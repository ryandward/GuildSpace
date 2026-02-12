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
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      discordUsername: user.discordUsername,
      needsSetup: user.needsSetup || false,
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
      const [toons, dkpRows, gsUsers] = await Promise.all([
        AppDataSource.manager.find(ActiveToons),
        AppDataSource.manager.find(Dkp),
        AppDataSource.manager.find(GuildSpaceUser),
      ]);

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
