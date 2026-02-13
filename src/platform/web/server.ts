/**
 * Web platform adapter.
 *
 * Express server that:
 * 1. Serves a simple command UI
 * 2. Exposes REST endpoints that mirror Discord's interaction model
 * 3. Creates PlatformInteraction objects and passes them to command handlers
 * 4. Uses WebSocket (via Socket.IO) to push replies back to the client
 *
 * This replaces the Discord gateway entirely.
 *
 * @module
 */
import express from 'express';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDataSource } from '../../app_data.js';
import { GuildSpaceUser } from '../../entities/GuildSpaceUser.js';
import { ChatMessage } from '../../entities/ChatMessage.js';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { Dkp } from '../../entities/Dkp.js';
import { Attendance } from '../../entities/Attendance.js';
import { Raids } from '../../entities/Raids.js';
import { RaidEvent } from '../../entities/RaidEvent.js';
import { RaidCall } from '../../entities/RaidCall.js';
import { RaidCallAttendance } from '../../entities/RaidCallAttendance.js';
import { Census } from '../../entities/Census.js';
import { processWhoLog } from '../../commands/dkp/attendance_processor.js';
import type {
  PlatformCommand,
  CommandInteraction,
  AutocompleteInteraction,
  ModalSubmitInteraction,
  ComponentInteraction,
  ReplyOptions,
  InteractionOptions,
  InteractionUser,
  ResolvedOption,
  ModalDefinition,
  Embed,
  ActionRow,
} from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Interaction Implementations ─────────────────────────────────────────────

class WebInteractionOptions implements InteractionOptions {
  private opts: Map<string, ResolvedOption>;
  private focused?: { name: string; value: string };

  constructor(rawOptions: Record<string, any>, focusedField?: { name: string; value: string }) {
    this.opts = new Map();
    for (const [key, val] of Object.entries(rawOptions || {})) {
      this.opts.set(key, {
        name: key,
        value: val,
        type: typeof val === 'number' ? 'integer' : typeof val === 'boolean' ? 'boolean' : 'string',
      });
    }
    this.focused = focusedField;
  }

  get(name: string): ResolvedOption | null {
    return this.opts.get(name) ?? null;
  }

  getString(name: string, required: true): string;
  getString(name: string, required?: boolean): string | null;
  getString(name: string, _required?: boolean): string | null {
    const opt = this.opts.get(name);
    return opt ? String(opt.value) : null;
  }

  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: boolean): number | null;
  getInteger(name: string, _required?: boolean): number | null {
    const opt = this.opts.get(name);
    return opt ? Number(opt.value) : null;
  }

  getBoolean(name: string, required: true): boolean;
  getBoolean(name: string, required?: boolean): boolean | null;
  getBoolean(name: string, _required?: boolean): boolean | null {
    const opt = this.opts.get(name);
    return opt ? Boolean(opt.value) : null;
  }

  getFocused(full: true): { name: string; value: string };
  getFocused(full?: false): string;
  getFocused(full?: boolean): string | { name: string; value: string } {
    if (!this.focused) return '';
    return full ? this.focused : this.focused.value;
  }
}

/**
 * Creates a reply sender that pushes messages back to the client via Socket.IO.
 */
function createReplySender(io: SocketServer, socketId: string, interactionId: string) {
  let replied = false;
  let deferred = false;

  const send = (event: string, data: object) => {
    io.to(socketId).emit(event, { interactionId, ...data });
  };

  return {
    async reply(options: ReplyOptions | string) {
      replied = true;
      const payload = typeof options === 'string' ? { content: options } : options;
      send('reply', payload);
    },
    async editReply(options: ReplyOptions | string) {
      const payload = typeof options === 'string' ? { content: options } : options;
      send('editReply', payload);
    },
    async deferReply() {
      deferred = true;
      send('deferReply', {});
    },
    async deleteReply() {
      send('deleteReply', {});
    },
    async followUp(options: ReplyOptions | string) {
      const payload = typeof options === 'string' ? { content: options } : options;
      send('followUp', payload);
    },
    async showModal(modal: ModalDefinition | { toJSON(): ModalDefinition }) {
      const resolved = 'toJSON' in modal && typeof modal.toJSON === 'function' ? modal.toJSON() : modal as ModalDefinition;
      send('showModal', resolved);
    },
    get isReplied() { return replied; },
    get isDeferred() { return deferred; },
  };
}

// ─── Server ──────────────────────────────────────────────────────────────────

export interface WebServerOptions {
  port?: number;
  commands: Map<string, PlatformCommand>;
  /** Session store: maps session token → user info. Simple for now. */
  sessions?: Map<string, InteractionUser>;
}

export function createWebServer(opts: WebServerOptions) {
  const { port = 3000, commands } = opts;
  const sessions = opts.sessions ?? new Map<string, InteractionUser>();

  const app = express();
  const server = createServer(app);
  const io = new SocketServer(server, { cors: { origin: '*' } });

  app.use(express.json());

  // Serve Vite-built client in production, fall back to legacy public/
  const clientDist = path.join(process.cwd(), 'client', 'dist');
  const legacyPublic = path.join(process.cwd(), 'src', 'platform', 'web', 'public');
  const staticDir = existsSync(clientDist) ? clientDist : legacyPublic;
  app.use(express.static(staticDir));

  // ─── Auth (Discord OAuth2) ───────────────────────────────────────

  const TOKEN_SECRET = process.env.DISCORD_CLIENT_SECRET || 'fallback-secret';
  const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function createSignedToken(discordId: string): string {
    const payload = `${discordId}.${Date.now()}`;
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
    return `${payload}.${sig}`;
  }

  function verifyToken(token: string): string | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [discordId, timestamp] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${discordId}.${timestamp}`).digest('hex').slice(0, 16);
    if (parts[2] !== expectedSig) return null;
    if (Date.now() - Number(timestamp) > TOKEN_TTL_MS) return null;
    return discordId;
  }

  async function getUser(req: express.Request): Promise<InteractionUser | null> {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
    if (!token) return null;

    // Check in-memory session first
    const cached = sessions.get(token);
    if (cached) return cached;

    // Try to reconstruct from signed token + database
    const discordId = verifyToken(token);
    if (!discordId) return null;

    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, {
      where: { discordId },
    });

    const user: InteractionUser = {
      id: discordId,
      username: gsUser?.displayName || discordId,
      displayName: gsUser?.displayName || discordId,
    };
    user.needsSetup = !gsUser;
    user.discordUsername = gsUser?.discordUsername || discordId;

    // Re-cache
    sessions.set(token, user);
    return user;
  }

  // Redirect to Discord's OAuth page
  app.get('/api/auth/discord', (_req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || '');
    const scope = encodeURIComponent('identify');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    res.redirect(url);
  });

  // Discord redirects back here with a code
  app.get('/api/auth/discord/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send('Missing code');
      return;
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID || '',
          client_secret: process.env.DISCORD_CLIENT_SECRET || '',
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI || '',
        }),
      });

      if (!tokenRes.ok) {
        console.error('Discord token exchange failed:', await tokenRes.text());
        res.status(500).send('Discord auth failed');
        return;
      }

      const tokenData = await tokenRes.json() as { access_token: string };

      // Get user info from Discord
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.status(500).send('Failed to get Discord user');
        return;
      }

      const discordUser = await userRes.json() as {
        id: string;
        username: string;
        global_name: string | null;
      };

      // Check if user has a GuildSpace account
      const existing = await AppDataSource.manager.findOne(GuildSpaceUser, {
        where: { discordId: discordUser.id },
      });

      // Create session
      const sessionToken = createSignedToken(discordUser.id);
      const user: InteractionUser = {
        id: discordUser.id,
        username: existing?.displayName || discordUser.username,
        displayName: existing?.displayName || discordUser.global_name || discordUser.username,
      };
      sessions.set(sessionToken, user);

      // Store Discord username in session for later
      user.discordUsername = discordUser.username;
      user.needsSetup = !existing;

      // Redirect to app with token
      res.redirect(`/?token=${sessionToken}`);
    } catch (err) {
      console.error('OAuth error:', err);
      res.status(500).send('Auth failed');
    }
  });

  // Check if user needs to set up their name
  app.get('/api/auth/me', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, {
      where: { discordId: user.id },
    });
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      discordUsername: user.discordUsername,
      needsSetup: user.needsSetup || false,
      isOfficer: gsUser?.isOfficer || gsUser?.isAdmin || gsUser?.isOwner || false,
      isAdmin: gsUser?.isAdmin || gsUser?.isOwner || false,
      isOwner: gsUser?.isOwner || false,
      joinedAt: gsUser?.createdAt?.toISOString() || null,
    });
  });

  // Set GuildSpace display name
  app.post('/api/auth/set-name', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { displayName } = req.body;
    if (!displayName || displayName.trim().length < 2 || displayName.trim().length > 32) {
      return res.status(400).json({ error: 'Name must be 2-32 characters' });
    }

    const name = displayName.trim();

    // Check if name is taken
    const taken = await AppDataSource.manager.findOne(GuildSpaceUser, {
      where: { displayName: name },
    });
    if (taken && taken.discordId !== user.id) {
      return res.status(409).json({ error: 'Name already taken' });
    }

    // Create or update
    let gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, {
      where: { discordId: user.id },
    });
    if (!gsUser) {
      gsUser = new GuildSpaceUser();
      gsUser.discordId = user.id;
      gsUser.discordUsername = user.discordUsername || user.username;
    }
    gsUser.displayName = name;
    await AppDataSource.manager.save(gsUser);

    // Update session
    user.username = name;
    user.displayName = name;
    user.needsSetup = false;

    res.json({ ok: true, displayName: name });
  });

  // Logout — remove session from server
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  // ─── Command Registry ──────────────────────────────────────────────

  app.get('/api/commands', (_req, res) => {
    const commandList = Array.from(commands.values()).map(cmd => cmd.data.toJSON());
    res.json(commandList);
  });

  // ─── Autocomplete ──────────────────────────────────────────────────

  app.post('/api/commands/:name/autocomplete', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const command = commands.get(req.params.name);
    if (!command?.autocomplete) return res.status(404).json({ error: 'No autocomplete handler' });

    const { options, focused } = req.body;
    let choices: { name: string; value: string; metadata?: Record<string, string | number> }[] = [];

    const interaction: AutocompleteInteraction = {
      user,
      commandName: req.params.name,
      options: new WebInteractionOptions(options, focused),
      async respond(c) {
        choices = c;
      },
    };

    try {
      await command.autocomplete(interaction);
      res.json(choices);
    } catch (error) {
      console.error(`Autocomplete error for /${req.params.name}:`, error);
      res.json([]);
    }
  });

  // ─── User's Toons ─────────────────────────────────────────────────

  app.get('/api/toons/mine', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const toons = await AppDataSource.manager.find(ActiveToons, {
        where: { DiscordId: user.id },
      });
      res.json(toons.map(t => ({
        name: t.Name,
        class: t.CharacterClass,
        level: Number(t.Level),
        status: t.Status,
      })));
    } catch (err) {
      console.error('Failed to fetch user toons:', err);
      res.status(500).json({ error: 'Failed to fetch characters' });
    }
  });

  // ─── Roster ────────────────────────────────────────────────────────

  app.get('/api/roster', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const [toons, dkpRows, gsUsers, lastRaidRows] = await Promise.all([
        AppDataSource.manager.find(ActiveToons),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(GuildSpaceUser),
        AppDataSource.manager.query(
          `SELECT name, MAX(date) as last_raid FROM attendance GROUP BY name`
        ) as Promise<{ name: string; last_raid: string | null }[]>,
      ]);

      const dkpByDiscord = new Map(dkpRows.map(d => [d.DiscordId, d]));
      const gsUserByDiscord = new Map(gsUsers.map(u => [u.discordId, u]));
      const lastRaidByName = new Map(lastRaidRows.map(r => [r.name, r.last_raid]));

      // Group characters by DiscordId
      const grouped = new Map<string, typeof toons>();
      for (const t of toons) {
        let arr = grouped.get(t.DiscordId);
        if (!arr) { arr = []; grouped.set(t.DiscordId, arr); }
        arr.push(t);
      }

      const classCounts: Record<string, number> = {};
      let totalCharacters = 0;

      const members = Array.from(grouped.entries()).map(([discordId, chars]) => {
        const dkp = dkpByDiscord.get(discordId);
        const gsUser = gsUserByDiscord.get(discordId);

        const mainChar = chars.find(c => c.Status === 'Main');
        const displayName = gsUser?.displayName || dkp?.DiscordName || discordId;

        const characters = chars.map(c => {
          const cls = c.CharacterClass;
          classCounts[cls] = (classCounts[cls] || 0) + 1;
          totalCharacters++;
          return {
            name: c.Name,
            class: cls,
            level: Number(c.Level),
            status: c.Status,
            lastRaidDate: lastRaidByName.get(c.Name) || null,
          };
        });

        return {
          discordId,
          displayName,
          characters,
          mainName: mainChar?.Name || characters[0]?.name || null,
          mainClass: mainChar?.CharacterClass || characters[0]?.class || null,
          mainLevel: mainChar ? Number(mainChar.Level) : (characters[0]?.level || null),
          earnedDkp: dkp ? Number(dkp.EarnedDkp) : 0,
          spentDkp: dkp ? Number(dkp.SpentDkp) : 0,
          hasGuildSpace: !!gsUser,
        };
      });

      res.json({
        members,
        summary: {
          totalMembers: members.length,
          totalCharacters,
          classCounts,
        },
      });
    } catch (err) {
      console.error('Failed to fetch roster:', err);
      res.status(500).json({ error: 'Failed to fetch roster' });
    }
  });

  // ─── Member Detail ──────────────────────────────────────────────────

  app.get('/api/roster/:discordId', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { discordId } = req.params;

    try {
      const [toons, dkpRow, gsUser, dkpByCharRows, lastRaidRows] = await Promise.all([
        AppDataSource.manager.find(ActiveToons, { where: { DiscordId: discordId } }),
        AppDataSource.manager.findOne(Dkp, { where: { DiscordId: discordId } }),
        AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId } }),
        AppDataSource.manager.query(
          `SELECT name, COALESCE(SUM(modifier), 0)::int as total_dkp, COUNT(*)::int as raid_count, MAX(date) as last_raid
           FROM attendance WHERE discord_id = $1 GROUP BY name
           HAVING COALESCE(SUM(modifier), 0) > 0
           ORDER BY MAX(date) DESC NULLS LAST`,
          [discordId]
        ) as Promise<{ name: string; total_dkp: number; raid_count: number; last_raid: string | null }[]>,
        AppDataSource.manager.query(
          `SELECT name, MAX(date) as last_raid FROM attendance WHERE discord_id = $1 GROUP BY name`,
          [discordId]
        ) as Promise<{ name: string; last_raid: string | null }[]>,
      ]);

      if (toons.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const lastRaidByName = new Map(lastRaidRows.map(r => [r.name, r.last_raid]));
      const displayName = gsUser?.displayName || dkpRow?.DiscordName || discordId;

      const characters = toons.map(c => ({
        name: c.Name,
        class: c.CharacterClass,
        level: Number(c.Level),
        status: c.Status,
        lastRaidDate: lastRaidByName.get(c.Name) || null,
      }));

      // Per-character DKP breakdown — only include active characters
      const charClassMap = new Map(toons.map(c => [c.Name, c.CharacterClass]));
      const dkpByCharacter = dkpByCharRows
        .filter(r => charClassMap.has(r.name))
        .map(r => ({
          name: r.name,
          class: charClassMap.get(r.name)!,
          totalDkp: r.total_dkp,
          raidCount: r.raid_count,
        }));

      res.json({
        discordId,
        displayName,
        bio: gsUser?.bio || null,
        isOfficer: gsUser?.isOfficer || gsUser?.isAdmin || gsUser?.isOwner || false,
        isAdmin: gsUser?.isAdmin || gsUser?.isOwner || false,
        isOwner: gsUser?.isOwner || false,
        officerSince: gsUser?.officerSince?.toISOString() || null,
        adminSince: gsUser?.adminSince?.toISOString() || null,
        joinedAt: gsUser?.createdAt?.toISOString() || null,
        characters,
        earnedDkp: dkpRow ? Number(dkpRow.EarnedDkp) : 0,
        spentDkp: dkpRow ? Number(dkpRow.SpentDkp) : 0,
        dkpByCharacter,
      });
    } catch (err) {
      console.error('Failed to fetch member detail:', err);
      res.status(500).json({ error: 'Failed to fetch member details' });
    }
  });

  // ─── Role Management (admin only) ─────────────────────────────────

  app.patch('/api/roster/:discordId/role', async (req, res) => {
    // At minimum, caller must be admin (or owner, which implies admin)
    const caller = await requireAdmin(req, res);
    if (!caller) return;

    const { discordId } = req.params;
    const { isOfficer, isAdmin } = req.body;

    if (typeof isOfficer !== 'boolean' && typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'isOfficer or isAdmin must be a boolean' });
    }

    // Cannot modify own role
    if (discordId === caller.user.id) {
      return res.status(403).json({ error: 'Cannot modify your own role' });
    }

    let target = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId } });

    // Cannot modify the owner
    if (target?.isOwner) {
      return res.status(403).json({ error: 'Cannot modify the owner' });
    }

    // Admin changes require owner
    if (typeof isAdmin === 'boolean' && !caller.gsUser.isOwner) {
      return res.status(403).json({ error: 'Only the owner can change admin roles' });
    }

    // If the user hasn't logged into GuildSpace yet, create a stub row
    if (!target) {
      const dkpRow = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId: discordId } });
      if (!dkpRow) return res.status(404).json({ error: 'User not found' });

      target = new GuildSpaceUser();
      target.discordId = discordId;
      target.displayName = dkpRow.DiscordName || discordId;
      target.discordUsername = dkpRow.DiscordName || discordId;
    }

    if (typeof isOfficer === 'boolean') {
      target.isOfficer = isOfficer;
      target.officerSince = isOfficer ? (target.officerSince ?? new Date()) : null;
    }
    if (typeof isAdmin === 'boolean') {
      target.isAdmin = isAdmin;
      target.adminSince = isAdmin ? (target.adminSince ?? new Date()) : null;
      // Admin implies officer
      if (isAdmin) {
        target.isOfficer = true;
        target.officerSince = target.officerSince ?? new Date();
      }
    }

    await AppDataSource.manager.save(target);

    res.json({ ok: true, discordId, isOfficer: target.isOfficer, isAdmin: target.isAdmin });
  });

  // ─── Profile ──────────────────────────────────────────────────────

  app.post('/api/profile/bio', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { bio } = req.body;
    if (typeof bio !== 'string') {
      return res.status(400).json({ error: 'Bio must be a string' });
    }
    if (bio.length > 300) {
      return res.status(400).json({ error: 'Bio must be 300 characters or fewer' });
    }

    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, {
      where: { discordId: user.id },
    });
    if (!gsUser) return res.status(404).json({ error: 'User not found' });

    gsUser.bio = bio.trim() || null;
    await AppDataSource.manager.save(gsUser);

    res.json({ ok: true, bio: gsUser.bio });
  });

  // ─── Officer Helpers ─────────────────────────────────────────────────

  async function requireOfficer(req: express.Request, res: express.Response): Promise<{ user: InteractionUser; gsUser: GuildSpaceUser } | null> {
    const user = await getUser(req);
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return null; }
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
    if (!gsUser?.isOfficer && !gsUser?.isAdmin && !gsUser?.isOwner) { res.status(403).json({ error: 'Officer access required' }); return null; }
    return { user, gsUser };
  }

  async function requireAdmin(req: express.Request, res: express.Response): Promise<{ user: InteractionUser; gsUser: GuildSpaceUser } | null> {
    const user = await getUser(req);
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return null; }
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
    if (!gsUser?.isAdmin && !gsUser?.isOwner) { res.status(403).json({ error: 'Admin access required' }); return null; }
    return { user, gsUser };
  }

  async function requireOwner(req: express.Request, res: express.Response): Promise<{ user: InteractionUser; gsUser: GuildSpaceUser } | null> {
    const user = await getUser(req);
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return null; }
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
    if (!gsUser?.isOwner) { res.status(403).json({ error: 'Owner access required' }); return null; }
    return { user, gsUser };
  }

  async function getApiKeyUser(req: express.Request): Promise<GuildSpaceUser | null> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { apiKey: token } });
    return gsUser?.isOfficer ? gsUser : null;
  }

  // ─── Raid Templates ──────────────────────────────────────────────────

  app.get('/api/raids/templates', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const raids = await AppDataSource.manager.find(Raids);
      res.json(raids.map(r => ({ name: r.Raid, type: r.Type, modifier: Number(r.Modifier) })));
    } catch (err) {
      console.error('Failed to fetch raid templates:', err);
      res.status(500).json({ error: 'Failed to fetch raid templates' });
    }
  });

  // ─── Raid Events ──────────────────────────────────────────────────────

  app.get('/api/raids/events', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const status = req.query.status as string | undefined;
      const where = status ? { status } : {};
      const events = await AppDataSource.manager.find(RaidEvent, {
        where,
        order: { createdAt: 'DESC' },
      });

      // Enrich with call/member counts
      const result = await Promise.all(events.map(async (event) => {
        const calls = await AppDataSource.manager.find(RaidCall, { where: { eventId: event.id } });
        const totalDkp = calls.reduce((sum, c) => sum + c.modifier, 0);

        // Count unique members across all calls
        const memberIds = new Set<string>();
        if (calls.length > 0) {
          const callIds = calls.map(c => c.id);
          const attendanceLinks = await AppDataSource.manager
            .createQueryBuilder()
            .select('rca.attendance_id', 'attendanceId')
            .from(RaidCallAttendance, 'rca')
            .where('rca.call_id IN (:...callIds)', { callIds })
            .getRawMany() as { attendanceId: string }[];

          if (attendanceLinks.length > 0) {
            const attIds = attendanceLinks.map(a => a.attendanceId);
            const attendanceRows = await AppDataSource.manager
              .createQueryBuilder()
              .select('a.discord_id', 'discordId')
              .from(Attendance, 'a')
              .where('a.id IN (:...attIds)', { attIds })
              .getRawMany() as { discordId: string }[];
            for (const row of attendanceRows) {
              if (row.discordId) memberIds.add(row.discordId);
            }
          }
        }

        return {
          id: event.id,
          name: event.name,
          status: event.status,
          createdBy: event.createdBy,
          createdAt: event.createdAt,
          closedAt: event.closedAt,
          callCount: calls.length,
          totalDkp,
          memberCount: memberIds.size,
        };
      }));

      res.json(result);
    } catch (err) {
      console.error('Failed to fetch raid events:', err);
      res.status(500).json({ error: 'Failed to fetch raid events' });
    }
  });

  app.post('/api/raids/events', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Event name is required' });
      }
      const event = new RaidEvent();
      event.name = name.trim();
      event.createdBy = officer.user.id;
      const saved = await AppDataSource.manager.save(event);
      res.json(saved);
    } catch (err) {
      console.error('Failed to create raid event:', err);
      res.status(500).json({ error: 'Failed to create raid event' });
    }
  });

  app.get('/api/raids/events/:id', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const eventId = parseInt(req.params.id, 10);
      const event = await AppDataSource.manager.findOne(RaidEvent, { where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      const calls = await AppDataSource.manager.find(RaidCall, {
        where: { eventId },
        order: { createdAt: 'ASC' },
      });

      // Build attendance matrix data
      const [gsUsers, dkpRows, allToons] = await Promise.all([
        AppDataSource.manager.find(GuildSpaceUser),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(ActiveToons),
      ]);
      const gsUserMap = new Map(gsUsers.map(u => [u.discordId, u]));
      const dkpNameMap = new Map(dkpRows.map(d => [d.DiscordId, d.DiscordName]));
      const toonClassMap = new Map(allToons.map(t => [t.Name, t.CharacterClass]));

      // For each call, get its attendees
      const callDetails = await Promise.all(calls.map(async (call) => {
        const links = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId: call.id } });
        const attendees: { characterName: string; discordId: string; characterClass: string | null }[] = [];
        const rejected: { name: string; reason: string }[] = [];

        if (links.length > 0) {
          const attIds = links.map(l => l.attendanceId);
          const rows = await AppDataSource.manager
            .createQueryBuilder()
            .select(['a.name as name', 'a.discord_id as "discordId"'])
            .from(Attendance, 'a')
            .where('a.id IN (:...attIds)', { attIds })
            .getRawMany() as { name: string; discordId: string }[];
          for (const row of rows) {
            attendees.push({ characterName: row.name, discordId: row.discordId, characterClass: toonClassMap.get(row.name) || null });
          }
        }

        return {
          id: call.id,
          raidName: call.raidName,
          modifier: call.modifier,
          recordedCount: attendees.length,
          rejectedCount: 0,
          createdBy: call.createdBy,
          createdAt: call.createdAt,
          attendees,
        };
      }));

      // Build members matrix
      const memberMap = new Map<string, { callsPresent: number[]; totalDkp: number }>();
      for (const call of callDetails) {
        for (const att of call.attendees) {
          let member = memberMap.get(att.discordId);
          if (!member) {
            member = { callsPresent: [], totalDkp: 0 };
            memberMap.set(att.discordId, member);
          }
          member.callsPresent.push(call.id);
          member.totalDkp += call.modifier;
        }
      }

      // Build discordId → main class (prefer Main status, then first toon)
      const toonsByDiscord = new Map<string, typeof allToons>();
      for (const t of allToons) {
        let arr = toonsByDiscord.get(t.DiscordId);
        if (!arr) { arr = []; toonsByDiscord.set(t.DiscordId, arr); }
        arr.push(t);
      }

      const members = Array.from(memberMap.entries()).map(([discordId, data]) => {
        const gsUser = gsUserMap.get(discordId);
        const toons = toonsByDiscord.get(discordId);
        const mainToon = toons?.find(t => t.Status === 'Main') || toons?.[0];
        return {
          discordId,
          displayName: gsUser?.displayName || dkpNameMap.get(discordId) || discordId,
          mainClass: mainToon?.CharacterClass || null,
          callsPresent: data.callsPresent,
          totalDkp: data.totalDkp,
          hasGuildSpace: !!gsUser,
        };
      }).sort((a, b) => b.totalDkp - a.totalDkp);

      res.json({
        event: {
          id: event.id,
          name: event.name,
          status: event.status,
          createdBy: event.createdBy,
          createdAt: event.createdAt,
          closedAt: event.closedAt,
        },
        calls: callDetails,
        members,
      });
    } catch (err) {
      console.error('Failed to fetch raid event detail:', err);
      res.status(500).json({ error: 'Failed to fetch event details' });
    }
  });

  app.patch('/api/raids/events/:id', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const event = await AppDataSource.manager.findOne(RaidEvent, { where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      if (req.body.name !== undefined) {
        event.name = String(req.body.name).trim();
      }
      if (req.body.status === 'closed' && event.status === 'active') {
        event.status = 'closed';
        event.closedAt = new Date();
      }
      await AppDataSource.manager.save(event);
      res.json(event);
    } catch (err) {
      console.error('Failed to update raid event:', err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // ─── Raid Calls ──────────────────────────────────────────────────────

  app.post('/api/raids/events/:id/calls', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const event = await AppDataSource.manager.findOne(RaidEvent, { where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      if (event.status !== 'active') return res.status(400).json({ error: 'Event is closed' });

      const { raidName, modifier, whoLog } = req.body;
      if (!raidName || modifier === undefined || !whoLog) {
        return res.status(400).json({ error: 'raidName, modifier, and whoLog are required' });
      }

      const mod = Number(modifier);
      if (isNaN(mod)) return res.status(400).json({ error: 'modifier must be a number' });

      // Process the /who log
      const result = await processWhoLog(whoLog, raidName, mod);

      // Save raid name as a template if it doesn't exist yet
      const existingRaid = await AppDataSource.manager.findOne(Raids, { where: { Raid: raidName } });
      if (!existingRaid) {
        const newRaid = new Raids();
        newRaid.Raid = raidName;
        newRaid.Modifier = mod;
        await AppDataSource.manager.save(newRaid);
      }

      // Create the call record
      const call = new RaidCall();
      call.eventId = eventId;
      call.raidName = raidName;
      call.modifier = mod;
      call.whoLog = whoLog;
      call.createdBy = officer.user.id;
      const savedCall = await AppDataSource.manager.save(call);

      // Link attendance records to this call
      for (const rec of result.recorded) {
        const link = new RaidCallAttendance();
        link.callId = savedCall.id;
        link.attendanceId = rec.attendanceId;
        await AppDataSource.manager.save(link);
      }

      res.json({
        call: {
          id: savedCall.id,
          raidName: savedCall.raidName,
          modifier: savedCall.modifier,
          createdAt: savedCall.createdAt,
        },
        recorded: result.recorded.length,
        rejected: result.rejected.length,
        rejectedPlayers: result.rejected,
      });
    } catch (err) {
      console.error('Failed to add raid call:', err);
      res.status(500).json({ error: 'Failed to add call' });
    }
  });

  app.delete('/api/raids/events/:id/calls/:callId', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const callId = parseInt(req.params.callId, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId: parseInt(req.params.id, 10) } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      // Get linked attendance records
      const links = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId } });

      if (links.length > 0) {
        const attIds = links.map(l => l.attendanceId);
        // Get discord IDs to reverse DKP
        const attendanceRows = await AppDataSource.manager
          .createQueryBuilder()
          .select(['a.discord_id as "discordId"'])
          .from(Attendance, 'a')
          .where('a.id IN (:...attIds)', { attIds })
          .getRawMany() as { discordId: string }[];

        const uniqueDiscordIds = [...new Set(attendanceRows.map(r => r.discordId))];

        // Reverse DKP for each affected member
        for (const discordId of uniqueDiscordIds) {
          await AppDataSource.manager
            .createQueryBuilder()
            .update(Dkp)
            .set({ EarnedDkp: () => `earned_dkp - ${call.modifier}` })
            .where('discord_id = :discordId', { discordId })
            .execute();
        }

        // Delete attendance records
        await AppDataSource.manager
          .createQueryBuilder()
          .delete()
          .from(Attendance)
          .where('id IN (:...attIds)', { attIds })
          .execute();
      }

      // Delete the call (cascade deletes raid_call_attendance links)
      await AppDataSource.manager.remove(call);

      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to delete raid call:', err);
      res.status(500).json({ error: 'Failed to delete call' });
    }
  });

  // Manually add a character to a call
  app.post('/api/raids/events/:id/calls/:callId/add', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const callId = parseInt(req.params.callId, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId: parseInt(req.params.id, 10) } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      const { characterName } = req.body;
      if (!characterName) return res.status(400).json({ error: 'characterName is required' });

      const censusEntry = await AppDataSource.manager.findOne(Census, { where: { Name: characterName } });
      if (!censusEntry?.DiscordId) return res.status(404).json({ error: 'Character not found in census' });

      // Check if already in this call
      const existingLinks = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId } });
      if (existingLinks.length > 0) {
        const attIds = existingLinks.map(l => l.attendanceId);
        const existing = await AppDataSource.manager
          .createQueryBuilder()
          .select('a.discord_id', 'discordId')
          .from(Attendance, 'a')
          .where('a.id IN (:...attIds)', { attIds })
          .andWhere('a.discord_id = :discordId', { discordId: censusEntry.DiscordId })
          .getRawOne();
        if (existing) return res.status(409).json({ error: 'Member already in this call' });
      }

      // Create attendance record
      const attendance = new Attendance();
      attendance.Date = new Date();
      attendance.Raid = call.raidName;
      attendance.Name = characterName;
      attendance.DiscordId = censusEntry.DiscordId;
      attendance.Modifier = call.modifier.toString();
      const saved = await AppDataSource.manager.save(attendance);

      // Update DKP
      await AppDataSource.manager
        .createQueryBuilder()
        .update(Dkp)
        .set({ EarnedDkp: () => `earned_dkp + ${call.modifier}` })
        .where('discord_id = :discordId', { discordId: censusEntry.DiscordId })
        .execute();

      // Link to call
      const link = new RaidCallAttendance();
      link.callId = callId;
      link.attendanceId = saved.Id;
      await AppDataSource.manager.save(link);

      res.json({ ok: true, characterName, discordId: censusEntry.DiscordId });
    } catch (err) {
      console.error('Failed to add character to call:', err);
      res.status(500).json({ error: 'Failed to add character' });
    }
  });

  // Remove a character from a call
  app.delete('/api/raids/events/:id/calls/:callId/remove', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const callId = parseInt(req.params.callId, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId: parseInt(req.params.id, 10) } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      const { characterName } = req.body;
      if (!characterName) return res.status(400).json({ error: 'characterName is required' });

      // Find the attendance record linked to this call for this character
      const links = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId } });
      if (links.length === 0) return res.status(404).json({ error: 'No attendance records for this call' });

      const attIds = links.map(l => l.attendanceId);
      const row = await AppDataSource.manager
        .createQueryBuilder()
        .select(['a.id as id', 'a.discord_id as "discordId"'])
        .from(Attendance, 'a')
        .where('a.id IN (:...attIds)', { attIds })
        .andWhere('a.name = :name', { name: characterName })
        .getRawOne() as { id: string; discordId: string } | undefined;

      if (!row) return res.status(404).json({ error: 'Character not found in this call' });

      // Reverse DKP
      await AppDataSource.manager
        .createQueryBuilder()
        .update(Dkp)
        .set({ EarnedDkp: () => `earned_dkp - ${call.modifier}` })
        .where('discord_id = :discordId', { discordId: row.discordId })
        .execute();

      // Delete the attendance record (cascade removes the link)
      await AppDataSource.manager
        .createQueryBuilder()
        .delete()
        .from(Attendance)
        .where('id = :id', { id: row.id })
        .execute();

      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to remove character from call:', err);
      res.status(500).json({ error: 'Failed to remove character' });
    }
  });

  // ─── Push Endpoint (companion app) ───────────────────────────────────

  app.post('/api/raids/push', async (req, res) => {
    const apiUser = await getApiKeyUser(req);
    if (!apiUser) return res.status(401).json({ error: 'Invalid API key' });

    try {
      const activeEvent = await AppDataSource.manager.findOne(RaidEvent, { where: { status: 'active' } });
      if (!activeEvent) return res.status(409).json({ error: 'No active raid event' });

      const { raidName, modifier, whoLog } = req.body;
      if (!raidName || modifier === undefined || !whoLog) {
        return res.status(400).json({ error: 'raidName, modifier, and whoLog are required' });
      }

      const mod = Number(modifier);
      if (isNaN(mod)) return res.status(400).json({ error: 'modifier must be a number' });

      const result = await processWhoLog(whoLog, raidName, mod);

      // Save raid name as a template if it doesn't exist yet
      const existingRaid = await AppDataSource.manager.findOne(Raids, { where: { Raid: raidName } });
      if (!existingRaid) {
        const newRaid = new Raids();
        newRaid.Raid = raidName;
        newRaid.Modifier = mod;
        await AppDataSource.manager.save(newRaid);
      }

      const call = new RaidCall();
      call.eventId = activeEvent.id;
      call.raidName = raidName;
      call.modifier = mod;
      call.whoLog = whoLog;
      call.createdBy = apiUser.discordId;
      const savedCall = await AppDataSource.manager.save(call);

      for (const rec of result.recorded) {
        const link = new RaidCallAttendance();
        link.callId = savedCall.id;
        link.attendanceId = rec.attendanceId;
        await AppDataSource.manager.save(link);
      }

      res.json({
        eventId: activeEvent.id,
        callId: savedCall.id,
        recorded: result.recorded.length,
        rejected: result.rejected.length,
      });
    } catch (err) {
      console.error('Failed to process push:', err);
      res.status(500).json({ error: 'Failed to process push' });
    }
  });

  // ─── API Key Generation ──────────────────────────────────────────────

  app.post('/api/profile/api-key', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      officer.gsUser.apiKey = crypto.randomBytes(32).toString('hex');
      await AppDataSource.manager.save(officer.gsUser);
      res.json({ apiKey: officer.gsUser.apiKey });
    } catch (err) {
      console.error('Failed to generate API key:', err);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  });

  // ─── Online Presence Tracking ──────────────────────────────────────

  const onlineUsers = new Map<string, number>(); // discordId → connection count

  async function emitPresenceUpdate() {
    const onlineIds = Array.from(onlineUsers.keys());
    let totalMembers = 0;
    try {
      const result = await AppDataSource.manager.query(
        `SELECT COUNT(DISTINCT discord_id) as count FROM active_toons`
      ) as { count: string }[];
      totalMembers = Number(result[0]?.count ?? 0);
    } catch { /* ignore */ }
    io.emit('presenceUpdate', {
      onlineCount: onlineIds.length,
      onlineIds,
      totalMembers,
    });
  }

  // ─── Command Execution (via WebSocket) ─────────────────────────────

  // Pending component collectors: interactionId → { resolve, filter, timeout }
  const pendingCollectors = new Map<string, {
    resolve: (interaction: ComponentInteraction | null) => void;
    filter: (i: ComponentInteraction) => boolean;
    timer: ReturnType<typeof setTimeout>;
  }>();

  io.on('connection', (socket) => {
    let sessionUser: InteractionUser | null = null;

    socket.on('auth', async (data: { token: string }) => {
      let user = sessions.get(data.token);

      // Try to reconstruct from signed token
      if (!user) {
        const discordId = verifyToken(data.token);
        if (discordId) {
          const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, {
            where: { discordId },
          });
          user = {
            id: discordId,
            username: gsUser?.displayName || discordId,
            displayName: gsUser?.displayName || discordId,
          };
          sessions.set(data.token, user);
        }
      }

      if (user) {
        sessionUser = user;
        socket.join('channel:general');
        socket.emit('authOk', user);

        // Track online presence
        const prev = onlineUsers.get(user.id) ?? 0;
        onlineUsers.set(user.id, prev + 1);
        if (prev === 0) emitPresenceUpdate();

        // Send recent chat history
        try {
          const history = await AppDataSource.manager.find(ChatMessage, {
            where: { channel: 'general' },
            order: { createdAt: 'ASC' },
            take: 100,
          });
          socket.emit('chatHistory', history);
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      } else {
        socket.emit('authError', { error: 'Invalid token' });
      }
    });

    socket.on('executeCommand', async (data: {
      interactionId: string;
      command: string;
      options: Record<string, any>;
    }) => {
      if (!sessionUser) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }

      const command = commands.get(data.command);
      if (!command?.execute) {
        socket.emit('error', { interactionId: data.interactionId, error: `Unknown command: ${data.command}` });
        return;
      }

      const sender = createReplySender(io, socket.id, data.interactionId);

      const interaction: CommandInteraction = {
        user: sessionUser,
        commandName: data.command,
        options: new WebInteractionOptions(data.options),
        guildId: 'guild_default', // TODO: from auth/session
        memberPermissions: new Set(['ManageRoles', 'ManageGuild']), // TODO: real permissions

        reply: sender.reply,
        editReply: sender.editReply,
        deferReply: sender.deferReply,
        deleteReply: sender.deleteReply,
        followUp: sender.followUp,
        showModal: sender.showModal,
      };

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Command error /${data.command}:`, error);
        if (!sender.isReplied && !sender.isDeferred) {
          sender.reply({ content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }
    });

    // Handle modal submissions
    socket.on('submitModal', async (data: {
      interactionId: string;
      modalId: string;
      fields: Record<string, string>;
    }) => {
      if (!sessionUser) return;

      // Find command by modal ID convention: "commandName_modal"
      const commandName = data.modalId.replace('_modal', '');
      const command = commands.get(commandName);
      if (!command?.handleModal) return;

      const sender = createReplySender(io, socket.id, data.interactionId);

      const interaction: ModalSubmitInteraction = {
        user: sessionUser,
        customId: data.modalId,
        fields: {
          getTextInputValue(customId: string) {
            return data.fields[customId] ?? '';
          },
        },
        reply: sender.reply,
        editReply: sender.editReply,
        deferReply: sender.deferReply,
      };

      try {
        await command.handleModal(interaction);
      } catch (error) {
        console.error(`Modal error ${data.modalId}:`, error);
      }
    });

    // Handle component interactions (button clicks, select menu choices)
    socket.on('componentInteraction', (data: {
      interactionId: string;
      parentInteractionId: string;
      customId: string;
      values?: string[];
    }) => {
      if (!sessionUser) return;

      const collector = pendingCollectors.get(data.parentInteractionId);
      if (!collector) return;

      const sender = createReplySender(io, socket.id, data.parentInteractionId);

      const componentInteraction: ComponentInteraction = {
        user: sessionUser,
        customId: data.customId,
        values: data.values,
        isStringSelectMenu() { return !!data.values && data.values.length > 0; },
        update: sender.reply, // update replaces the original message
      };

      if (collector.filter(componentInteraction)) {
        clearTimeout(collector.timer);
        pendingCollectors.delete(data.parentInteractionId);
        collector.resolve(componentInteraction);
      }
    });

    // ─── Chat Messages ──────────────────────────────────────────────

    socket.on('chatMessage', async (data: { content: string; channel?: string }) => {
      if (!sessionUser) return;
      const content = data.content?.trim();
      if (!content) return;

      const channel = data.channel || 'general';

      const msg = new ChatMessage();
      msg.channel = channel;
      msg.userId = sessionUser.id;
      msg.displayName = sessionUser.displayName || sessionUser.username;
      msg.content = content;

      try {
        const saved = await AppDataSource.manager.save(msg);
        io.to(`channel:${channel}`).emit('newMessage', saved);
      } catch (err) {
        console.error('Failed to save chat message:', err);
      }
    });

    socket.on('disconnect', () => {
      if (sessionUser) {
        const count = onlineUsers.get(sessionUser.id) ?? 0;
        if (count <= 1) {
          onlineUsers.delete(sessionUser.id);
          emitPresenceUpdate();
        } else {
          onlineUsers.set(sessionUser.id, count - 1);
        }
      }
      sessionUser = null;
    });
  });

  // ─── Collector Registration (used internally by adapted commands) ──

  /**
   * Commands that use awaitMessageComponent call this.
   * Returns a promise that resolves when a matching component interaction arrives.
   */
  function awaitComponent(
    interactionId: string,
    filter: (i: ComponentInteraction) => boolean,
    timeout: number,
  ): Promise<ComponentInteraction | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingCollectors.delete(interactionId);
        resolve(null);
      }, timeout);

      pendingCollectors.set(interactionId, { resolve, filter, timer });
    });
  }

  // Expose for use by adapted commands
  // awaitComponent is exposed via the return value

  // ─── SPA Fallback ───────────────────────────────────────────────────
  // Serve index.html for all non-API routes (client-side routing)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  // ─── Start ─────────────────────────────────────────────────────────

  function start() {
    server.listen(port, () => {
      console.log(`\n  🏰 GuildSpace running at http://localhost:${port}\n`);
      console.log(`  Commands loaded: ${commands.size}`);
      console.log(`  ${Array.from(commands.keys()).map(n => `/${n}`).join(', ')}\n`);
    });
    return server;
  }

  return { app, server, io, start, sessions, awaitComponent };
}
