/**
 * Triggers a full fixture sync from football-data.org without starting the HTTP server.
 * Usage: RUN_SYNC_ONLY=1 node server.js
 * Or:    node repair_sync.js
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(process.execPath, ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, RUN_SYNC_ONLY: '1' },
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
