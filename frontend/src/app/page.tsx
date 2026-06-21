'use client';

import React, { useState, useEffect } from 'react';
import { useApp, Match } from '@/context/AppContext';

// Views
import LandingPage from '@/components/LandingPage';
import DashboardView from '@/components/DashboardView';
import FixturesView from '@/components/FixturesView';
import PredictionsView from '@/components/PredictionsView';
import LeaderboardView from '@/components/LeaderboardView';
import RewardsView from '@/components/RewardsView';
import RulesView from '@/components/RulesView';
import AdminView from '@/components/AdminView';

// Overlay Components
import Navigation from '@/components/Navigation';
import AuthModal from '@/components/AuthModal';
import NotificationsDrawer from '@/components/NotificationsDrawer';

export default function Home() {
  const { user, isLoading } = useApp();
  
  // Navigation & Page routing state
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  
  // Overlays state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Redirect to Dashboard if logged in, otherwise default to Landing
  useEffect(() => {
    if (user) {
      if (currentTab === 'landing') {
        setCurrentTab('dashboard');
      }
    } else {
      if (currentTab === 'dashboard' || currentTab === 'admin') {
        setCurrentTab('landing');
      }
    }
  }, [user, currentTab]);

  const handlePlayNow = () => {
    if (user) {
      setCurrentTab('dashboard');
    } else {
      setAuthModalOpen(true);
    }
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'landing':
        return (
          <LandingPage 
            onPlayNowClick={handlePlayNow} 
            setViewLeaderboard={() => setCurrentTab('leaderboard')} 
          />
        );
      case 'dashboard':
        return (
          <DashboardView 
            onPredictClick={(match) => {
              setSelectedMatchId(match.id);
              setCurrentTab('predictions');
            }}
            onLoginClick={() => setAuthModalOpen(true)}
            setCurrentTab={setCurrentTab}
          />
        );
      case 'fixtures':
        return (
          <FixturesView 
            onPredictClick={(match) => {
              setSelectedMatchId(match.id);
              setCurrentTab('predictions');
            }}
            onLoginClick={() => setAuthModalOpen(true)}
          />
        );
      case 'predictions':
        return (
          <PredictionsView 
            onLoginClick={() => setAuthModalOpen(true)}
            defaultTab="open"
            selectedMatchId={selectedMatchId || undefined}
          />
        );
      case 'leaderboard':
        return <LeaderboardView />;
      case 'rewards':
        return <RewardsView />;
      case 'rules':
        return <RulesView setViewBadges={() => setCurrentTab('rewards')} />;
      case 'admin':
        return user?.isAdmin ? <AdminView /> : (
          <DashboardView 
            onPredictClick={(match) => {
              setSelectedMatchId(match.id);
              setCurrentTab('predictions');
            }} 
            onLoginClick={() => setAuthModalOpen(true)} 
            setCurrentTab={setCurrentTab} 
          />
        );
      default:
        return <LandingPage onPlayNowClick={handlePlayNow} setViewLeaderboard={() => setCurrentTab('leaderboard')} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-bounce">⚽</span>
          <div className="h-2.5 w-24 bg-orange-100 rounded-full overflow-hidden">
            <div className="bg-primary-orange h-full rounded-full animate-pulse w-1/2"></div>
          </div>
          <span className="text-xs font-semibold text-text-light">Loading FIFA Predictor 2026...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation Header */}
      <Navigation 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        toggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
        onLoginClick={() => setAuthModalOpen(true)}
      />

      {/* Main Page Layout */}
      <main className="flex-1 pb-16">
        {renderActiveView()}
      </main>

      {/* Footer Banner */}
      <footer className="border-t border-orange-100/50 bg-white py-6 text-center text-xs text-text-light">
        <div className="mx-auto max-w-7xl px-4">
          © {new Date().getFullYear()} Inforens FIFA Predictor 2026. Built matching Inforens designs. Play responsibly.
        </div>
      </footer>

      {/* Global Overlays */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      <NotificationsDrawer 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
}
