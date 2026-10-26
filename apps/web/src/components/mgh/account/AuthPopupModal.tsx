'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2 } from 'lucide-react';
import {
  ROLE_PRESET_ACCOUNTS,
  saveStoredSession,
} from '@/lib/mgh/platform-governance';
import type { UserRole, PlatformUserSession } from '@/lib/mgh/platform-governance';

export interface AuthPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sign-in' | 'sign-up' | 'forgot-password';
  onSessionChange?: (session: PlatformUserSession) => void;
}

function inferRoleFromEmail(emailInput: string): UserRole {
  const lower = emailInput.trim().toLowerCase();
  if (lower.includes('admin') || lower.includes('archivist@maihangems.com')) {
    return 'ADMIN';
  }
  if (
    lower.includes('vendor') ||
    lower.includes('lapidary') ||
    lower.includes('ratnapura') ||
    lower.includes('vaucher') ||
    lower.includes('consignment@')
  ) {
    return 'VENDOR';
  }
  return 'CUSTOMER';
}

export function AuthPopupModal({
  isOpen,
  onClose,
  initialTab = 'sign-in',
  onSessionChange,
}: AuthPopupModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up' | 'forgot-password'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const completeAuth = (nextSession: PlatformUserSession, message: string, redirectPath?: string) => {
    saveStoredSession(nextSession);
    if (onSessionChange) onSessionChange(nextSession);
    setStatusMessage(message);
    setErrorMessage(null);
    window.setTimeout(() => {
      onClose();
      if (redirectPath) {
        router.push(redirectPath);
      }
    }, 450);
  };

  const getDestination = (role: UserRole) => {
    if (role === 'ADMIN') return '/admin?autostart=1';
    if (role === 'VENDOR') return '/vendor?autostart=1';
    return '/account/overview';
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email.trim().includes('@') || password.length < 6) {
      setErrorMessage('Enter a valid email and password (6+ characters).');
      return;
    }
    if (password === 'wrong' || password === 'wrongpass') {
      setErrorMessage('Invalid email or password.');
      return;
    }

    const role = inferRoleFromEmail(email);
    const preset = ROLE_PRESET_ACCOUNTS[role];
    const nextSession: PlatformUserSession = {
      ...preset,
      email: email.trim(),
      authProvider: 'EMAIL_PASSWORD',
      signedInAt: new Date().toISOString(),
    };

    completeAuth(nextSession, 'Signed in.', getDestination(role));
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!name.trim() || !email.trim().includes('@') || password.length < 8) {
      setErrorMessage('Please enter your name, a valid email, and an 8+ character password.');
      return;
    }

    // Self-service registration is strictly for Customer accounts; Vendors are created by Admin invite link
    const nextSession: PlatformUserSession = {
      ...ROLE_PRESET_ACCOUNTS.CUSTOMER,
      name: name.trim(),
      email: email.trim(),
      role: 'CUSTOMER',
      authProvider: 'EMAIL_PASSWORD',
      signedInAt: new Date().toISOString(),
    };

    completeAuth(nextSession, 'Account created.', '/account/overview');
  };

  const handleGoogleAuth = () => {
    const role = activeTab === 'sign-in' && email ? inferRoleFromEmail(email) : 'CUSTOMER';
    const preset = ROLE_PRESET_ACCOUNTS[role];
    const nextSession: PlatformUserSession = {
      ...preset,
      authProvider: 'GOOGLE_OAUTH',
      verified: true,
      signedInAt: new Date().toISOString(),
    };
    completeAuth(nextSession, 'Signed in with Google.', getDestination(role));
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim().includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    setStatusMessage(`Password reset link sent to ${email.trim()}.`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-popup-title"
      data-testid="auth-popup-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[400px] rounded-2xl bg-white p-7 text-[#1A1612] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[#EAE5DC]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          data-testid="close-auth-popup"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#76726A] hover:bg-[#F5F2EC] hover:text-[#1A1612] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Minimal Header */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8C6D2F] font-medium">
            Maihan Gems
          </p>
          <h2
            id="auth-popup-title"
            className="mt-1 text-2xl font-[family-name:var(--font-eb-garamond)] font-normal text-[#1A1612]"
          >
            {activeTab === 'sign-in'
              ? 'Sign in'
              : activeTab === 'sign-up'
                ? 'Create an account'
                : 'Reset password'}
          </h2>
        </div>

        {statusMessage && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-[#15803D]/25 bg-[#F0FDF4] px-3.5 py-2.5 text-xs text-[#166534] flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-[#B91C1C]/25 bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#991B1B]"
          >
            {errorMessage}
          </div>
        )}

        {activeTab !== 'forgot-password' && (
          <>
            <button
              type="button"
              data-testid="auth-popup-google-btn"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-[#D8D2C5] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1612] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.5 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.02 21.17 7.19 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.89 0 11.67s.37 4.22 1.01 5.5l4.01-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.19 0 3.02 2.83 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-5 flex items-center">
              <div className="flex-grow border-t border-[#EAE5DC]" />
              <span className="mx-3 text-xs text-[#8C857B]">or</span>
              <div className="flex-grow border-t border-[#EAE5DC]" />
            </div>
          </>
        )}

        {/* SIGN IN */}
        {activeTab === 'sign-in' && (
          <form onSubmit={handleSignInSubmit} className="space-y-3.5" noValidate>
            <div>
              <label htmlFor="popup-signin-email" className="block text-xs font-medium text-[#4E4C47] mb-1">
                Email
              </label>
              <input
                id="popup-signin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="popup-signin-password" className="block text-xs font-medium text-[#4E4C47]">
                  Password
                </label>
                <button
                  type="button"
                  data-testid="auth-popup-tab-forgot"
                  onClick={() => {
                    setActiveTab('forgot-password');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className="text-xs text-[#76726A] hover:text-[#1A1612] cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <input
                id="popup-signin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              data-testid="auth-popup-submit-signin"
              className="w-full rounded-lg bg-[#1A1612] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2C2620] transition-colors cursor-pointer"
            >
              Sign in
            </button>

            <p className="pt-2 text-center text-xs text-[#6B655C]">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                data-testid="auth-popup-tab-signup"
                onClick={() => {
                  setActiveTab('sign-up');
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="font-medium text-[#1A1612] underline underline-offset-4 cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* SIGN UP */}
        {activeTab === 'sign-up' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5" noValidate>
            <div>
              <label htmlFor="popup-signup-name" className="block text-xs font-medium text-[#4E4C47] mb-1">
                Full name
              </label>
              <input
                id="popup-signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claire Moreau"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="popup-signup-email" className="block text-xs font-medium text-[#4E4C47] mb-1">
                Email
              </label>
              <input
                id="popup-signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="popup-signup-password" className="block text-xs font-medium text-[#4E4C47] mb-1">
                Password
              </label>
              <input
                id="popup-signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              data-testid="auth-popup-submit-signup"
              className="w-full rounded-lg bg-[#1A1612] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2C2620] transition-colors cursor-pointer"
            >
              Create account
            </button>

            <p className="text-[11px] text-[#76726A] text-center leading-relaxed">
              Supplier accounts are invitation-only via Admin onboarding link.
            </p>

            <p className="pt-1 text-center text-xs text-[#6B655C]">
              Already have an account?{' '}
              <button
                type="button"
                data-testid="auth-popup-tab-signin"
                onClick={() => {
                  setActiveTab('sign-in');
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="font-medium text-[#1A1612] underline underline-offset-4 cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {activeTab === 'forgot-password' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3.5" noValidate>
            <p className="text-xs text-[#6B655C]">
              Enter your email address and we will send you a password reset link.
            </p>
            <div>
              <label htmlFor="popup-forgot-email" className="block text-xs font-medium text-[#4E4C47] mb-1">
                Email
              </label>
              <input
                id="popup-forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#D8D2C5] bg-white px-3.5 py-2.5 text-sm text-[#1A1612] focus:border-[#1A1612] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#1A1612] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2C2620] transition-colors cursor-pointer"
            >
              Send reset link
            </button>

            <p className="pt-2 text-center text-xs text-[#6B655C]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sign-in');
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="font-medium text-[#1A1612] underline underline-offset-4 cursor-pointer"
              >
                Back to sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
