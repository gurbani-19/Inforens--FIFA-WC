const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op, DataTypes } = require('sequelize');
const { Parser } = require('json2csv');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { 
  sequelize, 
  User, 
  Match, 
  Prediction, 
  Reward, 
  Achievement, 
  Notification 
} = require('./models');

const footballDataService = require('./services/footballDataService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'inforens_secret_key_2026';

app.use(cors({
  origin: '*', // For local development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error checking admin rights' });
  }
};

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: '⚽'
    });
    
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET);
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points, rank: user.rank, isAdmin: user.isAdmin } });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points, rank: user.rank, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Google Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleId, email, name } = req.body;
    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Google authentication payload missing' });
    }
    
    let user = await User.findOne({ where: { [Op.or]: [{ googleId }, { email }] } });
    if (!user) {
      user = await User.create({
        username: name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000),
        email,
        googleId,
        avatar: '⚽'
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points, rank: user.rank, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MATCH ENDPOINTS ---
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await Match.findAll({
      order: [['kickoffTime', 'ASC']]
    });
    
    // Fetch predictions counts grouped by matchId and predictedWinner
    const stats = await Prediction.findAll({
      attributes: [
        'matchId',
        'predictedWinner',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['matchId', 'predictedWinner'],
      raw: true
    });
    
    // Organize stats in a map: matchId -> { teamA: count, teamB: count, draw: count }
    const statsMap = new Map();
    stats.forEach(s => {
      const mId = s.matchId;
      if (!statsMap.has(mId)) {
        statsMap.set(mId, { teamA: 0, teamB: 0, draw: 0 });
      }
      const counts = statsMap.get(mId);
      if (s.predictedWinner === 'teamA') counts.teamA = parseInt(s.count);
      if (s.predictedWinner === 'teamB') counts.teamB = parseInt(s.count);
      if (s.predictedWinner === 'draw') counts.draw = parseInt(s.count);
    });

    const matchesWithSplits = matches.map(m => {
      const matchJson = m.toJSON();
      const counts = statsMap.get(m.id) || { teamA: 0, teamB: 0, draw: 0 };
      const total = counts.teamA + counts.teamB + counts.draw;
      if (total === 0) {
        // Fallback splits to draw nicely
        const baseA = 33 + (m.id * 3) % 15;
        const baseB = 33 + (m.id * 7) % 15;
        matchJson.predictedSplit = { teamA: baseA, teamB: baseB, draw: 100 - baseA - baseB };
      } else {
        const teamAPercent = Math.round((counts.teamA / total) * 100);
        const teamBPercent = Math.round((counts.teamB / total) * 100);
        matchJson.predictedSplit = { teamA: teamAPercent, teamB: teamBPercent, draw: 100 - teamAPercent - teamBPercent };
      }
      return matchJson;
    });

    res.json(matchesWithSplits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PREDICTIONS ENDPOINTS ---
app.get('/api/predictions/my', authenticateToken, async (req, res) => {
  try {
    const predictions = await Prediction.findAll({ where: { userId: req.user.id } });
    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Prediction (Winner Outcome - Home / Draw / Away Win)
app.post('/api/predictions', authenticateToken, async (req, res) => {
  try {
    const { matchId, predictedWinner } = req.body;
    
    if (predictedWinner !== 'teamA' && predictedWinner !== 'teamB' && predictedWinner !== 'draw') {
      return res.status(400).json({ error: 'predictedWinner must be either teamA, teamB, or draw' });
    }

    const match = await Match.findByPk(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    if (match.status !== 'scheduled') {
      return res.status(400).json({ error: 'Predictions can only be made on scheduled matches' });
    }
    
    // Check prediction locking rules (1 hour before play, open within 24 hours)
    const now = new Date();
    const kickoff = new Date(match.kickoffTime);
    const timeDiff = kickoff - now;
    
    if (timeDiff < 1 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Predictions lock 1 hour before match start time' });
    }
    
    if (timeDiff > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Predictions open 24 hours before match kickoff time' });
    }
    
    // Enforce no edit rules
    const existingPred = await Prediction.findOne({ where: { userId: req.user.id, matchId } });
    if (existingPred) {
      return res.status(400).json({ error: 'Predictions cannot be edited once submitted' });
    }

    const prediction = await Prediction.create({
      userId: req.user.id,
      matchId,
      predictedWinner
    });
    
    // Evaluate badges
    await evaluateUserBadges(req.user.id);
    
    res.status(200).json(prediction);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Predictions cannot be edited once submitted' });
    }
    res.status(500).json({ error: error.message });
  }
});

// --- LEADERBOARD ENDPOINTS ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const userWhereClause = {};
    if (search) {
      userWhereClause.username = { [Op.like]: `%${search}%` };
    }
    
    const { count, rows: users } = await User.findAndCountAll({
      where: userWhereClause,
      order: [['points', 'DESC'], ['correctPredictions', 'DESC'], ['username', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'username', 'avatar', 'points', 'rank', 'correctPredictions', 'predictionAccuracy', 'activeStreak'],
      include: [{
        model: Achievement,
        where: { isClaimed: true },
        required: false,
        attributes: ['badgeType']
      }]
    });
    
    res.json({
      users,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- REWARDS & ACHIEVEMENTS ---
app.get('/api/rewards', authenticateToken, async (req, res) => {
  try {
    // Evaluate user achievements on-demand
    await evaluateUserBadges(req.user.id);
    
    const achievements = await Achievement.findAll({ where: { userId: req.user.id } });
    const rewards = await Reward.findAll({ where: { userId: req.user.id } });
    res.json({ achievements, rewards });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rewards/claim', authenticateToken, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const reward = await Reward.findOne({ where: { id: rewardId, userId: req.user.id } });
    if (!reward) return res.status(404).json({ error: 'Reward not found or does not belong to you' });
    if (reward.claimedAt) return res.status(400).json({ error: 'Reward already claimed' });
    
    reward.claimedAt = new Date();
    await reward.save();
    res.json({ success: true, reward });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/badges/claim', authenticateToken, async (req, res) => {
  try {
    const { badgeType } = req.body;
    if (!badgeType) return res.status(400).json({ error: 'badgeType is required' });
    
    const achievement = await Achievement.findOne({ where: { userId: req.user.id, badgeType } });
    if (!achievement) return res.status(404).json({ error: 'Badge not unlocked or not found' });
    if (achievement.isClaimed) return res.status(400).json({ error: 'Badge already claimed' });
    
    achievement.isClaimed = true;
    await achievement.save();
    
    // Create Badge Claimed notification
    await createNotificationIfNotExists(req.user.id, 'ACHIEVEMENT', `🎉 Badge Claimed: You claimed your ${badgeType.replace('_', ' ')} Badge!`);
    
    res.json({ success: true, achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN ENDPOINTS ---

app.post('/api/admin/sync-fixtures', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await syncScheduledMatchesAndPlayoffs();
    await syncAndSettleYesterdayMatches();
    const count = await Match.count();
    res.json({ success: true, message: 'Fixtures synced from football-data.org.', matchCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/matches', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamA, teamB, teamAFlag, teamBFlag, kickoffTime } = req.body;
    const match = await Match.create({ teamA, teamB, teamAFlag, teamBFlag, kickoffTime, status: 'scheduled' });
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/matches/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamA, teamB, teamAFlag, teamBFlag, kickoffTime, status } = req.body;
    const match = await Match.findByPk(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    await match.update({ teamA, teamB, teamAFlag, teamBFlag, kickoffTime, status });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/matches/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    await match.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export Leaderboard
app.get('/api/admin/leaderboard/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['points', 'DESC'], ['correctPredictions', 'DESC']],
      attributes: ['rank', 'username', 'email', 'points', 'correctPredictions', 'predictionAccuracy', 'maxStreak']
    });
    
    const json2csvParser = new Parser({ fields: ['rank', 'username', 'email', 'points', 'correctPredictions', 'predictionAccuracy', 'maxStreak'] });
    const csv = json2csvParser.parse(users);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fifa_leaderboard.csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Enters Final Score (TRIGGERS RESOLUTION HELPER)
app.post('/api/admin/matches/:id/result', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamAGoals, teamBGoals } = req.body;
    const matchId = req.params.id;
    
    const success = await resolveMatchResult(matchId, teamAGoals, teamBGoals);
    res.json({ success: true, match: success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Reprocesses Result (Result Correction Tool)
app.post('/api/admin/matches/:id/reprocess', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamAGoals, teamBGoals } = req.body;
    const matchId = req.params.id;
    
    const match = await resolveMatchResult(matchId, teamAGoals, teamBGoals, true);
    res.json({ success: true, message: 'Match reprocessed and standings updated successfully.', match });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send notification to all admin users in case of API failures
async function sendAdminNotification(message) {
  console.error(`[API SYNC ALERT] ${message}`);
}

// Helper to create notifications only if not already sent
async function createNotificationIfNotExists(userId, type, message, transaction = null) {
  try {
    const existing = await Notification.findOne({
      where: { userId, type, message },
      transaction
    });
    if (!existing) {
      return await Notification.create({ userId, type, message }, { transaction });
    }
    return existing;
  } catch (err) {
    console.error('Failed to create notification safely:', err.message);
  }
}

// Startup sync cooldown check
async function checkStartupSyncCooldown() {
  const lastSyncFile = path.join(__dirname, 'last_startup_sync.json');
  const cooldownSec = parseInt(process.env.STARTUP_SYNC_COOLDOWN_SEC) || 300; // 5 minutes
  const cooldownMs = cooldownSec * 1000;
  
  try {
    if (fs.existsSync(lastSyncFile)) {
      const data = JSON.parse(fs.readFileSync(lastSyncFile, 'utf8'));
      const lastSyncTime = new Date(data.timestamp).getTime();
      const diff = Date.now() - lastSyncTime;
      if (diff < cooldownMs) {
        console.log(`[STARTUP SYNC] Skipping startup sync. Last run was ${Math.round(diff/1000)}s ago (cooldown is ${cooldownSec}s).`);
        return false;
      }
    }
  } catch (err) {
    console.error('[STARTUP SYNC] Failed reading last sync file, proceeding with sync:', err.message);
  }
  
  try {
    fs.writeFileSync(lastSyncFile, JSON.stringify({ timestamp: new Date().toISOString() }), 'utf8');
  } catch (err) {
    console.error('[STARTUP SYNC] Failed writing last sync file:', err.message);
  }
  return true;
}

// Automated reminders for upcoming matches
async function runNotificationAutomations() {
  console.log('[NOTIFICATION AUTOMATION] Checking upcoming matches for reminders...');
  try {
    const now = new Date();
    const matches = await Match.findAll({
      where: {
        status: 'scheduled',
        kickoffTime: {
          [Op.gt]: now
        }
      }
    });

    const allUsers = await User.findAll();

    for (const match of matches) {
      const kickoff = new Date(match.kickoffTime);
      const timeDiff = kickoff - now;

      // 1. Predictions closing soon (starts in 1 to 3 hours)
      if (timeDiff >= 1 * 60 * 60 * 1000 && timeDiff <= 3 * 60 * 60 * 1000) {
        for (const user of allUsers) {
          const pred = await Prediction.findOne({ where: { userId: user.id, matchId: match.id } });
          if (!pred) {
            const msg = `⏳ Predictions closing soon! Lock in your winner for ${match.teamA} vs ${match.teamB} before lock window closes.`;
            await createNotificationIfNotExists(user.id, 'REMINDER', msg);
          }
        }
      }

      // 2. New predictions available (starts in 20 to 24 hours)
      if (timeDiff > 20 * 60 * 60 * 1000 && timeDiff <= 24 * 60 * 60 * 1000) {
        for (const user of allUsers) {
          const pred = await Prediction.findOne({ where: { userId: user.id, matchId: match.id } });
          if (!pred) {
            const msg = `🎯 Prediction Open: You can now predict the outcome for ${match.teamA} vs ${match.teamB}! Window closes 1h before kickoff.`;
            await createNotificationIfNotExists(user.id, 'REMINDER', msg);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error running notification automation:', err.message);
  }
}

// Evaluate and award achievements (badges) for a user based on current state
async function evaluateUserBadges(userId, transaction = null) {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return;

  const totalPredictions = await Prediction.count({ where: { userId }, transaction });
  const correctPredictions = user.correctPredictions || 0;
  const maxStreak = user.maxStreak || 0;
  const userRank = user.rank || 0;

  const badges = [
    { type: 'FIRST_PICK', name: 'First Pick', condition: totalPredictions >= 1, msg: '🏆 Badge Available to Claim: You unlocked the First Pick Badge! Go to Badges to claim it now.' },
    { type: 'PREDICTOR', name: 'Predictor', condition: totalPredictions >= 5, msg: '🏆 Badge Available to Claim: You unlocked the Predictor Badge! Go to Badges to claim it now.' },
    { type: 'FOLLOWER', name: 'Tournament Follower', condition: totalPredictions >= 10, msg: '🏆 Badge Available to Claim: You unlocked the Tournament Follower Badge! Go to Badges to claim it now.' },
    { type: 'SAGE', name: 'Football Sage', condition: correctPredictions >= 5, msg: '🏆 Badge Available to Claim: You unlocked the Football Sage Badge! Go to Badges to claim it now.' },
    { type: 'ORACLE', name: 'Oracle', condition: correctPredictions >= 10, msg: '🏆 Badge Available to Claim: You unlocked the Oracle Badge! Go to Badges to claim it now.' },
    { type: 'STREAK', name: 'Hot Streak', condition: maxStreak >= 3, msg: '🏆 Badge Available to Claim: You unlocked the Hot Streak Badge! Go to Badges to claim it now.' },
    { type: 'UNSTOPPABLE', name: 'Unstoppable', condition: maxStreak >= 5, msg: '🏆 Badge Available to Claim: You unlocked the Unstoppable Badge! Go to Badges to claim it now.' },
    { type: 'EXPERT', name: 'World Cup Expert', condition: correctPredictions >= 25, msg: '🏆 Badge Available to Claim: You unlocked the World Cup Expert Badge! Go to Badges to claim it now.' },
    { type: 'CHALLENGER', name: 'Global Challenger', condition: userRank > 0 && userRank <= 25, msg: '🏆 Badge Available to Claim: You unlocked the Global Challenger Badge! Go to Badges to claim it now.' },
    { type: 'CHAMPION', name: 'World Cup Champion', condition: userRank > 0 && userRank <= 3, msg: '🏆 Badge Available to Claim: You unlocked the World Cup Champion Badge! Go to Badges to claim it now.' }
  ];

  for (const b of badges) {
    if (b.condition) {
      const hasBadge = await Achievement.findOne({ where: { userId, badgeType: b.type }, transaction });
      if (!hasBadge) {
        await Achievement.create({ userId, badgeType: b.type }, { transaction });
        await createNotificationIfNotExists(userId, 'ACHIEVEMENT', b.msg, transaction);
      }
    }
  }
}

// Helper to resolve match results and update predictions, users, achievements, and leaderboard ranks
async function resolveMatchResult(matchId, teamAGoals, teamBGoals, forceReprocess = false) {
  const transaction = await sequelize.transaction();
  try {
    const goalsA = teamAGoals !== null && teamAGoals !== undefined ? parseInt(teamAGoals) : null;
    const goalsB = teamBGoals !== null && teamBGoals !== undefined ? parseInt(teamBGoals) : null;
    
    let winner = null;
    if (goalsA !== null && goalsB !== null) {
      if (goalsA > goalsB) winner = 'teamA';
      else if (goalsB > goalsA) winner = 'teamB';
      else winner = 'draw';
    }

    const match = await Match.findByPk(matchId, { transaction });
    if (!match) {
      throw new Error('Match not found');
    }
    
    const alreadySettled = match.teamAGoals !== null && match.teamBGoals !== null && match.winner !== null;
    if (match.status === 'completed' && alreadySettled && !forceReprocess) {
      console.log(`[resolveMatchResult] Match ${matchId} is already completed and settled. Skipping.`);
      await transaction.rollback();
      return match;
    }
    
    await match.update({
      teamAGoals: goalsA,
      teamBGoals: goalsB,
      winner,
      status: 'completed'
    }, { transaction });
    
    const predictionWhere = { matchId };
    if (!forceReprocess) {
      predictionWhere.isProcessed = false;
    }
    const predictions = await Prediction.findAll({ where: predictionWhere, transaction });
    const usersToUpdate = new Set();
    
    for (const pred of predictions) {
      const isCorrect = winner !== null && pred.predictedWinner === winner;
      const pointsEarned = isCorrect ? 1 : 0;
      
      const oldPointsEarned = pred.pointsEarned || 0;
      const oldIsProcessed = pred.isProcessed;
      
      await pred.update({ pointsEarned, isProcessed: true }, { transaction });
      
      const user = await User.findByPk(pred.userId, { transaction });
      if (user) {
        if (forceReprocess && oldIsProcessed) {
          user.points += (pointsEarned - oldPointsEarned);
        } else {
          user.points += pointsEarned;
        }
        
        console.log(`[EMAIL HOOK: Result Update Email] Sending to ${user.email}: Match ${match.teamA} vs ${match.teamB} resolved. Correct: ${isCorrect}. New points: ${user.points}`);
        
        if (isCorrect) {
          if (!(forceReprocess && oldIsProcessed && oldPointsEarned === 1)) {
            user.correctPredictions += 1;
            user.activeStreak += 1;
            if (user.activeStreak > user.maxStreak) {
              user.maxStreak = user.activeStreak;
            }
          }
          
          await createNotificationIfNotExists(user.id, 'RESULT', `Your prediction for ${match.teamA} vs ${match.teamB} was correct! You earned +1 point.`, transaction);
        } else {
          if (forceReprocess && oldIsProcessed && oldPointsEarned === 1) {
            user.correctPredictions = Math.max(0, user.correctPredictions - 1);
          }
          
          if (winner !== null) {
            user.activeStreak = 0;
          }
          
          const notifMessage = winner === null 
            ? `Match ${match.teamA} vs ${match.teamB} was abandoned with no result. No points were awarded.`
            : `Your prediction for ${match.teamA} vs ${match.teamB} was incorrect. Better luck next time!`;
            
          await createNotificationIfNotExists(user.id, 'RESULT', notifMessage, transaction);
        }
        await user.save({ transaction });
        usersToUpdate.add(user.id);
      }
    }
    
    // Update accuracy and achievements for all affected users
    for (const userId of usersToUpdate) {
      const user = await User.findByPk(userId, { transaction });
      
      const totalPicks = await Prediction.count({ where: { userId, isProcessed: true }, transaction });
      const correctPicks = await Prediction.count({ where: { userId, pointsEarned: 1, isProcessed: true }, transaction });
      user.correctPredictions = correctPicks;
      if (totalPicks > 0) {
        user.predictionAccuracy = parseFloat(((correctPicks / totalPicks) * 100).toFixed(1));
      } else {
        user.predictionAccuracy = 0.0;
      }
      
      // Re-calculate streaks properly if re-processing
      if (forceReprocess) {
        const userPreds = await Prediction.findAll({
          include: [{
            model: Match,
            attributes: ['kickoffTime', 'winner']
          }],
          where: { userId, isProcessed: true },
          order: [[Match, 'kickoffTime', 'ASC']],
          transaction
        });
        
        let actStreak = 0;
        let maxStk = 0;
        for (const p of userPreds) {
          const matchWinner = p.Match?.winner;
          if (matchWinner !== null) {
            if (p.predictedWinner === matchWinner) {
              actStreak += 1;
              if (actStreak > maxStk) maxStk = actStreak;
            } else {
              actStreak = 0;
            }
          }
        }
        user.activeStreak = actStreak;
        user.maxStreak = maxStk;
      }
      
      await user.save({ transaction });
      
      await evaluateUserBadges(userId, transaction);
    }
    
    // Recalculate Leaderboard Ranks
    const allUsers = await User.findAll({
      order: [['points', 'DESC'], ['correctPredictions', 'DESC'], ['username', 'ASC']],
      transaction
    });
    
    let currentRank = 1;
    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      const prevRank = u.rank;
      u.rank = currentRank;
      await u.save({ transaction });
      
      if (prevRank > 0 && u.rank < prevRank) {
        const getMilestone = (rank) => {
          if (rank === 1) return 'Rank #1';
          if (rank <= 3) return 'Top 3';
          if (rank <= 5) return 'Top 5';
          if (rank <= 10) return 'Top 10';
          if (rank <= 25) return 'Top 25';
          return null;
        };
        const prevMilestone = getMilestone(prevRank);
        const currMilestone = getMilestone(u.rank);
        if (currMilestone && currMilestone !== prevMilestone) {
          await createNotificationIfNotExists(u.id, 'RANK', `📊 Leaderboard Milestone: You reached the ${currMilestone}! Current Rank: #${u.rank}`, transaction);
        }
        await evaluateUserBadges(u.id, transaction);
      }
      currentRank++;
    }
    
    await transaction.commit();
    return match;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Normalize team names for matching
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
  const homeIsA = (normHome.includes(normA) || normA.includes(normHome)) &&
    (normAway.includes(normB) || normB.includes(normAway));
  return homeIsA;
}

function mapApiScoresToLocal(localMatch, apiMatch) {
  const homeGoals = apiMatch.score?.fullTime?.home;
  const awayGoals = apiMatch.score?.fullTime?.away;
  if (homeGoals === null || homeGoals === undefined || awayGoals === null || awayGoals === undefined) {
    return { teamAGoals: null, teamBGoals: null };
  }
  const apiHome = apiMatch.homeTeam?.name || apiMatch.homeTeam?.shortName || '';
  const apiAway = apiMatch.awayTeam?.name || apiMatch.awayTeam?.shortName || '';
  if (teamsAlignWithApi(localMatch, apiHome, apiAway)) {
    return { teamAGoals: homeGoals, teamBGoals: awayGoals };
  }
  return { teamAGoals: awayGoals, teamBGoals: homeGoals };
}

function findLocalMatch(apiMatch, localMatches) {
  if (!apiMatch || !localMatches) return null;

  // 1. Match by apiMatchId
  let match = localMatches.find(m => m.apiMatchId && m.apiMatchId.toString() === apiMatch.id.toString());
  if (match) return match;

  // 2. Match by home/away team names (teamA = home, teamB = away)
  if (apiMatch.homeTeam && apiMatch.awayTeam) {
    const apiHome = apiMatch.homeTeam.name || apiMatch.homeTeam.shortName;
    const apiAway = apiMatch.awayTeam.name || apiMatch.awayTeam.shortName;
    const normApiHome = normalizeTeamName(apiHome);
    const normApiAway = normalizeTeamName(apiAway);

    if (normApiHome && normApiAway) {
      match = localMatches.find(m => teamsAlignWithApi(m, apiHome, apiAway));
      if (match) return match;
    }
  }

  // 3. Fallback: kickoff time plus at least one overlapping team name
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
        t && (
          normApiHome.includes(t) || t.includes(normApiHome) ||
          normApiAway.includes(t) || t.includes(normApiAway)
        )
      );
    });
    if (match) return match;
  }

  return null;
}

const FAKE_SEED_API_IDS = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'];

async function purgeFakeSeedMatches() {
  const removed = await Match.destroy({
    where: { apiMatchId: { [Op.in]: FAKE_SEED_API_IDS } }
  });
  if (removed > 0) {
    console.log(`[SYNC] Removed ${removed} legacy seed fixture(s) not from football-data.org.`);
  }
}

// Hourly cron job: Sync scheduled matches from external API
async function syncScheduledMatchesAndPlayoffs() {
  console.log(`[PRE-POPULATE: CRON] Starting scheduled matches sync... ${new Date().toISOString()}`);
  try {
    await purgeFakeSeedMatches();

    const apiMatches = await footballDataService.getMatches();
    if (!apiMatches || apiMatches.length === 0) {
      console.log('[PRE-POPULATE: CRON] No matches found in API response.');
      return true;
    }

    const localMatches = await Match.findAll();

    for (const apiM of apiMatches) {
      const localM = findLocalMatch(apiM, localMatches);

      const teamA = apiM.homeTeam.name || 'Tbc';
      const teamB = apiM.awayTeam.name || 'Tbc';
      const teamAFlag = apiM.homeTeam.crest || '❓';
      const teamBFlag = apiM.awayTeam.crest || '❓';
      const apiTime = new Date(apiM.utcDate);

      let status = 'scheduled';
      if (apiM.status === 'FINISHED') {
        status = 'completed';
      } else if (apiM.status === 'IN_PLAY' || apiM.status === 'LIVE' || apiM.status === 'PAUSED') {
        status = 'live';
      }

      if (localM) {
        const updates = {};

        if (localM.teamA !== teamA) updates.teamA = teamA;
        if (localM.teamB !== teamB) updates.teamB = teamB;
        if (localM.teamAFlag !== teamAFlag) updates.teamAFlag = teamAFlag;
        if (localM.teamBFlag !== teamBFlag) updates.teamBFlag = teamBFlag;

        if (new Date(localM.kickoffTime).getTime() !== apiTime.getTime()) {
          updates.kickoffTime = apiTime;
        }

        if (localM.apiMatchId !== apiM.id.toString()) {
          updates.apiMatchId = apiM.id.toString();
        }

        if (status !== 'completed' && localM.status !== status) {
          updates.status = status;
        }

        if (Object.keys(updates).length > 0) {
          console.log(`[PRE-POPULATE: CRON] Updating match ${localM.id}:`, updates);
          await localM.update(updates);
          await localM.reload();
        }

        if (status === 'completed') {
          const { teamAGoals, teamBGoals } = mapApiScoresToLocal(localM, apiM);
          if (teamAGoals !== null && teamBGoals !== null) {
            const needsSettlement = localM.teamAGoals === null || localM.teamBGoals === null || localM.winner === null ||
              localM.teamAGoals !== teamAGoals || localM.teamBGoals !== teamBGoals;
            if (needsSettlement) {
              const forceReprocess = localM.status === 'completed' && localM.teamAGoals !== null && localM.teamBGoals !== null;
              console.log(`[RESULTS SETTLEMENT] Settle match ${localM.id}: ${localM.teamA} vs ${localM.teamB}. Score: ${teamAGoals}-${teamBGoals}`);
              await resolveMatchResult(localM.id, teamAGoals, teamBGoals, forceReprocess);
            }
          }
        }
      } else {
        console.log(`[PRE-POPULATE: CRON] Creating new match: ${teamA} vs ${teamB} at ${apiTime}`);
        const newMatch = await Match.create({
          teamA,
          teamB,
          teamAFlag,
          teamBFlag,
          kickoffTime: apiTime,
          status,
          apiMatchId: apiM.id.toString()
        });

        if (status === 'completed') {
          const { teamAGoals, teamBGoals } = mapApiScoresToLocal(newMatch, apiM);
          if (teamAGoals !== null && teamBGoals !== null) {
            console.log(`[RESULTS SETTLEMENT] Settle new match ${newMatch.id}: ${teamA} vs ${teamB}. Score: ${teamAGoals}-${teamBGoals}`);
            await resolveMatchResult(newMatch.id, teamAGoals, teamBGoals);
          }
        }
      }
    }
    
    // Trigger notifications checks
    await runNotificationAutomations();
    return true;
  } catch (err) {
    const errMsg = `Error syncing API matches: ${err.message}`;
    console.error('[PRE-POPULATE: CRON] ERROR:', errMsg);
    await sendAdminNotification(errMsg);
    return false;
  }
}

// Daily Midnight Cron Job: Settle match results for the previous day
async function syncAndSettleYesterdayMatches() {
  console.log(`[RESULTS SETTLEMENT: CRON] Starting settlement check for all past uncompleted matches... ${new Date().toISOString()}`);
  try {
    const localMatches = await Match.findAll({
      where: {
        kickoffTime: {
          [Op.lt]: new Date()
        },
        status: { [Op.ne]: 'completed' }
      }
    });

    if (localMatches.length === 0) {
      console.log('[RESULTS SETTLEMENT: CRON] No uncompleted past matches found.');
      return;
    }

    console.log(`[RESULTS SETTLEMENT: CRON] Found ${localMatches.length} uncompleted past matches to check.`);

    const apiMatches = await footballDataService.getMatches();
    if (!apiMatches || apiMatches.length === 0) {
      console.log('[RESULTS SETTLEMENT: CRON] No matches in API response.');
      return;
    }

    for (const localMatch of localMatches) {
      const apiMatch = apiMatches.find(apiM => {
        const matched = findLocalMatch(apiM, [localMatch]);
        return matched !== null;
      });

      if (apiMatch) {
        if (apiMatch.status === 'FINISHED') {
          const { teamAGoals, teamBGoals } = mapApiScoresToLocal(localMatch, apiMatch);
          if (teamAGoals !== null && teamBGoals !== null) {
            const needsSettlement = localMatch.teamAGoals === null || localMatch.teamBGoals === null || localMatch.winner === null ||
              localMatch.teamAGoals !== teamAGoals || localMatch.teamBGoals !== teamBGoals;
            if (needsSettlement) {
              const forceReprocess = localMatch.status === 'completed' && localMatch.teamAGoals !== null && localMatch.teamBGoals !== null;
              console.log(`[RESULTS SETTLEMENT: CRON] Settle match ${localMatch.id}: ${localMatch.teamA} vs ${localMatch.teamB}. Score: ${teamAGoals}-${teamBGoals}`);
              await resolveMatchResult(localMatch.id, teamAGoals, teamBGoals, forceReprocess);
            }
          }
        } else {
          console.log(`[RESULTS SETTLEMENT: CRON] Match ${localMatch.id} is yesterday but apiMatch.status is not FINISHED.`);
        }
      }
    }
  } catch (err) {
    const errMsg = `Error processing settlement API response: ${err.message}`;
    console.error('[RESULTS SETTLEMENT: CRON] ERROR:', errMsg);
    await sendAdminNotification(errMsg);
  }
}

// --- SEED FUNCTION ---
async function seedDatabase() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  await User.create({
    username: 'admin',
    email: 'admin@inforens.com',
    password: adminPassword,
    isAdmin: true,
    avatar: '⚽'
  });

  const user2 = await User.create({
    username: 'jane_smith',
    email: 'jane@example.com',
    password: userPassword,
    avatar: '🦊',
    points: 8,
    rank: 1,
    correctPredictions: 8,
    predictionAccuracy: 88.9,
    activeStreak: 5,
    maxStreak: 5
  });

  await User.create({
    username: 'john_doe',
    email: 'john@example.com',
    password: userPassword,
    avatar: '🦁',
    points: 5,
    rank: 2,
    correctPredictions: 5,
    predictionAccuracy: 71.4,
    activeStreak: 3,
    maxStreak: 4
  });

  await User.create({
    username: 'fifa_fanatic',
    email: 'fanatic@example.com',
    password: userPassword,
    avatar: '🐯',
    points: 3,
    rank: 3,
    correctPredictions: 3,
    predictionAccuracy: 42.8,
    activeStreak: 0,
    maxStreak: 2
  });

  await Achievement.create({ userId: user2.id, badgeType: 'STREAK' });
  await Notification.create({
    userId: user2.id,
    type: 'ACHIEVEMENT',
    message: '🏆 Badge Available to Claim: You unlocked the Hot Streak Badge! Go to Badges to claim it now.'
  });

  await Reward.create({
    userId: user2.id,
    title: '⚽ Official Inforens Predictor Cap',
    description: 'Exclusive merchandise for our top-tier Predictor leaders.',
    type: 'merchandise',
    value: 'Inforens Predictor Cap'
  });

  console.log('[SEED] Created sample users. Fixtures will be loaded from football-data.org on startup sync.');
}

// Start Server & Sync hooks
sequelize.authenticate()
  .then(async () => {
    console.log('Database connected.');
    // Standard sync
    await sequelize.sync();

    const queryInterface = sequelize.getQueryInterface();
    
    // Safely add apiMatchId
    const tableInfo = await queryInterface.describeTable('Matches');
    if (!tableInfo.apiMatchId) {
      console.log('[STARTUP] Adding apiMatchId to Matches table...');
      await queryInterface.addColumn('Matches', 'apiMatchId', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    // Safely add isClaimed to Achievements
    const achievementTableInfo = await queryInterface.describeTable('Achievements');
    if (!achievementTableInfo.isClaimed) {
      console.log('[STARTUP] Adding isClaimed to Achievements table...');
      await queryInterface.addColumn('Achievements', 'isClaimed', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }

    // Add unique composite index on Predictions
    try {
      const indexes = await queryInterface.showIndex('Predictions');
      const hasUniqueIndex = indexes.some(idx => idx.name === 'predictions_user_match_unique');
      if (!hasUniqueIndex) {
        console.log('[STARTUP] Adding unique composite index on Predictions...');
        await queryInterface.addIndex('Predictions', ['userId', 'matchId'], {
          unique: true,
          name: 'predictions_user_match_unique'
        });
      }
    } catch (err) {
      console.error('[STARTUP] Failed to add Predictions composite unique index:', err.message);
    }

    // Add unique index on Matches apiMatchId
    try {
      const matchIndexes = await queryInterface.showIndex('Matches');
      const hasMatchIndex = matchIndexes.some(idx => idx.name === 'matches_api_match_id_unique');
      if (!hasMatchIndex) {
        console.log('[STARTUP] Adding unique index on Matches(apiMatchId)...');
        await queryInterface.addIndex('Matches', ['apiMatchId'], {
          unique: true,
          name: 'matches_api_match_id_unique'
        });
      }
    } catch (err) {
      console.error('[STARTUP] Failed to add Matches unique index:', err.message);
    }

    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Database empty. Seeding admin account...');
      await seedDatabase();
    } else {
      console.log('Database already has data. Skipping seed.');
    }

    const matchCount = await Match.count();
    if (matchCount === 0) {
      console.log('[STARTUP] No fixtures in database — syncing from football-data.org...');
      await syncScheduledMatchesAndPlayoffs();
      await syncAndSettleYesterdayMatches();
    }
  })
  .then(async () => {
    if (process.env.RUN_SYNC_ONLY === '1') {
      console.log('[RUN_SYNC_ONLY] Running fixture sync and settlement...');
      await syncScheduledMatchesAndPlayoffs();
      await syncAndSettleYesterdayMatches();
      console.log('[RUN_SYNC_ONLY] Complete.');
      process.exit(0);
      return;
    }

    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
      
      // Hourly fixture sync
      const prepopulateCronPattern = process.env.FOOTBALL_PREPOPULATE_CRON_PATTERN || '0 * * * *';
      cron.schedule(prepopulateCronPattern, () => {
        syncScheduledMatchesAndPlayoffs().catch(err => {
          console.error('[CRON ERROR] Failed running pre-population sync:', err);
        });
      });
      console.log(`[PRE-POPULATE: CRON] Scheduled hourly sync with pattern: ${prepopulateCronPattern}`);
      
      // Midnight results sync
      const settlementCronPattern = process.env.FOOTBALL_SETTLEMENT_CRON_PATTERN || '0 0 * * *';
      cron.schedule(settlementCronPattern, () => {
        syncAndSettleYesterdayMatches().catch(err => {
          console.error('[CRON ERROR] Failed running daily results settlement:', err);
        });
      });
      console.log(`[RESULTS SETTLEMENT: CRON] Scheduled daily settlement with pattern: ${settlementCronPattern}`);
      
      // Startup sync with cooldown check
      checkStartupSyncCooldown().then(shouldSync => {
        if (shouldSync) {
          syncScheduledMatchesAndPlayoffs()
            .then(() => {
              console.log('[STARTUP SYNC] Successfully synced scheduled matches on startup.');
              return syncAndSettleYesterdayMatches();
            })
            .then(() => {
              console.log('[STARTUP SYNC] Successfully verified and settled past matches on startup.');
            })
            .catch(err => {
              console.error('[STARTUP ERROR] Failed running startup sync:', err);
            });
        }
      });
    });
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
  });
