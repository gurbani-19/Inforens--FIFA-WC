/**
 * One-off repair: remove orphan seed fixtures, then run full API sync + settlement.
 */
require('dotenv').config();
const { Match, Prediction, ScorePrediction } = require('./models');
const sequelize = require('./config/db');

async function removeOrphanSeedMatches() {
  let removed = 0;

  // Seed duplicate: Australia vs Türkiye (fake apiMatchId 1006); API fixture is local #13 Australia vs Turkey
  const orphan = await Match.findOne({ where: { apiMatchId: '1006' } });
  if (orphan) {
    console.log(`[REPAIR] Deleting orphan match #${orphan.id}: ${orphan.teamA} vs ${orphan.teamB}`);
    await Prediction.destroy({ where: { matchId: orphan.id } });
    await ScorePrediction.destroy({ where: { matchId: orphan.id } });
    await orphan.destroy();
    removed += 1;
  }

  return removed;
}

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();
  const removed = await removeOrphanSeedMatches();
  console.log(`[REPAIR] Removed ${removed} orphan fixture(s).`);
  await sequelize.close();

  const { spawnSync } = require('child_process');
  const result = spawnSync(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, RUN_SYNC_ONLY: '1' },
    stdio: 'inherit'
  });
  process.exit(result.status ?? 1);
}

main().catch(err => {
  console.error('[REPAIR] Failed:', err);
  process.exit(1);
});
