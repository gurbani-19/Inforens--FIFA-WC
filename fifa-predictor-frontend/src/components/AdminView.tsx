'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match, User } from '@/context/AppContext';
import { Settings, Shield, PlusCircle, Trash, Edit, RefreshCw, Download, Filter, Save, Calendar, UserCheck } from 'lucide-react';
import { TeamFlag } from './TeamFlag';

export default function AdminView() {
  const { 
    token,
    matches, 
    adminAddMatch, 
    adminEditMatch, 
    adminDeleteMatch, 
    adminResolveMatch 
  } = useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results' | 'users'>('fixtures');

  // Match Form state
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [teamAFlag, setTeamAFlag] = useState('');
  const [teamBFlag, setTeamBFlag] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');

  // Results state
  const [scores, setScores] = useState<{ [matchId: number]: { a: string, b: string } }>({});
  const [submittingResultId, setSubmittingResultId] = useState<number | null>(null);

  const API_BASE = 'http://localhost:5000/api';

  // Fetch all users list
  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching admin users:', err);
      }
    };
    fetchUsers();
  }, [token]);

  // Set initial score values for inputs
  useEffect(() => {
    const initialScores: typeof scores = {};
    matches.forEach(m => {
      initialScores[m.id] = { 
        a: m.teamAGoals?.toString() || '0', 
        b: m.teamBGoals?.toString() || '0' 
      };
    });
    setScores(initialScores);
  }, [matches]);

  const handleScoreChange = (matchId: number, side: 'a' | 'b', val: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: val
      }
    }));
  };

  const handleSubmitResult = async (matchId: number) => {
    const matchScore = scores[matchId];
    if (!matchScore || matchScore.a === '' || matchScore.b === '') return;
    
    setSubmittingResultId(matchId);
    try {
      const goalsA = parseInt(matchScore.a);
      const goalsB = parseInt(matchScore.b);
      const success = await adminResolveMatch(matchId, goalsA, goalsB);
      if (success) {
        alert('Match resolved and points recalculated!');
      } else {
        alert('Failed to resolve match.');
      }
    } catch (err) {
      alert('Error communicating with database.');
    } finally {
      setSubmittingResultId(null);
    }
  };

  const handleReprocessResult = async (matchId: number) => {
    const matchScore = scores[matchId];
    if (!matchScore || matchScore.a === '' || matchScore.b === '') return;
    
    setSubmittingResultId(matchId);
    try {
      const res = await fetch(`${API_BASE}/admin/matches/${matchId}/reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamAGoals: parseInt(matchScore.a),
          teamBGoals: parseInt(matchScore.b)
        })
      });
      if (res.ok) {
        alert('Match result reprocessed and ranks recalculated successfully!');
      } else {
        alert('Failed to reprocess match.');
      }
    } catch (err) {
      alert('Error communicating with database.');
    } finally {
      setSubmittingResultId(null);
    }
  };

  const handleAddOrEditMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA || !teamB || !teamAFlag || !teamBFlag || !kickoffTime) {
      alert('Please fill out all fields.');
      return;
    }

    const payload = {
      teamA,
      teamB,
      teamAFlag,
      teamBFlag,
      kickoffTime: new Date(kickoffTime).toISOString()
    };

    let success = false;
    if (isEditing) {
      success = await adminEditMatch(isEditing, payload);
    } else {
      success = await adminAddMatch(payload);
    }

    if (success) {
      setTeamA('');
      setTeamB('');
      setTeamAFlag('');
      setTeamBFlag('');
      setKickoffTime('');
      setIsEditing(null);
    } else {
      alert('Failed to save match.');
    }
  };

  const startEdit = (m: Match) => {
    setIsEditing(m.id);
    setTeamA(m.teamA);
    setTeamB(m.teamB);
    setTeamAFlag(m.teamAFlag);
    setTeamBFlag(m.teamBFlag);
    
    const d = new Date(m.kickoffTime);
    const tzoffset = d.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    setKickoffTime(localISOTime);
  };

  const handleDelete = async (matchId: number) => {
    if (confirm('Are you sure you want to delete this match? This removes all associated user predictions.')) {
      const success = await adminDeleteMatch(matchId);
      if (!success) alert('Failed to delete match.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/leaderboard/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fifa_leaderboard.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Failed to export CSV.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const pendingMatches = matches.filter(m => m.status !== 'completed');
  const settledMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-orange-100 pb-6 mb-8">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-text-dark flex items-center justify-center sm:justify-start gap-2">
            <Shield className="h-8 w-8 text-red-500" />
            Admin Panel
          </h1>
          <p className="text-xs text-text-light mt-1">
            Tournament, result scores, users database, and leaderboard correction tools.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl transition-all shadow-md shadow-green-600/10 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Export Leaderboard CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-orange-50/50 p-1.5 rounded-2xl border border-orange-100/35 mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'fixtures' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
          Manage Matches
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'results' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          <Save className="h-3.5 w-3.5 inline mr-1.5" />
          Enter Scores
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'users' ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 inline mr-1.5" />
          Manage Users
        </button>
      </div>

      {/* Fixtures Tab */}
      {activeTab === 'fixtures' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Add Match Form */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md h-fit">
            <h2 className="text-base font-bold text-text-dark mb-4 flex items-center gap-1.5">
              <PlusCircle className="h-5 w-5 text-primary-orange" />
              {isEditing ? 'Edit FIFA Match' : 'Add FIFA Match'}
            </h2>
            <form onSubmit={handleAddOrEditMatch} className="space-y-4 text-xs font-semibold text-text-dark">
              <div>
                <label className="text-text-light block mb-1">Team A Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. England"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
                />
              </div>

              <div>
                <label className="text-text-light block mb-1">Team A Flag (Emoji or SVG Link)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🏴󠁧󠁢󠁥󠁮󠁧󠁿 or https://..."
                  value={teamAFlag}
                  onChange={(e) => setTeamAFlag(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
                />
              </div>

              <div>
                <label className="text-text-light block mb-1">Team B Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brazil"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
                />
              </div>

              <div>
                <label className="text-text-light block mb-1">Team B Flag (Emoji or SVG Link)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🇧🇷 or https://..."
                  value={teamBFlag}
                  onChange={(e) => setTeamBFlag(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
                />
              </div>

              <div>
                <label className="text-text-light block mb-1">Kickoff Time & Date</label>
                <input
                  type="datetime-local"
                  required
                  value={kickoffTime}
                  onChange={(e) => setKickoffTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary-orange hover:bg-primary-orange/95 text-white font-bold py-2.5 rounded-xl shadow transition-all cursor-pointer text-center"
                >
                  {isEditing ? 'Save Changes' : 'Create Match'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(null);
                      setTeamA('');
                      setTeamB('');
                      setTeamAFlag('');
                      setTeamBFlag('');
                      setKickoffTime('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-text-dark font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Matches List */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md lg:col-span-2">
            <h2 className="text-base font-bold text-text-dark mb-4">FIFA Match Fixtures</h2>
            <div className="space-y-3">
              {matches.map(m => (
                <div 
                  key={m.id}
                  className="flex items-center justify-between p-4 bg-orange-50/20 border border-orange-100 rounded-2xl text-xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 items-center">
                      <TeamFlag flag={m.teamAFlag} teamName={m.teamA} className="text-2xl shrink-0" />
                      <span className="text-[10px] font-black text-text-light">VS</span>
                      <TeamFlag flag={m.teamBFlag} teamName={m.teamB} className="text-2xl shrink-0" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-text-dark block">{m.teamA} vs {m.teamB}</strong>
                      <span className="text-text-light block">{new Date(m.kickoffTime).toLocaleString()}</span>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.status === 'completed' ? 'bg-green-50 text-green-700' :
                        m.status === 'live' ? 'bg-red-50 text-red-700 animate-pulse' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(m)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-text-dark rounded-xl transition-all cursor-pointer"
                      title="Edit Match"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
                      title="Delete Match"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enter Scores / Reprocessing Tab */}
      {activeTab === 'results' && (
        <div className="space-y-8">
          {/* Pending Settlement */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md">
            <h2 className="text-base font-bold text-text-dark mb-2">Pending Match Settlement</h2>
            <p className="text-xs text-text-light mb-6">
              Enter final goals to settle scheduled or live match outcomes. Ranks, streak multipliers, and claimed badges recalculate dynamically.
            </p>

            <div className="space-y-4">
              {pendingMatches.map(m => {
                const currentScore = scores[m.id] || { a: '0', b: '0' };
                return (
                  <div 
                    key={m.id}
                    className="flex flex-col md:flex-row items-center justify-between p-5 bg-orange-50/20 border border-orange-100 rounded-2xl gap-4 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-4 text-left w-full md:w-auto">
                      <div className="flex gap-1.5 items-center">
                        <TeamFlag flag={m.teamAFlag} teamName={m.teamA} className="text-2xl shrink-0" />
                        <span className="text-[10px] font-black text-text-light">VS</span>
                        <TeamFlag flag={m.teamBFlag} teamName={m.teamB} className="text-2xl shrink-0" />
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-text-dark block">{m.teamA} vs {m.teamB}</strong>
                        <span className="text-text-light">{new Date(m.kickoffTime).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <span className="text-[10px] text-text-light block mb-1">{m.teamA} Goals</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.a}
                          onChange={(e) => handleScoreChange(m.id, 'a', e.target.value)}
                          className="w-16 text-center py-2 rounded-xl border border-orange-200 text-sm font-black outline-none bg-white"
                        />
                      </div>
                      <span className="text-sm font-bold text-text-light mt-4">-</span>
                      <div className="text-center">
                        <span className="text-[10px] text-text-light block mb-1">{m.teamB} Goals</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.b}
                          onChange={(e) => handleScoreChange(m.id, 'b', e.target.value)}
                          className="w-16 text-center py-2 rounded-xl border border-orange-200 text-sm font-black outline-none bg-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSubmitResult(m.id)}
                      disabled={submittingResultId === m.id}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-primary-orange hover:bg-primary-orange/95 disabled:bg-orange-300 text-white font-bold px-5 py-3 rounded-xl shadow transition-all cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${submittingResultId === m.id ? 'animate-spin' : ''}`} />
                      Settle Outcome
                    </button>
                  </div>
                );
              })}
              
              {pendingMatches.length === 0 && (
                <div className="text-center py-6 text-text-light">
                  No pending matches to settle.
                </div>
              )}
            </div>
          </div>

          {/* Finalized Match Reprocessing */}
          <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md">
            <h2 className="text-base font-bold text-text-dark mb-2">Finalized Matches (Reprocessing / Correction Tool)</h2>
            <p className="text-xs text-text-light mb-6">
              Correct matching errors or adjust match outcomes retroactively. Streak lengths, user points, standings positions, and notification logs recalculate in a safe transactional process.
            </p>

            <div className="space-y-4">
              {settledMatches.map(m => {
                const currentScore = scores[m.id] || { a: m.teamAGoals?.toString() || '0', b: m.teamBGoals?.toString() || '0' };
                return (
                  <div 
                    key={m.id}
                    className="flex flex-col md:flex-row items-center justify-between p-5 bg-green-50/10 border border-green-100/50 rounded-2xl gap-4 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-4 text-left w-full md:w-auto">
                      <div className="flex gap-1.5 items-center">
                        <TeamFlag flag={m.teamAFlag} teamName={m.teamA} className="text-2xl shrink-0" />
                        <span className="text-[10px] font-black text-text-light">VS</span>
                        <TeamFlag flag={m.teamBFlag} teamName={m.teamB} className="text-2xl shrink-0" />
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-text-dark block">{m.teamA} vs {m.teamB}</strong>
                        <span className="text-text-light block">{new Date(m.kickoffTime).toLocaleString()}</span>
                        <span className="text-[10px] text-green-700 font-extrabold mt-1 uppercase block bg-green-50 px-2 py-0.5 rounded-full border border-green-200 w-fit">
                          Settled: {m.teamAGoals} - {m.teamBGoals} ({m.winner === 'draw' ? 'Draw' : m.winner === 'teamA' ? `${m.teamA} Win` : `${m.teamB} Win`})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <span className="text-[10px] text-text-light block mb-1">{m.teamA} Goals</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.a}
                          onChange={(e) => handleScoreChange(m.id, 'a', e.target.value)}
                          className="w-16 text-center py-2.5 rounded-xl border border-orange-200 text-sm font-black outline-none bg-white"
                        />
                      </div>
                      <span className="text-sm font-bold text-text-light mt-4">-</span>
                      <div className="text-center">
                        <span className="text-[10px] text-text-light block mb-1">{m.teamB} Goals</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.b}
                          onChange={(e) => handleScoreChange(m.id, 'b', e.target.value)}
                          className="w-16 text-center py-2.5 rounded-xl border border-orange-200 text-sm font-black outline-none bg-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleReprocessResult(m.id)}
                      disabled={submittingResultId === m.id}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl shadow transition-all cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${submittingResultId === m.id ? 'animate-spin' : ''}`} />
                      Reprocess Result
                    </button>
                  </div>
                );
              })}
              
              {settledMatches.length === 0 && (
                <div className="text-center py-6 text-text-light">
                  No completed matches settled yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Database Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-orange-100/50 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-base font-bold text-text-dark">Registered Users Database</h2>
            <div className="relative flex items-center w-full sm:w-64">
              <Filter className="absolute left-3 h-4 w-4 text-text-light" />
              <input
                type="text"
                placeholder="Filter username / email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-orange-200/60 bg-orange-50/10 focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-orange-50/30 text-text-light text-[10px] font-bold uppercase tracking-wider border-b border-orange-100/50">
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Points</th>
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4 text-center">Active Streak</th>
                  <th className="py-3 px-4 text-center">Is Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/30 text-text-dark font-medium">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-orange-50/10">
                    <td className="py-3.5 px-4 font-mono text-text-light">#{u.id}</td>
                    <td className="py-3.5 px-4 flex items-center gap-2">
                      <span className="text-base">{u.avatar}</span>
                      <span>{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 text-text-light">{u.email}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-primary-orange">{u.points}</td>
                    <td className="py-3.5 px-4 text-center font-bold">#{u.rank || '-'}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-orange-500">🔥 {u.activeStreak}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        u.isAdmin ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-text-light border border-slate-200'
                      }`}>
                        {u.isAdmin ? 'Admin' : 'Player'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
