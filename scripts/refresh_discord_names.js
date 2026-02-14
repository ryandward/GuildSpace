#!/usr/bin/env node

/**
 * Two-step refresh of Discord names from Ex Astra guild member list.
 *
 * Uses the bulk guild members endpoint (1000 per page) to get server
 * nicknames. Prioritizes: nick > global_name > username.
 *
 * Step 1 — Fetch all guild members, match to DKP, save JSON:
 *   DISCORD_TOKEN=bot_token node scripts/refresh_discord_names.js --fetch
 *
 * Step 2 — Review the JSON, then apply:
 *   node scripts/refresh_discord_names.js --apply
 */

import 'dotenv/config';
import pg from 'pg';
import { readFileSync, writeFileSync } from 'fs';

const GUILD_ID = '838976035575562293';
const OUTPUT_FILE = 'scripts/discord_name_changes.json';

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: process.env.PGHOST?.includes('rlwy.net') ? { rejectUnauthorized: false } : undefined,
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchAllGuildMembers(botToken) {
  const members = [];
  let after = '0';

  while (true) {
    console.log(`  Fetching members after ${after}...`);
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after') || 5);
      console.log(`  Rate limited, waiting ${retry}s...`);
      await sleep(retry * 1000);
      continue;
    }

    if (!res.ok) {
      console.error(`  Discord API error: ${res.status} ${res.statusText}`);
      break;
    }

    const batch = await res.json();
    if (!batch.length) break;

    for (const m of batch) {
      const bestName = m.nick || m.user.global_name || m.user.username;
      members.push({
        discord_id: m.user.id,
        username: m.user.username,
        global_name: m.user.global_name,
        nick: m.nick,
        best_name: bestName,
      });
      console.log(`    ${m.user.id}  ${bestName}${m.nick ? ' (nick)' : m.user.global_name ? ' (global)' : ' (username)'}`);
    }

    console.log(`  Got ${batch.length} members (${members.length} total)`);

    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
    await sleep(3000);
  }

  return members;
}

async function fetchStep() {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error('Missing DISCORD_TOKEN env var');
    process.exit(1);
  }

  console.log('Fetching all guild members from Discord...\n');
  const guildMembers = await fetchAllGuildMembers(botToken);
  console.log(`\nFetched ${guildMembers.length} guild members total\n`);

  // Build lookup
  const discordLookup = new Map();
  for (const m of guildMembers) {
    discordLookup.set(m.discord_id, m);
  }

  // Get all DKP entries
  const { rows: dkpRows } = await pool.query(
    'SELECT DISTINCT discord_id, discord_name FROM dkp WHERE discord_id IS NOT NULL ORDER BY discord_id'
  );
  console.log(`Found ${dkpRows.length} unique discord IDs in DKP table\n`);

  const changes = [];
  let skipped = 0;
  let notInGuild = 0;

  for (const row of dkpRows) {
    const member = discordLookup.get(row.discord_id);
    if (!member) {
      notInGuild++;
      continue;
    }

    if (row.discord_name === member.best_name) {
      skipped++;
      continue;
    }

    changes.push({
      discord_id: row.discord_id,
      old_name: row.discord_name,
      new_name: member.best_name,
      source: member.nick ? 'nick' : member.global_name ? 'global_name' : 'username',
    });

    console.log(`  ${row.discord_id}: "${row.discord_name}" → "${member.best_name}" (${member.nick ? 'nick' : member.global_name ? 'global' : 'username'})`);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(changes, null, 2) + '\n');
  console.log(`\n${changes.length} changes saved to ${OUTPUT_FILE}`);
  console.log(`${skipped} already correct, ${notInGuild} not in guild`);
  if (changes.length > 0) {
    console.log(`\nReview the file, delete any rows you don't want, then run:`);
    console.log(`  node scripts/refresh_discord_names.js --apply`);
  }

  await pool.end();
}

async function applyStep() {
  let changes;
  try {
    changes = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
  } catch {
    console.error(`Could not read ${OUTPUT_FILE} — run --fetch first`);
    process.exit(1);
  }

  if (!changes.length) {
    console.log('No changes to apply.');
    await pool.end();
    return;
  }

  console.log(`Applying ${changes.length} changes to DKP table...\n`);

  for (const c of changes) {
    await pool.query(
      'UPDATE dkp SET discord_name = $1 WHERE discord_id = $2',
      [c.new_name, c.discord_id]
    );
    console.log(`  ${c.discord_id}: "${c.old_name}" → "${c.new_name}"`);
  }

  console.log(`\nDone. ${changes.length} DKP entries updated.`);
  await pool.end();
}

const mode = process.argv[2];
if (mode === '--fetch') {
  fetchStep().catch(err => { console.error(err); process.exit(1); });
} else if (mode === '--apply') {
  applyStep().catch(err => { console.error(err); process.exit(1); });
} else {
  console.log('Usage:');
  console.log('  DISCORD_TOKEN=bot_token node scripts/refresh_discord_names.js --fetch');
  console.log('  # review scripts/discord_name_changes.json');
  console.log('  node scripts/refresh_discord_names.js --apply');
}
