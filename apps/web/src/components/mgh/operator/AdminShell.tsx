'use client';

/**
 * apps/web/src/components/mgh/operator/AdminShell.tsx
 *
 * Phase M7 cutover chrome. Reproduces the reference applet's operator console
 * shell (components/operator/AdminConsoleClient.tsx) markup-for-markup — the
 * golden-cloud canvas, the dark vault top bar, and the mono navigation rail —
 * and slots the repo's REAL back-office workspaces as tab content.
 *
 * Honesty seams (no redesign):
 *   - Sidebar items link the repo's real /admin/* routes (the applet's tabs
 *     were localStorage state switches; nothing is persisted here).
 *   - The actor identity in the top bar is the real actor resolved by
 *     `requireAdminAccess` on the server and passed as props — never the
 *     applet's email-inferred session.
 *   - "Lock Session" terminates the real session (POST /api/v1/auth/logout),
 *     the same seam the vendor portal cutover wired.
 */
import Link from 'next/link';
import {
  Activity,
  Award,
  Compass,
  Database,
  FileText,
  Globe,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';

const NAV_ITEMS: { id: string; href: string; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', href: '/admin', label: 'Overview & KPIs', icon: LayoutDashboard },
  { id: 'catalogue', href: '/admin/catalogue', label: 'Inventory Approval', icon: Package },
  { id: 'orders', href: '/admin/orders', label: 'Payment Audit Log', icon: Landmark },
  { id: 'vendors', href: '/admin/vendors', label: 'Vendor KYB Review', icon: ShieldCheck },
  { id: 'seo', href: '/admin/seo', label: 'SEO & Redirects', icon: Globe },
  { id: 'navigation', href: '/admin/navigation', label: 'Navigation Trees', icon: Compass },
  { id: 'ai-ops', href: '/admin/ai-ops', label: 'AI-Ops Queue', icon: Terminal },
  { id: 'refunds', href: '/admin/refunds', label: 'Returns & Refunds', icon: RotateCcw },
  { id: 'discounts', href: '/admin/discounts', label: 'Promotions & Codes', icon: SlidersHorizontal },
  { id: 'customers', href: '/admin/customers', label: 'Customers', icon: Users },
  { id: 'users', href: '/admin/users', label: 'Roles & Permissions', icon: KeyRound },
  { id: 'audit', href: '/admin/audit', label: 'Audit Logs', icon: Scale },
  { id: 'content', href: '/admin/content', label: 'CMS Pages', icon: FileText },
  { id: 'certificates', href: '/admin/certificates', label: 'Certificates & OCR', icon: Award },
  { id: 'migration', href: '/admin/migration', label: 'Migration & INV-08', icon: Database },
  { id: 'operations', href: '/admin/operations', label: 'Operations & Queues', icon: Activity },
];

interface AdminShellProps {
  active: string;
  actorName: string;
  actorRole: string;
  children: React.ReactNode;
}

async function lockSession(): Promise<void> {
  await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.assign('/account/sign-in');
}

export function AdminShell({ active, actorName, actorRole, children }: AdminShellProps) {
  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col">
      {/* Luxury Header */}
      <header className="h-16 bg-[#1C1610] text-[#FAF3E3] px-4 sm:px-8 flex items-center justify-between border-b border-[#C5A059]/30">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl tracking-[0.16em] text-white font-normal">
            MAIHAN GEMS
          </Link>
          <span className="rounded-full border border-[#C5A059]/40 bg-[#C5A059]/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E6C97A]">
            Admin Console · Vault Governance
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#D8CEBE] hidden sm:inline">{actorName}</span>
          <span className="text-[#D8CEBE] hidden sm:inline">{actorRole}</span>
          <Link
            href="/vendor"
            className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#E6C97A] hover:bg-white/10"
          >
            Vendor Portal →
          </Link>
          <button
            type="button"
            onClick={() => {
              void lockSession();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-[#E6C97A] border border-[#C5A059]/35 hover:bg-white/15"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock Session
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 max-w-[1600px] w-full mx-auto">
        {/* Left Navigation Rail */}
        <aside className="md:col-span-3 lg:col-span-2 bg-[#FAF3E3]/80 border-b md:border-b-0 md:border-r border-[#E5D4B3] p-5 space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8C6D2F] px-2 pb-1">
            Governance Modules
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid={`admin-tab-${item.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] text-left text-xs font-mono uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#1C1610] text-[#E6C97A] border border-[#C5A059]/50 shadow-sm'
                    : 'text-[#3D3225] hover:bg-[#EFE5D1]/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-6 mt-6 border-t border-[#E5D4B3] px-3 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
              Cross-Surface Links
            </p>
            <Link
              href="/vendor"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Vendor Portal →
            </Link>
            <Link
              href="/account/overview"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Multi-Role Account →
            </Link>
            <Link
              href="/policy"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Legal &amp; Compliance Hub →
            </Link>
          </div>
        </aside>

        {/* Main Panel */}
        <main id="main-content" className="md:col-span-9 lg:col-span-10 p-6 sm:p-10 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
