'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Mail, Lock, User as UserIcon, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register, loginWithGoogle } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;
      if (isLogin) {
        success = await login(email, password);
      } else {
        if (!username || username.trim().length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        success = await register(username, email, password);
      }

      if (success) {
        onClose();
        // Clear fields
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setError(isLogin ? 'Invalid credentials' : 'Registration failed. Check if details are unique.');
      }
    } catch (err) {
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const mockGoogleId = 'g_' + Math.random().toString(36).substring(2, 11);
      const mockEmail = 'google_user_' + Math.floor(Math.random() * 1000) + '@inforens.com';
      const mockName = 'World Cup Fan';
      
      const success = await loginWithGoogle(mockGoogleId, mockEmail, mockName);
      if (success) {
        onClose();
      } else {
        setError('Google authentication failed.');
      }
    } catch (err) {
      setError('Connection error. Check backend server.');
    } finally {
      setLoading(false);
    }
  };

  const triggerFillDemo = (isAdmin: boolean) => {
    if (isAdmin) {
      setEmail('admin@inforens.com');
      setPassword('admin123');
    } else {
      setEmail('jane@example.com');
      setPassword('password123');
    }
    setIsLogin(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl border border-orange-100/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-text-light hover:text-text-dark hover:bg-orange-50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-orange/10 text-primary-orange shadow-inner">
          <ShieldCheck className="h-7 w-7" />
        </div>

        {/* Modal Header */}
        <div className="mt-4 text-center">
          <h3 className="text-2xl font-bold tracking-tight text-text-dark">
            {isLogin ? 'Welcome Back!' : 'Create an Account'}
          </h3>
          <p className="mt-1 text-sm text-text-light">
            {isLogin 
              ? 'Sign in to make predictions and check stats' 
              : 'Join Inforens FIFA Predictor 2026'
            }
          </p>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex bg-orange-50/50 p-1 rounded-xl border border-orange-100/30">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-white text-primary-orange shadow-sm' : 'text-text-light hover:text-text-dark'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 border border-red-100 text-xs font-medium text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div className="relative">
              <label className="text-xs font-semibold text-text-light block mb-1">Username</label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3.5 h-4.5 w-4.5 text-text-light/80 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. striker2026"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-orange-200/60 bg-orange-50/10 text-sm focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-light block mb-1">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4.5 w-4.5 text-text-light/80 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-orange-200/60 bg-orange-50/10 text-sm focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-light block mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4.5 w-4.5 text-text-light/80 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-orange-200/60 bg-orange-50/10 text-sm focus:border-primary-orange focus:ring-1 focus:ring-primary-orange outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 rounded hover:bg-orange-50 text-text-light hover:text-text-dark transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-orange hover:bg-primary-orange/95 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl shadow-md shadow-primary-orange/15 transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px]"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Separator */}
        <div className="mt-6 flex items-center justify-between">
          <span className="w-[30%] h-px bg-orange-100"></span>
          <span className="text-xs text-text-light font-medium uppercase">Or Connect With</span>
          <span className="w-[30%] h-px bg-orange-100"></span>
        </div>

        {/* Mock Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2.5 border border-orange-200 hover:bg-orange-50 py-3 rounded-xl font-semibold text-sm text-text-dark transition-all shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 7.995 12.5a5.99 5.99 0 0 1 5.996-6.015c1.603 0 3.064.63 4.15 1.65l3.148-3.148A10.23 10.23 0 0 0 13.99 1.5 10.2 10.2 0 0 0 3.8 11.7c0 5.637 4.562 10.2 10.19 10.2 5.86 0 10.165-4.116 10.165-10.334 0-.61-.06-1.127-.184-1.636l-11.73-.645z"
            />
          </svg>
          Google Login
        </button>

        {/* Quick Demo Helper Box */}
        <div className="mt-6 rounded-2xl bg-orange-50/50 p-4 border border-orange-100 text-center">
          <span className="text-xs font-bold text-text-dark block mb-2">💡 Quick Demo Access</span>
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => triggerFillDemo(false)}
              className="text-xs font-semibold bg-white border border-orange-200 hover:border-primary-orange text-text-dark px-3.5 py-1.5 rounded-lg shadow-sm"
            >
              Demo User
            </button>
            <button
              onClick={() => triggerFillDemo(true)}
              className="text-xs font-semibold bg-white border border-orange-200 hover:border-red-500 text-text-dark px-3.5 py-1.5 rounded-lg shadow-sm"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
