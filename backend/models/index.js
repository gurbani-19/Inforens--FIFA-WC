const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Nullable for Google Login
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '⚽'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rank: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  correctPredictions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  predictionAccuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  activeStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  maxStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Match Model
const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  teamA: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamB: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamAFlag: {
    type: DataTypes.STRING,
    allowNull: false // e.g. BR (Brazil), GB (England) emoji or icon keys
  },
  teamBFlag: {
    type: DataTypes.STRING,
    allowNull: false
  },
  kickoffTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'completed'),
    defaultValue: 'scheduled'
  },
  teamAGoals: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  teamBGoals: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  winner: {
    type: DataTypes.ENUM('teamA', 'teamB', 'draw'),
    allowNull: true
  },
  apiMatchId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});


// Prediction (Winner Predictor) Model
const Prediction = sequelize.define('Prediction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  predictedWinner: {
    type: DataTypes.ENUM('teamA', 'teamB', 'draw'),
    allowNull: false
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Score Prediction (Exact Score) Model
const ScorePrediction = sequelize.define('ScorePrediction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  predictedTeamAGoals: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  predictedTeamBGoals: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Leaderboard Cache Model
const Leaderboard = sequelize.define('Leaderboard', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  correctPredictions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  accuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  streak: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rank: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  type: {
    type: DataTypes.ENUM('weekly', 'tournament'),
    defaultValue: 'tournament'
  }
});

// Reward Model
const Reward = sequelize.define('Reward', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('cash', 'merchandise'),
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// Achievement (Badge) Model
const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  badgeType: {
    type: DataTypes.ENUM('FIRST_PICK', 'PREDICTOR', 'FOLLOWER', 'SAGE', 'ORACLE', 'STREAK', 'UNSTOPPABLE', 'EXPERT', 'CHALLENGER', 'CHAMPION'),
    allowNull: false
  },
  unlockedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isClaimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
});

// Notification Model
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('REMINDER', 'RESULT', 'RANK', 'ACHIEVEMENT'),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Associations
User.hasMany(Prediction, { foreignKey: 'userId', onDelete: 'CASCADE' });
Prediction.belongsTo(User, { foreignKey: 'userId' });

Match.hasMany(Prediction, { foreignKey: 'matchId', onDelete: 'CASCADE' });
Prediction.belongsTo(Match, { foreignKey: 'matchId' });

User.hasMany(ScorePrediction, { foreignKey: 'userId', onDelete: 'CASCADE' });
ScorePrediction.belongsTo(User, { foreignKey: 'userId' });

Match.hasMany(ScorePrediction, { foreignKey: 'matchId', onDelete: 'CASCADE' });
ScorePrediction.belongsTo(Match, { foreignKey: 'matchId' });

User.hasMany(Leaderboard, { foreignKey: 'userId', onDelete: 'CASCADE' });
Leaderboard.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Reward, { foreignKey: 'userId', onDelete: 'CASCADE' });
Reward.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Achievement, { foreignKey: 'userId', onDelete: 'CASCADE' });
Achievement.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Match,
  Prediction,
  ScorePrediction,
  Leaderboard,
  Reward,
  Achievement,
  Notification
};
