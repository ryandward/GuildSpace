/**
 * Web platform entry point.
 *
 * Replaces the Discord bot's index.ts. Same startup sequence:
 * 1. Initialize PostgreSQL via TypeORM
 * 2. Load command modules
 * 3. Start web server (instead of Discord gateway)
 *
 * @module
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDataSource } from './app_data.js';
import { createWebServer } from './platform/web/server.js';
import type { PlatformCommand } from './platform/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Database ────────────────────────────────────────────────────────────────
await initializeDataSource();
console.log('📦 Database connected');

// ─── Load Commands ───────────────────────────────────────────────────────────
const commands = new Map<string, PlatformCommand>();

// Load from commands_web/ (converted commands)
const webCommandsPath = path.join(__dirname, 'commands_web');
if (fs.existsSync(webCommandsPath)) {
  const folders = fs.readdirSync(webCommandsPath);
  for (const folder of folders) {
    const folderPath = path.join(webCommandsPath, folder);
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const mod = await import(path.join(folderPath, file));
        if ('data' in mod && 'execute' in mod) {
          const name = mod.data.name;
          commands.set(name, mod);
          console.log(`  ✅ /${name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️  Failed to load ${folder}/${file}:`, (err as Error).message);
      }
    }
  }
}

console.log(`\n📋 ${commands.size} commands loaded`);

// ─── Start Server ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000');
const { start } = createWebServer({ port, commands });
start();
