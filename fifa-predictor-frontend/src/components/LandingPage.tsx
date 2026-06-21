'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match } from '@/context/AppContext';
import { Trophy, Gift, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { TeamFlag } from './TeamFlag';
import Image from 'next/image';
import fifaLogo from '../../public/fifa_logo.png';

interface LandingPageProps {
  onPlayNowClick: () => void;
  setViewLeaderboard: () => void;
}

export default function LandingPage({ onPlayNowClick, setViewLeaderboard }: LandingPageProps) {
  const { user, matches } = useApp();
  const [now, setNow] = useState(new Date());

  // Update clock reference for match countdown banners
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter to find next 3 upcoming/live matches
  const upcomingMatches = matches
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())
    .slice(0, 3);

  // Generate banners based on opening (24h) and closing (1h) rules
  const getBannerInfo = (match: Match) => {
    if (match.status === 'live') {
      return {
        text: 'Live Match',
        color: 'bg-red-500 text-white border border-red-400 animate-pulse'
      };
    }
    
    const kickoff = new Date(match.kickoffTime).getTime();
    const diff = kickoff - now.getTime();
    
    if (diff < 1 * 60 * 60 * 1000) {
      return {
        text: 'Prediction Locked',
        color: 'bg-slate-800 text-slate-300 border border-slate-700'
      };
    }
    if (diff <= 24 * 60 * 60 * 1000) {
      const diffOpen = diff - 1 * 60 * 60 * 1000;
      const hours = Math.floor(diffOpen / (1000 * 60 * 60));
      const mins = Math.floor((diffOpen % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `Open (Closes in: ${hours}h ${mins}m)`,
        color: 'bg-green-500 text-white border border-green-400'
      };
    }
    
    // Opens in X time
    const diffOpens = diff - 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffOpens / (1000 * 60 * 60));
    if (hours > 24) {
      return {
        text: `Opens in ${Math.floor(hours / 24)} days`,
        color: 'bg-orange-50/80 text-primary-orange border border-orange-100'
      };
    }
    return {
      text: `Opens in ${hours} hours`,
      color: 'bg-orange-50/80 text-primary-orange border border-orange-100'
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 1. Hero Banner: FIFA Theme with Slogan */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-orange-500/20 mb-12">
        {/* Glow circles */}
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-primary-orange/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-light-orange/15 rounded-full blur-3xl"></div>

        <div className="relative z-10 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-orange/20 px-3.5 py-1.5 text-xs font-black text-primary-orange border border-primary-orange/30 uppercase tracking-widest">
              ⚽ FIFA World Cup Predictor
            </span>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-orange-100 to-primary-orange bg-clip-text text-transparent">
              Out of this World! 🚀
            </h1>
            <p className="text-lg font-semibold text-orange-200">
              Champions Rise Here • Back the World's Best Teams
            </p>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Track outcomes, predict correct winners or draws, build win streaks, and compete on the global standings. Experience the thrills of the FIFA World Cup 2026!
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={onPlayNowClick}
                className="bg-primary-orange hover:bg-primary-orange/95 text-white font-bold text-sm px-6.5 py-3.5 rounded-xl shadow-lg shadow-primary-orange/15 transition-all hover:translate-y-[-1px] cursor-pointer flex items-center justify-center gap-2"
              >
                Predict Matches Now
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={setViewLeaderboard}
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm px-6.5 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          {/* Official FIFA World Cup Logo */}
          <div className="md:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[280px] aspect-square bg-white rounded-2xl p-4 flex items-center justify-center shadow-lg">
              <Image
                src={fifaLogo}
                alt="FIFA World Cup Logo"
                className="w-full h-full object-contain rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Section: Next 3 Open/Upcoming Matches */}
      <div className="mb-12">
        <h2 className="text-xl font-extrabold text-text-dark mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-orange animate-spin-slow" />
          Next 3 Upcoming Matches
        </h2>

        <div className="grid gap-6 sm:grid-cols-3">
          {upcomingMatches.map(match => {
            const banner = getBannerInfo(match);
            
            return (
              <div 
                key={match.id}
                className="bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-lg"
              >
                <div>
                  {/* Status Banner */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase shadow-sm ${banner.color}`}>
                      {banner.text}
                    </span>
                    <span className="text-[10px] text-text-light font-bold">
                      {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Teams info */}
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

                  <div className="text-center text-[10px] text-text-light font-bold mt-2">
                    {new Date(match.kickoffTime).toLocaleDateString([], { dateStyle: 'medium' })}
                  </div>
                </div>

                <button
                  onClick={onPlayNowClick}
                  className="mt-5 w-full bg-orange-50/70 border border-orange-100 hover:bg-primary-orange hover:border-primary-orange hover:text-white text-text-dark font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Predict Match ⚽
                </button>
              </div>
            );
          })}

          {upcomingMatches.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">📅</span>
              <strong className="text-sm text-text-dark">No upcoming matches scheduled right now.</strong>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Grid: Rules and Prizes */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Rules Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/50 shadow-md">
          <h2 className="text-lg font-bold text-text-dark mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-orange" />
            Quick Game Rules
          </h2>
          <div className="space-y-4 text-xs font-semibold text-text-dark">
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-primary-orange mt-0.5">1</span>
              <div>
                <strong className="text-text-dark">24h Prediction Window</strong>
                <p className="text-[10px] text-text-light font-medium mt-0.5">Predictions open 24 hours and close exactly 1 hour before kickoff.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-primary-orange mt-0.5">2</span>
              <div>
                <strong className="text-text-dark">Locked In (No Edits)</strong>
                <p className="text-[10px] text-text-light font-medium mt-0.5">Once you click to save your outcome choice, your pick is instantly saved and locked.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-primary-orange mt-0.5">3</span>
              <div>
                <strong className="text-text-dark">Correct Predictions Earn Points</strong>
                <p className="text-[10px] text-text-light font-medium mt-0.5">Get 1 point for a correct outcome prediction (win or draw), 0 for incorrect.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prizes Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/50 shadow-md flex flex-col justify-center items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary-orange mb-4">
            <Gift className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-text-dark mb-2">Exciting Mystery Rewards</h2>
          <p className="text-xs text-text-light max-w-xs leading-relaxed">
            Finish high on the leaderboard for exclusive mystery rewards. Keep predicting, climbing the leaderboard, and unlocking achievements!
          </p>
        </div>
      </div>
    </div>
  );
}
