/**
 * apps/web/next.config.ts
 *
 * Minimal Next.js configuration.
 *
 * Authority: technical_design/02 (Next.js App Router, rendering and HTTP
 * only), technical_design/08 (frontend architecture). Phase 4 Task 1 only
 * builds the route tree — behaviour, budgets and bundle policy land with
 * their own Phase 4 tasks, so deliberately NOTHING is tuned here yet. No
 * experimental flags, no bundle analyser, no image domains: each of those is
 * a later task's deliverable and adding them now would be speculative.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
