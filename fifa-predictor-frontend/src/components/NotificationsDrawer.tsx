'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { X, Bell, Trophy, Calendar, Award, Sparkles, Circle } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  const { notifications, markNotificationsAsRead } = useApp();

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await markNotificationsAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'RESULT':
        return <Trophy className="h-4 w-4 text-warning-yellow" />;
      case 'RANK':
        return <Sparkles className="h-4 w-4 text-primary-orange" />;
      case 'ACHIEVEMENT':
        return <Award className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-text-light" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return 'bg-blue-50/50 border-blue-100/30';
      case 'RESULT':
        return 'bg-yellow-50/50 border-yellow-100/30';
      case 'RANK':
        return 'bg-orange-50/50 border-orange-100/30';
      case 'ACHIEVEMENT':
        return 'bg-green-50/50 border-green-100/30';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" onClick={onClose}></div>

      {/* Slide-over panel */}
      <div className="relative w-screen max-w-md bg-white shadow-2xl border-l border-orange-100 animate-in slide-in-from-right duration-250">
        <div className="flex h-full flex-col overflow-y-scroll py-6">
          {/* Header */}
          <div className="px-6 flex items-center justify-between border-b border-orange-50 pb-4">
            <h2 className="text-lg font-bold text-text-dark flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-orange" />
              Notifications
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-primary-orange hover:text-primary-orange/80 transition-colors"
              >
                Mark all as read
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-text-light hover:text-text-dark hover:bg-orange-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="relative mt-4 flex-1 px-6">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-text-light text-xs gap-2">
                <span className="text-3xl">🔔</span>
                <strong>No notifications</strong>
                <span>We will alert you when matches complete or achievements unlock!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(not => (
                  <div 
                    key={not.id}
                    className={`flex gap-3 p-4.5 rounded-2xl border ${getNotificationBg(not.type)} ${
                      !not.isRead ? 'ring-1 ring-primary-orange/10 font-medium' : ''
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-inner border border-orange-50">
                      {getNotificationIcon(not.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-text-dark leading-normal">
                        {not.message}
                      </p>
                      <span className="text-[9px] text-text-light block">
                        {new Date(not.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(not.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {!not.isRead && (
                      <div className="flex items-center shrink-0">
                        <Circle className="h-2.5 w-2.5 fill-primary-orange text-primary-orange animate-pulse" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
