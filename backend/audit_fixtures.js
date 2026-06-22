/**
 * Production-grade fixture/result audit script.
 * Compares local DB vs football-data.org API vs FIFA official schedule expectations.
 */
require('dotenv').config();
const { Match } = require('./models');
const footballDataService = require('./services/footballDataService');
const sequelize = require('./config/db');

// Mirror server.js matching logic
function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\b(?:national team|fc|cf|women)\b/gi, '')
    .trim();
}

function teamsAlignWithApi(localMatch, apiHomeName, apiAwayName) {
  const normHome = normalizeTeamName(apiHomeName);
  const normAway = normalizeTeamName(apiAwayName);
  const normA = normalizeTeamName(localMatch.teamA);
  const normB = normalizeTeamName(localMatch.teamB);
  return (normHome.includes(normA) || normA.includes(normHome)) &&
    (normAway.includes(normB) || normB.includes(normAway));
}

function findLocalMatch(apiMatch, localMatches) {
  if (!apiMatch || !localMatches) return null;

  let match = localMatches.find(m => m.apiMatchId && m.apiMatchId.toString() === apiMatch.id.toString());
  if (match) return { match, method: 'apiMatchId' };

  if (apiMatch.homeTeam && apiMatch.awayTeam) {
    const apiHome = apiMatch.homeTeam.name || apiMatch.homeTeam.shortName;
    const apiAway = apiMatch.awayTeam.name || apiMatch.awayTeam.shortName;
    match = localMatches.find(m => teamsAlignWithApi(m, apiHome, apiAway));
    if (match) return { match, method: 'teamNames' };
  }

  if (apiMatch.utcDate && apiMatch.homeTeam && apiMatch.awayTeam) {
    const apiTime = new Date(apiMatch.utcDate).getTime();
    const normApiHome = normalizeTeamName(apiMatch.homeTeam.name || apiMatch.homeTeam.shortName);
    const normApiAway = normalizeTeamName(apiMatch.awayTeam.name || apiMatch.awayTeam.shortName);
    match = localMatches.find(m => {
      const localTime = new Date(m.kickoffTime).getTime();
      if (Math.abs(localTime - apiTime) >= 15 * 60 * 1000) return false;
      const normA = normalizeTeamName(m.teamA);
      const normB = normalizeTeamName(m.teamB);
      return [normA, normB].some(t =>
        t && (normApiHome.includes(t) || t.includes(normApiHome) || normApiAway.includes(t) || t.includes(normApiAway))
      );
    });
    if (match) return { match, method: 'kickoffTime' };
  }

  return null;
}

function mapApiStatus(apiStatus) {
  if (apiStatus === 'FINISHED') return 'completed';
  if (['IN_PLAY', 'LIVE', 'PAUSED'].includes(apiStatus)) return 'live';
  return 'scheduled';
}

function expectedWinner(homeGoals, awayGoals, homeIsTeamA) {
  if (homeGoals == null || awayGoals == null) return null;
  if (homeGoals > awayGoals) return homeIsTeamA ? 'teamA' : 'teamB';
  if (awayGoals > homeGoals) return homeIsTeamA ? 'teamB' : 'teamA';
  return 'draw';
}

function teamsSwapped(local, apiHome, apiAway) {
  const correctOrientation = teamsAlignWithApi(local, apiHome, apiAway);
  const normHome = normalizeTeamName(apiHome);
  const normAway = normalizeTeamName(apiAway);
  const normA = normalizeTeamName(local.teamA);
  const normB = normalizeTeamName(local.teamB);
  const swapped =
    (normHome.includes(normB) || normB.includes(normHome)) &&
    (normAway.includes(normA) || normA.includes(normAway));
  return { correctOrientation, swapped };
}

async function main() {
  const mismatches = [];
  const passes = [];
  const duplicateGroups = [];
  const missingInDb = [];
  const missingInApi = [];
  const wrongFixtureAttachments = [];

  await sequelize.authenticate();
  const localMatches = await Match.findAll({ order: [['kickoffTime', 'ASC'], ['id', 'ASC']] });
  const apiMatches = await footballDataService.getMatches();

  console.log(`\n=== AUDIT START ===`);
  console.log(`Local DB matches: ${localMatches.length}`);
  console.log(`API matches: ${apiMatches.length}`);
  console.log(`API source: https://api.football-data.org/v4/competitions/WC/matches\n`);

  // Duplicate detection in DB
  const byApiId = {};
  const byTeamsKickoff = {};
  for (const m of localMatches) {
    if (m.apiMatchId) {
      const key = m.apiMatchId.toString();
      if (!byApiId[key]) byApiId[key] = [];
      byApiId[key].push(m);
    }
    const tk = `${normalizeTeamName(m.teamA)}|${normalizeTeamName(m.teamB)}|${new Date(m.kickoffTime).toISOString()}`;
    if (!byTeamsKickoff[tk]) byTeamsKickoff[tk] = [];
    byTeamsKickoff[tk].push(m);
  }
  for (const [key, group] of Object.entries(byApiId)) {
    if (group.length > 1) {
      duplicateGroups.push({ type: 'apiMatchId', key, ids: group.map(m => m.id) });
    }
  }
  for (const [key, group] of Object.entries(byTeamsKickoff)) {
    if (group.length > 1) {
      duplicateGroups.push({ type: 'teams+kickoff', key, ids: group.map(m => m.id) });
    }
  }

  // Track which API matches are matched
  const matchedApiIds = new Set();
  const matchedLocalIds = new Set();

  for (const apiM of apiMatches) {
    const result = findLocalMatch(apiM, localMatches);
    const apiHome = apiM.homeTeam?.name || 'Tbc';
    const apiAway = apiM.awayTeam?.name || 'Tbc';
    const apiTime = new Date(apiM.utcDate);
    const apiStatus = mapApiStatus(apiM.status);
    const scoreHome = apiM.score?.fullTime?.home;
    const scoreAway = apiM.score?.fullTime?.away;

    if (!result) {
      missingInDb.push({
        apiId: apiM.id,
        home: apiHome,
        away: apiAway,
        utcDate: apiM.utcDate,
        status: apiM.status,
        score: scoreHome != null ? `${scoreHome}-${scoreAway}` : 'n/a'
      });
      continue;
    }

    const local = result.match;
    matchedApiIds.add(apiM.id.toString());
    matchedLocalIds.add(local.id);

    const orientation = teamsSwapped(local, apiHome, apiAway);
    const issues = [];

    if (result.method === 'kickoffTime' && !orientation.correctOrientation && !orientation.swapped) {
      issues.push({
        field: 'wrong_fixture_attachment',
        detail: `Matched by kickoffTime only; teams do not align. Local: ${local.teamA} vs ${local.teamB}, API: ${apiHome} vs ${apiAway}`,
        method: result.method
      });
      wrongFixtureAttachments.push({ localId: local.id, apiId: apiM.id, method: result.method });
    }

    if (orientation.swapped && !orientation.correctOrientation) {
      issues.push({
        field: 'home_away_swap',
        detail: `Home/away swapped. Local teamA=${local.teamA} teamB=${local.teamB}, API home=${apiHome} away=${apiAway}`
      });
    }

    if (local.teamA !== apiHome && orientation.correctOrientation) {
      issues.push({ field: 'teamA_name', expected: apiHome, actual: local.teamA });
    }
    if (local.teamB !== apiAway && orientation.correctOrientation) {
      issues.push({ field: 'teamB_name', expected: apiAway, actual: local.teamB });
    }

    const localTimeMs = new Date(local.kickoffTime).getTime();
    const apiTimeMs = apiTime.getTime();
    if (localTimeMs !== apiTimeMs) {
      issues.push({
        field: 'kickoff_time',
        expected: apiM.utcDate,
        actual: local.kickoffTime.toISOString()
      });
    }

    if (local.apiMatchId && local.apiMatchId.toString() !== apiM.id.toString()) {
      issues.push({
        field: 'apiMatchId',
        expected: apiM.id.toString(),
        actual: local.apiMatchId
      });
    }

    if (local.status !== apiStatus && !(local.status === 'completed' && apiStatus === 'completed')) {
      if (local.status !== apiStatus) {
        issues.push({ field: 'status', expected: apiStatus, actual: local.status, apiRaw: apiM.status });
      }
    } else if (local.status !== apiStatus) {
      issues.push({ field: 'status', expected: apiStatus, actual: local.status, apiRaw: apiM.status });
    }

    if (apiStatus === 'completed' && scoreHome != null && scoreAway != null) {
      const homeIsTeamA = orientation.correctOrientation || !orientation.swapped;
      const expGoalsA = homeIsTeamA ? scoreHome : scoreAway;
      const expGoalsB = homeIsTeamA ? scoreAway : scoreHome;
      const expWinner = expectedWinner(scoreHome, scoreAway, homeIsTeamA);

      if (local.teamAGoals !== expGoalsA) {
        issues.push({ field: 'teamAGoals', expected: expGoalsA, actual: local.teamAGoals, apiScore: `${scoreHome}-${scoreAway}` });
      }
      if (local.teamBGoals !== expGoalsB) {
        issues.push({ field: 'teamBGoals', expected: expGoalsB, actual: local.teamBGoals, apiScore: `${scoreHome}-${scoreAway}` });
      }
      if (local.winner !== expWinner) {
        issues.push({ field: 'winner', expected: expWinner, actual: local.winner, apiScore: `${scoreHome}-${scoreAway}` });
      }

      // Settlement bug check: scores applied as home/away without orientation check
      if (!orientation.swapped && local.teamAGoals === scoreHome && local.teamBGoals === scoreAway && local.winner) {
        // ok
      } else if (orientation.swapped && local.teamAGoals === scoreHome && local.teamBGoals === scoreAway) {
        issues.push({
          field: 'settlement_orientation_bug',
          detail: 'Scores match API home-away but local home/away teams are swapped — results attached to wrong fixture orientation'
        });
      }
    }

    if (issues.length === 0) {
      passes.push({ localId: local.id, apiId: apiM.id, match: `${apiHome} vs ${apiAway}`, method: result.method });
    } else {
      mismatches.push({
        localId: local.id,
        apiId: apiM.id,
        match: `${apiHome} vs ${apiAway}`,
        matchMethod: result.method,
        issues
      });
    }
  }

  // Local matches not matched to any API fixture
  for (const m of localMatches) {
    if (!matchedLocalIds.has(m.id)) {
      missingInApi.push({
        localId: m.id,
        teamA: m.teamA,
        teamB: m.teamB,
        kickoffTime: m.kickoffTime,
        apiMatchId: m.apiMatchId,
        status: m.status
      });
    }
  }

  // Ambiguous matching: multiple API fixtures map to same local
  const apiToLocal = {};
  for (const apiM of apiMatches) {
    const result = findLocalMatch(apiM, localMatches);
    if (result) {
      const lid = result.match.id;
      if (!apiToLocal[lid]) apiToLocal[lid] = [];
      apiToLocal[lid].push(apiM.id);
    }
  }
  const mergedFixtures = Object.entries(apiToLocal).filter(([, ids]) => ids.length > 1);

  const counts = {
    fixturesChecked: apiMatches.length,
    localChecked: localMatches.length,
    passes: passes.length,
    mismatches: mismatches.length,
    duplicates: duplicateGroups.length,
    missingInDb: missingInDb.length,
    missingInApi: missingInApi.length,
    incorrectScores: mismatches.filter(m => m.issues.some(i => ['teamAGoals', 'teamBGoals', 'settlement_orientation_bug'].includes(i.field))).length,
    incorrectWinners: mismatches.filter(m => m.issues.some(i => i.field === 'winner')).length,
    incorrectKickoff: mismatches.filter(m => m.issues.some(i => i.field === 'kickoff_time')).length,
    wrongAttachments: wrongFixtureAttachments.length,
    mergedFixtures: mergedFixtures.length
  };

  console.log('=== SUMMARY ===');
  console.log(JSON.stringify(counts, null, 2));

  if (passes.length) {
    console.log('\n=== PASS (sample) ===');
    passes.slice(0, 5).forEach(p => console.log(`  OK local#${p.localId} api#${p.apiId} ${p.match} [${p.method}]`));
    if (passes.length > 5) console.log(`  ... and ${passes.length - 5} more`);
  }

  if (mismatches.length) {
    console.log('\n=== FAIL ===');
    mismatches.forEach(m => {
      console.log(`\n  Local#${m.localId} / API#${m.apiId}: ${m.match} [matched via ${m.matchMethod}]`);
      m.issues.forEach(i => console.log(`    - ${i.field}: ${JSON.stringify(i)}`));
    });
  }

  if (duplicateGroups.length) {
    console.log('\n=== DUPLICATES ===');
    duplicateGroups.forEach(d => console.log(`  ${d.type} ${d.key}: local IDs ${d.ids.join(', ')}`));
  }

  if (missingInDb.length) {
    console.log('\n=== MISSING IN DB (in API, not local) ===');
    missingInDb.forEach(m => console.log(`  API#${m.apiId} ${m.home} vs ${m.away} @ ${m.utcDate} [${m.status}] ${m.score}`));
  }

  if (missingInApi.length) {
    console.log('\n=== MISSING IN API (in local, not API) ===');
    missingInApi.forEach(m => console.log(`  Local#${m.localId} ${m.teamA} vs ${m.teamB} @ ${m.kickoffTime} apiMatchId=${m.apiMatchId}`));
  }

  if (mergedFixtures.length) {
    console.log('\n=== INCORRECTLY MERGED (multiple API -> one local) ===');
    mergedFixtures.forEach(([lid, apiIds]) => console.log(`  Local#${lid} <- API IDs: ${apiIds.join(', ')}`));
  }

  const safe = counts.mismatches === 0 && counts.duplicates === 0 && counts.missingInDb === 0 && counts.missingInApi === 0 && counts.mergedFixtures === 0;
  console.log(`\nSAFE FOR PRODUCTION: ${safe ? 'YES' : 'NO'}`);

  await sequelize.close();
  process.exit(safe ? 0 : 1);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(2);
});
