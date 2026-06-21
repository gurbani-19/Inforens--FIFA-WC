'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match } from '@/context/AppContext';
import { Calendar, Award, Clock, CheckCircle2, AlertCircle, BarChart3, HelpCircle } from 'lucide-react';
import { TeamFlag } from './TeamFlag';

interface PredictionsViewProps {
  onLoginClick: () => void;
  defaultTab?: 'open' | 'locked' | 'completed' | 'history';
  selectedMatchId?: number;
}

export default function PredictionsView({ onLoginClick, defaultTab = 'open', selectedMatchId }: PredictionsViewProps) {
  const { user, matches, predictions, submitPrediction } = useApp();
  const [activeTab, setActiveTab] = useState<'open' | 'locked' | 'completed' | 'history'>(defaultTab);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [lastSelectedMatchId, setLastSelectedMatchId] = useState<number | null>(null);

  // Filter definitions based on 24h opening and 1h locking rules
  const getMatchTimeStatus = (match: Match) => {
    if (match.status === 'completed') return 'completed';
    if (match.status === 'live') return 'locked';
    
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

  // Sync activeTab when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Auto-switch to correct tab and scroll to selected match
  useEffect(() => {
    if (selectedMatchId && selectedMatchId !== lastSelectedMatchId && matches.length > 0) {
      const match = matches.find(m => m.id === selectedMatchId);
      if (match) {
        const status = getMatchTimeStatus(match);
        if (status === 'open') {
          setActiveTab('open');
        } else if (status === 'locked') {
          setActiveTab('locked');
        } else if (status === 'completed') {
          setActiveTab('completed');
        }
        
        setLastSelectedMatchId(selectedMatchId);
        
        // Wait a brief moment for the tab content to render, then scroll to the match card
        setTimeout(() => {
          const element = document.getElementById(`match-card-${selectedMatchId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);
      }
    }
  }, [selectedMatchId, matches, lastSelectedMatchId]);

  // Update time reference every 10 seconds for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Find user's predictions
  const userPredictionMap = new Map(predictions.map(p => [p.matchId, p]));
  const userPredictedMatches = matches.filter(m => userPredictionMap.has(m.id));

  const openMatches = matches.filter(m => {
    const timeStatus = getMatchTimeStatus(m);
    if (timeStatus !== 'open') return false;
    // If the user has predicted an open match, it moves to locked tab
    if (user && userPredictionMap.has(m.id)) return false;
    return true;
  });

  const lockedMatches = matches.filter(m => {
    const timeStatus = getMatchTimeStatus(m);
    if (timeStatus === 'locked') return true;
    if (timeStatus === 'open' && user && userPredictionMap.has(m.id)) return true;
    return false;
  });

  const completedMatches = matches.filter(m => getMatchTimeStatus(m) === 'completed');

  // Countdown string helper (Closes in X hours Y minutes)
  const getCountdownString = (kickoffTime: string) => {
    const diff = new Date(kickoffTime).getTime() - now.getTime() - 1 * 60 * 60 * 1000;
    if (diff <= 0) return 'Closing soon';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) {
      return `Closes in: ${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Closes in: ${hours}h ${mins}m`;
  };

  // Social proof live splits (adapted for 3-way soccer outcomes)
  const getSocialProofSplit = (match: Match) => {
    if (match.predictedSplit) {
      return match.predictedSplit;
    }
    const valA = 30 + (match.id * 7) % 25;
    const valDraw = 20 + (match.id * 3) % 20;
    const valB = 100 - valA - valDraw;
    return { teamA: valA, draw: valDraw, teamB: valB };
  };

  const handlePredictSubmit = async (matchId: number, winner: 'teamA' | 'teamB' | 'draw') => {
    if (!user) {
      onLoginClick();
      return;
    }
    setSavingId(matchId);
    setErrorMsg(null);
    try {
      const success = await submitPrediction(matchId, winner);
      if (!success) {
        setErrorMsg('Failed to lock in prediction. Check if window is closed.');
      }
    } catch (err) {
      setErrorMsg('Error connecting to server.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-dark sm:text-4xl flex items-center justify-center gap-2">
          <Calendar className="h-8 w-8 text-primary-orange" />
          FIFA World Cup Prediction Center
        </h1>
        <p className="mt-2 text-sm text-text-light">
          Back match outcomes (Home Win, Draw, or Away Win) during the 24-hour open window. Predictions lock immediately upon submission.
        </p>
      </div>

      {errorMsg && (
        <div className="mx-auto max-w-md mb-6 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 justify-center">
          <AlertCircle className="h-4 w-4" />
          {errorMsg}
        </div>
      )}

      {/* Tabs list */}
      <div className="flex flex-wrap bg-orange-50/50 p-1.5 rounded-2xl border border-orange-100/30 mb-8 max-w-2xl mx-auto gap-1 sm:gap-0">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'open' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          Open Predictions ({openMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('locked')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'locked' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          Locked / Live ({lockedMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'completed' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          Completed ({completedMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          My Predictions ({user ? userPredictedMatches.length : 0})
        </button>
      </div>

      {/* 1. OPEN FOR PREDICTIONS */}
      {activeTab === 'open' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {openMatches.map(match => {
            const pred = userPredictionMap.get(match.id);
            const countdownStr = getCountdownString(match.kickoffTime);
            
            return (
              <div 
                key={match.id}
                id={`match-card-${match.id}`}
                className={`bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  match.id === selectedMatchId ? 'ring-2 ring-primary-orange ring-offset-2 scale-[1.01]' : ''
                }`}
              >
                {pred && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center z-10 p-4 text-center">
                    <CheckCircle2 className="h-10 w-10 text-success-green mb-2 animate-bounce" />
                    <span className="text-sm font-black text-text-dark block">Prediction Locked In ✅</span>
                    <span className="text-[11px] text-text-light mt-1">
                      You backed <strong className="text-primary-orange">
                        {pred.predictedWinner === 'teamA' ? match.teamA : pred.predictedWinner === 'teamB' ? match.teamB : 'Draw'}
                      </strong>
                    </span>
                    <span className="text-[9px] bg-orange-50 text-primary-orange px-2 py-0.5 rounded-full mt-3 font-bold">
                      No edits are allowed
                    </span>
                  </div>
                )}

                <div>
                  {/* Header Status & Countdown */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-200 uppercase animate-pulse">
                      <Clock className="h-3 w-3" />
                      {countdownStr}
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

                {/* Inline Home / Draw / Away Buttons */}
                <div className="mt-5 pt-3 border-t border-orange-50/50">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handlePredictSubmit(match.id, 'teamA')}
                      disabled={savingId === match.id}
                      className="bg-orange-50/70 border border-orange-100/50 hover:bg-primary-orange hover:border-primary-orange hover:text-white text-text-dark font-extrabold text-[10px] py-2.5 px-1 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 truncate"
                      title={`${match.teamA} Win`}
                    >
                      {match.teamA} Win
                    </button>
                    <button
                      onClick={() => handlePredictSubmit(match.id, 'draw')}
                      disabled={savingId === match.id}
                      className="bg-orange-50/70 border border-orange-100/50 hover:bg-primary-orange hover:border-primary-orange hover:text-white text-text-dark font-extrabold text-[10px] py-2.5 px-1 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 text-center"
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => handlePredictSubmit(match.id, 'teamB')}
                      disabled={savingId === match.id}
                      className="bg-orange-50/70 border border-orange-100/50 hover:bg-primary-orange hover:border-primary-orange hover:text-white text-text-dark font-extrabold text-[10px] py-2.5 px-1 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 truncate"
                      title={`${match.teamB} Win`}
                    >
                      {match.teamB} Win
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {openMatches.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">⚽</span>
              <strong className="text-sm text-text-dark">No open predictions available right now.</strong>
              <span>Predictions open 24 hours before match kickoff.</span>
            </div>
          )}
        </div>
      )}

      {/* 2. LOCKED / LIVE */}
      {activeTab === 'locked' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lockedMatches.map(match => {
            const pred = userPredictionMap.get(match.id);
            const split = getSocialProofSplit(match);
            const isLive = match.status === 'live';
            
            return (
              <div 
                key={match.id}
                id={`match-card-${match.id}`}
                className={`bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col justify-between transition-all duration-300 ${
                  match.id === selectedMatchId ? 'ring-2 ring-primary-orange ring-offset-2 scale-[1.01]' : ''
                }`}
              >
                <div>
                  {/* Status Ribbon */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-50 text-red-600 border border-red-200 uppercase">
                      <Clock className="h-3 w-3" />
                      {isLive ? 'Live Match' : (getMatchTimeStatus(match) === 'open' ? 'Prediction Locked' : 'Locked')}
                    </span>
                    <span className="text-[10px] text-text-light font-bold">
                      {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Team Flags */}
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

                <div className="mt-5 pt-3 border-t border-orange-50/50 space-y-3">
                  {/* 3-way dynamic splits bar */}
                  <div className="bg-orange-50/20 border border-orange-100/40 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-bold text-text-light block uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5 text-primary-orange" />
                      Predicted Splits
                    </span>
                    <div className="flex items-center justify-between text-[9px] font-black text-text-dark gap-2">
                      <span className="truncate">{match.teamA}: {split.teamA}%</span>
                      <span>Draw: {split.draw}%</span>
                      <span className="truncate">{match.teamB}: {split.teamB}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5 flex">
                      <div className="bg-primary-orange h-full" style={{ width: `${split.teamA}%` }}></div>
                      <div className="bg-slate-300 h-full" style={{ width: `${split.draw}%` }}></div>
                      <div className="bg-amber-500 h-full" style={{ width: `${split.teamB}%` }}></div>
                    </div>
                  </div>

                  {/* User Prediction display */}
                  {user && (
                    <div className="text-center text-[10px] font-bold text-text-light">
                      Your Choice: {pred ? (
                        <span className="text-primary-orange font-extrabold">
                          {pred.predictedWinner === 'teamA' ? `${match.teamA} Win` : pred.predictedWinner === 'teamB' ? `${match.teamB} Win` : 'Draw'}
                        </span>
                      ) : (
                        <span className="text-red-500 font-extrabold">No predictions submitted</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {lockedMatches.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">🔒</span>
              <strong className="text-sm text-text-dark">No locked or active live matches right now.</strong>
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLETED MATCHES */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedMatches.map(match => {
            const pred = userPredictionMap.get(match.id);
            const split = getSocialProofSplit(match);
            
            return (
              <div 
                key={match.id}
                id={`match-card-${match.id}`}
                className={`bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 ${
                  match.id === selectedMatchId ? 'ring-2 ring-primary-orange ring-offset-2 scale-[1.01]' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                  <div className="flex items-center gap-4 text-center">
                    <div className="flex flex-col items-center w-20">
                      <TeamFlag flag={match.teamAFlag} teamName={match.teamA} className="text-3xl" />
                      <strong className="text-xs text-text-dark mt-1 truncate w-full">{match.teamA}</strong>
                    </div>

                    <div className="bg-orange-50/50 border border-orange-100 px-4 py-2 rounded-xl text-base font-black text-text-dark">
                      {match.teamAGoals} - {match.teamBGoals}
                    </div>

                    <div className="flex flex-col items-center w-20">
                      <TeamFlag flag={match.teamBFlag} teamName={match.teamB} className="text-3xl" />
                      <strong className="text-xs text-text-dark mt-1 truncate w-full">{match.teamB}</strong>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-56 bg-orange-50/10 border border-orange-100/50 rounded-xl p-2.5 text-[10px] font-semibold text-text-light">
                  <span className="block text-[8px] font-bold text-center uppercase tracking-wider mb-1">Social Proof</span>
                  <div className="flex justify-between font-bold text-text-dark gap-2">
                    <span>{match.teamA}: {split.teamA}%</span>
                    <span>Draw: {split.draw}%</span>
                    <span>{match.teamB}: {split.teamB}%</span>
                  </div>
                </div>

                <div className="text-center md:text-right text-xs space-y-1 w-full md:w-auto">
                  <span className="block text-[10px] font-bold text-text-light">FINAL RESULT</span>
                  <span className="block text-text-dark font-extrabold uppercase bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-[9px] w-fit mx-auto md:ml-auto">
                    {match.winner === 'draw' ? 'Draw' : `${match.winner === 'teamA' ? match.teamA : match.teamB} Wins`}
                  </span>
                  
                  {user && (
                    <div className="pt-1.5 text-[10px] font-bold">
                      {pred ? (
                        pred.predictedWinner === match.winner ? (
                          <span className="text-success-green flex items-center justify-center md:justify-end gap-0.5">
                            Correct Pick (+1 pt) ✅
                          </span>
                        ) : (
                          <span className="text-red-500">Incorrect Pick (0 pts) ❌</span>
                        )
                      ) : (
                        <span className="text-text-light">No prediction made</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {completedMatches.length === 0 && (
            <div className="bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">📊</span>
              <strong className="text-sm text-text-dark">No completed matches available yet.</strong>
            </div>
          )}
        </div>
      )}

      {/* 4. MY PREDICTIONS LOG */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {!user ? (
            <div className="bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">🔒</span>
              <strong className="text-sm text-text-dark">Sign in to review your predictions log</strong>
              <button
                onClick={onLoginClick}
                className="mt-2 bg-primary-orange hover:bg-primary-orange/95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Leaderboard stats header summary */}
              <div className="grid gap-4 grid-cols-3 bg-gradient-to-r from-primary-orange to-light-orange text-white rounded-2xl p-5 shadow-sm">
                <div className="text-center">
                  <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wider">Total Score</span>
                  <strong className="text-lg font-black">{user.points || 0} pts</strong>
                </div>
                <div className="text-center border-x border-white/10">
                  <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wider">Accuracy</span>
                  <strong className="text-lg font-black">{user.predictionAccuracy || 0}%</strong>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wider">Streak</span>
                  <strong className="text-lg font-black">🔥 {user.activeStreak || 0}</strong>
                </div>
              </div>

              {/* History list */}
              <div className="space-y-4">
                {userPredictedMatches.map(match => {
                  const pred = userPredictionMap.get(match.id)!;
                  const isResolved = match.status === 'completed';
                  const isCorrect = isResolved && pred.predictedWinner === match.winner;
                  
                  return (
                    <div 
                      key={match.id}
                      className="bg-white rounded-3xl p-5 border border-orange-100/40 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-4 justify-between sm:justify-start w-full sm:w-auto">
                        <div className="flex gap-1.5 items-center">
                          <TeamFlag flag={match.teamAFlag} teamName={match.teamA} className="text-2xl" />
                          <span className="text-[10px] font-black text-text-light">VS</span>
                          <TeamFlag flag={match.teamBFlag} teamName={match.teamB} className="text-2xl" />
                        </div>
                        <div className="text-left">
                          <strong className="text-xs font-bold text-text-dark block">{match.teamA} vs {match.teamB}</strong>
                          <span className="text-[10px] text-text-light block">{new Date(match.kickoffTime).toLocaleString()}</span>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                            isResolved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isResolved ? 'Completed' : 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Picks Details */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                        <div className="text-right text-xs">
                          <span className="text-[9px] text-text-light font-bold block uppercase tracking-wider">Your Pick</span>
                          <span className="font-extrabold text-text-dark">
                            {pred.predictedWinner === 'teamA' ? `${match.teamA} Win` : pred.predictedWinner === 'teamB' ? `${match.teamB} Win` : 'Draw'}
                          </span>
                        </div>

                        <div className="border-l border-orange-100 pl-6 text-right text-xs">
                          <span className="text-[9px] text-text-light font-bold block uppercase tracking-wider">Points</span>
                          {isResolved ? (
                            <span className={`font-black flex items-center justify-end gap-0.5 ${isCorrect ? 'text-success-green' : 'text-red-500'}`}>
                              {isCorrect ? '✅ +1 pt' : '❌ 0 pts'}
                            </span>
                          ) : (
                            <span className="text-text-light font-bold">Locked In ✅</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {userPredictedMatches.length === 0 && (
                  <div className="bg-white rounded-3xl p-10 border border-orange-100/50 shadow-md text-center py-12 text-text-light text-xs flex flex-col items-center gap-2">
                    <span className="text-3xl">🔮</span>
                    <strong className="text-sm text-text-dark">No predictions logged yet.</strong>
                    <span>Back match outcomes in the Open Predictions tab to populate this list.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
