'use client';

import React from 'react';
import { BookOpen, Trophy, Clock, BadgeAlert } from 'lucide-react';

interface RulesViewProps {
  setViewBadges?: () => void;
}

export default function RulesView({ setViewBadges }: RulesViewProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-dark sm:text-4xl flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-primary-orange" />
          Game Rules & Scoring
        </h1>
        <p className="mt-3 text-lg text-text-light max-w-xl mx-auto">
          Learn how to make predictions, earn points, unlock special football badges, and claim achievements.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Prediction Timeline Lock Card */}
        <div className="bg-white rounded-3xl p-8 border border-orange-100/50 shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary-orange mb-6">
            <Clock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-text-dark mb-3">Prediction Timeline</h2>
          <p className="text-sm text-text-light mb-6">
            Predictions are regulated by strict locks to ensure fair play:
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600">1</span>
              <div>
                <strong className="text-sm font-semibold text-text-dark block">Predictions Open</strong>
                <span className="text-xs text-text-light">24 hours before match kickoff time. The prediction options become tappable on your feed.</span>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">2</span>
              <div>
                <strong className="text-sm font-semibold text-text-dark block">Predictions Close / Lock</strong>
                <span className="text-xs text-text-light">Exactly **1 hour before match start time**. After this, all prediction inputs are disabled and become read-only.</span>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-primary-orange">3</span>
              <div>
                <strong className="text-sm font-semibold text-text-dark block">No Edits Once Submitted</strong>
                <span className="text-xs text-text-light">Once you tap and submit your outcome choice, it is locked immediately ("Locked In ✅"). No updates are allowed.</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Scoring Logic Card */}
        <div className="bg-white rounded-3xl p-8 border border-orange-100/50 shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary-orange mb-6">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-text-dark mb-3">Points Calculator</h2>
          <p className="text-sm text-text-light mb-6">
            Earn points based on outcome correctness. Simple binary scoring:
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-orange-50 pb-2">
              <div>
                <strong className="text-sm font-bold text-text-dark">Team Win prediction</strong>
                <p className="text-[11px] text-text-light">Correctly choosing the match winner (Team A Wins or Team B Wins)</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-600">+1 Point</span>
            </div>

            <div className="flex items-center justify-between border-b border-orange-50 pb-2">
              <div>
                <strong className="text-sm font-bold text-text-dark">Draw prediction</strong>
                <p className="text-[11px] text-text-light">Correctly choosing a draw outcome</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-600">+1 Point</span>
            </div>

            <div className="flex items-center justify-between pb-2">
              <div>
                <strong className="text-sm font-semibold text-text-dark block">Incorrect prediction</strong>
                <p className="text-[11px] text-text-light">Choosing the wrong outcome, or not submitting a prediction before the 1-hour lock</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600">0 Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges & Achievements Strip */}
      <div className="mt-8 bg-gradient-to-br from-primary-orange to-light-orange text-white rounded-3xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-7 w-7 text-white" />
          <h2 className="text-xl font-bold">Badges & Achievements</h2>
        </div>
        <p className="text-sm text-white/90 leading-relaxed max-w-3xl mb-4">
          Predict matches, maintain streaks, improve accuracy, and climb the leaderboard to unlock unique badges and achievements. Multiple badges can be unlocked throughout the tournament.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 text-text-dark mt-6">
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">🎯</span>
            <strong className="text-xs font-black block">First Pick</strong>
            <span className="text-[9px] text-text-light block mt-0.5">First prediction submitted</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">📈</span>
            <strong className="text-xs font-black block">Predictor</strong>
            <span className="text-[9px] text-text-light block mt-0.5">5 predictions submitted</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">🔮</span>
            <strong className="text-xs font-black block">Football Sage</strong>
            <span className="text-[9px] text-text-light block mt-0.5">5 correct predictions</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">🔥</span>
            <strong className="text-xs font-black block">Hot Streak</strong>
            <span className="text-[9px] text-text-light block mt-0.5">3 correct predictions in a row</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">🎓</span>
            <strong className="text-xs font-black block">Oracle</strong>
            <span className="text-[9px] text-text-light block mt-0.5">10 correct predictions</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 border border-white/20 text-center shadow-sm">
            <span className="text-2xl block mb-1">🏆</span>
            <strong className="text-xs font-black block">Champion</strong>
            <span className="text-[9px] text-text-light block mt-0.5">Finish Top 3 in standings</span>
          </div>
        </div>
      </div>

      {/* Redirect CTA to Badges page */}
      {setViewBadges && (
        <div className="mt-8 bg-orange-50/50 border border-orange-100 rounded-3xl p-8 text-center flex flex-col items-center gap-3">
          <h3 className="text-lg font-bold text-text-dark">View All Available Badges</h3>
          <p className="text-xs text-text-light max-w-md">
            Check the full list of achievements, track your current progress, and claim your earned badges to display them on the leaderboard.
          </p>
          <button
            onClick={setViewBadges}
            className="bg-primary-orange hover:bg-primary-orange/95 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-primary-orange/10 hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            Go To Badges
          </button>
        </div>
      )}
    </div>
  );
}
