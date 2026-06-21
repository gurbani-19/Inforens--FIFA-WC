'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match } from '@/context/AppContext';
import { Calendar, Clock, Trophy } from 'lucide-react';
import { TeamFlag } from './TeamFlag';

interface FixturesViewProps {
  onPredictClick?: (match: Match) => void;
  onLoginClick?: () => void;
}

export default function FixturesView({ onPredictClick, onLoginClick }: FixturesViewProps) {
  const { user, matches } = useApp();
  const [now, setNow] = useState(new Date());

  // Update time reference every 10 seconds for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Check if prediction is open (between 24h and 1h before kickoff)
  const isMatchActive = (match: Match) => {
    if (match.status === 'completed' || match.status === 'live') return false;
    const kickoff = new Date(match.kickoffTime).getTime();
    const diff = kickoff - now.getTime();
    return diff >= 1 * 60 * 60 * 1000 && diff <= 24 * 60 * 60 * 1000;
  };

  const handleCardClick = (match: Match) => {
    if (user) {
      onPredictClick?.(match);
    } else {
      onLoginClick?.();
    }
  };

  // Sort matches chronologically
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );

  // Generate banners based on opening (24h) and closing (1h) rules
  const getBannerInfo = (match: Match) => {
    if (match.status === 'completed') {
      return {
        text: 'Match Completed',
        color: 'bg-green-50 text-green-700 border border-green-200'
      };
    }
    if (match.status === 'live') {
      return {
        text: 'Live Match',
        color: 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
      };
    }
    
    const kickoff = new Date(match.kickoffTime).getTime();
    const diff = kickoff - now.getTime();
    
    if (diff < 1 * 60 * 60 * 1000) {
      return {
        text: 'Prediction Locked',
        color: 'bg-red-50 text-red-600 border border-red-100'
      };
    }
    if (diff <= 24 * 60 * 60 * 1000) {
      const diffOpen = diff - 1 * 60 * 60 * 1000;
      const hours = Math.floor(diffOpen / (1000 * 60 * 60));
      const mins = Math.floor((diffOpen % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `Open Now (Closes in ${hours}h ${mins}m)`,
        color: 'bg-green-50 text-green-700 border border-green-200 animate-pulse'
      };
    }
    
    const diffOpens = diff - 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffOpens / (1000 * 60 * 60));
    if (hours > 24) {
      return {
        text: `Opens in ${Math.floor(hours / 24)} days`,
        color: 'bg-slate-50 text-text-light border border-slate-200'
      };
    }
    return {
      text: `Opens in ${hours} hours`,
      color: 'bg-slate-50 text-text-light border border-slate-200'
    };
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-dark sm:text-4xl flex items-center justify-center gap-2">
          <Calendar className="h-8 w-8 text-primary-orange" />
          FIFA World Cup Schedule
        </h1>
        <p className="mt-2 text-sm text-text-light">
          Full tournament schedule and prediction windows. Predictions open 24 hours and lock 1 hour before kickoff.
        </p>
      </div>

      {/* Grid of All Matches */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedMatches.map(match => {
          const banner = getBannerInfo(match);
          const isCompleted = match.status === 'completed';
          const active = isMatchActive(match);

          return (
            <div 
              key={match.id}
              onClick={() => active && handleCardClick(match)}
              className={`bg-white rounded-3xl p-5 border shadow-md flex flex-col justify-between transition-all ${
                active 
                  ? 'border-orange-100/50 hover:border-primary-orange/60 hover:shadow-lg cursor-pointer hover:scale-[1.01]' 
                  : 'border-orange-100/40'
              }`}
            >
              <div>
                {/* Header Status & Countdown */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${banner.color}`}>
                    <Clock className="h-3 w-3" />
                    {banner.text}
                  </span>
                  <span className="text-[10px] text-text-light font-bold">
                    {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Team Details Flags */}
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

              {/* Bottom Info / Results Details */}
              <div className="mt-5 pt-3 border-t border-orange-50/50">
                {isCompleted ? (
                  <div className="bg-green-50/30 border border-green-100/50 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-bold text-green-700 block uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-warning-yellow" />
                      Result Score
                    </span>
                    {match.teamAGoals !== null && match.teamBGoals !== null ? (
                      <div className="text-xs font-black text-text-dark">
                        {match.teamA} {match.teamAGoals} - {match.teamBGoals} {match.teamB}
                      </div>
                    ) : (
                      <div className="text-xs font-black text-text-dark">
                        {match.teamA} vs {match.teamB}
                      </div>
                    )}
                    <div className="text-[10px] text-green-700 font-extrabold uppercase mt-1">
                      {match.winner === 'draw' ? 'Draw' : (match.winner ? `Winner: ${match.winner === 'teamA' ? match.teamA : match.teamB}` : 'No Result')}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[10px] font-semibold text-text-light">
                    {match.status === 'live' ? (
                      <span className="text-red-500 font-bold">Match is live in play! ⚽</span>
                    ) : active ? (
                      <span className="text-primary-orange font-bold animate-pulse">Click to Predict Now! ⚽</span>
                    ) : (
                      <span>Fixture is scheduled</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sortedMatches.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
            <span className="text-3xl">📅</span>
            <strong className="text-sm text-text-dark">No scheduled matches available.</strong>
          </div>
        )}
      </div>
    </div>
  );
}
