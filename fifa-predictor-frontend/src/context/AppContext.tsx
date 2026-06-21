'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  points: number;
  rank: number;
  correctPredictions: number;
  predictionAccuracy: number;
  activeStreak: number;
  maxStreak: number;
  isAdmin: boolean;
}

export interface Match {
  id: number;
  teamA: string;
  teamB: string;
  teamAFlag: string;
  teamBFlag: string;
  kickoffTime: string;
  status: 'scheduled' | 'live' | 'completed';
  teamAGoals: number | null;
  teamBGoals: number | null;
  winner: 'teamA' | 'teamB' | 'draw' | null;
  predictedSplit?: { teamA: number; teamB: number; draw: number };
}

export interface Prediction {
  id: number;
  userId: number;
  matchId: number;
  predictedWinner: 'teamA' | 'teamB' | 'draw';
  pointsEarned: number;
  isProcessed: boolean;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'REMINDER' | 'RESULT' | 'RANK' | 'ACHIEVEMENT';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Reward {
  id: number;
  title: string;
  description: string;
  type: 'cash' | 'merchandise';
  value: string;
  claimedAt: string | null;
}

export interface Achievement {
  id: number;
  badgeType: 'FIRST_PICK' | 'PREDICTOR' | 'FOLLOWER' | 'SAGE' | 'ORACLE' | 'STREAK' | 'UNSTOPPABLE' | 'EXPERT' | 'CHALLENGER' | 'CHAMPION';
  unlockedAt: string;
  isClaimed: boolean;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  matches: Match[];
  predictions: Prediction[];
  notifications: Notification[];
  rewards: Reward[];
  achievements: Achievement[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (googleId: string, email: string, name: string) => Promise<boolean>;
  logout: () => void;
  submitPrediction: (matchId: number, winner: 'teamA' | 'teamB' | 'draw') => Promise<boolean>;
  markNotificationsAsRead: () => Promise<void>;
  claimReward: (rewardId: number) => Promise<boolean>;
  claimBadge: (badgeType: string) => Promise<boolean>;
  fetchData: () => Promise<void>;
  adminAddMatch: (matchData: Partial<Match>) => Promise<boolean>;
  adminEditMatch: (matchId: number, matchData: Partial<Match>) => Promise<boolean>;
  adminDeleteMatch: (matchId: number) => Promise<boolean>;
  adminResolveMatch: (matchId: number, teamAGoals: number, teamBGoals: number) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE = 'http://localhost:5000/api';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper headers
  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, [token]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('fifa_token');
    setToken(null);
    setUser(null);
    setPredictions([]);
    setNotifications([]);
    setRewards([]);
    setAchievements([]);
  }, []);

  // Fetch match fixtures (public)
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  }, []);

  // Fetch core user data after authentication
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // 1. Fetch user profile
      const userRes = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else if (userRes.status === 401 || userRes.status === 403) {
        logout();
        return;
      }

      // 2. Fetch predictions
      const predRes = await fetch(`${API_BASE}/predictions/my`, { headers: getHeaders() });
      if (predRes.ok) {
        const { predictions: p } = await predRes.json();
        setPredictions(p);
      }

      // 3. Fetch rewards & achievements
      const rewRes = await fetch(`${API_BASE}/rewards`, { headers: getHeaders() });
      if (rewRes.ok) {
        const { achievements: ach, rewards: rew } = await rewRes.json();
        setAchievements(ach);
        setRewards(rew);
      }

      // 4. Fetch notifications
      const notRes = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (notRes.ok) {
        const notificationsData = await notRes.json();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [token, getHeaders, logout]);

  // Auth: Email Login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('fifa_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Auth: Register
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('fifa_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  // Auth: Mock Google Login
  const loginWithGoogle = async (googleId: string, email: string, name: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleId, email, name })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('fifa_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  };

  // Predictions: Submit Winner (Outcome only)
  const submitPrediction = async (matchId: number, winner: 'teamA' | 'teamB' | 'draw'): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/predictions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ matchId, predictedWinner: winner })
      });
      if (res.ok) {
        await fetchData(); // refresh predictions & stats
        return true;
      }
      return false;
    } catch (error) {
      console.error('Winner prediction submit error:', error);
      return false;
    }
  };

  // Notifications: Mark as read
  const markNotificationsAsRead = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/notifications/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Mark read notifications error:', error);
    }
  };

  // Rewards: Claim Merchandise
  const claimReward = async (rewardId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/rewards/claim`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rewardId })
      });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Claim reward error:', error);
      return false;
    }
  };

  // Badges: Claim Achievement Badge
  const claimBadge = async (badgeType: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/badges/claim`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ badgeType })
      });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Claim badge error:', error);
      return false;
    }
  };

  // --- ADMIN ACTIONS ---
  const adminAddMatch = async (matchData: Partial<Match>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/admin/matches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(matchData)
      });
      if (res.ok) {
        await fetchMatches();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin add match error:', error);
      return false;
    }
  };

  const adminEditMatch = async (matchId: number, matchData: Partial<Match>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/admin/matches/${matchId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(matchData)
      });
      if (res.ok) {
        await fetchMatches();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin edit match error:', error);
      return false;
    }
  };

  const adminDeleteMatch = async (matchId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/admin/matches/${matchId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        await fetchMatches();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin delete match error:', error);
      return false;
    }
  };

  const adminResolveMatch = async (matchId: number, teamAGoals: number, teamBGoals: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/admin/matches/${matchId}/result`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ teamAGoals, teamBGoals })
      });
      if (res.ok) {
        await fetchMatches();
        await fetchData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin resolve match error:', error);
      return false;
    }
  };

  // Auto load token and fetch public matches
  useEffect(() => {
    const savedToken = localStorage.getItem('fifa_token');
    if (savedToken) {
      setToken(savedToken);
    }
    fetchMatches().finally(() => setIsLoading(false));
  }, [fetchMatches]);

  // Re-fetch user data when token changes
  useEffect(() => {
    if (token) {
      fetchData();
      // Auto poll leaderboard / user profile every 15 seconds to ensure real-time updates
      const timer = setInterval(() => {
        fetchData();
        fetchMatches();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [token, fetchData, fetchMatches]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        matches,
        predictions,
        notifications,
        rewards,
        achievements,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        submitPrediction,
        markNotificationsAsRead,
        claimReward,
        claimBadge,
        fetchData,
        adminAddMatch,
        adminEditMatch,
        adminDeleteMatch,
        adminResolveMatch
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
