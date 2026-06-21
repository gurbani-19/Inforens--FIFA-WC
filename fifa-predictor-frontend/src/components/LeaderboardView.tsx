'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Trophy, ArrowLeft, ArrowRight } from 'lucide-react';

interface LeaderboardUser {
  id: number;
  username: string;
  avatar?: string | null;
  points: number;
  rank: number;
  predictionAccuracy: number;
  activeStreak: number;
  Achievements?: { badgeType: string }[];
}

const BADGE_ICONS: Record<string, string> = {
  FIRST_PICK: '🎯',
  PREDICTOR: '📈',
  FOLLOWER: '📅',
  SAGE: '🔮',
  ORACLE: '🎓',
  STREAK: '🔥',
  UNSTOPPABLE: '⚡',
  EXPERT: '👑',
  CHALLENGER: '🚀',
  CHAMPION: '🏆',
};

interface LeaderboardResponse {
  users: LeaderboardUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function LeaderboardView() {
  const { user: currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    let active = true;
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/leaderboard?search=${encodeURIComponent(search)}&page=${page}&limit=20`
        );
        if (res.ok && active) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLeaderboard();
    
    // Auto refresh every 15 seconds
    const poll = setInterval(loadLeaderboard, 15000);
    
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [search, page, currentUser?.points, currentUser?.rank]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Sticky banner helper: should display if currentUser is logged in, has a rank,
  // and is NOT in the current data users list.
  const shouldShowStickyBanner = () => {
    if (!currentUser || !data || !data.users) return false;
    return !data.users.some((u) => u.id === currentUser.id);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 relative">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-dark sm:text-4xl flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-warning-yellow" />
          Live Leaderboard
        </h1>
        <p className="mt-2 text-sm text-text-light">
          Track rankings by total points, with prediction accuracy resolving sub-rank positions.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center justify-end mb-6 bg-white p-4 rounded-2xl border border-orange-100/50 shadow-sm">
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="absolute left-3 h-4 w-4 text-text-light" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-orange-200/60 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-colors"
          />
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-white rounded-3xl border border-orange-100/50 shadow-md overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-orange-50/40 text-text-light text-xs font-bold uppercase tracking-wider border-b border-orange-100/60">
                <th className="py-4.5 px-6">Rank</th>
                <th className="py-4.5 px-6">Player</th>
                <th className="py-4.5 px-6 text-center">Points</th>
                <th className="py-4.5 px-6 text-center">Accuracy</th>
                <th className="py-4.5 px-6 text-center">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/40 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4.5 px-6"><div className="h-4.5 w-8 bg-orange-100 rounded"></div></td>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100"></div>
                        <div className="h-4 w-24 bg-orange-100 rounded"></div>
                      </div>
                    </td>
                    <td className="py-4.5 px-6"><div className="mx-auto h-4.5 w-12 bg-orange-100 rounded"></div></td>
                    <td className="py-4.5 px-6"><div className="mx-auto h-4.5 w-12 bg-orange-100 rounded"></div></td>
                    <td className="py-4.5 px-6"><div className="mx-auto h-4.5 w-12 bg-orange-100 rounded"></div></td>
                  </tr>
                ))
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-light">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">🔍</span>
                      <strong className="text-sm text-text-dark">No players found</strong>
                    </div>
                  </td>
                </tr>
              ) : (
                data.users.map((row) => {
                  const isSelf = currentUser && row.id === currentUser.id;
                  
                  let rankBadge = `${row.rank}`;
                  if (row.rank === 1) rankBadge = '🥇 1';
                  else if (row.rank === 2) rankBadge = '🥈 2';
                  else if (row.rank === 3) rankBadge = '🥉 3';

                  return (
                    <tr 
                      key={row.id}
                      className={`transition-colors ${
                        isSelf 
                          ? 'bg-primary-orange/5 font-semibold text-primary-orange' 
                          : 'hover:bg-orange-50/20 text-text-dark'
                      }`}
                    >
                      <td className="py-4 px-6 font-extrabold">{rankBadge}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-base shadow-sm shrink-0">
                            {row.avatar || '⚽'}
                          </span>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate max-w-[120px] sm:max-w-none font-bold text-text-dark">
                              {row.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] shrink-0 bg-primary-orange text-white px-1.5 py-0.5 rounded-full font-bold">
                                YOU
                              </span>
                            )}
                            {/* Claimed Badges */}
                            {row.Achievements && row.Achievements.length > 0 && (
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {row.Achievements.slice(0, 3).map((ach) => (
                                  <span
                                    key={ach.badgeType}
                                    className="inline-flex items-center justify-center w-5 h-5 text-xs bg-slate-50 rounded-full border border-slate-100 shadow-xs"
                                    title={ach.badgeType.replace('_', ' ')}
                                  >
                                    {BADGE_ICONS[ach.badgeType] || '🏅'}
                                  </span>
                                ))}
                                {row.Achievements.length > 3 && (
                                  <span className="text-[10px] text-text-light font-black ml-0.5">
                                    +{row.Achievements.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-black">{row.points || 0}</td>
                      <td className="py-4 px-6 text-center text-text-light">{row.predictionAccuracy || 0}%</td>
                      <td className="py-4 px-6 text-center font-bold text-orange-500">
                        {row.activeStreak > 0 ? `🔥 ${row.activeStreak}` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-orange-100 px-6 py-4">
            <span className="text-xs text-text-light">
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="flex items-center gap-1 bg-white hover:bg-orange-50 disabled:bg-slate-50 border border-orange-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, data.totalPages))}
                disabled={page === data.totalPages}
                className="flex items-center gap-1 bg-white hover:bg-orange-50 disabled:bg-slate-50 border border-orange-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* User Row Sticky Highlight */}
        {shouldShowStickyBanner() && (
          <div className="sticky bottom-0 bg-primary-orange text-white px-6 py-4 flex items-center justify-between shadow-2xl rounded-b-3xl border-t border-white/10 font-bold">
            <div className="flex items-center gap-3">
              <span className="font-extrabold">#{currentUser!.rank || '-'}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base shadow-sm">
                {currentUser!.avatar || '⚽'}
              </span>
              <span className="truncate max-w-[120px] sm:max-w-none">{currentUser!.username} (You)</span>
            </div>
            <div className="flex items-center gap-4.5 sm:gap-6 text-xs sm:text-sm">
              <div className="text-right">
                <span className="text-[9px] text-white/80 block uppercase tracking-wider">Points</span>
                <span className="font-black">{currentUser!.points || 0} pts</span>
              </div>
              <div className="border-l border-white/20 pl-4.5 text-right">
                <span className="text-[9px] text-white/80 block uppercase tracking-wider">Accuracy</span>
                <span className="font-black">{currentUser!.predictionAccuracy || 0}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
