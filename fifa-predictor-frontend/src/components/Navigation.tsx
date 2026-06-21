'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Bell, 
  Menu, 
  X, 
  User as UserIcon, 
  Award, 
  Trophy, 
  LogOut, 
  Settings,
  Calendar,
  Layers,
  BookOpen,
  Gift
} from 'lucide-react';
import Link from 'next/link';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  toggleNotifications: () => void;
  onLoginClick: () => void;
}

export default function Navigation({ currentTab, setCurrentTab, toggleNotifications, onLoginClick }: NavigationProps) {
  const { user, logout, notifications } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: 'dashboard', name: 'Home', icon: Trophy },
    { id: 'fixtures', name: 'Fixtures', icon: Calendar },
    { id: 'predictions', name: 'Predictions', icon: Layers },
    { id: 'leaderboard', name: 'Leaderboard', icon: Award },
    { id: 'rewards', name: 'Badges', icon: Gift },
    { id: 'rules', name: 'Rules', icon: BookOpen },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-orange-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-dark hover:opacity-90"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-orange text-white shadow-md shadow-primary-orange/20">
              ⚽
            </span>
            <span className="bg-gradient-to-r from-primary-orange to-light-orange bg-clip-text text-transparent">
              Inforens
            </span>
            <span className="text-text-dark font-medium hidden sm:inline">
              FIFA Predictor
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active 
                      ? 'bg-primary-orange/10 text-primary-orange' 
                      : 'text-text-light hover:text-text-dark hover:bg-orange-50/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
            
            {user?.isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'admin' 
                    ? 'bg-red-50 text-red-600 border border-red-100' 
                    : 'text-red-500 hover:text-red-600 hover:bg-red-50/30'
                }`}
              >
                <Settings className="h-4 w-4" />
                Admin Panel
              </button>
            )}
          </nav>
        </div>

        {/* Right Action Widgets */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* User Stats Display (Desktop) */}
              <div className="hidden lg:flex items-center gap-4 bg-orange-50/60 border border-orange-100/50 rounded-xl px-4 py-1.5 text-xs font-semibold">
                <div className="flex items-center gap-1 text-text-light">
                  <Trophy className="h-3.5 w-3.5 text-warning-yellow" />
                  <span>Rank:</span>
                  <span className="text-text-dark text-sm">#{user.rank || '-'}</span>
                </div>
                <div className="h-3 w-px bg-orange-100"></div>
                <div className="flex items-center gap-1 text-text-light">
                  <Award className="h-3.5 w-3.5 text-primary-orange" />
                  <span>Points:</span>
                  <span className="text-text-dark text-sm">{user.points || 0} pts</span>
                </div>
              </div>

              {/* Notification Bell */}
              <button 
                onClick={toggleNotifications}
                className="relative p-2 rounded-lg text-text-light hover:text-text-dark hover:bg-orange-50 transition-colors"
                aria-label="Notification Center"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-orange text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Actions */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 p-1 rounded-full border border-orange-200 hover:bg-orange-50 transition-all">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm">
                    {user.avatar || '⚽'}
                  </span>
                  <span className="text-sm font-semibold text-text-dark max-w-[80px] truncate hidden sm:inline-block">
                    {user.username}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-orange-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150">
                  <div className="px-3 py-2 text-xs text-text-light border-b border-orange-50">
                    Logged in as <strong className="text-text-dark block truncate">{user.email}</strong>
                  </div>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-text-light hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 bg-primary-orange hover:bg-primary-orange/95 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all shadow-md shadow-primary-orange/15 hover:translate-y-[-1px]"
            >
              <UserIcon className="h-4 w-4" />
              Sign In
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-text-light hover:text-text-dark hover:bg-orange-50 md:hidden transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-orange-100 bg-white px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-4 duration-150">
          {user && (
            <div className="flex items-center justify-between bg-orange-50/50 rounded-xl p-3 mb-2 border border-orange-100/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{user.avatar}</span>
                <div>
                  <h4 className="text-sm font-bold text-text-dark">{user.username}</h4>
                  <span className="text-xs text-text-light">Rank #{user.rank || '-'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-primary-orange block">{user.points || 0} pts</span>
                <span className="text-[10px] text-text-light">Points balance</span>
              </div>
            </div>
          )}

          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                  active 
                    ? 'bg-primary-orange/10 text-primary-orange' 
                    : 'text-text-light hover:text-text-dark hover:bg-orange-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </button>
            );
          })}

          {user?.isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition-all ${
                currentTab === 'admin' ? 'bg-red-50 text-red-600' : ''
              }`}
            >
              <Settings className="h-5 w-5" />
              Admin Dashboard
            </button>
          )}

          {user && (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition-all border-t border-orange-50 pt-3"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
