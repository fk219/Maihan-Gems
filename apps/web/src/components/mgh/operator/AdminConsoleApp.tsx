'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowLeft, ArrowUpRight, BadgePercent, Bell,
  Building2, Check, ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck,
  Clock, CreditCard, Eye, EyeOff, Gem, LayoutDashboard, LogOut, Mail,
  Menu, MoreVertical, PanelLeftClose, Moon, PackageSearch, Plus, RotateCcw, Search,
  ShoppingCart, Settings, ShieldCheck, Sun, Trash2, TrendingDown, TrendingUp, Truck, X, HelpCircle,
} from 'lucide-react';

type Tab = 'overview' | 'inventory' | 'orders' | 'submissions' | 'vendors' | 'discounts' | 'certificates' | 'leads' | 'audit' | 'settings' | 'help';

interface Stats {
  gemstones_total: number; gemstones_active: number; gemstones_sold: number;
  settings_total: number; settings_active: number;
  products_total: number; products_active: number; products_sold: number;
  orders_total: number; orders_pending: number; orders_paid: number;
  revenue_total: number; revenue_currency: string;
  customers_total: number; vendors_total: number; vendors_active: number; vendors_pending: number;
  submissions_pending: number; submissions_total: number;
  leads_total: number; leads_new: number;
  inventory_value: number; configurations_total: number;
}
interface InvItem {
  ref: string; name: string; kind: string; status: string; price_amount: number | null;
  currency: string; weight_ct: number | null; variety: string; origin: string | null;
  origin_type: string; vendor_code: string | null; vendor_name: string | null;
  table_name: string; primary_image: string | null; created_at: string; quantity: number | null;
}
interface OrderRow {
  order_number: string; email: string; status: string; grand_total: string; currency: string; placed_at: string;
  payment_provider: string | null;
}
interface OrderDetail extends OrderRow {
  subtotal: string; tax: string; shipping: string; discount: string;
  shipping_address: Record<string, unknown>; customer_note: string | null; customer_email: string | null;
  first_name: string | null; last_name: string | null;
  items: Array<{ description: string; code_snapshot: string; quantity: number; unit_price: string; line_total: string }>;
  payments: Array<{ provider: string; state: string; amount: string; currency: string }>;
  events: Array<{ event: string; payload: unknown; created_at: string }>;
  fulfilments: Array<{ id: number; carrier: string; tracking_number: string; state: string; shipped_at: string | null; delivered_at: string | null }>;
  refunds: Array<{ id: number; amount: string; reason: string; state: string; created_at: string }>;
}
interface SubmissionRow {
  id: number; vendor_code: string; vendor_name: string; kind: string; status: string;
  payload: Record<string, unknown>; reviewer_note: string | null; resulting_ref: string | null;
  created_at: string; reviewed_at: string | null;
}
interface DiscountRow {
  id: number; code: string; kind: string; value: string; min_subtotal: string | null;
  starts_at: string | null; ends_at: string | null; usage_limit: number | null; used_count: number;
  active: boolean; created_at: string;
}
interface CertRow {
  id: number; agency: string; cert_no: string; url: string | null; issued_at: string | null;
  verified: string; gemstone_ref: string | null; gemstone_name: string | null;
  vendor_code: string | null; vendor_name: string | null; created_at: string;
}
interface OutboxItem {
  id: number; to_email: string; subject: string; state: string; attempts: number;
  last_error: string | null; created_at: string; sent_at: string | null;
}
interface OutboxData {
  summary: { queued: number; sent: number; failed: number; provider_configured: boolean };
  items: OutboxItem[];
}
interface AuditRow {
  id: number; actor_kind: string; action: string; entity_kind: string;
  entity_id: number | null; after: unknown; created_at: string;
}
interface VendorRow {
  code: string; name: string; country: string | null; status: string;
  email: string | null; contact_name: string | null; onboarding_status: string;
  live_gems: number; inventory_value: number; revenue: number; total_submissions: number;
}
interface LeadRow {
  id: number; email: string; name: string | null; source: string; status: string; created_at: string;
}
interface PaletteEntry {
  id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void;
}

const PAID_STATUSES = new Set(['PAID', 'IN_FULFILLMENT', 'FULFILLED', 'DELIVERED']);
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
type ChartRange = 'today' | 'week' | 'month';
const CHART_RANGES: Record<ChartRange, { label: string; previousLabel: string; tab: string; days: number }> = {
  today: { label: 'Today', previousLabel: 'Yesterday', tab: 'Today', days: 1 },
  week: { label: 'This week', previousLabel: 'Last week', tab: 'Week', days: 7 },
  month: { label: 'This month', previousLabel: 'Last month', tab: 'Month', days: 30 },
};
const PAYMENT_LABELS: Record<string, string> = {
  test: 'Test card', stripe: 'Card', cash: 'Cash', bank: 'Bank transfer', unrecorded: 'Unrecorded',
};
const PAYMENT_COLORS = ['var(--p-accent)', 'var(--p-info)', 'var(--p-warn-fill)', 'var(--p-good-fill)'];

const NAV_GROUPS: Array<{ head: string; items: Array<{ id: Tab; label: string; icon: LucideIcon }> }> = [
  {
    head: 'Shop',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'inventory', label: 'Inventory', icon: PackageSearch },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'submissions', label: 'Submissions', icon: ClipboardCheck },
      { id: 'vendors', label: 'Vendors', icon: Building2 },
      { id: 'discounts', label: 'Discounts', icon: BadgePercent },
      { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
      { id: 'leads', label: 'Leads', icon: Mail },
    ],
  },
  {
    head: 'Support',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help', icon: HelpCircle },
      { id: 'audit', label: 'Audit log', icon: Activity },
    ],
  },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment', PAID: 'Paid', IN_FULFILLMENT: 'In fulfilment',
  FULFILLED: 'Fulfilled', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REFUNDED: 'Refunded',
  ACTIVE: 'Active', DRAFT: 'Draft', SOLD: 'Sold', RESERVED: 'Reserved', ARCHIVED: 'Archived',
  SUBMITTED: 'Submitted', HOLD: 'On hold', APPROVED: 'Approved', REJECTED: 'Rejected',
  NEW: 'New', CONTACTED: 'Contacted', CONVERTED: 'Converted', LOST: 'Lost',
};

const statusLabel = (status: string) => STATUS_LABELS[status] ?? status.replaceAll('_', ' ').toLowerCase();

const badgeClass = (status: string) => {
  if (['ACTIVE', 'PAID', 'APPROVED', 'CONVERTED', 'DELIVERED', 'FULFILLED'].includes(status)) return 'portal-badge portal-badge--active';
  if (['SUBMITTED', 'RESERVED', 'PENDING_PAYMENT', 'NEW', 'QUOTE', 'IN_FULFILLMENT', 'HOLD'].includes(status)) return 'portal-badge portal-badge--pending';
  if (['SOLD', 'CONTACTED', 'REFUNDED'].includes(status)) return 'portal-badge portal-badge--sold';
  if (['REJECTED', 'CANCELLED', 'LOST'].includes(status)) return 'portal-badge portal-badge--rejected';
  return 'portal-badge portal-badge--draft';
};

const toneClass = (status: string) => {
  if (['ACTIVE', 'PAID', 'APPROVED', 'DELIVERED', 'FULFILLED', 'CONVERTED'].includes(status)) return 'is-good';
  if (['REJECTED', 'CANCELLED', 'LOST', 'PENDING_PAYMENT'].includes(status)) return 'is-late';
  return 'is-pending';
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const buildChartSeries = <T,>(
  items: T[],
  dateOf: (item: T) => Date,
  valueOf: (item: T) => number,
  range: ChartRange,
) => {
  if (range === 'today') {
    const base = startOfDay(new Date());
    const buckets = Array.from({ length: 48 }, (_, index) => {
      const date = new Date(base.getTime() - (47 - index) * HOUR_MS);
      return { label: date.getHours().toString().padStart(2, '0'), value: 0 };
    });
    for (const item of items) {
      const hour = new Date(dateOf(item));
      hour.setMinutes(0, 0, 0);
      const diff = Math.round((base.getTime() - hour.getTime()) / HOUR_MS);
      if (diff < 0 || diff >= 48) continue;
      buckets[47 - diff]!.value += valueOf(item);
    }
    return buckets.slice(24).map((bucket, index) => ({
      label: bucket.label,
      current: bucket.value,
      previous: buckets[index]!.value,
    }));
  }
  const days = range === 'week' ? 7 : 30;
  const today = startOfDay(new Date());
  const buckets = Array.from({ length: days * 2 }, (_, index) => {
    const date = new Date(today.getTime() - (days * 2 - 1 - index) * DAY_MS);
    return { label: date.toLocaleDateString('en-GB', { weekday: 'short' }), value: 0 };
  });
  for (const item of items) {
    const date = startOfDay(dateOf(item));
    const diff = Math.round((today.getTime() - date.getTime()) / DAY_MS);
    if (diff < 0 || diff >= days * 2) continue;
    buckets[days * 2 - 1 - diff]!.value += valueOf(item);
  }
  return buckets.slice(days).map((bucket, index) => ({
    label: bucket.label,
    current: bucket.value,
    previous: buckets[index]!.value,
  }));
};

const sparkPath = (values: number[], width = 60, height = 20) => {
  if (values.length === 0) return `M0 ${height / 2} L${width} ${height / 2}`;
  const max = Math.max(...values, 0);
  if (max === 0) return `M0 ${height / 2} L${width} ${height / 2}`;
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 1 - (value / max) * (height - 2);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

const paymentLabel = (provider: string) => PAYMENT_LABELS[provider] ?? provider.replaceAll('_', ' ');

const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const compactMoney = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(value)}`;
};

const niceMax = (value: number) => {
  if (value <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const rounded = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return rounded * power;
};

const initials = (value: string) => {
  const base = value.includes('@') ? value.split('@')[0] ?? value : value;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '').join('');
  return (letters.length > 1 ? letters : base.slice(0, 2) || 'MG').toUpperCase();
};

const ageInDays = (iso: string) => {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / DAY_MS));
};

const stockPill = (days: number) => {
  if (days >= 60) return { label: 'Aged', className: 'is-aged' };
  if (days >= 30) return { label: 'Slow', className: 'is-slow' };
  return { label: 'Fresh', className: 'is-fresh' };
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatClock = (date: Date) =>
  `${date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });

const addressLine = (address: Record<string, unknown>) =>
  Object.values(address).filter((value) => typeof value === 'string' && value.trim().length > 0).join(' · ');

export default function AdminConsoleApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState('admin@maihangems.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [twoFactor, setTwoFactor] = useState<{ enabled: boolean } | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [subFilter, setSubFilter] = useState('');
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [outbox, setOutbox] = useState<OutboxData | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<number | null>(null);
  const [discountEdit, setDiscountEdit] = useState({ value: '', min_subtotal: '', starts_at: '', ends_at: '' });
  const [shipForm, setShipForm] = useState({ carrier: '', tracking_number: '' });
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [discountForm, setDiscountForm] = useState({ code: '', kind: 'PERCENT', value: '', min_subtotal: '' });
  const [busy, setBusy] = useState(false);
  const [vendorAction, setVendorAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [issuedKey, setIssuedKey] = useState<{ code: string; key: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ current_password: '', new_password: '' });
  const [settingsNotice, setSettingsNotice] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '', legal_name: '', contact_name: '', email: '', country: '', phone: '', website: '',
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [range, setRange] = useState<ChartRange>('week');
  const [partnerMetric, setPartnerMetric] = useState<'value' | 'units' | 'revenue'>('value');

  const loadAll = useCallback(async () => {
    setBusy(true);
    try {
      const [statsRes, invRes, ordersRes, vendorsRes, leadsRes, subRes, discRes, auditRes, certRes, outboxRes] = await Promise.all([
        fetch('/api/fresh/admin/stats', { cache: 'no-store' }),
        fetch('/api/fresh/admin/inventory?limit=100', { cache: 'no-store' }),
        fetch('/api/fresh/admin/orders?limit=200', { cache: 'no-store' }),
        fetch('/api/fresh/admin/vendors', { cache: 'no-store' }),
        fetch('/api/fresh/admin/leads', { cache: 'no-store' }),
        fetch('/api/fresh/admin/submissions', { cache: 'no-store' }),
        fetch('/api/fresh/admin/discounts', { cache: 'no-store' }),
        fetch('/api/fresh/admin/audit?limit=100', { cache: 'no-store' }),
        fetch('/api/fresh/admin/certificates', { cache: 'no-store' }),
        fetch('/api/fresh/admin/outbox?limit=10', { cache: 'no-store' }),
      ]);
      if (statsRes.status === 401) { setAuthed(false); return; }
      if (statsRes.ok) setStats((await statsRes.json()) as Stats);
      if (invRes.ok) {
        const data = (await invRes.json()) as InvItem[] | { items?: InvItem[] };
        setInventory(Array.isArray(data) ? data : data.items ?? []);
      }
      if (ordersRes.ok) setOrders((await ordersRes.json()) as OrderRow[]);
      if (vendorsRes.ok) setVendors((await vendorsRes.json()) as VendorRow[]);
      if (leadsRes.ok) setLeads((await leadsRes.json()) as LeadRow[]);
      if (subRes.ok) setSubmissions((await subRes.json()) as SubmissionRow[]);
      if (discRes.ok) setDiscounts((await discRes.json()) as DiscountRow[]);
      if (auditRes.ok) setAudit((await auditRes.json()) as AuditRow[]);
      if (certRes.ok) setCerts((await certRes.json()) as CertRow[]);
      if (outboxRes.ok) setOutbox((await outboxRes.json()) as OutboxData);
      const twoFactorRes = await fetch('/api/fresh/admin/auth/2fa/status', { cache: 'no-store' });
      if (twoFactorRes.ok) setTwoFactor((await twoFactorRes.json()) as { enabled: boolean });
      setAuthed(true);
    } catch { setAuthed(false); }
    setBusy(false);
  }, []);

  useEffect(() => {
    fetch('/api/fresh/admin/stats', { cache: 'no-store' })
      .then((response) => setAuthed(response.status !== 401))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => { if (authed) void loadAll(); }, [authed, loadAll]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('maihan_portal_theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch { setTheme('light'); }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('maihan_portal_theme', theme); } catch { return; }
  }, [theme]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setMenuOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginError(''); setBusy(true);
    const response = await fetch('/api/fresh-admin/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: adminEmail.trim(), password }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string; requires_2fa?: boolean; challenge_token?: string;
    };
    if (response.ok && data.requires_2fa && data.challenge_token) {
      setChallengeToken(data.challenge_token);
      setPassword('');
    } else if (response.ok) {
      setPassword(''); setAuthed(true); await loadAll();
    } else {
      setLoginError(data.error ?? 'Invalid email or password');
    }
    setBusy(false);
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginError(''); setBusy(true);
    const response = await fetch('/api/fresh-admin/2fa/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenge_token: challengeToken, code: otp }),
    });
    if (response.ok) {
      setChallengeToken(null); setOtp(''); setAuthed(true); await loadAll();
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setLoginError(data.error ?? 'Invalid two-factor code');
    }
    setBusy(false);
  };

  const setupTotp = async () => {
    setTotpError('');
    const response = await fetch('/api/fresh/admin/auth/2fa/setup', { method: 'POST' });
    if (response.ok) setTotpSetup((await response.json()) as { secret: string; otpauth_url: string });
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setTotpError(data.error ?? 'Could not start 2FA setup');
    }
  };

  const enableTotp = async () => {
    setTotpError('');
    const response = await fetch('/api/fresh/admin/auth/2fa/enable', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: totpCode }),
    });
    if (response.ok) { setTwoFactor({ enabled: true }); setTotpSetup(null); setTotpCode(''); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setTotpError(data.error ?? 'Could not enable 2FA');
    }
  };

  const disableTotp = async () => {
    setTotpError('');
    const response = await fetch('/api/fresh/admin/auth/2fa/disable', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: totpCode }),
    });
    if (response.ok) { setTwoFactor({ enabled: false }); setTotpCode(''); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setTotpError(data.error ?? 'Could not disable 2FA');
    }
  };

  const logout = async () => {
    await fetch('/api/fresh-admin/login', { method: 'DELETE' });
    setAuthed(false);
  };

  const searchInventory = useCallback(async (term?: string, status?: string) => {
    setBusy(true);
    const params = new URLSearchParams({ limit: '100' });
    const query = term ?? invSearch;
    const state = status ?? invStatus;
    if (query) params.set('q', query);
    if (state) params.set('status', state);
    const response = await fetch(`/api/fresh/admin/inventory?${params}`, { cache: 'no-store' });
    if (response.ok) {
      const data = (await response.json()) as InvItem[] | { items?: InvItem[] };
      setInventory(Array.isArray(data) ? data : data.items ?? []);
      setSelectedInventory([]);
    }
    setBusy(false);
  }, [invSearch, invStatus]);

  const loadMoreOrders = async () => {
    const response = await fetch(`/api/fresh/admin/orders?limit=100&offset=${orders.length}`, { cache: 'no-store' });
    if (!response.ok) return;
    const more = (await response.json()) as OrderRow[];
    setOrders((current) => [...current, ...more.filter((row) => !current.some((o) => o.order_number === row.order_number))]);
  };

  const loadMoreSubmissions = async () => {
    const response = await fetch(`/api/fresh/admin/submissions?limit=100&offset=${submissions.length}`, { cache: 'no-store' });
    if (!response.ok) return;
    const more = (await response.json()) as SubmissionRow[];
    setSubmissions((current) => [...current, ...more.filter((row) => !current.some((x) => x.id === row.id))]);
  };

  const loadMoreInventory = async () => {
    const params = new URLSearchParams({ limit: '100', offset: String(inventory.length) });
    if (invSearch) params.set('q', invSearch);
    if (invStatus) params.set('status', invStatus);
    const response = await fetch(`/api/fresh/admin/inventory?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const more = ((await response.json()) as { items?: InvItem[] }).items ?? [];
    setInventory((current) => [...current, ...more.filter((row) => !current.some((x) => x.ref === row.ref && x.table_name === row.table_name))]);
  };

  const updateStock = async (ref: string, quantity: number) => {
    setBusy(true); setActionError('');
    const response = await fetch(`/api/fresh/admin/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? 'Could not update stock');
    } else {
      await loadAll();
    }
    setBusy(false);
  };

  const updateStatus = async (ref: string, status: string) => {
    setBusy(true);
    await fetch(`/api/fresh/admin/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll(); setBusy(false);
  };

  const toggleInventorySelection = (ref: string) => {
    setSelectedInventory((current) => current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref]);
  };

  const bulkUpdateInventory = async (status: string) => {
    if (selectedInventory.length === 0) return;
    setBusy(true);
    await Promise.all(selectedInventory.map((ref) => fetch(`/api/fresh/admin/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })));
    setSelectedInventory([]);
    await loadAll();
    setBusy(false);
  };

  const openOrder = useCallback(async (number: string) => {
    setBusy(true);
    const response = await fetch(`/api/fresh/admin/orders/${number}`, { cache: 'no-store' });
    if (response.ok) setOrderDetail((await response.json()) as OrderDetail);
    setBusy(false);
  }, []);

  const vendorOnboarding = async (vendor: VendorRow, action: 'approve' | 'reject' | 'suspend') => {
    setVendorAction(action); setActionError('');
    try {
      const response = await fetch(`/api/fresh/admin/onboarding/${encodeURIComponent(vendor.code)}/${action}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? {} : { note: action === 'suspend' ? 'Suspended by admin' : 'Rejected by admin' }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; apiKey?: string };
      if (!response.ok) throw new Error(data.error ?? 'Action failed');
      const refreshed = await fetch('/api/fresh/admin/vendors', { cache: 'no-store' });
      if (refreshed.ok) {
        const list = (await refreshed.json()) as VendorRow[];
        setVendors(list);
        setSelectedVendor(list.find((item) => item.code === vendor.code) ?? null);
      }
      if (action === 'approve' && data.apiKey) setIssuedKey({ code: vendor.code, key: data.apiKey });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Action failed');
    } finally {
      setVendorAction(null);
    }
  };

  const createVendor = async (event: React.FormEvent) => {
    event.preventDefault(); setCreateBusy(true); setActionError('');
    try {
      const response = await fetch('/api/fresh/vendors', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name, legal_name: createForm.legal_name,
          contact_name: createForm.contact_name, email: createForm.email,
          country: createForm.country,
          phone: createForm.phone || undefined,
          website: createForm.website || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; vendorCode?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not create partner');
      setShowCreate(false);
      setCreateForm({ name: '', legal_name: '', contact_name: '', email: '', country: '', phone: '', website: '' });
      await loadAll();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not create partner');
    } finally {
      setCreateBusy(false);
    }
  };

  const markLead = async (id: number, status: string) => {
    await fetch(`/api/fresh/admin/leads/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  };

  const moderateSubmission = async (id: number, action: 'approve' | 'reject' | 'hold' | 'release') => {
    setVendorAction(`${action}-${id}`); setActionError('');
    try {
      const response = await fetch(`/api/fresh/admin/submissions/${id}/${action}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'approve' || action === 'release' ? {} : { note: action === 'hold' ? 'On hold for review' : 'Rejected by admin' }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Action failed');
      await loadAll();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Action failed');
    } finally {
      setVendorAction(null);
    }
  };

  const transitionOrder = async (status: string) => {
    if (!orderDetail) return;
    setBusy(true); setActionError('');
    const response = await fetch(`/api/fresh/admin/orders/${orderDetail.order_number}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not update the order');
    else { await openOrder(orderDetail.order_number); await loadAll(); }
    setBusy(false);
  };

  const shipOrder = async () => {
    if (!orderDetail) return;
    setBusy(true); setActionError('');
    const response = await fetch(`/api/fresh/admin/orders/${orderDetail.order_number}/fulfillment`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(shipForm),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not record the shipment');
    else { setShipForm({ carrier: '', tracking_number: '' }); await openOrder(orderDetail.order_number); await loadAll(); }
    setBusy(false);
  };

  const refundOrder = async () => {
    if (!orderDetail) return;
    setBusy(true); setActionError('');
    const response = await fetch(`/api/fresh/admin/orders/${orderDetail.order_number}/refund`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: Number(refundForm.amount), reason: refundForm.reason || 'admin refund' }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not record the refund');
    else { setRefundForm({ amount: '', reason: '' }); await openOrder(orderDetail.order_number); await loadAll(); }
    setBusy(false);
  };

  const createDiscount = async (event: React.FormEvent) => {
    event.preventDefault(); setActionError('');
    const response = await fetch('/api/fresh/admin/discounts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: discountForm.code.trim().toUpperCase(),
        kind: discountForm.kind,
        value: Number(discountForm.value),
        min_subtotal: discountForm.min_subtotal ? Number(discountForm.min_subtotal) : null,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not create the discount');
    else { setDiscountForm({ code: '', kind: 'PERCENT', value: '', min_subtotal: '' }); await loadAll(); }
  };

  const editDiscount = (discount: DiscountRow) => {
    setEditingDiscount(discount.id);
    setDiscountEdit({
      value: String(Number(discount.value)),
      min_subtotal: discount.min_subtotal ? String(Number(discount.min_subtotal)) : '',
      starts_at: discount.starts_at ? discount.starts_at.slice(0, 10) : '',
      ends_at: discount.ends_at ? discount.ends_at.slice(0, 10) : '',
    });
  };

  const saveDiscount = async (id: number) => {
    setActionError('');
    const response = await fetch(`/api/fresh/admin/discounts/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        value: Number(discountEdit.value),
        min_subtotal: discountEdit.min_subtotal ? Number(discountEdit.min_subtotal) : null,
        starts_at: discountEdit.starts_at || null,
        ends_at: discountEdit.ends_at || null,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not update the discount');
    else { setEditingDiscount(null); await loadAll(); }
  };

  const dispatchEmails = async () => {
    setBusy(true); setActionError('');
    const response = await fetch('/api/fresh/admin/outbox/dispatch', { method: 'POST' });
    const data = (await response.json().catch(() => ({}))) as { error?: string; provider_configured?: boolean };
    if (!response.ok) setActionError(data.error ?? 'Could not dispatch the outbox');
    else if (!data.provider_configured) setActionError('No email provider configured — messages stay queued (dev transport).');
    const refreshed = await fetch('/api/fresh/admin/outbox?limit=10', { cache: 'no-store' });
    if (refreshed.ok) setOutbox((await refreshed.json()) as OutboxData);
    setBusy(false);
  };

  const verifyCertificate = async (id: number, verified: 'VERIFIED' | 'FLAGGED' | 'UNVERIFIED') => {
    setActionError('');
    const response = await fetch(`/api/fresh/admin/certificates/${id}/verify`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ verified }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? 'Could not update the certificate');
    } else {
      await loadAll();
    }
  };

  const changeAdminPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError('');
    setSettingsNotice('');
    const response = await fetch('/api/fresh/admin/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not change the password');
    else {
      setSettingsForm({ current_password: '', new_password: '' });
      setSettingsNotice('Password updated.');
    }
  };

  const cancelOrder = async () => {
    if (!orderDetail) return;
    if (!window.confirm(`Cancel ${orderDetail.order_number}? Reserved stones return to the vault and a pending refund is recorded when paid.`)) return;
    setBusy(true); setActionError('');
    const response = await fetch(`/api/fresh/admin/orders/${orderDetail.order_number}/cancel`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'cancelled by admin' }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setActionError(data.error ?? 'Could not cancel the order');
    else { await openOrder(orderDetail.order_number); await loadAll(); }
    setBusy(false);
  };

  const toggleDiscount = async (discount: DiscountRow) => {
    await fetch(`/api/fresh/admin/discounts/${discount.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !discount.active }),
    });
    await loadAll();
  };

  const chartRange = CHART_RANGES[range];
  const paidOrders = useMemo(() => orders.filter((order) => PAID_STATUSES.has(order.status)), [orders]);
  const series = useMemo(
    () => buildChartSeries(paidOrders, (order) => new Date(order.placed_at), (order) => Number(order.grand_total), range),
    [paidOrders, range],
  );
  const currentTotal = series.reduce((total, day) => total + day.current, 0);
  const previousTotal = series.reduce((total, day) => total + day.previous, 0);
  const rangeStart = useMemo(() => startOfDay(new Date()).getTime() - (chartRange.days - 1) * DAY_MS, [chartRange.days]);
  const currentPeriodOrders = useMemo(
    () => paidOrders.filter((order) => startOfDay(new Date(order.placed_at)).getTime() >= rangeStart),
    [paidOrders, rangeStart],
  );
  const currentAverage = currentPeriodOrders.length ? currentTotal / currentPeriodOrders.length : 0;
  const cancelledThisRange = useMemo(
    () => orders.filter((order) => order.status === 'CANCELLED' && startOfDay(new Date(order.placed_at)).getTime() >= rangeStart).length,
    [orders, rangeStart],
  );
  const delta = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const chartMax = niceMax(Math.max(...series.map((day) => Math.max(day.current, day.previous)), 1));
  const hasChartData = series.some((day) => day.current > 0 || day.previous > 0);

  const activeOrders = orders.filter((order) => ['PAID', 'IN_FULFILLMENT'].includes(order.status));
  const pendingOrders = orders.filter((order) => order.status === 'PENDING_PAYMENT');
  const latestOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()).slice(0, 4),
    [orders],
  );
  const timelineOrders = useMemo(
    () => [...orders]
      .filter((order) => ['PENDING_PAYMENT', 'PAID', 'IN_FULFILLMENT', 'FULFILLED'].includes(order.status))
      .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
      .slice(0, 5),
    [orders],
  );
  const topVendors = useMemo(
    () => [...vendors]
      .sort((a, b) => (partnerMetric === 'value' ? b.inventory_value - a.inventory_value : partnerMetric === 'revenue' ? b.revenue - a.revenue : b.live_gems - a.live_gems))
      .slice(0, 5),
    [vendors, partnerMetric],
  );
  const topVendorMetric = topVendors[0]
    ? (partnerMetric === 'value' ? topVendors[0].inventory_value : partnerMetric === 'revenue' ? topVendors[0].revenue : topVendors[0].live_gems)
    : 0;
  const vendorMetric = (vendor: VendorRow) => (partnerMetric === 'value' ? vendor.inventory_value : partnerMetric === 'revenue' ? vendor.revenue : vendor.live_gems);
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const order of currentPeriodOrders) {
      const provider = order.payment_provider ?? 'unrecorded';
      const entry = map.get(provider) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(order.grand_total);
      map.set(provider, entry);
    }
    return [...map.entries()]
      .map(([provider, value], index) => ({
        provider,
        ...value,
        color: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
        spark: sparkPath(
          buildChartSeries(
            currentPeriodOrders.filter((order) => (order.payment_provider ?? 'unrecorded') === provider),
            (order) => new Date(order.placed_at),
            () => 1,
            range,
          ).map((point) => point.current),
        ),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentPeriodOrders, range]);
  const agedInventory = useMemo(
    () => [...inventory]
      .filter((item) => item.status !== 'SOLD')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 4),
    [inventory],
  );

  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    const entries: PaletteEntry[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        entries.push({
          id: `tab-${item.id}`, group: 'Navigate', label: item.label, hint: 'Page', icon: item.icon,
          run: () => {
            setTab(item.id);
            setOrderDetail(null);
            setSelectedVendor(null);
            setMenuOpen(false);
          },
        });
      }
    }
    for (const order of orders.slice(0, 6)) {
      entries.push({
        id: `order-${order.order_number}`, group: 'Orders', label: order.order_number,
        hint: `${order.email} · ${statusLabel(order.status)}`, icon: ShoppingCart,
        run: () => {
          setTab('orders');
          setSelectedVendor(null);
          void openOrder(order.order_number);
          setMenuOpen(false);
        },
      });
    }
    for (const item of inventory.slice(0, 6)) {
      entries.push({
        id: `inv-${item.ref}`, group: 'Inventory', label: item.name,
        hint: `${item.ref} · ${item.variety}`, icon: Gem,
        run: () => {
          setTab('inventory');
          setOrderDetail(null);
          setSelectedVendor(null);
          setInvSearch(item.ref);
          void searchInventory(item.ref, invStatus);
          setMenuOpen(false);
        },
      });
    }
    for (const vendor of vendors.slice(0, 4)) {
      entries.push({
        id: `vendor-${vendor.code}`, group: 'Vendors', label: vendor.name,
        hint: `${vendor.code} · ${vendor.country ?? '—'}`, icon: Building2,
        run: () => {
          setTab('vendors');
          setOrderDetail(null);
          setSelectedVendor(vendor);
          setMenuOpen(false);
        },
      });
    }
    return entries;
  }, [orders, inventory, vendors, openOrder, searchInventory, invStatus]);

  const visiblePalette = paletteEntries
    .filter((entry) => `${entry.group} ${entry.label} ${entry.hint ?? ''}`.toLowerCase().includes(paletteQuery.trim().toLowerCase()))
    .slice(0, 14);

  if (authed === null) return <div className="portal-shell" />;

  if (!authed) {
    return (
      <div className="portal-shell portal-auth" data-portal-theme={theme}>
        <div className="portal-auth__inner">
          <div className="portal-auth__brand">
            <span className="portal-auth__mark"><Gem /></span>
            <p className="portal-auth__eyebrow">Maihan Gems</p>
            <h1 className="portal-auth__title">Maison Operations</h1>
            <p className="portal-auth__sub">The complete ledger of the house.</p>
            <span className="portal-auth__rule" />
          </div>
          <form onSubmit={challengeToken ? verifyOtp : login} className="portal-card portal-auth__card space-y-5">
            {challengeToken ? (
              <>
                <p className="portal-card__sub">Enter the 6-digit code from your authenticator app.</p>
                <div>
                  <label className="portal-label" htmlFor="admin-otp">Authentication code</label>
                  <input id="admin-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="portal-input portal-input--mono" autoFocus />
                </div>
              </>
            ) : (
              <>
            <div>
              <label className="portal-label" htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required className="portal-input" autoComplete="email" />
            </div>
            <div>
              <label className="portal-label" htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="portal-input" autoComplete="current-password" />
            </div>
              </>
            )}
            {loginError ? <p className="portal-notice">{loginError}</p> : null}
            <button type="submit" disabled={busy || (challengeToken !== null && otp.length !== 6)} className="portal-btn portal-btn--gold w-full">
              {busy ? 'Opening the vault…' : challengeToken ? 'Verify code' : 'Enter the console'}
            </button>
            {challengeToken ? (
              <button type="button" onClick={() => { setChallengeToken(null); setOtp(''); setLoginError(''); }} className="portal-card__sub" style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                Back to password
              </button>
            ) : null}
          </form>
          <p className="portal-auth__foot">Authorized personnel only.</p>
        </div>
      </div>
    );
  }

  const currentTab = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === tab);
  const pendingReview = submissions.filter((submission) => submission.status === 'SUBMITTED').length;
  const newLeads = leads.filter((lead) => lead.status === 'NEW').length;
  const notificationCount = pendingReview + newLeads;

  const navCount = (id: Tab) => {
    if (id === 'orders') return activeOrders.length + pendingOrders.length;
    if (id === 'submissions') return pendingReview;
    if (id === 'leads') return newLeads;
    return null;
  };

  const openNewPartner = () => {
    setTab('vendors');
    setSelectedVendor(null);
    setShowCreate(true);
    setActionError('');
  };

  const downloadCsv = (filename: string, rows: Array<Array<string | number | null>>) => {
    const escape = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-shell" data-portal-theme={theme}>
      {menuOpen ? <button type="button" className="portal-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

      <aside className={`portal-sidebar ${collapsed ? 'is-collapsed' : ''} ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="portal-brand">
          <button type="button" className="portal-brand__logo" onClick={() => { setTab('overview'); setOrderDetail(null); setSelectedVendor(null); }}>
            <span className="portal-brand__mark"><Gem /></span>
            <span className="portal-brand__text">
              <span className="portal-brand__name">Maihan Gems</span>
              <span className="portal-brand__eyebrow">Operations</span>
            </span>
          </button>
          <button
            type="button"
            className="portal-brand__collapse"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <PanelLeftClose />
          </button>
        </div>

        <nav className="portal-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.head}>
              <p className="portal-nav__head">{group.head}</p>
              {group.items.map((item) => {
                const count = navCount(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`portal-nav__item ${tab === item.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setTab(item.id);
                      setOrderDetail(null);
                      setSelectedVendor(null);
                      setMenuOpen(false);
                    }}
                  >
                    <item.icon />
                    <span className="portal-nav__label">{item.label}</span>
                    {count ? <span className={`portal-nav__count ${item.id === 'submissions' || item.id === 'leads' ? 'portal-nav__count--warn' : ''}`}>{count}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="portal-sidebar__footer">
          <div className="portal-user">
            {userMenuOpen ? (
              <div className="portal-user__panel" role="menu">
                <button type="button" className="portal-user__item" role="menuitem" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
                  {theme === 'light' ? <Moon /> : <Sun />}
                  <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
                </button>
                <button type="button" className="portal-user__item" role="menuitem" onClick={() => void logout()}>
                  <LogOut />
                  <span>Sign out</span>
                </button>
              </div>
            ) : null}
            <button type="button" className="portal-sidebar__me" aria-haspopup="menu" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((value) => !value)}>
              <span className="portal-avatar">{initials(adminEmail)}</span>
              <span className="portal-sidebar__me-text">
                <b>{adminEmail.split('@')[0]}</b>
                <small>Administrator</small>
              </span>
              <MoreVertical className="portal-sidebar__dots" />
            </button>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-top">
          <div className="portal-top__left">
            <button type="button" className="portal-menu-btn" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Menu />
            </button>
            <div className="portal-top__where">
              <span>Shop</span>
              <ChevronRight className="portal-top__sep" />
              <b>{currentTab?.label ?? 'Overview'}</b>
            </div>
          </div>

          <button type="button" className="portal-top__search" onClick={() => { setPaletteQuery(''); setPaletteOpen(true); }}>
            <Search />
            <span>Search orders, gems, partners…</span>
            <kbd className="portal-top__kbd">⌘K</kbd>
          </button>

          <div className="portal-top__tools">
            <span className="portal-chip">
              <Building2 />
              <span>Full platform</span>
              <ChevronDown className="portal-chip__chev" />
            </span>
            <span className="portal-chip portal-chip--live">
              <i className="portal-live-dot" />
              <span>{formatClock(now)}</span>
            </span>
            <div className="portal-notifications">
              <button
                type="button"
                className="portal-icon-btn"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell />
                {notificationCount > 0 ? <span className="portal-badge-dot">{notificationCount}</span> : null}
              </button>
              {notificationsOpen ? (
                <>
                  <button type="button" className="portal-notifications__scrim" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} />
                  <div className="portal-notifications__panel">
                  <p className="portal-label" style={{ padding: '2px 8px 8px' }}>Needs attention</p>
                  <button type="button" className="portal-notification__item" onClick={() => { setTab('submissions'); setNotificationsOpen(false); }}>
                    <ClipboardCheck />
                    <span className="portal-notification__text">
                      <span className="portal-notification__title">Partner submissions</span>
                      <span className="portal-notification__sub">Awaiting moderation</span>
                    </span>
                    <span className="portal-notification__count">{pendingReview}</span>
                  </button>
                  <button type="button" className="portal-notification__item" onClick={() => { setTab('orders'); setNotificationsOpen(false); }}>
                    <ShoppingCart />
                    <span className="portal-notification__text">
                      <span className="portal-notification__title">Orders awaiting payment</span>
                      <span className="portal-notification__sub">Pending settlement</span>
                    </span>
                    <span className="portal-notification__count">{pendingOrders.length}</span>
                  </button>
                  <button type="button" className="portal-notification__item" onClick={() => { setTab('leads'); setNotificationsOpen(false); }}>
                    <Mail />
                    <span className="portal-notification__text">
                      <span className="portal-notification__title">New leads</span>
                      <span className="portal-notification__sub">Viewing and newsletter enquiries</span>
                    </span>
                    <span className="portal-notification__count">{newLeads}</span>
                  </button>
                    {notificationCount === 0 ? <p className="portal-notifications__empty">Nothing requires attention.</p> : null}
                  </div>
                </>
              ) : null}
            </div>
            <button
              type="button"
              className="portal-icon-btn"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? <Moon /> : <Sun />}
            </button>
            <button type="button" className="portal-btn portal-btn--gold" onClick={openNewPartner}>
              <Plus />
              <span>New</span>
            </button>
          </div>
        </header>

        {tab === 'overview' ? (
          <div className="portal-section">
            <div className="portal-greeting">
              <div>
                <h1 className="portal-greeting__title">{greeting()}, Admin</h1>
                <p className="portal-greeting__sub">
                  {formatDay(now)} · {activeOrders.length} orders in motion · <b>{stats?.orders_pending ?? pendingOrders.length} awaiting payment</b>
                </p>
              </div>
              <div className="portal-greeting__actions">
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => setTab('submissions')}>
                  <ClipboardCheck />
                  <span>Review submissions</span>
                </button>
                <button type="button" className="portal-btn portal-btn--gold" onClick={openNewPartner}>
                  <Building2 />
                  <span>New partner</span>
                </button>
              </div>
            </div>

            <div className="portal-grid--top">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Takings</h2>
                    <p className="portal-card__sub">{chartRange.label} · settled orders against {chartRange.previousLabel.toLowerCase()}</p>
                  </div>
                  <div className="portal-seg" role="group" aria-label="Takings range">
                    {(Object.keys(CHART_RANGES) as ChartRange[]).map((value) => (
                      <button key={value} type="button" className={`portal-seg__item ${range === value ? 'is-active' : ''}`} onClick={() => setRange(value)}>
                        {CHART_RANGES[value].tab}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="portal-takings__big">
                  <span className="portal-takings__val">{money(currentTotal, stats?.revenue_currency ?? 'USD')}</span>
                  <span className={`portal-takings__trend ${delta !== null && delta < 0 ? 'is-down' : ''}`}>
                    {delta !== null && delta < 0 ? <TrendingDown /> : <TrendingUp />}
                    {delta === null
                      ? previousTotal === 0 && currentTotal > 0 ? 'First settled period' : 'No settled orders yet'
                      : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs ${chartRange.previousLabel.toLowerCase()}`}
                  </span>
                </div>

                <div className="portal-inline" style={{ alignItems: 'center' }}>
                  <dl className="portal-takings__kpis">
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">Sales</dt>
                      <dd className="portal-kpi__value">{currentPeriodOrders.length}</dd>
                    </div>
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">Average basket</dt>
                      <dd className="portal-kpi__value">{money(currentAverage, stats?.revenue_currency ?? 'USD')}</dd>
                    </div>
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">Cancelled</dt>
                      <dd className="portal-kpi__value">{cancelledThisRange}</dd>
                    </div>
                  </dl>
                  <div className="portal-legend">
                    <span className="portal-legend__item"><i className="portal-legend__dot is-current" /> {chartRange.label}</span>
                    <span className="portal-legend__item"><i className="portal-legend__dot is-previous" /> {chartRange.previousLabel}</span>
                  </div>
                </div>

                <div className="portal-chart">
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label={`Settled order value for ${chartRange.label.toLowerCase()} compared with ${chartRange.previousLabel.toLowerCase()}`}>
                    {[0, 1, 2, 3].map((line) => {
                      const y = 20 + line * (125 / 3);
                      const labelValue = (chartMax * (3 - line)) / 3;
                      return (
                        <g key={line}>
                          <line x1="42" x2="590" y1={y} y2={y} stroke="var(--p-line)" strokeDasharray={line === 3 ? undefined : '2 3'} />
                          <text x="4" y={y + 4} fontSize="10" fill="var(--p-faint)">{compactMoney(labelValue)}</text>
                        </g>
                      );
                    })}
                    {series.map((day, index) => {
                      const step = (590 - 42) / series.length;
                      const groupX = 42 + index * step + step / 2;
                      const barWidth = Math.max(3, Math.min(22, step * 0.28));
                      const gap = Math.max(2, barWidth * 0.18);
                      const currentHeight = (day.current / chartMax) * 125;
                      const previousHeight = (day.previous / chartMax) * 125;
                      return (
                        <g key={`${day.label}-${index}`}>
                          {day.previous > 0 ? (
                            <rect
                              x={groupX - barWidth - gap / 2}
                              y={145 - previousHeight}
                              width={barWidth}
                              height={previousHeight}
                              rx={4}
                              fill="var(--p-chart-ghost)"
                              stroke="var(--p-chart-ghost-line)"
                              strokeDasharray="2 2"
                            />
                          ) : null}
                          {day.current > 0 ? (
                            <rect
                              x={groupX + gap / 2}
                              y={145 - currentHeight}
                              width={barWidth}
                              height={currentHeight}
                              rx={4}
                              fill="var(--p-chart-current)"
                            />
                          ) : null}
                          {range === 'today'
                            ? index % 3 === 0 ? <text x={groupX} y="162" fontSize="11" fill="var(--p-muted)" textAnchor="middle">{day.label}</text> : null
                            : series.length <= 14 || index % 5 === 0 || index === series.length - 1
                              ? <text x={groupX} y="162" fontSize="11" fill="var(--p-muted)" textAnchor="middle">{day.label}</text>
                              : null}
                        </g>
                      );
                    })}
                  </svg>
                  {!hasChartData ? <div className="portal-chart__empty">No settled orders {chartRange.label.toLowerCase()} yet.</div> : null}
                </div>
              </section>

              <div className="portal-tiles">
                <button type="button" className="portal-tile portal-tile--gold" onClick={() => setTab('orders')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><ClipboardCheck /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Orders to fulfil</span>
                    <span className="portal-tile__value">{activeOrders.length}</span>
                    <span className="portal-tile__sub">{pendingOrders.length} still awaiting payment</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--butter" onClick={() => setTab('submissions')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><ClipboardCheck /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Awaiting review</span>
                    <span className="portal-tile__value">{stats?.submissions_pending ?? pendingReview}</span>
                    <span className="portal-tile__sub">{stats?.submissions_total ?? submissions.length} lifetime submissions</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--sky" onClick={() => setTab('vendors')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><Building2 /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Active partners</span>
                    <span className="portal-tile__value">{stats?.vendors_active ?? vendors.filter((vendor) => vendor.status === 'ACTIVE').length}</span>
                    <span className="portal-tile__sub">{stats?.vendors_pending ?? vendors.filter((vendor) => vendor.status === 'DRAFT').length} pending onboarding</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--mint" onClick={() => setTab('inventory')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><Gem /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Inventory value</span>
                    <span className="portal-tile__value">{money(stats?.inventory_value ?? 0, stats?.revenue_currency ?? 'USD')}</span>
                    <span className="portal-tile__sub">{stats?.gemstones_active ?? 0} active stones</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="portal-grid--mid">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Orders in motion</h2>
                    <p className="portal-card__sub">{activeOrders.length} of {orders.length} recent orders require the house</p>
                  </div>
                  <div className="portal-card__actions">
                    <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('orders')}>
                      All orders <ArrowUpRight />
                    </button>
                    <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('orders')}>
                      Board
                    </button>
                  </div>
                </header>

                {timelineOrders.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><ShoppingCart /></div>
                    <p className="portal-empty__title">No orders in motion</p>
                    <p className="portal-empty__sub">New orders will land here as they are placed.</p>
                  </div>
                ) : (
                  <div className="portal-timeline">
                    {timelineOrders.map((order) => {
                      const tone = toneClass(order.status);
                      return (
                        <button
                          type="button"
                          key={order.order_number}
                          className="portal-tl"
                          onClick={() => { setTab('orders'); void openOrder(order.order_number); }}
                          style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                        >
                          <span className="portal-tl__time">{new Date(order.placed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`portal-tl__dot ${tone}`}>
                            {tone === 'is-good' ? <Check /> : <Clock />}
                          </span>
                          <span className="portal-tl__info">
                            <span className="portal-tl__name">{order.email}</span>
                            <span className="portal-tl__sub">{order.order_number} · {order.currency} {Number(order.grand_total).toLocaleString()}</span>
                          </span>
                          <span className={`portal-tl__status ${tone}`}>{statusLabel(order.status)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Best partners</h2>
                    <p className="portal-card__sub">{partnerMetric === 'value' ? 'Live inventory value' : partnerMetric === 'revenue' ? 'Settled revenue' : 'Live pieces'}</p>
                  </div>
                  <div className="portal-seg" role="group" aria-label="Partner ranking">
                    <button type="button" className={`portal-seg__item ${partnerMetric === 'value' ? 'is-active' : ''}`} onClick={() => setPartnerMetric('value')}>Value</button>
                    <button type="button" className={`portal-seg__item ${partnerMetric === 'revenue' ? 'is-active' : ''}`} onClick={() => setPartnerMetric('revenue')}>Revenue</button>
                    <button type="button" className={`portal-seg__item ${partnerMetric === 'units' ? 'is-active' : ''}`} onClick={() => setPartnerMetric('units')}>Units</button>
                  </div>
                </header>

                {topVendors.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><Building2 /></div>
                    <p className="portal-empty__title">No partners yet</p>
                    <p className="portal-empty__sub">Invite the first house to the network.</p>
                  </div>
                ) : (
                  <div className="portal-best">
                    {topVendors.map((vendor, index) => (
                      <button
                        type="button"
                        key={vendor.code}
                        className="portal-best__item"
                        onClick={() => { setTab('vendors'); setSelectedVendor(vendor); }}
                        style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                      >
                        <span className="portal-best__rank">{index + 1}</span>
                        <span className="portal-best__details">
                          <span className="portal-best__header">
                            <span className="portal-best__name">{vendor.name} <small>{vendor.country ?? '—'}</small></span>
                            <span className="portal-best__value">{partnerMetric === 'value' ? money(vendor.inventory_value, stats?.revenue_currency ?? 'USD') : partnerMetric === 'revenue' ? money(vendor.revenue, stats?.revenue_currency ?? 'USD') : `${vendor.live_gems} live`}</span>
                          </span>
                          <span className="portal-best__track">
                            <span className={`portal-best__bar ${index === 4 ? 'is-muted' : ''}`} style={{ width: `${topVendorMetric > 0 ? Math.max(4, (vendorMetric(vendor) / topVendorMetric) * 100) : 0}%` }} />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">How they paid</h2>
                    <p className="portal-card__sub">{chartRange.label}</p>
                  </div>
                </header>

                {paymentBreakdown.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><CreditCard /></div>
                    <p className="portal-empty__title">No payments yet</p>
                    <p className="portal-empty__sub">Payment methods appear after the first settled order.</p>
                  </div>
                ) : (
                  <>
                    <div className="portal-mix__stack">
                      {paymentBreakdown.map((item) => (
                        <span
                          key={item.provider}
                          className="portal-mix__seg"
                          style={{ flexGrow: item.count, background: item.color }}
                          title={`${paymentLabel(item.provider)} · ${item.count}`}
                        />
                      ))}
                    </div>
                    <div className="portal-mix__list">
                      {paymentBreakdown.map((item) => {
                        const PaymentIcon = item.provider === 'cash' ? CircleDollarSign : CreditCard;
                        return (
                        <div key={item.provider} className="portal-mix__item">
                          <div className="portal-mix__left">
                            <span className="portal-mix__icon"><PaymentIcon /></span>
                            <span className="portal-mix__label">
                              <b>{paymentLabel(item.provider)}</b>
                              <small>{Math.round((item.count / Math.max(1, currentPeriodOrders.length)) * 100)}%</small>
                            </span>
                          </div>
                          <svg className="portal-mix__spark" viewBox="0 0 60 20" aria-hidden="true">
                            <path d={item.spark} fill="none" stroke={item.color} strokeWidth="2" />
                          </svg>
                          <span className="portal-mix__value">
                            {money(item.amount, stats?.revenue_currency ?? 'USD')}
                            <small>{item.count} orders</small>
                          </span>
                        </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="portal-grid--bottom">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--p-good-fill)' }} />
                      Latest orders
                    </h2>
                    <p className="portal-card__sub">As they land in the ledger</p>
                  </div>
                  <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('orders')}>
                    All orders <ArrowUpRight />
                  </button>
                </header>

                {latestOrders.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><CircleDollarSign /></div>
                    <p className="portal-empty__title">No orders yet</p>
                    <p className="portal-empty__sub">The till feed begins with the first sale.</p>
                  </div>
                ) : (
                  <div className="portal-feed">
                    {latestOrders.map((order) => (
                      <button
                        type="button"
                        key={order.order_number}
                        className="portal-feed__item"
                        onClick={() => { setTab('orders'); void openOrder(order.order_number); }}
                        style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', borderRadius: 0 }}
                      >
                        <span className="portal-feed__avatar">{initials(order.email)}</span>
                        <span className="portal-feed__info">
                          <span className="portal-feed__name">{order.email}</span>
                          <span className="portal-feed__sub">{order.order_number} · {new Date(order.placed_at).toLocaleDateString('en-GB')}</span>
                        </span>
                        <span className="portal-feed__meta">{statusLabel(order.status)}</span>
                        <span className="portal-feed__amount">{order.currency} {Number(order.grand_total).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Aged stock</h2>
                    <p className="portal-card__sub">Inventory listed longest</p>
                  </div>
                  <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('inventory')}>
                    Inventory <ArrowUpRight />
                  </button>
                </header>

                {agedInventory.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><Gem /></div>
                    <p className="portal-empty__title">No stock to review</p>
                    <p className="portal-empty__sub">Aged pieces surface here after listing.</p>
                  </div>
                ) : (
                  <div className="portal-aged">
                    {agedInventory.map((item) => {
                      const days = ageInDays(item.created_at);
                      const pill = stockPill(days);
                      return (
                        <div key={`${item.table_name}-${item.ref}`} className="portal-aged__item">
                          <span className="portal-aged__days">{days}</span>
                          <span className="portal-aged__info">
                            <span className="portal-aged__name">{item.name}</span>
                            <span className="portal-aged__sub">{item.variety} · {item.ref} · {item.price_amount ? money(item.price_amount, item.currency) : 'On request'}</span>
                          </span>
                          <span className={`portal-aged__pill ${pill.className}`}>{pill.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <section className="portal-card portal-card--pad">
              <header className="portal-card__head" style={{ marginBottom: 8 }}>
                <div>
                  <h2 className="portal-card__title">Floors</h2>
                  <p className="portal-card__sub">Live catalogue by pillar</p>
                </div>
                <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('inventory')}>
                  Manage <ArrowUpRight />
                </button>
              </header>

              <div className="portal-tills">
                <div className="portal-till">
                  <div className="portal-till__left">
                    <span className="portal-till__dot" />
                    <div>
                      <p className="portal-till__name">Gemstones</p>
                      <p className="portal-till__sub">{stats?.gemstones_active ?? 0} active · {stats?.gemstones_total ?? 0} total</p>
                    </div>
                  </div>
                  <span className="portal-till__value">{money(stats?.inventory_value ?? 0, stats?.revenue_currency ?? 'USD')}</span>
                </div>
                <div className="portal-till">
                  <div className="portal-till__left">
                    <span className="portal-till__dot" />
                    <div>
                      <p className="portal-till__name">Settings</p>
                      <p className="portal-till__sub">{stats?.settings_active ?? 0} active · {stats?.settings_total ?? 0} total</p>
                    </div>
                  </div>
                  <span className="portal-till__value">{stats?.settings_active ?? 0}</span>
                </div>
                <div className="portal-till">
                  <div className="portal-till__left">
                    <span className="portal-till__dot" />
                    <div>
                      <p className="portal-till__name">Jewellery</p>
                      <p className="portal-till__sub">{stats?.products_active ?? 0} active · {stats?.products_total ?? 0} total</p>
                    </div>
                  </div>
                  <span className="portal-till__value">{stats?.products_active ?? 0}</span>
                </div>
              </div>
            </section>

            <footer className="portal-foot">
              <span>❖</span>
              <span>
                This period: <b>{money(currentTotal, stats?.revenue_currency ?? 'USD')}</b> across {currentPeriodOrders.length} settled orders · {stats?.orders_pending ?? pendingOrders.length} awaiting payment · data as of just now
              </span>
            </footer>
          </div>
        ) : null}

        {tab === 'inventory' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Catalogue</p>
                <h1 className="portal-page-title">Platform Inventory</h1>
                <p className="portal-page-sub">Every stone and piece across the house and its partners.</p>
              </div>
              <div className="portal-card__actions">
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-inventory.csv', [
                  ['Reference', 'Name', 'Kind', 'Status', 'Vendor', 'Variety', 'Price', 'Currency', 'Created'],
                  ...inventory.map((item) => [item.ref, item.name, item.kind, item.status, item.vendor_name ?? 'House', item.variety, item.price_amount, item.currency, item.created_at]),
                ])}>Export CSV</button>
                <button type="button" className="portal-btn portal-btn--gold" onClick={() => { setInvSearch(''); setInvStatus(''); void searchInventory('', ''); }}>
                  Refresh list
                </button>
              </div>
            </div>

            <div className="portal-inline">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--p-faint)' }} />
                <input
                  value={invSearch}
                  onChange={(event) => setInvSearch(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void searchInventory(); }}
                  placeholder="Search by name or reference…"
                  className="portal-input portal-input--search"
                />
              </div>
              <select value={invStatus} onChange={(event) => setInvStatus(event.target.value)} className="portal-select" style={{ maxWidth: 180 }}>
                <option value="">All statuses</option>
                <option>ACTIVE</option><option>DRAFT</option><option>SOLD</option><option>RESERVED</option><option>ARCHIVED</option>
              </select>
              <button type="button" onClick={() => void searchInventory()} className="portal-btn portal-btn--gold">Search</button>
            </div>

            <div className="portal-card portal-table-wrap">
              {selectedInventory.length > 0 ? (
                <div className="portal-inline" style={{ padding: '12px 14px', borderBottom: '1px solid var(--p-line)' }}>
                  <span className="portal-badge portal-badge--pending">{selectedInventory.length} selected</span>
                  <button type="button" onClick={() => void bulkUpdateInventory('ACTIVE')} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Publish</button>
                  <button type="button" onClick={() => void bulkUpdateInventory('DRAFT')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm">Hide</button>
                  <button type="button" onClick={() => void bulkUpdateInventory('ARCHIVED')} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm">Archive</button>
                  <button type="button" onClick={() => setSelectedInventory([])} className="portal-btn portal-btn--ghost portal-btn--sm">Clear</button>
                </div>
              ) : null}
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        className="portal-checkbox"
                        aria-label="Select all inventory on this page"
                        checked={inventory.length > 0 && selectedInventory.length === inventory.length}
                        onChange={(event) => setSelectedInventory(event.target.checked ? inventory.map((item) => item.ref) : [])}
                      />
                    </th>
                    <th>Item</th><th>Reference</th><th>Vendor</th><th>Status</th><th className="num">Stock</th><th className="num">Price</th><th className="num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.ref + item.table_name}>
                      <td>
                        <input
                          type="checkbox"
                          className="portal-checkbox"
                          aria-label={`Select ${item.name}`}
                          checked={selectedInventory.includes(item.ref)}
                          onChange={() => toggleInventorySelection(item.ref)}
                        />
                      </td>
                      <td>
                        <span className="strong">{item.name}</span>
                        <span className="dim">{item.variety} · {item.kind}</span>
                      </td>
                      <td className="mono">{item.ref}</td>
                      <td>{item.vendor_name ?? 'House'}</td>
                      <td><span className={badgeClass(item.status)}>{statusLabel(item.status)}</span></td>
                      <td className="num">
                        {item.table_name === 'products' ? (
                          <input
                            type="number" min={0} max={1000} step={1}
                            defaultValue={String(item.quantity ?? 0)}
                            aria-label={`Stock for ${item.name}`}
                            onBlur={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isInteger(value) && value >= 0 && value <= 1000 && value !== item.quantity) void updateStock(item.ref, value);
                            }}
                            className="portal-input portal-input--sm" style={{ width: 72, textAlign: 'right' }}
                          />
                        ) : '—'}
                      </td>
                      <td className="num">{item.price_amount ? money(item.price_amount, item.currency) : '—'}</td>
                      <td className="num">
                        <div className="flex gap-1.5 justify-end">
                          {item.status === 'ACTIVE' ? (
                            <>
                              <button type="button" onClick={() => void updateStatus(item.ref, 'DRAFT')} title="Hide from storefront" className="portal-btn portal-btn--ghost portal-btn--icon portal-btn--sm"><EyeOff /></button>
                              <button type="button" onClick={() => void updateStatus(item.ref, 'ARCHIVED')} title="Archive" className="portal-btn portal-btn--danger portal-btn--icon portal-btn--sm"><Trash2 /></button>
                            </>
                          ) : item.status === 'DRAFT' ? (
                            <button type="button" onClick={() => void updateStatus(item.ref, 'ACTIVE')} title="Publish" className="portal-btn portal-btn--ghost portal-btn--icon portal-btn--sm"><Eye /></button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventory.length > 0 && inventory.length % 100 === 0 ? (
                <div className="flex justify-center p-3">
                  <button type="button" onClick={() => void loadMoreInventory()} className="portal-btn portal-btn--ghost portal-btn--sm">Load more inventory</button>
                </div>
              ) : null}
              {inventory.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><PackageSearch /></div>
                  <p className="portal-empty__title">No items match</p>
                  <p className="portal-empty__sub">Try a different search or status filter.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'orders' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Ledger</p>
                <h1 className="portal-page-title">{orderDetail ? orderDetail.order_number : 'Orders'}</h1>
                <p className="portal-page-sub">{orderDetail ? 'Order dossier and customer record.' : 'Every order placed on the platform.'}</p>
              </div>
              {orderDetail ? (
                <button type="button" onClick={() => setOrderDetail(null)} className="portal-btn portal-btn--ghost">
                  <ArrowLeft /> All orders
                </button>
              ) : (
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-orders.csv', [
                  ['Order', 'Email', 'Status', 'Total', 'Currency', 'Placed', 'Payment provider'],
                  ...orders.map((order) => [order.order_number, order.email, order.status, order.grand_total, order.currency, order.placed_at, order.payment_provider]),
                ])}>Export CSV</button>
              )}
            </div>

            {orderDetail ? (
              <div className="portal-detail">
                <div className="portal-card portal-card--pad">
                  <div className="portal-detail__head">
                    <div>
                      <p className="portal-mono">{orderDetail.order_number}</p>
                      <h2 style={{ margin: '4px 0 0', fontSize: 'var(--p-fs-2xl)', fontWeight: 700 }}>{orderDetail.customer_email ?? orderDetail.email}</h2>
                      <div className="portal-inline" style={{ marginTop: 8 }}>
                        <span className={badgeClass(orderDetail.status)}>{statusLabel(orderDetail.status)}</span>
                        <span className="portal-card__sub">{new Date(orderDetail.placed_at).toLocaleString('en-GB')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="portal-detail__amount">{orderDetail.currency} {Number(orderDetail.grand_total).toLocaleString()}</p>
                      <p className="portal-card__sub">Grand total</p>
                    </div>
                  </div>

                  <div className="portal-detail__grid" style={{ marginTop: 18 }}>
                    <div className="portal-detail__block">
                      <p className="portal-label">Items</p>
                      <div className="space-y-2">
                        {orderDetail.items.map((item, index) => (
                          <div key={index} className="flex justify-between gap-3" style={{ fontSize: 'var(--p-fs-md)' }}>
                            <span>{item.quantity}× {item.description}</span>
                            <span className="mono" style={{ color: 'var(--p-text)' }}>{item.line_total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="portal-detail__block">
                      <p className="portal-label">Shipping</p>
                      <p className="portal-note">{addressLine(orderDetail.shipping_address) || 'No address recorded.'}</p>
                      {orderDetail.customer_note ? <p className="portal-note" style={{ marginTop: 8 }}>{orderDetail.customer_note}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="portal-detail__grid">
                  <div className="portal-card portal-card--pad">
                    <p className="portal-label">Timeline</p>
                    <div className="space-y-2">
                      {orderDetail.events.map((event, index) => (
                        <div key={index} className="flex items-center justify-between gap-3" style={{ fontSize: 'var(--p-fs-xs)' }}>
                          <span className="mono">{event.event}</span>
                          <span className="portal-card__sub">{new Date(event.created_at).toLocaleString('en-GB')}</span>
                        </div>
                      ))}
                      {orderDetail.events.length === 0 ? <p className="portal-card__sub">No events recorded.</p> : null}
                    </div>

                    {orderDetail.fulfilments.length > 0 ? (
                      <div style={{ marginTop: 16 }}>
                        <p className="portal-label">Shipments</p>
                        {orderDetail.fulfilments.map((fulfilment) => (
                          <p key={fulfilment.id} className="portal-mono" style={{ margin: '3px 0' }}>{fulfilment.carrier} · {fulfilment.tracking_number} · {fulfilment.state}</p>
                        ))}
                      </div>
                    ) : null}

                    {orderDetail.refunds.length > 0 ? (
                      <div style={{ marginTop: 16 }}>
                        <p className="portal-label">Refunds</p>
                        {orderDetail.refunds.map((refund) => (
                          <p key={refund.id} className="portal-mono" style={{ margin: '3px 0' }}>{refund.amount} · {refund.state} · {refund.reason}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="portal-card portal-card--pad space-y-4">
                    <div>
                      <p className="portal-label">Advance the ledger</p>
                      <div className="portal-inline">
                        {orderDetail.status === 'PAID' ? <button type="button" onClick={() => void transitionOrder('IN_FULFILLMENT')} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Begin fulfilment</button> : null}
                        {orderDetail.status === 'IN_FULFILLMENT' ? <button type="button" onClick={() => void transitionOrder('FULFILLED')} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Mark fulfilled</button> : null}
                        {orderDetail.status === 'FULFILLED' ? <button type="button" onClick={() => void transitionOrder('DELIVERED')} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Mark delivered</button> : null}
                        {['PENDING_PAYMENT', 'PAID'].includes(orderDetail.status) ? <button type="button" onClick={() => void cancelOrder()} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm">Cancel order</button> : null}
                      </div>
                    </div>

                    {['PAID', 'IN_FULFILLMENT'].includes(orderDetail.status) ? (
                      <div>
                        <p className="portal-label">Record shipment</p>
                        <div className="portal-inline">
                          <input value={shipForm.carrier} onChange={(event) => setShipForm((form) => ({ ...form, carrier: event.target.value }))} placeholder="Carrier" className="portal-input portal-input--sm" style={{ width: 130 }} />
                          <input value={shipForm.tracking_number} onChange={(event) => setShipForm((form) => ({ ...form, tracking_number: event.target.value }))} placeholder="Tracking number" className="portal-input portal-input--sm" style={{ width: 180 }} />
                          <button type="button" onClick={() => void shipOrder()} disabled={busy || !shipForm.carrier || !shipForm.tracking_number} className="portal-btn portal-btn--ghost portal-btn--sm"><Truck /> Ship</button>
                        </div>
                      </div>
                    ) : null}

                    {['PAID', 'IN_FULFILLMENT', 'FULFILLED', 'DELIVERED'].includes(orderDetail.status) ? (
                      <div>
                        <p className="portal-label">Record refund (pending settlement)</p>
                        <div className="portal-inline">
                          <input value={refundForm.amount} onChange={(event) => setRefundForm((form) => ({ ...form, amount: event.target.value }))} placeholder="Amount" inputMode="decimal" className="portal-input portal-input--sm" style={{ width: 110 }} />
                          <input value={refundForm.reason} onChange={(event) => setRefundForm((form) => ({ ...form, reason: event.target.value }))} placeholder="Reason" className="portal-input portal-input--sm" style={{ width: 180 }} />
                          <button type="button" onClick={() => void refundOrder()} disabled={busy || !refundForm.amount} className="portal-btn portal-btn--danger portal-btn--sm"><RotateCcw /> Refund</button>
                        </div>
                      </div>
                    ) : null}

                    {actionError ? <p className="portal-notice">{actionError}</p> : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="portal-card portal-table-wrap">
                <table className="portal-table">
                  <thead><tr><th>Order</th><th>Email</th><th>Status</th><th className="num">Total</th><th className="num">Placed</th></tr></thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.order_number} className="is-clickable" onClick={() => void openOrder(order.order_number)}>
                        <td className="mono">{order.order_number}</td>
                        <td>{order.email}</td>
                        <td><span className={badgeClass(order.status)}>{statusLabel(order.status)}</span></td>
                        <td className="num strong">{order.currency} {Number(order.grand_total).toLocaleString()}</td>
                        <td className="num">{new Date(order.placed_at).toLocaleDateString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length > 0 && orders.length % 100 === 0 ? (
                  <div className="flex justify-center p-3">
                    <button type="button" onClick={() => void loadMoreOrders()} className="portal-btn portal-btn--ghost portal-btn--sm">Load more orders</button>
                  </div>
                ) : null}
                {orders.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><ShoppingCart /></div>
                    <p className="portal-empty__title">No orders yet</p>
                    <p className="portal-empty__sub">Orders placed on the storefront appear here.</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'vendors' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Partners</p>
                <h1 className="portal-page-title">{selectedVendor ? selectedVendor.name : 'Vendors'}</h1>
                <p className="portal-page-sub">{selectedVendor ? 'Partner dossier and inventory position.' : 'Every partner supplying the maison.'}</p>
              </div>
              {!selectedVendor ? (
                <div className="portal-card__actions">
                  <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-vendors.csv', [
                    ['Code', 'Name', 'Country', 'Status', 'Email', 'Contact', 'Onboarding', 'Live gems', 'Inventory value', 'Revenue', 'Submissions'],
                    ...vendors.map((vendor) => [vendor.code, vendor.name, vendor.country, vendor.status, vendor.email, vendor.contact_name, vendor.onboarding_status, vendor.live_gems, vendor.inventory_value, vendor.revenue, vendor.total_submissions]),
                  ])}>Export CSV</button>
                  <button type="button" onClick={() => { setShowCreate((value) => !value); setActionError(''); }} className="portal-btn portal-btn--gold">
                    {showCreate ? <X /> : <Plus />}
                    {showCreate ? 'Close' : 'New partner'}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setSelectedVendor(null)} className="portal-btn portal-btn--ghost">
                  <ArrowLeft /> All vendors
                </button>
              )}
            </div>

            {showCreate && !selectedVendor ? (
              <form onSubmit={createVendor} className="portal-card portal-card--pad space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cv-name" className="portal-label">Trading name</label>
                    <input id="cv-name" required minLength={2} value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} className="portal-input" placeholder="Atelier Lumière" />
                  </div>
                  <div>
                    <label htmlFor="cv-legal" className="portal-label">Legal name</label>
                    <input id="cv-legal" required minLength={2} value={createForm.legal_name} onChange={(event) => setCreateForm((form) => ({ ...form, legal_name: event.target.value }))} className="portal-input" placeholder="Atelier Lumière SARL" />
                  </div>
                  <div>
                    <label htmlFor="cv-contact" className="portal-label">Contact name</label>
                    <input id="cv-contact" required minLength={2} value={createForm.contact_name} onChange={(event) => setCreateForm((form) => ({ ...form, contact_name: event.target.value }))} className="portal-input" placeholder="Full name" />
                  </div>
                  <div>
                    <label htmlFor="cv-email" className="portal-label">Email</label>
                    <input id="cv-email" type="email" required value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} className="portal-input" placeholder="partner@company.com" />
                  </div>
                  <div>
                    <label htmlFor="cv-country" className="portal-label">Country (ISO-2)</label>
                    <input id="cv-country" required maxLength={2} minLength={2} value={createForm.country} onChange={(event) => setCreateForm((form) => ({ ...form, country: event.target.value.toUpperCase() }))} className="portal-input" placeholder="AE" />
                  </div>
                  <div>
                    <label htmlFor="cv-phone" className="portal-label">Phone <span style={{ fontWeight: 400, textTransform: 'none' }}>optional</span></label>
                    <input id="cv-phone" value={createForm.phone} onChange={(event) => setCreateForm((form) => ({ ...form, phone: event.target.value }))} className="portal-input" placeholder="+971 …" />
                  </div>
                </div>
                {actionError ? <p className="portal-notice">{actionError}</p> : null}
                <div className="flex justify-end">
                  <button type="submit" disabled={createBusy} className="portal-btn portal-btn--gold">
                    {createBusy ? 'Creating…' : 'Create partner'}
                  </button>
                </div>
              </form>
            ) : null}

            {selectedVendor ? (
              <div className="space-y-4">
                {issuedKey && issuedKey.code === selectedVendor.code ? (
                  <div className="portal-card portal-card--pad" style={{ borderColor: 'var(--p-accent)' }}>
                    <p className="portal-kicker">One-time credential</p>
                    <p style={{ margin: '8px 0 0', fontSize: 'var(--p-fs-md)' }}>API key for <span className="portal-mono">{issuedKey.code}</span> — shown once. Send it to the partner for first-time password setup.</p>
                    <code className="mt-3 block break-all rounded-md border px-3 py-2 font-mono text-[11px]" style={{ borderColor: 'var(--p-line)', background: 'var(--p-well)', color: 'var(--p-text)' }}>{issuedKey.key}</code>
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(issuedKey.key)} className="portal-btn portal-btn--ghost portal-btn--sm mt-3">Copy key</button>
                  </div>
                ) : null}

                <div className="portal-card portal-card--pad">
                  <div className="portal-detail__head">
                    <div>
                      <p className="portal-mono">{selectedVendor.code}</p>
                      <h2 style={{ margin: '4px 0 0', fontSize: 'var(--p-fs-2xl)', fontWeight: 700 }}>{selectedVendor.name}</h2>
                      <p className="portal-card__sub">{selectedVendor.contact_name} · {selectedVendor.email}</p>
                      <div className="portal-inline" style={{ marginTop: 8 }}>
                        <span className={badgeClass(selectedVendor.status)}>{statusLabel(selectedVendor.status)}</span>
                        <span className="portal-badge portal-badge--draft">{statusLabel(selectedVendor.onboarding_status)}</span>
                        <span className="portal-badge portal-badge--draft">{selectedVendor.country ?? '—'}</span>
                      </div>
                      <div className="portal-inline" style={{ marginTop: 14 }}>
                        {selectedVendor.onboarding_status !== 'APPROVED' || selectedVendor.status !== 'ACTIVE' ? (
                          <>
                            <button type="button" onClick={() => void vendorOnboarding(selectedVendor, 'approve')} disabled={vendorAction !== null} className="portal-btn portal-btn--gold portal-btn--sm">
                              {vendorAction === 'approve' ? 'Approving…' : 'Approve partner'}
                            </button>
                            <button type="button" onClick={() => void vendorOnboarding(selectedVendor, 'reject')} disabled={vendorAction !== null} className="portal-btn portal-btn--ghost portal-btn--sm">
                              {vendorAction === 'reject' ? 'Rejecting…' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => void vendorOnboarding(selectedVendor, 'suspend')} disabled={vendorAction !== null} className="portal-btn portal-btn--danger portal-btn--sm">
                            {vendorAction === 'suspend' ? 'Suspending…' : 'Suspend partner'}
                          </button>
                        )}
                      </div>
                      {actionError ? <p className="portal-notice" style={{ marginTop: 10 }}>{actionError}</p> : null}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="portal-detail__amount">{money(selectedVendor.inventory_value, stats?.revenue_currency ?? 'USD')}</p>
                      <p className="portal-card__sub">{selectedVendor.live_gems} live items</p>
                    </div>
                  </div>
                </div>

                <div className="portal-grid--stats">
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Live gems</p><p className="portal-stat__value">{selectedVendor.live_gems}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Submissions</p><p className="portal-stat__value">{selectedVendor.total_submissions}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Inventory value</p><p className="portal-stat__value">{money(selectedVendor.inventory_value, stats?.revenue_currency ?? 'USD')}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Revenue</p><p className="portal-stat__value">{money(selectedVendor.revenue, stats?.revenue_currency ?? 'USD')}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Country</p><p className="portal-stat__value" style={{ fontSize: 'var(--p-fs-2xl)' }}>{selectedVendor.country ?? '—'}</p></div>
                </div>
              </div>
            ) : (
              <div className="portal-card portal-table-wrap">
                <table className="portal-table">
                  <thead><tr><th>Code</th><th>Partner</th><th>Country</th><th>Status</th><th className="num">Live</th><th className="num">Value</th><th className="num">Revenue</th></tr></thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.code} className="is-clickable" onClick={() => setSelectedVendor(vendor)}>
                        <td className="mono">{vendor.code}</td>
                        <td>
                          <span className="strong">{vendor.name}</span>
                          <span className="dim">{vendor.contact_name} · {vendor.email}</span>
                        </td>
                        <td>{vendor.country ?? '—'}</td>
                        <td><span className={badgeClass(vendor.status)}>{statusLabel(vendor.status)}</span></td>
                        <td className="num">{vendor.live_gems}</td>
                        <td className="num strong">{money(vendor.inventory_value, stats?.revenue_currency ?? 'USD')}</td>
                        <td className="num strong">{money(vendor.revenue, stats?.revenue_currency ?? 'USD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vendors.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><Building2 /></div>
                    <p className="portal-empty__title">No vendors yet</p>
                    <p className="portal-empty__sub">Partner onboarding appears here.</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'submissions' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Moderation</p>
                <h1 className="portal-page-title">Partner Submissions</h1>
                <p className="portal-page-sub">Approve to mint a semantic code, hold for review, or reject with a note.</p>
              </div>
              <div className="portal-card__actions">
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-submissions.csv', [
                  ['ID', 'Vendor code', 'Vendor', 'Kind', 'Status', 'Resulting ref', 'Created', 'Reviewer note'],
                  ...submissions.map((submission) => [submission.id, submission.vendor_code, submission.vendor_name, submission.kind, submission.status, submission.resulting_ref, submission.created_at, submission.reviewer_note]),
                ])}>Export CSV</button>
                <span className="portal-badge portal-badge--pending">{pendingReview} awaiting review</span>
              </div>
            </div>

            <div className="portal-seg">
              {['', 'SUBMITTED', 'HOLD', 'APPROVED', 'REJECTED'].map((filter) => (
                <button key={filter || 'all'} type="button" onClick={() => setSubFilter(filter)} className={`portal-seg__item ${subFilter === filter ? 'is-active' : ''}`}>
                  {filter ? statusLabel(filter) : 'All'} ({filter ? submissions.filter((submission) => submission.status === filter).length : submissions.length})
                </button>
              ))}
            </div>

            {actionError ? <p className="portal-notice">{actionError}</p> : null}

            <div className="portal-card portal-table-wrap">
              <table className="portal-table">
                <thead><tr><th>ID</th><th>Partner</th><th>Kind</th><th>Payload</th><th>Status</th><th className="num">Actions</th></tr></thead>
                <tbody>
                  {submissions.filter((submission) => !subFilter || submission.status === subFilter).map((submission) => (
                    <tr key={submission.id}>
                      <td className="mono">{submission.id}</td>
                      <td>
                        <span className="strong">{submission.vendor_name}</span>
                        <span className="dim">{submission.vendor_code}</span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: 'var(--p-fs-2xs)' }}>{submission.kind}</td>
                      <td style={{ maxWidth: '22rem' }}>
                        <span className="block truncate" title={JSON.stringify(submission.payload)}>{JSON.stringify(submission.payload)}</span>
                      </td>
                      <td>
                        <span className={badgeClass(submission.status)}>{statusLabel(submission.status)}</span>
                        {submission.resulting_ref ? <span className="block mono" style={{ marginTop: 4 }}>{submission.resulting_ref}</span> : null}
                        {submission.reviewer_note ? <span className="dim">{submission.reviewer_note}</span> : null}
                      </td>
                      <td className="num">
                        <div className="flex justify-end gap-1.5">
                          {submission.status === 'SUBMITTED' ? (
                            <>
                              <button type="button" onClick={() => void moderateSubmission(submission.id, 'approve')} disabled={vendorAction !== null} className="portal-btn portal-btn--gold portal-btn--sm">Approve</button>
                              <button type="button" onClick={() => void moderateSubmission(submission.id, 'hold')} disabled={vendorAction !== null} className="portal-btn portal-btn--ghost portal-btn--sm">Hold</button>
                              <button type="button" onClick={() => void moderateSubmission(submission.id, 'reject')} disabled={vendorAction !== null} className="portal-btn portal-btn--danger portal-btn--sm">Reject</button>
                            </>
                          ) : null}
                          {submission.status === 'HOLD' ? (
                            <>
                              <button type="button" onClick={() => void moderateSubmission(submission.id, 'release')} disabled={vendorAction !== null} className="portal-btn portal-btn--gold portal-btn--sm">Release</button>
                              <button type="button" onClick={() => void moderateSubmission(submission.id, 'reject')} disabled={vendorAction !== null} className="portal-btn portal-btn--danger portal-btn--sm">Reject</button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {submissions.length > 0 && submissions.length % 100 === 0 ? (
                <div className="flex justify-center p-3">
                  <button type="button" onClick={() => void loadMoreSubmissions()} className="portal-btn portal-btn--ghost portal-btn--sm">Load more submissions</button>
                </div>
              ) : null}
              {submissions.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><ClipboardCheck /></div>
                  <p className="portal-empty__title">No submissions</p>
                  <p className="portal-empty__sub">Partner submissions appear here for moderation.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'discounts' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Commerce</p>
                <h1 className="portal-page-title">Discounts</h1>
                <p className="portal-page-sub">Codes are validated at checkout against the live window and usage limit.</p>
              </div>
            </div>

            <form onSubmit={createDiscount} className="portal-card portal-card--pad">
              <div className="grid gap-3 sm:grid-cols-5">
                <input value={discountForm.code} onChange={(event) => setDiscountForm((form) => ({ ...form, code: event.target.value.toUpperCase() }))} placeholder="CODE" required className="portal-input" />
                <select value={discountForm.kind} onChange={(event) => setDiscountForm((form) => ({ ...form, kind: event.target.value }))} className="portal-select">
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed</option>
                </select>
                <input value={discountForm.value} onChange={(event) => setDiscountForm((form) => ({ ...form, value: event.target.value }))} placeholder={discountForm.kind === 'PERCENT' ? 'Value %' : 'Value $'} inputMode="decimal" required className="portal-input" />
                <input value={discountForm.min_subtotal} onChange={(event) => setDiscountForm((form) => ({ ...form, min_subtotal: event.target.value }))} placeholder="Min subtotal" inputMode="decimal" className="portal-input" />
                <button type="submit" className="portal-btn portal-btn--gold">Create code</button>
              </div>
              {actionError ? <p className="portal-notice" style={{ marginTop: 12 }}>{actionError}</p> : null}
            </form>

            <div className="portal-card portal-table-wrap">
              <table className="portal-table">
                <thead><tr><th>Code</th><th>Kind</th><th className="num">Value</th><th className="num">Min</th><th className="num">Used</th><th>Window</th><th>Status</th><th className="num"> </th></tr></thead>
                <tbody>
                  {discounts.map((discount) => (
                    <tr key={discount.id}>
                      <td className="mono">{discount.code}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: 'var(--p-fs-2xs)' }}>{discount.kind}</td>
                      <td className="num">{discount.kind === 'PERCENT' ? `${Number(discount.value)}%` : money(Number(discount.value), stats?.revenue_currency ?? 'USD')}</td>
                      <td className="num">{discount.min_subtotal ? money(Number(discount.min_subtotal), stats?.revenue_currency ?? 'USD') : '—'}</td>
                      <td className="num">{discount.used_count}{discount.usage_limit ? ` / ${discount.usage_limit}` : ''}</td>
                      <td style={{ fontSize: 'var(--p-fs-2xs)' }}>{discount.starts_at ? new Date(discount.starts_at).toLocaleDateString('en-GB') : '—'} → {discount.ends_at ? new Date(discount.ends_at).toLocaleDateString('en-GB') : '—'}</td>
                      <td><span className={discount.active ? 'portal-badge portal-badge--active' : 'portal-badge portal-badge--draft'}>{discount.active ? 'Active' : 'Paused'}</span></td>
                      <td className="num">
                        <div className="portal-inline" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => editDiscount(discount)} className="portal-btn portal-btn--ghost portal-btn--sm">Edit</button>
                          <button type="button" onClick={() => void toggleDiscount(discount)} className="portal-btn portal-btn--ghost portal-btn--sm">{discount.active ? 'Pause' : 'Activate'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {editingDiscount != null ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="portal-inline" style={{ flexWrap: 'wrap', padding: '6px 0' }}>
                          <label className="portal-label" style={{ margin: 0 }}>Value
                            <input value={discountEdit.value} onChange={(event) => setDiscountEdit((form) => ({ ...form, value: event.target.value }))} inputMode="decimal" className="portal-input portal-input--sm" style={{ width: 100 }} />
                          </label>
                          <label className="portal-label" style={{ margin: 0 }}>Min subtotal
                            <input value={discountEdit.min_subtotal} onChange={(event) => setDiscountEdit((form) => ({ ...form, min_subtotal: event.target.value }))} inputMode="decimal" className="portal-input portal-input--sm" style={{ width: 110 }} />
                          </label>
                          <label className="portal-label" style={{ margin: 0 }}>Starts
                            <input type="date" value={discountEdit.starts_at} onChange={(event) => setDiscountEdit((form) => ({ ...form, starts_at: event.target.value }))} className="portal-input portal-input--sm" style={{ width: 150 }} />
                          </label>
                          <label className="portal-label" style={{ margin: 0 }}>Ends
                            <input type="date" value={discountEdit.ends_at} onChange={(event) => setDiscountEdit((form) => ({ ...form, ends_at: event.target.value }))} className="portal-input portal-input--sm" style={{ width: 150 }} />
                          </label>
                          <button type="button" onClick={() => void saveDiscount(editingDiscount)} className="portal-btn portal-btn--gold portal-btn--sm">Save</button>
                          <button type="button" onClick={() => setEditingDiscount(null)} className="portal-btn portal-btn--ghost portal-btn--sm">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {discounts.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><BadgePercent /></div>
                  <p className="portal-empty__title">No discount codes</p>
                  <p className="portal-empty__sub">Create the first invitation code above.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'certificates' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Trust</p>
                <h1 className="portal-page-title">Certificates</h1>
                <p className="portal-page-sub">Only VERIFIED reports appear on the public product page.</p>
              </div>
            </div>
            {actionError ? <p className="portal-notice">{actionError}</p> : null}
            <div className="portal-card portal-table-wrap">
              <table className="portal-table">
                <thead><tr><th>Stone</th><th>Vendor</th><th>Agency / Report</th><th>Issued</th><th>Status</th><th className="num">Actions</th></tr></thead>
                <tbody>
                  {certs.map((cert) => (
                    <tr key={cert.id}>
                      <td>
                        <span className="strong">{cert.gemstone_name ?? '—'}</span>
                        <span className="block mono">{cert.gemstone_ref ?? '—'}</span>
                      </td>
                      <td>{cert.vendor_name ?? '—'}<span className="block mono">{cert.vendor_code ?? ''}</span></td>
                      <td>
                        {cert.agency} · {cert.cert_no}
                        {cert.url ? <a href={cert.url} target="_blank" rel="noreferrer" className="portal-link" style={{ display: 'block' }}>report</a> : null}
                      </td>
                      <td>{cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB') : '—'}</td>
                      <td><span className={cert.verified === 'VERIFIED' ? 'portal-badge portal-badge--active' : cert.verified === 'FLAGGED' ? 'portal-badge portal-badge--rejected' : 'portal-badge portal-badge--pending'}>{cert.verified}</span></td>
                      <td>
                        <div className="portal-inline" style={{ justifyContent: 'flex-end' }}>
                          {cert.verified !== 'VERIFIED' ? <button type="button" onClick={() => void verifyCertificate(cert.id, 'VERIFIED')} className="portal-btn portal-btn--gold portal-btn--sm">Verify</button> : null}
                          {cert.verified !== 'FLAGGED' ? <button type="button" onClick={() => void verifyCertificate(cert.id, 'FLAGGED')} className="portal-btn portal-btn--danger portal-btn--sm">Flag</button> : null}
                          {cert.verified !== 'UNVERIFIED' ? <button type="button" onClick={() => void verifyCertificate(cert.id, 'UNVERIFIED')} className="portal-btn portal-btn--ghost portal-btn--sm">Reset</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {certs.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><ShieldCheck /></div>
                  <p className="portal-empty__title">No certificates submitted</p>
                  <p className="portal-empty__sub">Vendor uploads appear here for verification.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'leads' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Relationships</p>
                <h1 className="portal-page-title">Leads</h1>
                <p className="portal-page-sub">Newsletter signups and viewing requests from the storefront.</p>
              </div>
              <span className="portal-badge portal-badge--pending">{newLeads} new</span>
            </div>

            {leads.length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><Mail /></div>
                <p className="portal-empty__title">No leads yet</p>
                <p className="portal-empty__sub">Newsletter and viewing requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className="portal-card portal-card--pad flex items-start justify-between gap-4" style={{ padding: 16 }}>
                    <div>
                      <p className="strong" style={{ margin: 0 }}>{lead.email}</p>
                      <p className="portal-card__sub">{lead.name ?? '—'} · {lead.source} · {new Date(lead.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="portal-inline">
                      <span className={badgeClass(lead.status)}>{statusLabel(lead.status)}</span>
                      {lead.status === 'NEW' ? (
                        <button type="button" onClick={() => void markLead(lead.id, 'CONTACTED')} className="portal-btn portal-btn--ghost portal-btn--sm">
                          Mark contacted <ArrowUpRight />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'settings' ? (
          <div className="portal-section" style={{ maxWidth: 620 }}>
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Console</p>
                <h1 className="portal-page-title">Settings</h1>
                <p className="portal-page-sub">Appearance, account and credentials.</p>
              </div>
            </div>

            <div className="portal-card portal-card--pad">
              <p className="portal-label">Appearance</p>
              <div className="portal-seg">
                <button type="button" className={`portal-seg__item ${theme === 'light' ? 'is-active' : ''}`} onClick={() => setTheme('light')}>
                  <Sun style={{ width: 13, height: 13, marginRight: 4 }} /> Light
                </button>
                <button type="button" className={`portal-seg__item ${theme === 'dark' ? 'is-active' : ''}`} onClick={() => setTheme('dark')}>
                  <Moon style={{ width: 13, height: 13, marginRight: 4 }} /> Dark
                </button>
              </div>
              <p className="portal-card__sub" style={{ marginTop: 10 }}>The preference is stored in this browser and applies to both consoles.</p>
            </div>

            <form onSubmit={changeAdminPassword} className="portal-card portal-card--pad space-y-3">
              <p className="portal-label">Change password</p>
              <input type="password" required value={settingsForm.current_password} onChange={(event) => setSettingsForm((form) => ({ ...form, current_password: event.target.value }))} placeholder="Current password" autoComplete="current-password" className="portal-input" />
              <input type="password" required minLength={8} value={settingsForm.new_password} onChange={(event) => setSettingsForm((form) => ({ ...form, new_password: event.target.value }))} placeholder="New password (8+ characters)" autoComplete="new-password" className="portal-input" />
              {actionError ? <p className="portal-notice">{actionError}</p> : null}
              {settingsNotice ? <p className="portal-notice portal-notice--good">{settingsNotice}</p> : null}
              <button type="submit" className="portal-btn portal-btn--gold portal-btn--sm">Update password</button>
            </form>

            <div className="portal-card portal-card--pad space-y-2">
              <p className="portal-label">Account</p>
              <p style={{ margin: 0, fontSize: 'var(--p-fs-md)', color: 'var(--p-text)' }}>{adminEmail}</p>
              <p className="portal-mono" style={{ margin: 0 }}>Administrator · full platform</p>
              <button type="button" onClick={() => void logout()} className="portal-btn portal-btn--ghost portal-btn--sm" style={{ marginTop: 8 }}>
                <LogOut /> Sign out
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'help' ? (
          <div className="portal-section" style={{ maxWidth: 760 }}>
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Support</p>
                <h1 className="portal-page-title">Help</h1>
                <p className="portal-page-sub">The shortest routes through the console.</p>
              </div>
            </div>

            <div className="portal-card portal-card--pad">
              <p className="portal-label">House operations</p>
              <p className="client-note">For a client, partner or order that needs a human decision, contact the atelier directly. The console never invents a resolution.</p>
              <div className="client-list" style={{ marginTop: 14 }}>
                <a href="/contact" className="client-list__item" style={{ textDecoration: 'none' }}>
                  <span className="client-list__main">
                    <span className="client-list__title">Contact the atelier</span>
                    <span className="client-list__sub">Private client services and viewing requests</span>
                  </span>
                  <ArrowUpRight style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
                </a>
                <button type="button" className="client-list__item" onClick={() => setTab('audit')} style={{ textAlign: 'left' }}>
                  <span className="client-list__main">
                    <span className="client-list__title">Review the audit log</span>
                    <span className="client-list__sub">Every privileged action, append-only</span>
                  </span>
                  <Activity style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
                </button>
                <button type="button" className="client-list__item" onClick={() => setTab('settings')} style={{ textAlign: 'left' }}>
                  <span className="client-list__main">
                    <span className="client-list__title">Open settings</span>
                    <span className="client-list__sub">Appearance, account and two-factor authentication</span>
                  </span>
                  <Settings style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
                </button>
              </div>
            </div>

            <div className="portal-card portal-card--pad">
              <p className="portal-label">Console guide</p>
              <div className="client-list">
                <div className="client-list__item"><span className="client-list__main"><span className="client-list__title">Catalogue & inventory</span><span className="client-list__sub">Publish, hide, archive, adjust stock and export CSV.</span></span></div>
                <div className="client-list__item"><span className="client-list__main"><span className="client-list__title">Orders & fulfilment</span><span className="client-list__sub">Advance the ledger, record shipments and refunds.</span></span></div>
                <div className="client-list__item"><span className="client-list__main"><span className="client-list__title">Partners & submissions</span><span className="client-list__sub">Approve partners, moderate submissions and verify certificates.</span></span></div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'audit' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Governance</p>
                <h1 className="portal-page-title">Audit log</h1>
                <p className="portal-page-sub">Every privileged action, append-only.</p>
              </div>
              <span className="portal-badge portal-badge--draft">{audit.length} recent</span>
            </div>

            <div className="portal-card portal-card--pad space-y-3">
              <p className="portal-label">Two-factor authentication</p>
              <p className="portal-card__sub">
                {twoFactor?.enabled
                  ? 'Enabled — sign-in requires a 6-digit authenticator code.'
                  : 'Not enabled — protect the console with an authenticator app.'}
              </p>
              {twoFactor?.enabled ? (
                <div className="portal-inline">
                  <input value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" maxLength={6} className="portal-input portal-input--sm" style={{ width: 130 }} />
                  <button type="button" onClick={() => void disableTotp()} className="portal-btn portal-btn--danger portal-btn--sm">Disable 2FA</button>
                </div>
              ) : totpSetup ? (
                <div className="space-y-2">
                  <p className="portal-mono" style={{ wordBreak: 'break-all' }}>Secret: {totpSetup.secret}</p>
                  <a href={totpSetup.otpauth_url} className="portal-card__sub">Open in authenticator</a>
                  <div className="portal-inline">
                    <input value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" maxLength={6} className="portal-input portal-input--sm" style={{ width: 130 }} />
                    <button type="button" onClick={() => void enableTotp()} disabled={totpCode.length !== 6} className="portal-btn portal-btn--gold portal-btn--sm">Enable 2FA</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => void setupTotp()} className="portal-btn portal-btn--ghost portal-btn--sm">Set up 2FA</button>
              )}
              {totpError ? <p className="portal-notice">{totpError}</p> : null}
            </div>

            <div className="portal-card portal-card--pad space-y-3">
              <div className="portal-inline" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="portal-label">Email outbox</p>
                  <p className="portal-card__sub">
                    {outbox
                      ? `${outbox.summary.queued} queued · ${outbox.summary.sent} sent · ${outbox.summary.failed} failed · ${outbox.summary.provider_configured ? 'provider configured' : 'dev transport (no provider)'}`
                      : 'Loading…'}
                  </p>
                </div>
                <button type="button" onClick={() => void dispatchEmails()} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Dispatch queued</button>
              </div>
              {outbox && outbox.items.length > 0 ? (
                <div className="space-y-1.5">
                  {outbox.items.map((item) => (
                    <p key={item.id} className="portal-mono" style={{ margin: 0 }}>
                      {item.state} · {item.to_email} · {item.subject}{item.attempts > 0 ? ` · attempts ${item.attempts}` : ''}
                    </p>
                  ))}
                </div>
              ) : null}
              {actionError ? <p className="portal-notice">{actionError}</p> : null}
            </div>

            <div className="portal-card portal-table-wrap">
              <table className="portal-table">
                <thead><tr><th>Action</th><th>Actor</th><th>Entity</th><th className="num">When</th></tr></thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td className="mono">{entry.action}</td>
                      <td>{entry.actor_kind}</td>
                      <td>{entry.entity_kind}{entry.entity_id ? ` #${entry.entity_id}` : ''}</td>
                      <td className="num">{new Date(entry.created_at).toLocaleString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {audit.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><Activity /></div>
                  <p className="portal-empty__title">No privileged actions yet</p>
                  <p className="portal-empty__sub">The ledger begins with the first operator action.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>

      {paletteOpen ? (
        <div className="portal-palette-backdrop" role="presentation" onClick={() => setPaletteOpen(false)}>
          <div className="portal-palette" role="dialog" aria-modal="true" aria-label="Search the console" onClick={(event) => event.stopPropagation()}>
            <div className="portal-palette__search">
              <Search />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Search orders, gems, partners, pages…"
                aria-label="Search"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="portal-palette__list">
              {visiblePalette.length === 0 ? (
                <p className="portal-palette__empty">Nothing matches “{paletteQuery}”.</p>
              ) : (
                visiblePalette.map((entry, index) => {
                  const previous = visiblePalette[index - 1];
                  return (
                    <div key={entry.id}>
                      {!previous || previous.group !== entry.group ? <p className="portal-palette__group">{entry.group}</p> : null}
                      <button
                        type="button"
                        className="portal-palette__item"
                        onClick={() => { entry.run(); setPaletteOpen(false); setPaletteQuery(''); }}
                      >
                        <entry.icon />
                        <span>{entry.label}</span>
                        {entry.hint ? <span className="portal-palette__hint">{entry.hint}</span> : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
