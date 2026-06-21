'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Award, Trophy, ShieldAlert, Zap, Flame, Target, Calendar, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RewardsView() {
  const { user, achievements, predictions, claimBadge } = useApp();
  const [claimInProgress, setClaimInProgress] = useState<string | null>(null);

  const handleClaimBadge = async (badgeType: string) => {
    setClaimInProgress(badgeType);
    try {
      const success = await claimBadge(badgeType);
      if (success) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Error claiming badge:', err);
    } finally {
      setClaimInProgress(null);
    }
  };

  const totalPicks = user ? predictions.length : 0;
  const correctPicks = user ? user.correctPredictions : 0;
  const maxStreak = user ? user.maxStreak : 0;
  const currentRank = user ? user.rank : 0;

  // 10 Badges lists configuration adapted for football
  const badgesConfig = [
    {
      type: 'FIRST_PICK',
      name: 'First Pick',
      desc: 'First prediction submitted',
      icon: '🎯',
      target: 1,
      current: totalPicks,
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    },
    {
      type: 'PREDICTOR',
      name: 'Predictor',
      desc: '5 predictions submitted',
      icon: '📈',
      target: 5,
      current: totalPicks,
      color: 'bg-amber-50 text-amber-600 border-amber-200'
    },
    {
      type: 'FOLLOWER',
      name: 'Tournament Follower',
      desc: '10 predictions submitted',
      icon: '📅',
      target: 10,
      current: totalPicks,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    },
    {
      type: 'SAGE',
      name: 'Football Sage',
      desc: '5 correct winner predictions',
      icon: '🔮',
      target: 5,
      current: correctPicks,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
    },
    {
      type: 'ORACLE',
      name: 'Oracle',
      desc: '10 correct predictions',
      icon: '🎓',
      target: 10,
      current: correctPicks,
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      type: 'STREAK',
      name: 'Hot Streak',
      desc: '3 correct predictions in a row',
      icon: '🔥',
      target: 3,
      current: maxStreak,
      color: 'bg-red-50 text-red-600 border-red-200'
    },
    {
      type: 'UNSTOPPABLE',
      name: 'Unstoppable',
      desc: '5 correct predictions in a row',
      icon: '⚡',
      target: 5,
      current: maxStreak,
      color: 'bg-rose-50 text-rose-600 border-rose-200'
    },
    {
      type: 'EXPERT',
      name: 'World Cup Expert',
      desc: '25 correct predictions',
      icon: '👑',
      target: 25,
      current: correctPicks,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      type: 'CHALLENGER',
      name: 'Global Challenger',
      desc: 'Reach Top 25 in standings',
      icon: '🚀',
      target: 25,
      current: currentRank > 0 && currentRank <= 25 ? 25 : 0,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      customProgressText: currentRank > 0 ? `#${currentRank} / Top 25` : 'Unranked'
    },
    {
      type: 'CHAMPION',
      name: 'World Cup Champion',
      desc: 'Finish Top 3 in standings',
      icon: '🏆',
      target: 3,
      current: currentRank > 0 && currentRank <= 3 ? 3 : 0,
      color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      customProgressText: currentRank > 0 ? `#${currentRank} / Top 3` : 'Unranked'
    }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-dark sm:text-4xl flex items-center justify-center gap-2">
          <Award className="h-8 w-8 text-primary-orange" />
          Achievements & Badges
        </h1>
        <p className="mt-2 text-sm text-text-light max-w-xl mx-auto">
          Track your predictions history, maintain hot streaks, and unlock unique collectible badges as you climb the global ranks.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Achievements Grid (Left 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md">
          <h2 className="text-lg font-bold text-text-dark mb-6 flex items-center gap-2 border-b border-orange-50 pb-3">
            <Trophy className="h-5 w-5 text-warning-yellow" />
            Badges Log ({achievements.length} Unlocked)
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badgesConfig.map(badge => {
              const unlockData = achievements.find(a => a.badgeType === badge.type);
              const isUnlocked = !!unlockData;
              const isClaimed = unlockData?.isClaimed || false;
              
              // Calculate progress percentage
              let progressPct = 0;
              if (badge.type === 'CHALLENGER' || badge.type === 'CHAMPION') {
                progressPct = isUnlocked ? 100 : 0;
              } else {
                progressPct = Math.min((badge.current / badge.target) * 100, 100);
              }

              return (
                <div 
                  key={badge.type}
                  className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    isClaimed
                      ? 'border-green-300 bg-green-50/15 shadow-inner scale-[1.01]'
                      : isUnlocked
                      ? 'border-amber-400 bg-amber-50/30 shadow-md scale-[1.02] ring-1 ring-amber-400/20'
                      : 'border-slate-100 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`text-3xl filter-none ${!isUnlocked ? 'grayscale opacity-60' : ''}`}>{badge.icon}</span>
                      {isClaimed ? (
                        <span className="text-[9px] bg-green-50 border border-green-300 text-green-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                          Claimed ✅
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[9px] bg-amber-100 border border-amber-300 text-amber-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Ready to Claim
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 border border-slate-300 text-slate-500 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Locked
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-text-dark mt-4">{badge.name}</h3>
                    <p className="text-[10px] text-text-light mt-1 leading-relaxed">{badge.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    {isClaimed ? (
                      <span className="text-[9px] text-green-600 font-medium block text-center">
                        Claimed on: {unlockData ? new Date(unlockData.unlockedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </span>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleClaimBadge(badge.type)}
                        disabled={claimInProgress === badge.type}
                        className="w-full bg-primary-orange hover:bg-primary-orange/95 text-white font-extrabold text-[10px] py-1.5 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {claimInProgress === badge.type ? 'Claiming...' : 'Claim Badge 🏆'}
                      </button>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center text-[9px] text-text-light font-bold mb-1">
                          <span>Progress</span>
                          <span>
                            {badge.customProgressText ? badge.customProgressText : `${badge.current} / ${badge.target}`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary-orange h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tournament Stats Panel (Right 1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md h-fit">
          <h2 className="text-lg font-bold text-text-dark mb-6 border-b border-orange-50 pb-3 flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5 text-primary-orange" />
            Tournament Stats
          </h2>
          
          {user ? (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex justify-between border-b border-orange-50 pb-3 items-center">
                <span className="text-text-light">Current Rank</span>
                <strong className="text-text-dark text-base font-black">#{user.rank || '-'}</strong>
              </div>
              <div className="flex justify-between border-b border-orange-50 pb-3 items-center">
                <span className="text-text-light">Total Points</span>
                <strong className="text-primary-orange text-base font-black">{user.points || 0} pts</strong>
              </div>
              <div className="flex justify-between border-b border-orange-50 pb-3 items-center">
                <span className="text-text-light">Correct Picks</span>
                <strong className="text-text-dark text-base font-black">{correctPicks}</strong>
              </div>
              <div className="flex justify-between border-b border-orange-50 pb-3 items-center">
                <span className="text-text-light">Accuracy</span>
                <strong className="text-text-dark text-base font-black">{user.predictionAccuracy || 0.0}%</strong>
              </div>
              <div className="flex justify-between border-b border-orange-50 pb-3 items-center">
                <span className="text-text-light">Predictions Submitted</span>
                <strong className="text-text-dark text-base font-black">{totalPicks}</strong>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-text-light">Max Streak</span>
                <strong className="text-orange-600 text-base font-black">🔥 {maxStreak}</strong>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-text-light text-xs flex flex-col items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-orange-300" />
              <span>Sign in to view your prediction statistics and unlock progress trackers.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
