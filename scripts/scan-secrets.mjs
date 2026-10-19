#!/usr/bin/env node
/**
 * scripts/scan-secrets.mjs
 *
 * Dependency-free secret scan over GIT-TRACKED files (SG-7 / M-10).
 * High-signal patterns only, with a documented allow-list for the local dev
 * fixture credentials published in compose.yaml and the test doubles — those
 * are deliberately public, rotating them is meaningless, and blocking CI on
 * them would train everyone to bypass the scan.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: 'Stripe live key', re: /sk_live_[0-9a-zA-Z]{20,}/ },
  { name: 'Stripe webhook secret', re: /whsec_[0-9a-zA-Z]{24,}/ },
  { name: 'OpenAI-style key', re: /sk-(?:proj-)?[A-Za-z0-9_-]{40,}/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'Slack bot token', re: /xoxb-[0-9A-Za-z-]{20,}/ },
  {
    name: 'database URL with credentials',
    // scheme://user:password@host — but NOT the documented local dev fixtures
    re: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^/\s:"']+:[^/\s"@]+@[^\s"']+/,
  },
  { name: 'Resend key', re: /re_[A-Za-z0-9]{8}_[A-Za-z0-9]{20,}/ },
];

/** Substrings that mark a match as a published test/dev fixture, not a secret. */
const ALLOWED_SUBSTRINGS = [
  'maihan_local_dev_only', // compose.yaml published throwaway credential (AGENTS.md)
  'test_webhook_secret_key_123', // TestPaymentProvider default (test double)
  'whsec_test_default', // StripePaymentProvider test fallback
  'dummy_timing_protection_password_value_123',
  'maihan_gems_session_hmac_secret_v1_local_dev',
  'password@127.0.0.1', // generic docs placeholder
  'user:password@localhost',
  'USER:PASSWORD@HOST',
  'postgres:postgres@', // local Postgres default-credential examples in docs
  'user:pass@', // docs placeholder
  '<SECRET>', // .env.example template placeholder
];

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let findings = 0;
for (const file of tracked) {
  if (file.includes('pnpm-lock.yaml')) continue;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // binary or unreadable to the scanner
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const { name, re } of PATTERNS) {
      const match = line.match(re);
      if (!match) continue;
      if (ALLOWED_SUBSTRINGS.some((ok) => line.includes(ok))) continue;
      console.error(`SECRET SCAN FAIL: ${name} in ${file}:${i + 1}`);
      findings += 1;
    }
  }
}

if (findings > 0) {
  console.error(`scan-secrets: ${findings} finding(s). Remove the secret, rotate the credential, and purge history.`);
  process.exit(1);
}
console.log(`scan-secrets: OK (${tracked.length} tracked files scanned, 0 findings)`);
