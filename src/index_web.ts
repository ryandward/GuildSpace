/**
 * Web platform entry point.
 *
 * Replaces the Discord bot's index.ts. Same startup sequence:
 * 1. Initialize PostgreSQL via TypeORM
 * 2. Run SQL migrations
 * 3. Start web server
 *
 * @module
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDataSource, AppDataSource } from './app_data.js';
import { createWebServer } from './platform/web/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Database ────────────────────────────────────────────────────────────────
await initializeDataSource();
console.log('📦 Database connected');

// Run migrations
const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await AppDataSource.query(sql);
    console.log(`  🔧 ${file}`);
  }
}

// ─── Start Server ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000');
const { start } = createWebServer({ port });
start();
