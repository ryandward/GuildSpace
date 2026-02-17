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
import { ILike, Not, In } from 'typeorm';
import express from 'express';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDataSource } from '../../app_data.js';
import { GuildSpaceUser } from '../../entities/GuildSpaceUser.js';
import { ChatMessage } from '../../entities/ChatMessage.js';
import { ChatChannel } from '../../entities/ChatChannel.js';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { Dkp } from '../../entities/Dkp.js';
import { Attendance } from '../../entities/Attendance.js';
import { Raids } from '../../entities/Raids.js';
import { RaidEvent } from '../../entities/RaidEvent.js';
import { RaidCall } from '../../entities/RaidCall.js';
import { RaidCallAttendance } from '../../entities/RaidCallAttendance.js';
import { Census } from '../../entities/Census.js';
import { Bank } from '../../entities/Bank.js';
import { Items } from '../../entities/Items.js';
import { BankImport } from '../../entities/BankImport.js';
import { Trash } from '../../entities/Trash.js';
import { Classes } from '../../entities/Classes.js';
import { CharacterEquipment } from '../../entities/CharacterEquipment.js';
import { processWhoLog } from '../../commands/dkp/attendance_processor.js';
import { getItemMetadata } from '../../data/itemMetadata.js';
import { isDmChannel, dmParticipants } from '../../lib/dmChannel.js';
import { initDmEncryption, encryptDmContent, decryptDmContent } from '../../lib/dmEncrypt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Server ──────────────────────────────────────────────────────────────────

interface InteractionUser {
  id: string;
  username: string;
  displayName: string;
  discordUsername?: string;
  needsSetup?: boolean;
}

export interface WebServerOptions {
  port?: number;
  /** Session store: maps session token → user info. Simple for now. */
  sessions?: Map<string, InteractionUser>;
}

export function createWebServer(opts: WebServerOptions) {
  const { port = 3000 } = opts;
  const sessions = opts.sessions ?? new Map<string, InteractionUser>();

  const app = express();
  const server = createServer(app);
  const io = new SocketServer(server, { cors: { origin: '*' } });

  app.use(express.json());

  const staticDir = path.join(process.cwd(), 'client', 'dist');
  if (!existsSync(staticDir)) {
    console.warn(`⚠ Client build not found at ${staticDir} — static files will not be served`);
  }
  app.use(express.static(staticDir));

  // ─── Shared Helpers ──────────────────────────────────────────────

  /** Fetch name → last raid date map. Used by roster, member detail, and event detail. */
  async function fetchLastRaidByName(): Promise<Map<string, string | null>> {
    const rows = await AppDataSource.getRepository(Attendance)
      .createQueryBuilder('a')
      .select('a.Name', 'name')
      .addSelect('MAX(a.Date)', 'last_raid')
      .groupBy('a.Name')
      .getRawMany<{ name: string; last_raid: string | null }>();
    return new Map(rows.map(r => [r.name, r.last_raid]));
  }

  /** Pick the most-recently-raided toon for a user. Falls back to Main, then first. */
  function pickMostRecentToon<T extends { Name: string; Status: string }>(
    toons: T[],
    lastRaidByName: Map<string, string | null>,
  ): T | undefined {
    let best: T | undefined;
    let bestDate: string | null = null;
    for (const t of toons) {
      const rd = lastRaidByName.get(t.Name) ?? null;
      if (rd && (!bestDate || rd > bestDate)) {
        bestDate = rd;
        best = t;
      }
    }
    return best || toons.find(t => t.Status === 'Main') || toons[0];
  }

  // ─── Auth (Discord OAuth2) ───────────────────────────────────────

  const TOKEN_SECRET = process.env.DISCORD_CLIENT_SECRET || 'fallback-secret';
  initDmEncryption(TOKEN_SECRET);
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
      ...GuildSpaceUser.roleFlags(gsUser),
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

  // ─── Toon Search ──────────────────────────────────────────────────

  app.get('/api/toons/search', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const q = String(req.query.q || '');
      const where = q ? { Name: ILike(`%${q}%`) } : {};
      const toons = await AppDataSource.manager.find(ActiveToons, {
        where,
        take: 10,
      });
      res.json(toons.map(t => t.Name));
    } catch (err) {
      console.error('Failed to search toons:', err);
      res.status(500).json({ error: 'Search failed' });
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
      const [toons, dkpRows, gsUsers, lastRaidByName, classes, earnedByChar, spentByChar] = await Promise.all([
        AppDataSource.manager.find(ActiveToons),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(GuildSpaceUser),
        fetchLastRaidByName(),
        AppDataSource.manager.find(Classes),
        AppDataSource.getRepository(Attendance)
          .createQueryBuilder('a')
          .select('a.Name', 'name')
          .addSelect('COALESCE(SUM(a.Modifier), 0)', 'earned')
          .groupBy('a.Name')
          .getRawMany<{ name: string; earned: string }>(),
        AppDataSource.getRepository(Items)
          .createQueryBuilder('i')
          .select('i.Name', 'name')
          .addSelect('COALESCE(SUM(i.DkpSpent), 0)', 'spent')
          .groupBy('i.Name')
          .getRawMany<{ name: string; spent: string }>(),
      ]);

      const earnedMap = new Map(earnedByChar.map(r => [r.name, Number(r.earned)]));
      const spentMap = new Map(spentByChar.map(r => [r.name, Number(r.spent)]));

      const classAbbreviations: Record<string, string> = {};
      for (const c of classes) {
        classAbbreviations[c.characterClass] = c.abbreviation;
      }

      const dkpByDiscord = new Map(dkpRows.map(d => [d.DiscordId, d]));
      const gsUserByDiscord = new Map(gsUsers.map(u => [u.discordId, u]));

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
            earnedDkp: earnedMap.get(c.Name) || 0,
            spentDkp: spentMap.get(c.Name) || 0,
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
          ...GuildSpaceUser.roleFlags(gsUser),
        };
      });

      res.json({
        members,
        summary: {
          totalMembers: members.length,
          totalCharacters,
          classCounts,
        },
        classAbbreviations,
      });
    } catch (err) {
      console.error('Failed to fetch roster:', err);
      res.status(500).json({ error: 'Failed to fetch roster' });
    }
  });

  // ─── Class Stats (raid ticks + items won, grouped by class) ────────

  app.get('/api/roster/class-stats', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const activeToons = await AppDataSource.manager.find(ActiveToons);
      const charClassMap = new Map(activeToons.map(c => [c.Name, c.CharacterClass]));

      // Raid ticks per character name
      const tickRows = await AppDataSource.getRepository(Attendance)
        .createQueryBuilder('a')
        .select('a.Name', 'name')
        .addSelect('COUNT(*)', 'ticks')
        .groupBy('a.Name')
        .getRawMany<{ name: string; ticks: string }>();

      const raidTicks: Record<string, number> = {};
      for (const row of tickRows) {
        const cls = charClassMap.get(row.name);
        if (!cls) continue;
        raidTicks[cls] = (raidTicks[cls] || 0) + Number(row.ticks);
      }

      // Items won per character name
      const itemRows = await AppDataSource.getRepository(Items)
        .createQueryBuilder('i')
        .select('i.Name', 'name')
        .addSelect('COUNT(*)', 'items')
        .groupBy('i.Name')
        .getRawMany<{ name: string; items: string }>();

      const itemsWon: Record<string, number> = {};
      for (const row of itemRows) {
        const cls = charClassMap.get(row.name);
        if (!cls) continue;
        itemsWon[cls] = (itemsWon[cls] || 0) + Number(row.items);
      }

      res.json({ raidTicks, itemsWon });
    } catch (err) {
      console.error('Failed to fetch class stats:', err);
      res.status(500).json({ error: 'Failed to fetch class stats' });
    }
  });

  // ─── Member Detail ──────────────────────────────────────────────────

  app.get('/api/roster/:discordId', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { discordId } = req.params;

    try {
      const [toons, dkpRow, gsUser, dkpByCharRows] = await Promise.all([
        AppDataSource.manager.find(ActiveToons, { where: { DiscordId: discordId } }),
        AppDataSource.manager.findOne(Dkp, { where: { DiscordId: discordId } }),
        AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId } }),
        AppDataSource.getRepository(Attendance)
          .createQueryBuilder('a')
          .select('a.Name', 'name')
          .addSelect('COALESCE(SUM(a.Modifier), 0)', 'total_dkp')
          .addSelect('COUNT(*)', 'raid_count')
          .addSelect('MAX(a.Date)', 'last_raid')
          .where('a.DiscordId = :discordId', { discordId })
          .groupBy('a.Name')
          .orderBy('MAX(a.Date)', 'DESC', 'NULLS LAST')
          .getRawMany<{ name: string; total_dkp: string; raid_count: string; last_raid: string | null }>(),
      ]);

      if (toons.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const lastRaidByName = new Map(dkpByCharRows.map(r => [r.name, r.last_raid]));
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
        .filter(r => charClassMap.has(r.name) && Number(r.total_dkp) > 0)
        .map(r => ({
          name: r.name,
          class: charClassMap.get(r.name)!,
          totalDkp: Number(r.total_dkp),
          raidCount: Number(r.raid_count),
        }));

      res.json({
        discordId,
        displayName,
        bio: gsUser?.bio || null,
        hasGuildSpace: !!gsUser,
        ...GuildSpaceUser.roleFlags(gsUser),
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

  // ─── Character Management ─────────────────────────────────────────

  const RANK_MAP: Record<string, number> = { member: 0, officer: 1, admin: 2, owner: 3 };

  function meetsMinRole(userRole: string, minRole: string): boolean {
    return (RANK_MAP[userRole] ?? 0) >= (RANK_MAP[minRole] ?? 0);
  }

  /** Check if caller can manage characters for target discordId. Returns caller info or sends error. */
  async function requireCharacterAccess(
    req: express.Request, res: express.Response, targetDiscordId: string
  ): Promise<{ user: InteractionUser; callerGsUser: GuildSpaceUser | null } | null> {
    const user = await getUser(req);
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return null; }

    // Self-service: always allowed
    if (user.id === targetDiscordId) {
      const callerGsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
      return { user, callerGsUser };
    }

    // Managing someone else: caller must outrank target
    const callerGsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
    const targetGsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: targetDiscordId } });

    const callerRole = callerGsUser?.isOwner ? 'owner'
      : callerGsUser?.hasAdminAccess ? 'admin'
      : callerGsUser?.hasOfficerAccess ? 'officer'
      : 'member';
    const targetRole = targetGsUser?.isOwner ? 'owner'
      : targetGsUser?.hasAdminAccess ? 'admin'
      : targetGsUser?.hasOfficerAccess ? 'officer'
      : 'member';

    if (RANK_MAP[callerRole] <= RANK_MAP[targetRole]) {
      res.status(403).json({ error: 'You do not have permission to manage this member\'s characters' });
      return null;
    }

    return { user, callerGsUser };
  }

  // Create or update a character
  app.put('/api/roster/:discordId/characters/:name', async (req, res) => {
    const { discordId, name } = req.params;
    const access = await requireCharacterAccess(req, res, discordId);
    if (!access) return;

    try {
      const { class: charClass, level, status } = req.body;
      if (!charClass || level == null || !status) {
        return res.status(400).json({ error: 'class, level, and status are required' });
      }
      if (!['Main', 'Alt', 'Bot'].includes(status)) {
        return res.status(400).json({ error: 'Status must be Main, Alt, or Bot' });
      }

      const result = await (await import('../../commands/census/census_functions.js')).declareOrUpdate(
        discordId, status, name, Number(level), charClass,
      );

      // Ensure the user has a DKP row (new members get 5 starter DKP)
      await (await import('../../commands/census/census_functions.js')).insertUser(discordId);

      res.json({ ok: true, name, class: charClass, level: Number(level), status, message: result.message });
    } catch (err: any) {
      const msg = err?.message?.replace(/:x:\s*/g, '') || 'Failed to save character';
      res.status(400).json({ error: msg });
    }
  });

  // Drop a character (set status to 'Dropped')
  app.delete('/api/roster/:discordId/characters/:name', async (req, res) => {
    const { discordId, name } = req.params;
    const access = await requireCharacterAccess(req, res, discordId);
    if (!access) return;

    try {
      const existing = await AppDataSource.manager.findOne(Census, { where: { Name: name, DiscordId: discordId } });
      if (!existing) {
        return res.status(404).json({ error: 'Character not found' });
      }

      // Guard: can't drop last Main
      if (existing.Status === 'Main') {
        const mainCount = await AppDataSource.manager.count(ActiveToons, {
          where: { DiscordId: discordId, Status: 'Main' },
        });
        if (mainCount <= 1) {
          return res.status(400).json({ error: 'Cannot drop your only Main character' });
        }
      }

      existing.Status = 'Dropped';
      existing.Time = new Date();
      await AppDataSource.manager.save(existing);

      res.json({ ok: true, name });
    } catch (err: any) {
      console.error('Failed to drop character:', err);
      res.status(500).json({ error: 'Failed to drop character' });
    }
  });

  // ─── Character Equipment ─────────────────────────────────────────

  const EQUIPMENT_SLOTS = new Set([
    'Ear1', 'Ear2', 'Head', 'Face', 'Neck', 'Shoulders', 'Arms', 'Back',
    'Wrist1', 'Wrist2', 'Range', 'Hands', 'Primary', 'Secondary',
    'Finger1', 'Finger2', 'Chest', 'Legs', 'Feet', 'Waist', 'Ammo',
  ]);

  /** Normalize TSV Location to a canonical base name (e.g. "Fingers" → "Finger"). */
  const SLOT_ALIASES: Record<string, string> = {
    'Fingers': 'Finger',
    'Ears': 'Ear',
    'Wrists': 'Wrist',
  };

  /** Map TSV Location values to canonical slot keys. Duplicate slots get 1/2 suffix. */
  function normalizeSlots(rows: { location: string }[]): Map<number, string> {
    const seen: Record<string, number> = {};
    const DUPLICATE_SLOTS = new Set(['Ear', 'Wrist', 'Finger']);
    const result = new Map<number, string>();

    for (let i = 0; i < rows.length; i++) {
      let loc = rows[i].location.trim();
      // Normalize aliases (Fingers→Finger, Ears→Ear, etc.)
      if (SLOT_ALIASES[loc]) loc = SLOT_ALIASES[loc];
      if (DUPLICATE_SLOTS.has(loc)) {
        seen[loc] = (seen[loc] || 0) + 1;
        result.set(i, `${loc}${seen[loc]}`);
      } else {
        result.set(i, loc);
      }
    }
    return result;
  }

  // Get equipment for a character
  app.get('/api/roster/:discordId/characters/:name/equipment', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const { discordId, name } = req.params;
      const rows = await AppDataSource.manager.find(CharacterEquipment, {
        where: { characterName: name, discordId },
      });

      const enriched = rows.map(r => {
        const meta = r.itemName !== 'Empty' ? getItemMetadata(r.itemName) : undefined;
        return {
          slot: r.slot,
          itemName: r.itemName,
          eqItemId: r.eqItemId,
          iconId: meta?.iconId ?? null,
          statsblock: meta?.statsblock ?? null,
        };
      });

      res.json(enriched);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
      res.status(500).json({ error: 'Failed to fetch equipment' });
    }
  });

  // Import equipment from /outputfile inventory TSV
  app.post('/api/roster/:discordId/characters/:name/equipment', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { discordId, name } = req.params;

    // Owner only
    if (user.id !== discordId) {
      return res.status(403).json({ error: 'Only the character owner can upload equipment' });
    }

    try {
      // Validate character exists
      const toon = await AppDataSource.manager.findOne(ActiveToons, {
        where: { Name: name, DiscordId: discordId },
      });
      if (!toon) {
        return res.status(404).json({ error: 'Character not found' });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required' });
      }

      // Parse TSV
      const lines = content.split('\n').filter((l: string) => l.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: 'File appears to be empty' });
      }

      const header = lines[0].split('\t');
      const colIdx = {
        location: header.findIndex((h: string) => h.trim().toLowerCase() === 'location'),
        name: header.findIndex((h: string) => h.trim().toLowerCase() === 'name'),
        id: header.findIndex((h: string) => h.trim().toLowerCase() === 'id'),
      };

      if (colIdx.location === -1 || colIdx.name === -1) {
        return res.status(400).json({ error: 'Could not find required Location and Name columns' });
      }

      // Parse data rows (equipment slots only)
      const parsed: { location: string; itemName: string; eqItemId: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const loc = (cols[colIdx.location] || '').trim();
        if (!loc) continue;
        parsed.push({
          location: loc,
          itemName: (cols[colIdx.name] || 'Empty').trim(),
          eqItemId: colIdx.id >= 0 ? (cols[colIdx.id] || '0').trim() : '0',
        });
      }

      // Normalize duplicate slot names and filter to equipment slots
      const slotMap = normalizeSlots(parsed);
      const entities: CharacterEquipment[] = [];
      const now = new Date();

      for (let i = 0; i < parsed.length; i++) {
        const slot = slotMap.get(i)!;
        if (!EQUIPMENT_SLOTS.has(slot)) continue;

        const e = new CharacterEquipment();
        e.characterName = name;
        e.discordId = discordId;
        e.slot = slot;
        e.itemName = parsed[i].itemName;
        e.eqItemId = parsed[i].eqItemId;
        e.updatedAt = now;
        entities.push(e);
      }

      if (entities.length === 0) {
        return res.status(400).json({ error: 'No equipment slots found in file' });
      }

      // Atomic replace: delete old + insert new
      await AppDataSource.transaction(async manager => {
        await manager.delete(CharacterEquipment, { characterName: name, discordId });
        await manager.save(entities);
      });

      res.json({ ok: true, count: entities.length });
    } catch (err) {
      console.error('Failed to import equipment:', err);
      res.status(500).json({ error: 'Failed to import equipment' });
    }
  });

  // Search equipment across a member's characters
  app.get('/api/roster/:discordId/equipment/search', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const { discordId } = req.params;
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) {
        return res.json([]);
      }

      const rows = await AppDataSource.getRepository(CharacterEquipment)
        .createQueryBuilder('e')
        .where('e.discord_id = :discordId', { discordId })
        .andWhere('e.item_name ILIKE :q', { q: `%${q}%` })
        .andWhere('e.item_name != :empty', { empty: 'Empty' })
        .orderBy('e.character_name', 'ASC')
        .addOrderBy('e.slot', 'ASC')
        .getMany();

      const results = rows.map(r => {
        const meta = getItemMetadata(r.itemName);
        return {
          characterName: r.characterName,
          slot: r.slot,
          itemName: r.itemName,
          eqItemId: r.eqItemId,
          iconId: meta?.iconId ?? null,
          statsblock: meta?.statsblock ?? null,
        };
      });

      res.json(results);
    } catch (err) {
      console.error('Failed to search equipment:', err);
      res.status(500).json({ error: 'Failed to search equipment' });
    }
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
    if (!gsUser?.hasOfficerAccess) { res.status(403).json({ error: 'Officer access required' }); return null; }
    return { user, gsUser };
  }

  async function requireAdmin(req: express.Request, res: express.Response): Promise<{ user: InteractionUser; gsUser: GuildSpaceUser } | null> {
    const user = await getUser(req);
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return null; }
    const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
    if (!gsUser?.hasAdminAccess) { res.status(403).json({ error: 'Admin access required' }); return null; }
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

  // ─── Raid Template CRUD ────────────────────────────────────────────────

  app.post('/api/raids/templates', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const { name, type, modifier } = req.body;
      if (!name || modifier == null) return res.status(400).json({ error: 'name and modifier are required' });
      const existing = await AppDataSource.manager.findOne(Raids, { where: { Raid: name } });
      if (existing) return res.status(409).json({ error: 'A template with that name already exists' });
      const raid = new Raids();
      raid.Raid = name;
      raid.Type = type || null;
      raid.Modifier = Number(modifier);
      await AppDataSource.manager.save(raid);
      res.json({ name: raid.Raid, type: raid.Type, modifier: Number(raid.Modifier) });
    } catch (err) {
      console.error('Failed to create raid template:', err);
      res.status(500).json({ error: 'Failed to create raid template' });
    }
  });

  app.patch('/api/raids/templates/:name', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const raid = await AppDataSource.manager.findOne(Raids, { where: { Raid: req.params.name } });
      if (!raid) return res.status(404).json({ error: 'Template not found' });
      if (req.body.type !== undefined) raid.Type = req.body.type || null;
      if (req.body.modifier !== undefined) raid.Modifier = Number(req.body.modifier);
      await AppDataSource.manager.save(raid);
      res.json({ name: raid.Raid, type: raid.Type, modifier: Number(raid.Modifier) });
    } catch (err) {
      console.error('Failed to update raid template:', err);
      res.status(500).json({ error: 'Failed to update raid template' });
    }
  });

  app.delete('/api/raids/templates/:name', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const raid = await AppDataSource.manager.findOne(Raids, { where: { Raid: req.params.name } });
      if (!raid) return res.status(404).json({ error: 'Template not found' });
      await AppDataSource.manager.remove(raid);
      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to delete raid template:', err);
      res.status(500).json({ error: 'Failed to delete raid template' });
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
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      // Build attendance matrix data
      const [gsUsers, dkpRows, allToons, lastRaidByName] = await Promise.all([
        AppDataSource.manager.find(GuildSpaceUser),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(ActiveToons),
        fetchLastRaidByName(),
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

      // Build discordId → most-recently-raided class (matches AppShell classMap logic)
      const toonsByDiscord = new Map<string, typeof allToons>();
      for (const t of allToons) {
        let arr = toonsByDiscord.get(t.DiscordId);
        if (!arr) { arr = []; toonsByDiscord.set(t.DiscordId, arr); }
        arr.push(t);
      }

      const members = Array.from(memberMap.entries()).map(([discordId, data]) => {
        const gsUser = gsUserMap.get(discordId);
        const toons = toonsByDiscord.get(discordId);
        const mainToon = toons ? pickMostRecentToon(toons, lastRaidByName) : undefined;
        return {
          discordId,
          displayName: gsUser?.displayName || dkpNameMap.get(discordId) || discordId,
          mainClass: mainToon?.CharacterClass || null,
          callsPresent: data.callsPresent,
          totalDkp: data.totalDkp,
          hasGuildSpace: !!gsUser,
          ...GuildSpaceUser.roleFlags(gsUser),
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
      if (req.body.status === 'active' && event.status === 'closed') {
        event.status = 'active';
        event.closedAt = null;
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
      const maxResult = await AppDataSource.manager
        .createQueryBuilder(RaidCall, 'c')
        .select('COALESCE(MAX(c.sort_order), 0)', 'maxSort')
        .where('c.event_id = :eventId', { eventId })
        .getRawOne() as { maxSort: number };

      const call = new RaidCall();
      call.eventId = eventId;
      call.raidName = raidName;
      call.modifier = mod;
      call.whoLog = whoLog;
      call.createdBy = officer.user.id;
      call.sortOrder = Number(maxResult.maxSort) + 1;
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

  app.patch('/api/raids/events/:id/calls/reorder', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const eventId = parseInt(req.params.id, 10);
      const event = await AppDataSource.manager.findOne(RaidEvent, { where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      if (event.status !== 'active') return res.status(400).json({ error: 'Event is closed' });

      const { callIds } = req.body as { callIds: number[] };
      if (!Array.isArray(callIds) || callIds.length === 0) {
        return res.status(400).json({ error: 'callIds must be a non-empty array' });
      }

      // Validate all IDs belong to this event
      const calls = await AppDataSource.manager.find(RaidCall, { where: { eventId } });
      const callIdSet = new Set(calls.map(c => c.id));
      for (const id of callIds) {
        if (!callIdSet.has(id)) {
          return res.status(400).json({ error: `Call ${id} does not belong to this event` });
        }
      }

      // Update sort_order for each call
      for (let i = 0; i < callIds.length; i++) {
        await AppDataSource.manager.update(RaidCall, callIds[i], { sortOrder: i + 1 });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to reorder calls:', err);
      res.status(500).json({ error: 'Failed to reorder calls' });
    }
  });

  app.patch('/api/raids/events/:id/calls/:callId', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;
    try {
      const callId = parseInt(req.params.callId, 10);
      const eventId = parseInt(req.params.id, 10);
      const call = await AppDataSource.manager.findOne(RaidCall, { where: { id: callId, eventId } });
      if (!call) return res.status(404).json({ error: 'Call not found' });

      const { raidName, modifier } = req.body;
      const newModifier = modifier !== undefined ? Number(modifier) : call.modifier;
      const newRaidName = raidName !== undefined ? String(raidName) : call.raidName;

      if (modifier !== undefined && isNaN(newModifier)) {
        return res.status(400).json({ error: 'modifier must be a number' });
      }

      const delta = newModifier - call.modifier;

      // Get linked attendance records
      const links = await AppDataSource.manager.find(RaidCallAttendance, { where: { callId } });

      if (links.length > 0) {
        const attIds = links.map(l => l.attendanceId);

        // Apply DKP delta if modifier changed
        if (delta !== 0) {
          const attendanceRows = await AppDataSource.manager
            .createQueryBuilder()
            .select(['a.discord_id as "discordId"'])
            .from(Attendance, 'a')
            .where('a.id IN (:...attIds)', { attIds })
            .getRawMany() as { discordId: string }[];

          const uniqueDiscordIds = [...new Set(attendanceRows.map(r => r.discordId))];

          for (const discordId of uniqueDiscordIds) {
            await AppDataSource.manager
              .createQueryBuilder()
              .update(Dkp)
              .set({ EarnedDkp: () => `earned_dkp + ${delta}` })
              .where('discord_id = :discordId', { discordId })
              .execute();
          }
        }

        // Update attendance snapshot rows
        const updateFields: Record<string, string> = {};
        if (raidName !== undefined) updateFields['Raid'] = newRaidName;
        if (modifier !== undefined) updateFields['Modifier'] = String(newModifier);

        if (Object.keys(updateFields).length > 0) {
          await AppDataSource.manager
            .createQueryBuilder()
            .update(Attendance)
            .set(updateFields as any)
            .where('id IN (:...attIds)', { attIds })
            .execute();
        }
      }

      // Update the call record
      call.raidName = newRaidName;
      call.modifier = newModifier;
      await AppDataSource.manager.save(call);

      res.json({ ok: true, raidName: call.raidName, modifier: call.modifier });
    } catch (err) {
      console.error('Failed to edit raid call:', err);
      res.status(500).json({ error: 'Failed to edit call' });
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

  // ─── Bank ───────────────────────────────────────────────────────────

  app.get('/api/bank', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      // Fetch trash item names to exclude
      const trashRows = await AppDataSource.manager.find(Trash);
      const trashNames = trashRows.map(t => t.Name).filter((n): n is string => n != null);

      // Fetch bank items, excluding trash
      const bankRows = await AppDataSource.manager.find(Bank, {
        where: trashNames.length > 0 ? { Name: Not(In(trashNames)) } : undefined,
        order: { Name: 'ASC' },
      });

      // Aggregate by item name
      const grouped = new Map<string, { totalQuantity: number; bankers: Set<string>; slots: { banker: string; location: string; quantity: number }[] }>();
      for (const row of bankRows) {
        let entry = grouped.get(row.Name);
        if (!entry) {
          entry = { totalQuantity: 0, bankers: new Set(), slots: [] };
          grouped.set(row.Name, entry);
        }
        const qty = Number(row.Quantity);
        entry.totalQuantity += qty;
        entry.bankers.add(row.Banker);
        entry.slots.push({ banker: row.Banker, location: row.Location, quantity: qty });
      }

      const availableClassesSet = new Set<string>();
      const availableRacesSet = new Set<string>();

      const items = Array.from(grouped.entries()).map(([name, entry]) => {
        const meta = getItemMetadata(name);
        if (meta) {
          for (const c of meta.classes) availableClassesSet.add(c);
          for (const r of meta.races) availableRacesSet.add(r);
        }
        return {
          name,
          totalQuantity: entry.totalQuantity,
          bankers: [...entry.bankers],
          slots: entry.slots,
          iconId: meta?.iconId ?? null,
          classes: meta?.classes ?? [],
          races: meta?.races ?? [],
          statsblock: meta?.statsblock ?? null,
        };
      });

      res.json({
        items,
        availableClasses: [...availableClassesSet].sort(),
        availableRaces: [...availableRacesSet].sort(),
      });
    } catch (err) {
      console.error('Failed to fetch bank inventory:', err);
      res.status(500).json({ error: 'Failed to fetch bank inventory' });
    }
  });

  // ─── Bank Import ───────────────────────────────────────────────────

  app.post('/api/bank/import', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;

    try {
      const { filename, content } = req.body;
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content are required' });
      }

      // Extract banker name from filename (e.g. "Earanger-Inventory.txt" → "Earanger")
      const bankerName = filename.split('.')[0].split('-')[0];
      if (!bankerName) {
        return res.status(400).json({ error: 'Could not determine banker name from filename' });
      }

      // Parse TSV content
      const lines = content.split('\n').filter((l: string) => l.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: 'File appears to be empty or has no data rows' });
      }

      // First line is header: Location\tName\tID\tCount\tSlots
      const header = lines[0].split('\t');
      const colIdx = {
        location: header.findIndex((h: string) => h.trim().toLowerCase() === 'location'),
        name: header.findIndex((h: string) => h.trim().toLowerCase() === 'name'),
        id: header.findIndex((h: string) => h.trim().toLowerCase() === 'id'),
        count: header.findIndex((h: string) => h.trim().toLowerCase() === 'count'),
        slots: header.findIndex((h: string) => h.trim().toLowerCase() === 'slots'),
      };

      if (colIdx.name === -1 || colIdx.count === -1) {
        return res.status(400).json({ error: 'Could not find required Name and Count columns in TSV' });
      }

      const now = new Date();
      const newEntities: Bank[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (!cols[colIdx.name]?.trim()) continue;

        const entity = new Bank();
        entity.Banker = bankerName;
        entity.Location = colIdx.location >= 0 ? (cols[colIdx.location] || '') : '';
        entity.Name = cols[colIdx.name].trim();
        entity.EqItemId = colIdx.id >= 0 ? (cols[colIdx.id] || '0') : '0';
        entity.Quantity = parseInt(cols[colIdx.count] || '1', 10) || 1;
        entity.Slots = colIdx.slots >= 0 ? (cols[colIdx.slots] || '0') : '0';
        entity.Time = now;
        newEntities.push(entity);
      }

      if (newEntities.length === 0) {
        return res.status(400).json({ error: 'No valid items found in file' });
      }

      // Fetch trash list and old inventory in parallel
      const [trashRows, oldRows] = await Promise.all([
        AppDataSource.manager.find(Trash),
        AppDataSource.manager.find(Bank, { where: { Banker: bankerName } }),
      ]);
      const trashNames = new Set(trashRows.map(t => t.Name).filter((n): n is string => n != null));

      const oldByName = new Map<string, number>();
      for (const row of oldRows) {
        if (trashNames.has(row.Name)) continue;
        oldByName.set(row.Name, (oldByName.get(row.Name) || 0) + Number(row.Quantity));
      }

      // Aggregate new by name (excluding trash)
      const newByName = new Map<string, number>();
      for (const e of newEntities) {
        if (trashNames.has(e.Name)) continue;
        newByName.set(e.Name, (newByName.get(e.Name) || 0) + e.Quantity);
      }

      // Compute diff (trash items excluded from both sides)
      const added: { name: string; quantity: number }[] = [];
      const removed: { name: string; quantity: number }[] = [];
      const changed: { name: string; oldQuantity: number; newQuantity: number }[] = [];

      for (const [name, qty] of newByName) {
        const oldQty = oldByName.get(name);
        if (oldQty === undefined) {
          added.push({ name, quantity: qty });
        } else if (oldQty !== qty) {
          changed.push({ name, oldQuantity: oldQty, newQuantity: qty });
        }
      }
      for (const [name, qty] of oldByName) {
        if (!newByName.has(name)) {
          removed.push({ name, quantity: qty });
        }
      }

      // Delete old, insert new
      await AppDataSource.manager.delete(Bank, { Banker: bankerName });
      await AppDataSource.manager.save(newEntities);

      // Save import record
      const importRecord = new BankImport();
      importRecord.banker = bankerName;
      importRecord.uploadedBy = officer.user.id;
      importRecord.uploadedByName = officer.user.displayName || officer.user.username;
      importRecord.itemCount = newEntities.length;
      importRecord.diff = { added, removed, changed };
      const saved = await AppDataSource.manager.save(importRecord);

      res.json({
        banker: bankerName,
        inserted: newEntities.length,
        diff: { added: added.length, removed: removed.length, changed: changed.length },
        importId: saved.id,
      });
    } catch (err) {
      console.error('Failed to import bank inventory:', err);
      res.status(500).json({ error: 'Failed to import bank inventory' });
    }
  });

  app.get('/api/bank/history', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const history = await AppDataSource.manager.find(BankImport, {
        order: { createdAt: 'DESC' },
        take: 50,
      });
      res.json(history);
    } catch (err) {
      console.error('Failed to fetch bank history:', err);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
  });

  app.get('/api/bank/:banker/history', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const { banker } = req.params;
      const history = await AppDataSource.manager.find(BankImport, {
        where: { banker },
        order: { createdAt: 'DESC' },
        take: 20,
      });
      res.json(history);
    } catch (err) {
      console.error('Failed to fetch bank import history:', err);
      res.status(500).json({ error: 'Failed to fetch import history' });
    }
  });

  // ─── Bank Import Squash ────────────────────────────────────────────

  app.post('/api/bank/history/:id/squash', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;

    try {
      const targetId = req.params.id;

      const target = await AppDataSource.manager.findOne(BankImport, {
        where: { id: targetId },
      });
      if (!target) return res.status(404).json({ error: 'Record not found' });

      const older = await AppDataSource.manager
        .createQueryBuilder(BankImport, 'bi')
        .where('bi.banker = :banker AND bi.id < :id', {
          banker: target.banker,
          id: targetId,
        })
        .orderBy('bi.id', 'DESC')
        .limit(1)
        .getOne();

      if (!older) {
        return res.status(400).json({ error: 'No previous import to squash with' });
      }

      // Compose diffs: older (A→B) + target (B→C) = net (A→C)
      const diff1 = older.diff;
      const diff2 = target.diff;

      const netAdded = new Map<string, number>();
      const netRemoved = new Map<string, number>();
      const netChanged = new Map<string, { oldQuantity: number; newQuantity: number }>();

      // Process diff1 (A→B)
      for (const item of diff1.added) {
        const d2removed = diff2.removed.find(r => r.name === item.name);
        const d2changed = diff2.changed.find(c => c.name === item.name);
        if (d2removed) {
          // added then removed → cancel out
        } else if (d2changed) {
          // added then changed → net added with C's quantity
          netAdded.set(item.name, d2changed.newQuantity);
        } else {
          // added, untouched in diff2 → stays added
          netAdded.set(item.name, item.quantity);
        }
      }

      for (const item of diff1.removed) {
        const d2added = diff2.added.find(a => a.name === item.name);
        if (d2added) {
          if (d2added.quantity === item.quantity) {
            // removed then added back same qty → cancel out
          } else {
            // removed then added back diff qty → net changed
            netChanged.set(item.name, {
              oldQuantity: item.quantity,
              newQuantity: d2added.quantity,
            });
          }
        } else {
          // removed, untouched in diff2 → stays removed
          netRemoved.set(item.name, item.quantity);
        }
      }

      for (const item of diff1.changed) {
        const d2removed = diff2.removed.find(r => r.name === item.name);
        const d2changed = diff2.changed.find(c => c.name === item.name);
        if (d2removed) {
          // changed then removed → net removed with A's original qty
          netRemoved.set(item.name, item.oldQuantity);
        } else if (d2changed) {
          // changed then changed → A's old → C's new (cancel if equal)
          if (item.oldQuantity !== d2changed.newQuantity) {
            netChanged.set(item.name, {
              oldQuantity: item.oldQuantity,
              newQuantity: d2changed.newQuantity,
            });
          }
        } else {
          // changed, untouched in diff2 → stays changed
          netChanged.set(item.name, {
            oldQuantity: item.oldQuantity,
            newQuantity: item.newQuantity,
          });
        }
      }

      // Process diff2 items not already handled (items only in diff2)
      const d1names = new Set([
        ...diff1.added.map(i => i.name),
        ...diff1.removed.map(i => i.name),
        ...diff1.changed.map(i => i.name),
      ]);

      for (const item of diff2.added) {
        if (!d1names.has(item.name)) netAdded.set(item.name, item.quantity);
      }
      for (const item of diff2.removed) {
        if (!d1names.has(item.name)) netRemoved.set(item.name, item.quantity);
      }
      for (const item of diff2.changed) {
        if (!d1names.has(item.name)) {
          netChanged.set(item.name, {
            oldQuantity: item.oldQuantity,
            newQuantity: item.newQuantity,
          });
        }
      }

      const composedDiff = {
        added: Array.from(netAdded.entries()).map(([name, quantity]) => ({ name, quantity })),
        removed: Array.from(netRemoved.entries()).map(([name, quantity]) => ({ name, quantity })),
        changed: Array.from(netChanged.entries()).map(([name, { oldQuantity, newQuantity }]) => ({
          name,
          oldQuantity,
          newQuantity,
        })),
      };

      target.diff = composedDiff;
      await AppDataSource.manager.save(target);
      await AppDataSource.manager.delete(BankImport, { id: older.id });

      res.json(target);
    } catch (err) {
      console.error('Failed to squash bank imports:', err);
      res.status(500).json({ error: 'Failed to squash imports' });
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

  // ─── Chat Channels ─────────────────────────────────────────────────

  /** Compute a user's role string from their GuildSpaceUser record. */
  function getUserRole(gsUser: GuildSpaceUser | null): string {
    if (!gsUser) return 'member';
    if (gsUser.isOwner) return 'owner';
    if (gsUser.hasAdminAccess) return 'admin';
    if (gsUser.hasOfficerAccess) return 'officer';
    return 'member';
  }

  app.get('/api/chat/channels', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
      const role = getUserRole(gsUser);
      const channels = await AppDataSource.manager.find(ChatChannel, { order: { createdAt: 'ASC' } });
      const accessible = channels.filter(ch => meetsMinRole(role, ch.minRole));
      res.json(accessible);
    } catch (err) {
      console.error('Failed to fetch chat channels:', err);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  app.post('/api/chat/channels', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;

    try {
      const { name, displayName, minRole } = req.body;
      if (!name || !displayName) {
        return res.status(400).json({ error: 'name and displayName are required' });
      }

      const slug = String(name).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!slug || slug.length < 2 || slug.length > 32) {
        return res.status(400).json({ error: 'Channel name must be 2-32 lowercase alphanumeric characters' });
      }

      const role = minRole && RANK_MAP[minRole] !== undefined ? minRole : 'member';

      const existing = await AppDataSource.manager.findOne(ChatChannel, { where: { name: slug } });
      if (existing) {
        return res.status(409).json({ error: 'A channel with that name already exists' });
      }

      const channel = new ChatChannel();
      channel.name = slug;
      channel.displayName = String(displayName).trim();
      channel.minRole = role;
      channel.createdBy = officer.user.id;
      const saved = await AppDataSource.manager.save(channel);
      res.json(saved);
    } catch (err) {
      console.error('Failed to create chat channel:', err);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  app.delete('/api/chat/channels/:name', async (req, res) => {
    const officer = await requireOfficer(req, res);
    if (!officer) return;

    try {
      const { name } = req.params;
      if (name === 'general') {
        return res.status(403).json({ error: 'Cannot delete the General channel' });
      }

      const channel = await AppDataSource.manager.findOne(ChatChannel, { where: { name } });
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Delete associated messages
      await AppDataSource.manager.delete(ChatMessage, { channel: name });
      await AppDataSource.manager.remove(channel);
      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to delete chat channel:', err);
      res.status(500).json({ error: 'Failed to delete channel' });
    }
  });

  // ─── DM Threads ────────────────────────────────────────────────────

  app.get('/api/chat/dm-threads', async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    try {
      // Find distinct DM channels this user participates in
      const dmRows = await AppDataSource.manager
        .createQueryBuilder(ChatMessage, 'cm')
        .select('cm.channel', 'channel')
        .addSelect('MAX(cm.created_at)', 'lastAt')
        .where('cm.channel LIKE :p1 OR cm.channel LIKE :p2', {
          p1: `dm:${user.id}:%`,
          p2: `dm:%:${user.id}`,
        })
        .groupBy('cm.channel')
        .orderBy('MAX(cm.created_at)', 'DESC')
        .getRawMany<{ channel: string; lastAt: string }>();

      if (dmRows.length === 0) return res.json([]);

      // For each thread, get latest message + other user's displayName
      const threads = await Promise.all(dmRows.map(async (row) => {
        const parts = dmParticipants(row.channel);
        if (!parts) return null;
        const otherId = parts[0] === user.id ? parts[1] : parts[0];

        const [lastMsg, otherUser] = await Promise.all([
          AppDataSource.manager.findOne(ChatMessage, {
            where: { channel: row.channel },
            order: { createdAt: 'DESC' },
          }),
          AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: otherId } }),
        ]);

        return {
          channel: row.channel,
          otherUserId: otherId,
          otherDisplayName: otherUser?.displayName || otherId,
          lastMessage: lastMsg ? decryptDmContent(lastMsg.content) : '',
          lastMessageAt: lastMsg?.createdAt?.toISOString() || row.lastAt,
        };
      }));

      res.json(threads.filter(Boolean));
    } catch (err) {
      console.error('Failed to fetch DM threads:', err);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // ─── Online Presence Tracking ──────────────────────────────────────

  const onlineUsers = new Map<string, number>(); // discordId → connection count
  const userSockets = new Map<string, Set<import('socket.io').Socket>>(); // discordId → sockets

  async function fetchTotalMemberCount(): Promise<number> {
    const result = await AppDataSource.getRepository(ActiveToons)
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.DiscordId)', 'count')
      .getRawOne<{ count: string }>();
    return Number(result?.count ?? 0);
  }

  async function emitPresenceUpdate() {
    const onlineIds = Array.from(onlineUsers.keys());
    let totalMembers = 0;
    try {
      totalMembers = await fetchTotalMemberCount();
    } catch { /* ignore */ }
    io.emit('presenceUpdate', {
      onlineCount: onlineIds.length,
      onlineIds,
      totalMembers,
    });
  }

  // ─── WebSocket ─────────────────────────────────────────────────────

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

        // Join all accessible channel rooms
        try {
          const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: user.id } });
          const role = getUserRole(gsUser);
          const channels = await AppDataSource.manager.find(ChatChannel, { order: { createdAt: 'ASC' } });
          for (const ch of channels) {
            if (meetsMinRole(role, ch.minRole)) {
              socket.join(`channel:${ch.name}`);
            }
          }
        } catch {
          // Fallback: at least join general
          socket.join('channel:general');
        }

        // Auto-join DM rooms this user participates in
        try {
          const dmRows = await AppDataSource.manager
            .createQueryBuilder(ChatMessage, 'cm')
            .select('DISTINCT cm.channel', 'channel')
            .where('cm.channel LIKE :p1 OR cm.channel LIKE :p2', {
              p1: `dm:${user.id}:%`,
              p2: `dm:%:${user.id}`,
            })
            .getRawMany<{ channel: string }>();
          for (const row of dmRows) {
            socket.join(`channel:${row.channel}`);
          }
        } catch { /* ignore */ }

        // Track user → socket mapping for DM delivery
        let sockets = userSockets.get(user.id);
        if (!sockets) { sockets = new Set(); userSockets.set(user.id, sockets); }
        sockets.add(socket);

        socket.emit('authOk', user);

        // Track online presence
        const prev = onlineUsers.get(user.id) ?? 0;
        onlineUsers.set(user.id, prev + 1);
        if (prev === 0) {
          // New unique user — broadcast to everyone
          emitPresenceUpdate();
        } else {
          // Already tracked (reconnect or second tab) — send current state to this socket only
          const onlineIds = Array.from(onlineUsers.keys());
          let currentTotalMembers = 0;
          try {
            currentTotalMembers = await fetchTotalMemberCount();
          } catch { /* ignore */ }
          socket.emit('presenceUpdate', {
            onlineCount: onlineIds.length,
            onlineIds,
            totalMembers: currentTotalMembers,
          });
        }

        // Send recent chat history for general channel
        try {
          const history = await AppDataSource.manager.find(ChatMessage, {
            where: { channel: 'general' },
            order: { createdAt: 'ASC' },
            take: 100,
          });
          socket.emit('chatHistory', { channel: 'general', messages: history });
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      } else {
        socket.emit('authError', { error: 'Invalid token' });
      }
    });

    // ─── Chat Messages ──────────────────────────────────────────────

    socket.on('requestChannelHistory', async (data: { channel: string }) => {
      if (!sessionUser) return;
      const channelName = data.channel;
      if (!channelName) return;

      try {
        if (isDmChannel(channelName)) {
          // DM channel: verify sender is a participant
          const parts = dmParticipants(channelName);
          if (!parts || !parts.includes(sessionUser.id)) return;

          const history = await AppDataSource.manager.find(ChatMessage, {
            where: { channel: channelName },
            order: { createdAt: 'ASC' },
            take: 100,
          });
          history.forEach(m => { m.content = decryptDmContent(m.content); });
          socket.emit('chatHistory', { channel: channelName, messages: history });
          return;
        }

        // Validate channel exists and user has access
        const channel = await AppDataSource.manager.findOne(ChatChannel, { where: { name: channelName } });
        if (!channel) return;
        const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: sessionUser.id } });
        const role = getUserRole(gsUser);
        if (!meetsMinRole(role, channel.minRole)) return;

        const history = await AppDataSource.manager.find(ChatMessage, {
          where: { channel: channelName },
          order: { createdAt: 'ASC' },
          take: 100,
        });
        socket.emit('chatHistory', { channel: channelName, messages: history });
      } catch (err) {
        console.error('Failed to load channel history:', err);
      }
    });

    socket.on('chatMessage', async (data: { content: string; channel?: string }) => {
      if (!sessionUser) return;
      const content = data.content?.trim();
      if (!content) return;

      const channelName = data.channel || 'general';

      if (isDmChannel(channelName)) {
        // DM channel: verify sender is a participant and other user exists
        const parts = dmParticipants(channelName);
        if (!parts || !parts.includes(sessionUser.id)) return;
        const otherId = parts[0] === sessionUser.id ? parts[1] : parts[0];

        try {
          const other = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: otherId } });
          if (!other) return;

          const msg = new ChatMessage();
          msg.channel = channelName;
          msg.userId = sessionUser.id;
          msg.displayName = sessionUser.displayName || sessionUser.username;
          msg.content = encryptDmContent(content);
          const saved = await AppDataSource.manager.save(msg);
          saved.content = content; // emit plaintext to sockets

          // Ensure both participants' sockets are in the room
          const roomName = `channel:${channelName}`;
          socket.join(roomName);
          const otherSockets = userSockets.get(otherId);
          if (otherSockets) {
            for (const s of otherSockets) s.join(roomName);
          }

          io.to(roomName).emit('newMessage', saved);
        } catch (err) {
          console.error('Failed to save DM:', err);
        }
        return;
      }

      // Validate channel exists and user has access
      try {
        const channel = await AppDataSource.manager.findOne(ChatChannel, { where: { name: channelName } });
        if (!channel) return;
        const gsUser = await AppDataSource.manager.findOne(GuildSpaceUser, { where: { discordId: sessionUser.id } });
        const role = getUserRole(gsUser);
        if (!meetsMinRole(role, channel.minRole)) return;
      } catch {
        return;
      }

      const msg = new ChatMessage();
      msg.channel = channelName;
      msg.userId = sessionUser.id;
      msg.displayName = sessionUser.displayName || sessionUser.username;
      msg.content = content;

      try {
        const saved = await AppDataSource.manager.save(msg);
        io.to(`channel:${channelName}`).emit('newMessage', saved);
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

        // Clean up socket tracking
        const sockets = userSockets.get(sessionUser.id);
        if (sockets) {
          sockets.delete(socket);
          if (sockets.size === 0) userSockets.delete(sessionUser.id);
        }
      }
      sessionUser = null;
    });
  });

  // ─── SPA Fallback ───────────────────────────────────────────────────
  // Serve index.html for all non-API routes (client-side routing)
  const indexPath = path.join(staticDir, 'index.html');
  app.get('*', (_req, res) => {
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Client build not found');
    }
  });

  // ─── Start ─────────────────────────────────────────────────────────

  function start() {
    server.listen(port, () => {
      console.log(`\n  🏰 GuildSpace running at http://localhost:${port}\n`);
    });
    return server;
  }

  return { app, server, io, start, sessions };
}
