#!/usr/bin/env node
/**
 * Import simulated game data into PocketBase.
 *
 * Usage:
 *   node sample_data/import.js <POCKETBASE_URL> <ADMIN_EMAIL> <ADMIN_PASSWORD>
 *
 * Examples:
 *   node sample_data/import.js http://localhost:8090 admin@example.com secret
 *   node sample_data/import.js https://your-app.cloudron.net/_pb admin@example.com secret
 *
 * The script will:
 *   1. Authenticate as a PocketBase superuser/admin
 *   2. Import the game record from games_import.json
 *   3. Import all 65 plate appearance records from plate_appearances_import.json
 *
 * To delete and re-import, delete the records via the PocketBase admin UI first,
 * or run: node sample_data/import.js ... --delete-first
 */

const path = require('path');
const fs = require('fs');

const [, , pbUrl, email, password, ...flags] = process.argv;
const deleteFirst = flags.includes('--delete-first');

if (!pbUrl || !email || !password) {
  console.error('Usage: node import.js <POCKETBASE_URL> <ADMIN_EMAIL> <ADMIN_PASSWORD> [--delete-first]');
  process.exit(1);
}

const baseUrl = pbUrl.replace(/\/_pb\/?$/, '').replace(/\/$/, '');
const apiBase = `${baseUrl}/_pb/api`;

const games = JSON.parse(fs.readFileSync(path.join(__dirname, 'games_import.json'), 'utf8'));
const plateAppearances = JSON.parse(fs.readFileSync(path.join(__dirname, 'plate_appearances_import.json'), 'utf8'));

async function authenticate() {
  // Try superusers endpoint (PocketBase v0.23+), then legacy admins endpoint
  for (const endpoint of ['/collections/_superusers/auth-with-password', '/admins/auth-with-password']) {
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Authenticated via ${endpoint}`);
      return data.token;
    }
  }
  throw new Error('Authentication failed — check URL, email, and password');
}

async function deleteRecord(collection, id, token) {
  const res = await fetch(`${apiBase}/collections/${collection}/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`  Warning: DELETE ${collection}/${id} returned ${res.status}`);
  }
}

async function importRecord(collection, record, token) {
  // PocketBase JSON-type fields must be sent as serialized JSON strings via the REST API.
  // Other field values are sent as-is.
  const payload = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      payload[key] = JSON.stringify(value);
    } else {
      payload[key] = value;
    }
  }

  const res = await fetch(`${apiBase}/collections/${collection}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

async function main() {
  console.log(`PocketBase URL: ${apiBase}`);
  const token = await authenticate();

  if (deleteFirst) {
    console.log('\nDeleting existing records (--delete-first)...');
    for (const pa of plateAppearances) {
      await deleteRecord('plate_appearances', pa.id, token);
    }
    for (const game of games) {
      await deleteRecord('games', game.id, token);
    }
    console.log('Existing records removed.');
  }

  console.log(`\nImporting ${games.length} game(s)...`);
  let gameOk = 0;
  for (const game of games) {
    try {
      await importRecord('games', game, token);
      console.log(`  ✓ ${game.id}  (${game.home_team} vs ${game.away_team})`);
      gameOk++;
    } catch (err) {
      console.error(`  ✗ ${game.id}: ${err.message}`);
    }
  }

  console.log(`\nImporting ${plateAppearances.length} plate appearance(s)...`);
  let paOk = 0;
  for (const pa of plateAppearances) {
    try {
      await importRecord('plate_appearances', pa, token);
      process.stdout.write('.');
      paOk++;
    } catch (err) {
      console.error(`\n  ✗ ${pa.id} (I${pa.inning} ${pa.is_top_inning ? 'Top' : 'Bot'} ${pa.batter_name}): ${err.message}`);
    }
  }

  console.log(`\n\nDone. Games: ${gameOk}/${games.length}, Plate appearances: ${paOk}/${plateAppearances.length}`);

  if (gameOk < games.length || paOk < plateAppearances.length) {
    console.log('\nTip: If records already exist, re-run with --delete-first to replace them.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
