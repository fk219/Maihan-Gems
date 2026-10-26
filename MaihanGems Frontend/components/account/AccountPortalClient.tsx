'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { ACCOUNT_FIXTURE, INITIAL_ORDERS } from '@/lib/fixtures/operations';
import { formatUsd } from '@/lib/storefront-data';
import {
  UserRole,
  PlatformUserSession,
  ROLE_PRESET_ACCOUNTS,
  loadStoredSession,
  saveStoredSession,
} from '@/lib/platform-governance';
import { AuthPopupModal } from '@/components/account/AuthPopupModal';

export function AccountPortalClient({ subPath }: { subPath: string[] }) {
  const router = useRouter();
  const primarySection = subPath[0] || 'overview';
  const secondaryId = subPath[1];

  const [session, setSession] = useState<PlatformUserSession>(ROLE_PRESET_ACCOUNTS.CUSTOMER);
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState(ACCOUNT_FIXTURE.user.email);
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('Claire Moreau');
  const [signupOrg, setSignupOrg] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('MHG-RST-9042');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(ACCOUNT_FIXTURE.user.name);
  const [profileSalon, setProfileSalon] = useState(ACCOUNT_FIXTURE.user.preferredSalon);
  const [authPopupOpen, setAuthPopupOpen] = useState(false);

  useEffect(() => {
    const loaded = loadStoredSession();
    setSession(loaded);
    setSelectedRole(loaded.role);
  }, []);

  const handleSwitchRole = (role: UserRole) => {
    const nextSession: PlatformUserSession = {
      ...ROLE_PRESET_ACCOUNTS[role],
      signedInAt: new Date().toISOString(),
    };
    setSelectedRole(role);
    setSession(nextSession);
    saveStoredSession(nextSession);
    setEmail(nextSession.email);
    setProfileName(nextSession.name);
    setErrorMessage(null);
    setStatusMessage(
      `Active role switched to ${role} (${nextSession.name} · ${
        nextSession.organization || nextSession.preferredSalon
      }).`
    );
  };

  const handleGoogleSignIn = (roleToAssign: UserRole = selectedRole) => {
    setErrorMessage(null);
    const preset = ROLE_PRESET_ACCOUNTS[roleToAssign];
    const googleSession: PlatformUserSession = {
      ...preset,
      authProvider: 'GOOGLE_OAUTH',
      verified: true,
      signedInAt: new Date().toISOString(),
    };
    setSession(googleSession);
    saveStoredSession(googleSession);
    setEmail(googleSession.email);
    setProfileName(googleSession.name);
    setStatusMessage(
      `Authenticated via Google OAuth 2.0 as ${googleSession.name} (${googleSession.role}).`
    );
    if (primarySection === 'sign-in' || primarySection === 'sign-up') {
      window.setTimeout(() => router.push('/account/overview'), 500);
    }
  };

  const navItems = [
    { key: 'overview', label: 'Overview & Role Access', href: '/account/overview' },
    { key: 'orders', label: 'Insured Order Ledger', href: '/account/orders' },
    { key: 'profile', label: 'Client Profile', href: '/account/profile' },
    { key: 'addresses', label: 'Insured Addresses', href: '/account/addresses' },
    { key: 'notifications', label: 'Vault Notifications', href: '/account/notifications' },
    { key: 'sign-in', label: 'Sign In / Google Auth', href: '/account/sign-in' },
    { key: 'sign-up', label: 'Register Account', href: '/account/sign-up' },
    { key: 'verify-email', label: 'Verify Email', href: '/account/verify-email' },
    { key: 'forgot-password', label: 'Forgot Password', href: '/account/forgot-password' },
    { key: 'reset-password', label: 'Reset Password', href: '/account/reset-password' },
  ];

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    if (!email.includes('@') || password.length < 6) {
      setErrorMessage('Invalid credentials: password must be at least 6 characters.');
      return;
    }
    if (password === 'wrong' || password === 'wrongpass') {
      setErrorMessage('Authentication failed: The password provided does not match the client record.');
      return;
    }
    const preset = ROLE_PRESET_ACCOUNTS[selectedRole];
    const nextSession: PlatformUserSession = {
      ...preset,
      email,
      authProvider: 'EMAIL_PASSWORD',
      signedInAt: new Date().toISOString(),
    };
    setSession(nextSession);
    saveStoredSession(nextSession);
    router.push('/account/overview');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    if (verifyCode.trim() !== ACCOUNT_FIXTURE.user.verificationCodeExpected) {
      setErrorMessage(
        `Invalid verification code "${verifyCode}". Expected fixture code: ${ACCOUNT_FIXTURE.user.verificationCodeExpected}.`
      );
      return;
    }
    setStatusMessage('Email verified against Geneva client registry. Redirecting...');
    window.setTimeout(() => router.push('/account/overview'), 600);
  };

  const ordersList = Object.values(INITIAL_ORDERS);

  return (
    <div className="space-y-8">
      {/* Multi-Role Switcher & RBAC Protection Bar */}
      <section
        aria-label="Multi-Role Identity Switcher"
        data-testid="role-switcher-banner"
        className="rounded-[24px] border border-[#E5D4B3] bg-gradient-to-r from-[#231B12] via-[#1C1610] to-[#14100C] p-6 sm:p-7 text-[#FAF3E3] shadow-[0_18px_48px_rgba(26,20,14,0.16)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#E6C97A]">
              <ShieldCheck className="h-4 w-4" />
              Role-Based Access Control (RBAC) · Active Session: {session.role}
            </div>
            <h2 className="text-2xl sm:text-3xl font-normal text-white">
              {session.name} <span className="text-[#C5A059]">·</span>{' '}
              <span className="text-lg text-[#D8CEBE]">{session.email}</span>
            </h2>
            <p className="text-sm text-[#D8CEBE]">
              Authenticated via{' '}
              <span className="text-[#E6C97A] font-semibold uppercase">
                {session.authProvider === 'GOOGLE_OAUTH'
                  ? 'Google OAuth 2.0'
                  : 'Encrypted Vault Credentials'}
              </span>{' '}
              · {session.organization || session.preferredSalon || 'Geneva Flagship Salon'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(['CUSTOMER', 'VENDOR', 'ADMIN'] as UserRole[]).map((role) => {
              const isCurrent = session.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  data-testid={`switch-role-${role.toLowerCase()}`}
                  onClick={() => handleSwitchRole(role)}
                  className={`px-4 py-2.5 rounded-full text-xs uppercase tracking-[0.16em] font-semibold transition-all ${
                    isCurrent
                      ? 'bg-[#C5A059] text-[#14100C] shadow-[0_0_20px_rgba(197,160,89,0.4)]'
                      : 'border border-[#C5A059]/40 bg-white/5 text-[#FAF3E3] hover:bg-white/10'
                  }`}
                >
                  {role === 'CUSTOMER' && 'Private Client'}
                  {role === 'VENDOR' && 'Vendor Partner'}
                  {role === 'ADMIN' && 'Vault Admin'}
                </button>
              );
            })}
            <button
              type="button"
              data-testid="open-auth-popup-button"
              onClick={() => setAuthPopupOpen(true)}
              className="px-4 py-2.5 rounded-full text-xs uppercase tracking-[0.16em] font-semibold border border-[#E6C97A] bg-[#D4AF37]/20 text-[#E6C97A] hover:bg-[#D4AF37] hover:text-[#14100C] transition-all cursor-pointer"
            >
              Login / Sign Up Popup
            </button>
          </div>
        </div>

        {/* Role-Protected Surface Quick Launchers */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#E6C97A]">Customer Role</p>
              <p className="font-medium text-white mt-0.5">Private Dossier, DYOJ &amp; Orders</p>
            </div>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[#E6C97A] underline"
            >
              Orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#E6C97A]">Vendor Role</p>
              <p className="font-medium text-white mt-0.5">Inventory, KYB &amp; Payout Ledger</p>
            </div>
            <Link
              href="/vendor?autostart=1"
              className="inline-flex items-center gap-1 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/50 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#E6C97A] hover:bg-[#C5A059] hover:text-[#14100C] transition-colors"
            >
              Open Vendor Portal <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#E6C97A]">Admin Role</p>
              <p className="font-medium text-white mt-0.5">Vault Inventory, Audit Log &amp; KYB</p>
            </div>
            <Link
              href="/admin?autostart=1"
              className="inline-flex items-center gap-1 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/50 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#E6C97A] hover:bg-[#C5A059] hover:text-[#14100C] transition-colors"
            >
              Open Admin Console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-3 rounded-[24px] border border-[#E5D4B3] bg-[#1C1610] p-5 shadow-[0_14px_34px_rgba(26,20,14,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#E6C97A] px-2 mb-3 font-semibold">
            IDENTITY &amp; VAULT MENU
          </p>
          <nav aria-label="Account sections" className="space-y-1">
            {navItems.map((item) => {
              const active = primarySection === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-3.5 py-2.5 rounded-[12px] text-xs uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? 'bg-[#C5A059] text-[#14100C] font-semibold shadow-sm'
                      : 'text-[#D8CEBE] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-9 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-[14px] border border-[#991B1B] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
            >
              {errorMessage}
            </div>
          )}
          {statusMessage && (
            <div
              role="status"
              className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-sm text-[#166534] flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {primarySection === 'sign-in' && (
            <div className="max-w-lg space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D2F] font-semibold">
                  Zero-Trust Session Gate
                </p>
                <h2 className="text-3xl font-normal text-[#1A1612] mt-1">
                  Client, Vendor &amp; Operator Sign In
                </h2>
                <p className="text-sm text-[#5C4E3C] mt-1">
                  Authenticate with your email credentials or one-click Google Sign-In. Enter password{' '}
                  <code className="font-mono text-xs bg-[#FAF3E3] px-1.5 py-0.5 rounded">wrongpass</code>{' '}
                  to verify the honest error state.
                </p>
              </div>

              {/* Google Sign-In Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  data-testid="google-signin-button"
                  onClick={() => handleGoogleSignIn(selectedRole)}
                  className="w-full flex items-center justify-center gap-3 rounded-[14px] border border-[#D5C29F] bg-[#FAF3E3] hover:bg-[#F3E7CC] px-5 py-3 text-sm font-semibold text-[#1A1612] transition-colors shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-[#8C6D2F]" />
                  Continue with Google ({selectedRole} SSO)
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5D4B3]" />
                <span className="flex-shrink mx-3 text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
                  Or Sign In with Vault Email
                </span>
                <div className="flex-grow border-t border-[#E5D4B3]" />
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="acc-signin-role" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Account Role
                  </label>
                  <select
                    id="acc-signin-role"
                    value={selectedRole}
                    onChange={(e) => handleSwitchRole(e.target.value as UserRole)}
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  >
                    <option value="CUSTOMER">Customer — Private Client Vault</option>
                    <option value="VENDOR">Vendor — Mine &amp; Lapidary Supplier</option>
                    <option value="ADMIN">Admin — Vault &amp; Governance Operator</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="acc-signin-email" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Email Address
                  </label>
                  <input
                    id="acc-signin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-signin-pass" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Password
                  </label>
                  <input
                    id="acc-signin-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6+ characters (or 'wrongpass')"
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
                  >
                    Sign In
                  </button>
                  <div className="flex items-center gap-4 text-sm">
                    <Link href="/account/forgot-password" className="text-[#8C6D2F] underline hover:text-[#1A1612]">
                      Forgot password?
                    </Link>
                    <Link href="/account/sign-up" className="text-[#8C6D2F] underline hover:text-[#1A1612]">
                      Register →
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          )}

          {primarySection === 'sign-up' && (
            <div className="max-w-lg space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D2F] font-semibold">
                  New Private Client Registry
                </p>
                <h2 className="text-3xl font-normal text-[#1A1612] mt-1">
                  Create Private Client Account
                </h2>
                <p className="text-sm text-[#5C4E3C] mt-1">
                  Public registration creates a Private Client (Customer) account. Supplier and Vendor accounts can only be provisioned by an Administrator via a dedicated onboarding link (<code className="font-mono text-xs">/vendor?invite=TOKEN</code>).
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleSignIn('CUSTOMER')}
                className="w-full flex items-center justify-center gap-3 rounded-[14px] border border-[#D5C29F] bg-[#FAF3E3] hover:bg-[#F3E7CC] px-5 py-3 text-sm font-semibold text-[#1A1612] transition-colors"
              >
                <Sparkles className="h-4 w-4 text-[#8C6D2F]" />
                Fast-Track Registration with Google
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSelectedRole('CUSTOMER');
                  router.push('/account/verify-email');
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="acc-signup-name" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Full Name
                  </label>
                  <input
                    id="acc-signup-name"
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-signup-email" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Email Address
                  </label>
                  <input
                    id="acc-signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-signup-pass" className="block text-sm font-semibold text-[#1A1612] mb-1">
                    Password
                  </label>
                  <input
                    id="acc-signup-pass"
                    type="password"
                    required
                    minLength={8}
                    defaultValue="genevavault2026"
                    className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
                >
                  Register Client Account →
                </button>
              </form>
            </div>
          )}

          {primarySection === 'verify-email' && (
            <form onSubmit={handleVerifyCode} className="max-w-md space-y-4">
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Verify Email Token
              </h2>
              <p className="text-sm text-[#5C4E3C]">
                Expected Geneva security code:{' '}
                <code className="font-mono font-semibold text-[#1A1612] bg-[#FAF3E3] px-2 py-0.5 rounded">
                  {ACCOUNT_FIXTURE.user.verificationCodeExpected}
                </code>
                .
              </p>
              <div>
                <label htmlFor="acc-verify-code" className="block text-sm font-semibold text-[#1A1612] mb-1">
                  6-Digit Token
                </label>
                <input
                  id="acc-verify-code"
                  type="text"
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="842910"
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 font-mono text-sm text-[#1A1612]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
              >
                Verify Code
              </button>
            </form>
          )}

          {primarySection === 'forgot-password' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStatusMessage(
                  `Password reset token (MHG-RST-9042) dispatched to ${email}. Proceed to Reset Password screen.`
                );
              }}
              className="max-w-md space-y-4"
            >
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8C6D2F] font-semibold">
                <KeyRound className="h-4 w-4" />
                Account Recovery Protocol
              </div>
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Forgot Password
              </h2>
              <p className="text-sm text-[#5C4E3C]">
                Enter your registered email to receive a time-bound cryptographic recovery token.
              </p>
              <div>
                <label htmlFor="acc-forgot-email" className="block text-sm font-semibold text-[#1A1612] mb-1">
                  Client or Partner Email
                </label>
                <input
                  id="acc-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                />
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
                >
                  Dispatch Token
                </button>
                <Link href="/account/reset-password" className="text-sm text-[#8C6D2F] underline">
                  Reset Screen →
                </Link>
              </div>
            </form>
          )}

          {primarySection === 'reset-password' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword.length < 8) {
                  setErrorMessage('New password must be at least 8 characters.');
                  return;
                }
                setErrorMessage(null);
                setStatusMessage('Password updated across Geneva Vault & SSO Registry.');
              }}
              className="max-w-md space-y-4"
            >
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Reset Password
              </h2>
              <div>
                <label htmlFor="acc-reset-token" className="block text-sm font-semibold text-[#1A1612] mb-1">
                  Recovery Token
                </label>
                <input
                  id="acc-reset-token"
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 font-mono text-sm text-[#1A1612]"
                />
              </div>
              <div>
                <label htmlFor="acc-reset-pass" className="block text-sm font-semibold text-[#1A1612] mb-1">
                  New Password (8+ characters)
                </label>
                <input
                  id="acc-reset-pass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-sm text-[#1A1612]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
              >
                Update Password
              </button>
            </form>
          )}

          {primarySection === 'overview' && (
            <div className="space-y-6">
              <div className="border-b border-[#EFE5D1] pb-4 flex flex-wrap justify-between items-end gap-4">
                <div>
                  <p className="text-xs font-mono text-[#8C6D2F]">
                    {session.userId} · ROLE: {session.role}
                  </p>
                  <h2 className="text-3xl font-normal text-[#1A1612]">
                    {session.name}
                  </h2>
                </div>
                <span className="text-sm text-[#5C4E3C]">
                  {session.preferredSalon || 'Geneva Flagship Salon'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                  <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                    Orders
                  </p>
                  <p className="text-3xl font-semibold text-[#1A1612] mt-1">
                    {ordersList.length}
                  </p>
                  <Link href="/account/orders" className="text-[#8C6D2F] underline block mt-2 text-sm">
                    Inspect →
                  </Link>
                </div>
                <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                  <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                    Saved DYO Code
                  </p>
                  <p className="text-lg font-semibold font-mono text-[#1A1612] mt-1">
                    DYO-MG-8841
                  </p>
                  <Link
                    href="/design-your-own/review/DYO-MG-8841"
                    className="text-[#8C6D2F] underline block mt-2 text-sm"
                  >
                    Open Dossier →
                  </Link>
                </div>
                <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                  <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                    Unread Notices
                  </p>
                  <p className="text-3xl font-semibold text-[#1A1612] mt-1">
                    {ACCOUNT_FIXTURE.notifications.filter((n) => !n.read).length}
                  </p>
                  <Link href="/account/notifications" className="text-[#8C6D2F] underline block mt-2 text-sm">
                    Read →
                  </Link>
                </div>
              </div>

              {/* Active Role Permissions Card */}
              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-normal text-[#1A1612] flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#8C6D2F]" />
                    Role Permissions &amp; Protected Console Access ({session.role})
                  </h3>
                  <span className="text-xs uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-[#C5A059]/20 text-[#8C6D2F] font-semibold">
                    Verified Session
                  </span>
                </div>
                <p className="text-sm text-[#5C4E3C]">
                  {session.role === 'CUSTOMER' &&
                    'Your Private Client session grants access to insured order tracking, laboratory dossiers, bespoke DYOJ configurations, and private showroom reservations.'}
                  {session.role === 'VENDOR' &&
                    'Your Mine & Lapidary Partner session grants access to the Vendor Portal (/vendor) for real-time Gemstone/Setting/Jewellery submissions, KYB & Tax onboarding, and Vendor Payout Audit Logs.'}
                  {session.role === 'ADMIN' &&
                    'Your Vault Archivist & Admin session grants full governance over the Admin Console (/admin), including multi-category Inventory Approval, Vendor Payout Wire Releases, and KYB Compliance Review.'}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {session.role === 'VENDOR' && (
                    <Link
                      href="/vendor?autostart=1"
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full gold-gradient-cta text-xs uppercase tracking-[0.16em] font-semibold"
                    >
                      <Building2 className="h-3.5 w-3.5" /> Enter Vendor Portal →
                    </Link>
                  )}
                  {session.role === 'ADMIN' && (
                    <Link
                      href="/admin?autostart=1"
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full gold-gradient-cta text-xs uppercase tracking-[0.16em] font-semibold"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Enter Admin Console →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {primarySection === 'orders' && !secondaryId && (
            <div className="space-y-4">
              <h2 className="text-3xl font-normal text-[#1A1612] border-b border-[#EFE5D1] pb-3">
                Insured Order Ledger
              </h2>
              <div className="divide-y divide-[#EFE5D1] border border-[#E5D4B3] rounded-[18px] overflow-hidden">
                {ordersList.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-5 flex flex-wrap items-center justify-between gap-4 text-sm bg-[#FFFDF9]"
                  >
                    <div>
                      <p className="font-mono font-semibold text-[#1A1612]">
                        {ord.orderId}
                      </p>
                      <p className="text-[#5C4E3C] mt-0.5">
                        {ord.items.map((i) => i.title).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs uppercase tracking-wider text-[#8C6D2F] bg-[#FAF3E3] px-3 py-1 rounded-full border border-[#E5D4B3]">
                        {ord.paymentStatus}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#1A1612]">
                        {formatUsd(ord.total)}
                      </span>
                      <Link
                        href={`/account/orders/${ord.orderId}`}
                        className="px-4 py-1.5 uppercase tracking-wider text-xs bg-[#1C1610] text-[#E6C97A] rounded-full hover:bg-[#2B2219]"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {primarySection === 'orders' && secondaryId && (
            <div className="space-y-4">
              {INITIAL_ORDERS[secondaryId] ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#EFE5D1] pb-3">
                    <div>
                      <p className="text-xs font-mono text-[#8C6D2F]">
                        {secondaryId}
                      </p>
                      <h2 className="text-3xl font-normal text-[#1A1612]">
                        Status: {INITIAL_ORDERS[secondaryId].paymentStatus}
                      </h2>
                    </div>
                    <Link
                      href={`/checkout/confirmation/${secondaryId}`}
                      className="text-xs uppercase tracking-wider text-[#8C6D2F] underline"
                    >
                      Receipt View →
                    </Link>
                  </div>
                  <p className="text-sm text-[#5C4E3C]">
                    {INITIAL_ORDERS[secondaryId].paymentProviderNote}
                  </p>
                </>
              ) : (
                <div className="text-sm text-[#991B1B]">
                  Order ID &ldquo;{secondaryId}&rdquo; was not found in your client dossier.
                </div>
              )}
            </div>
          )}

          {primarySection === 'profile' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStatusMessage('Profile saved.');
              }}
              className="max-w-md space-y-4 text-sm"
            >
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Client Profile
              </h2>
              <div>
                <label htmlFor="prof-name" className="block font-semibold text-[#1A1612] mb-1">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-[#1A1612]"
                />
              </div>
              <div>
                <label htmlFor="prof-salon" className="block font-semibold text-[#1A1612] mb-1">
                  Preferred Salon
                </label>
                <select
                  id="prof-salon"
                  value={profileSalon}
                  onChange={(e) => setProfileSalon(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-2.5 text-[#1A1612]"
                >
                  <option value="Geneva Flagship Salon">Geneva Flagship Salon</option>
                  <option value="New York Fifth Avenue Suite">New York Fifth Avenue Suite</option>
                  <option value="London Mayfair Salon">London Mayfair Salon</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs uppercase tracking-[0.18em] font-semibold gold-gradient-cta rounded-full"
              >
                Save Profile
              </button>
            </form>
          )}

          {primarySection === 'addresses' && (
            <div className="space-y-4">
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Insured Addresses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {ACCOUNT_FIXTURE.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5 space-y-1"
                  >
                    <p className="font-semibold text-[#1A1612]">{addr.label}</p>
                    <p className="text-[#5C4E3C]">{addr.recipient}</p>
                    <p className="text-[#5C4E3C]">{addr.line1}</p>
                    <p className="text-[#5C4E3C]">
                      {addr.postalCode} {addr.city}, {addr.country}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {primarySection === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-3xl font-normal text-[#1A1612]">
                Vault Notifications
              </h2>
              <ul className="divide-y divide-[#EFE5D1] border border-[#E5D4B3] rounded-[18px] text-sm">
                {ACCOUNT_FIXTURE.notifications.map((n) => (
                  <li key={n.id} className="p-5 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#1A1612]">{n.title}</span>
                      <span className="font-mono text-xs text-[#8C6D2F]">{n.date}</span>
                    </div>
                    <p className="text-[#5C4E3C]">{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <AuthPopupModal
        isOpen={authPopupOpen}
        onClose={() => setAuthPopupOpen(false)}
        initialTab={primarySection === 'sign-up' ? 'sign-up' : 'sign-in'}
        onSessionChange={(nextSession) => {
          setSession(nextSession);
          setSelectedRole(nextSession.role);
          setEmail(nextSession.email);
          setProfileName(nextSession.name);
        }}
      />
    </div>
  );
}
