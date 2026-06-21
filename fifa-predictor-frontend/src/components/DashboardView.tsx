'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match } from '@/context/AppContext';
import { Award, Trophy, Target, Flame, Calendar, Clock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TeamFlag } from './TeamFlag';

interface DashboardViewProps {
  onPredictClick: (match: Match) => void;
  onLoginClick: () => void;
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({ onPredictClick, onLoginClick, setCurrentTab }: DashboardViewProps) {
  const { user, matches, achievements } = useApp();
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [now, setNow] = useState(new Date());

  // Update time reference every 10 seconds for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Trigger confetti when a new achievement is unlocked
  useEffect(() => {
    if (achievements.length > unlockedCount) {
      if (unlockedCount > 0) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 }
        });
      }
      setUnlockedCount(achievements.length);
    }
  }, [achievements, unlockedCount]);

  // Filters to find the next 3 active upcoming matches (scheduled or live)
  const upcomingMatches = matches
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())
    .slice(0, 3);

  const getMatchTimeStatus = (match: Match) => {
    if (match.status === 'completed') return 'completed';
    if (match.status === 'live') return 'live';
    
    const kickoff = new Date(match.kickoffTime).getTime();
    const diff = kickoff - now.getTime();
    
    if (diff < 1 * 60 * 60 * 1000) {
      return 'locked'; // Closes 1 hour before play
    }
    if (diff <= 24 * 60 * 60 * 1000) {
      return 'open'; // Opens 24 hours before play
    }
    return 'scheduled'; // Not open yet (more than 24 hours away)
  };

  const getBannerInfo = (match: Match) => {
    const status = getMatchTimeStatus(match);
    
    if (status === 'live') {
      return {
        text: 'Live Match',
        color: 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
      };
    }
    if (status === 'locked') {
      return {
        text: 'Prediction Locked',
        color: 'bg-red-50 text-red-600 border border-red-100'
      };
    }
    
    const kickoff = new Date(match.kickoffTime).getTime();
    const diff = kickoff - now.getTime();
    
    if (status === 'open') {
      const diffOpen = diff - 1 * 60 * 60 * 1000;
      const hours = Math.floor(diffOpen / (1000 * 60 * 60));
      const mins = Math.floor((diffOpen % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `Open Now (Closes in ${hours}h ${mins}m)`,
        color: 'bg-green-50 text-green-700 border border-green-200 animate-pulse'
      };
    }
    
    // Scheduled (Opens in X time)
    const diffOpens = diff - 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffOpens / (1000 * 60 * 60));
    if (hours > 24) {
      return {
        text: `Opens in ${Math.floor(hours / 24)} days`,
        color: 'bg-slate-50 text-text-light border border-slate-100'
      };
    }
    return {
      text: `Opens in ${hours} hours`,
      color: 'bg-slate-50 text-text-light border border-slate-100'
    };
  };

  const getCTAButton = (match: Match) => {
    const timeStatus = getMatchTimeStatus(match);
    
    if (timeStatus === 'open') {
      if (user) {
        return (
          <button
            onClick={() => onPredictClick(match)}
            className="w-full bg-orange-50/70 border border-orange-100 hover:bg-primary-orange hover:border-primary-orange hover:text-white text-text-dark font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 hover:translate-y-[-1px] cursor-pointer"
          >
            Predict Now ⚽
          </button>
        );
      } else {
        return (
          <button
            onClick={onLoginClick}
            className="w-full bg-slate-50 border border-slate-200 text-text-light font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            Sign in to Predict
          </button>
        );
      }
    }
    
    let buttonText = 'Opening Soon 📅';
    if (timeStatus === 'live') {
      buttonText = 'Match is Live ⚽';
    } else if (timeStatus === 'locked') {
      buttonText = 'Predictions Locked 🔒';
    }
    
    return (
      <button
        disabled
        className="w-full bg-slate-50 border border-slate-200/60 text-text-light font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-not-allowed opacity-80"
      >
        {buttonText}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {user ? (
        <>
          {/* Welcome Dashboard Profile Card */}
          <div className="bg-gradient-to-br from-primary-orange to-light-orange text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden mb-8">
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 text-[180px] leading-none opacity-10 pointer-events-none select-none">
              ⚽
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-3 py-1 text-xs font-bold border border-white/10">
                  <Sparkles className="h-3.5 w-3.5" />
                  Active Season 2026
                </span>
                <h1 className="text-2xl sm:text-3xl font-black">
                  Welcome back, {user.username}!
                </h1>
                <p className="text-white/85 text-xs sm:text-sm max-w-md">
                  Check upcoming FIFA fixtures below, make outcome predictions, and claim mystery rewards.
                </p>
              </div>

              {/* Quick stats on the welcome card */}
              <div className="grid grid-cols-2 gap-4 bg-white/10 border border-white/10 backdrop-blur-xs p-4 rounded-2xl w-full sm:w-auto">
                <div className="text-center">
                  <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wider">Rank</span>
                  <strong className="text-xl font-extrabold text-white">#{user.rank || '-'}</strong>
                </div>
                <div className="text-center border-l border-white/10 pl-4">
                  <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wider">Accuracy</span>
                  <strong className="text-xl font-extrabold text-white">{user.predictionAccuracy || 0}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-10">
            {/* Points card */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/50 shadow-sm flex items-center gap-4.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-primary-orange shadow-inner font-bold">
                <Award className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[10px] text-text-light font-bold block uppercase tracking-wider">Total Points</span>
                <strong className="text-lg font-black text-text-dark">{user.points || 0} pts</strong>
              </div>
            </div>

            {/* Rank card */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/50 shadow-sm flex items-center gap-4.5 font-bold">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-warning-yellow shadow-inner">
                <Trophy className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[10px] text-text-light font-bold block uppercase tracking-wider">Current Rank</span>
                <strong className="text-lg font-black text-text-dark">#{user.rank || '-'}</strong>
              </div>
            </div>

            {/* Correct Picks card */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/50 shadow-sm flex items-center gap-4.5 font-bold">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-green-600 shadow-inner">
                <Target className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[10px] text-text-light font-bold block uppercase tracking-wider">Correct Picks</span>
                <strong className="text-lg font-black text-text-dark">{user.correctPredictions || 0}</strong>
              </div>
            </div>

            {/* Streaks card */}
            <div className="bg-white rounded-2xl p-5 border border-orange-100/50 shadow-sm flex items-center gap-4.5 font-bold">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 shadow-inner">
                <Flame className="h-5.5 w-5.5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] text-text-light font-bold block uppercase tracking-wider">Active Streak</span>
                <strong className="text-lg font-black text-text-dark">🔥 {user.activeStreak || 0}</strong>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Guest CTA Banner */
        <div className="bg-white rounded-3xl p-8 border border-orange-100/50 shadow-md text-center mb-10 max-w-xl mx-auto">
          <span className="text-4xl block mb-3 font-bold">🎮</span>
          <h2 className="text-xl font-bold text-text-dark">Ready to predict World Cup outcomes?</h2>
          <p className="text-xs text-text-light mt-1.5 leading-relaxed max-w-sm mx-auto">
            Create an account or sign in to save predictions, monitor leaderboards, check accuracy, and qualify for mystery rewards.
          </p>
          <button
            onClick={onLoginClick}
            className="mt-5 bg-primary-orange hover:bg-primary-orange/95 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-primary-orange/15 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Fixtures Title */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-dark flex items-center gap-1.5">
          <Calendar className="h-5 w-5 text-primary-orange" />
          Upcoming FIFA Matches
        </h2>
        {user && (
          <button
            onClick={() => setCurrentTab('fixtures')}
            className="text-xs font-bold text-primary-orange hover:text-primary-orange/85 transition-colors cursor-pointer"
          >
            View all matches
          </button>
        )}
      </div>

      {/* Matches Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingMatches.map(match => {
          const banner = getBannerInfo(match);
          
          return (
            <div 
              key={match.id}
              className="bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header Status Countdown */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${banner.color}`}>
                    <Clock className="h-3 w-3" />
                    {banner.text}
                  </span>
                </div>

                {/* Team Info flags */}
                <div className="flex items-center justify-center gap-4 text-center mt-3 mb-4">
                  <div className="flex-1 flex flex-col items-center">
                    <TeamFlag flag={match.teamAFlag} teamName={match.teamA} className="text-4xl block mb-1.5" />
                    <strong className="text-xs font-bold text-text-dark line-clamp-1 w-full">{match.teamA}</strong>
                  </div>
                  <span className="text-[10px] font-black text-text-light uppercase tracking-wider mt-4">VS</span>
                  <div className="flex-1 flex flex-col items-center">
                    <TeamFlag flag={match.teamBFlag} teamName={match.teamB} className="text-4xl block mb-1.5" />
                    <strong className="text-xs font-bold text-text-dark line-clamp-1 w-full">{match.teamB}</strong>
                  </div>
                </div>

                {/* Kickoff schedule details */}
                <div className="text-center text-[10px] text-text-light font-bold mt-2">
                  {new Date(match.kickoffTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              {/* CTA Action button */}
              <div className="mt-5 pt-3 border-t border-orange-50/50">
                {getCTAButton(match)}
              </div>
            </div>
          );
        })}

        {upcomingMatches.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
            <span className="text-3xl">⚽</span>
            <strong className="text-sm text-text-dark">No matches available.</strong>
            <span>Check back soon for World Cup fixtures!</span>
          </div>
        )}
      </div>
    </div>
  );
}
