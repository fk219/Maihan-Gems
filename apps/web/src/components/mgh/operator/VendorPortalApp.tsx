'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MediaImage } from '@/components/mgh/ui/MediaImage';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle, ArrowUpRight, Bell, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck,
  Clock, CreditCard, DollarSign, Eye, EyeOff, Gem, ImagePlus, LayoutDashboard,
  LogOut, Menu, MoreVertical, PanelLeftClose, Moon, Package, PackageSearch, Plus, PlusCircle, Search,
  Settings, Sun, Trash2, TrendingDown, TrendingUp, XCircle,
} from 'lucide-react';

const badgeClass = (status: string) => {
  if (['ACTIVE', 'APPROVED'].includes(status)) return 'portal-badge portal-badge--active';
  if (['SUBMITTED', 'RESERVED', 'HOLD', 'PENDING_PAYMENT'].includes(status)) return 'portal-badge portal-badge--pending';
  if (['SOLD', 'CONTACTED'].includes(status)) return 'portal-badge portal-badge--sold';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'portal-badge portal-badge--rejected';
  return 'portal-badge portal-badge--draft';
};

type Tab = 'overview' | 'analytics' | 'submissions' | 'inventory' | 'new' | 'settings';
type SubTab = 'all' | 'APPROVED' | 'SUBMITTED' | 'HOLD' | 'REJECTED';
type Kind = 'gemstone' | 'setting' | 'product';

interface SubmissionRow {
  id: number; submission_kind: string; status: string; resulting_ref: string | null;
  payload: Record<string, unknown>; reviewer_note: string | null; reviewed_at: string | null; created_at: string;
}
interface InventoryItem {
  ref: string; slug: string; name: string; kind: string; weight_ct: number | null;
  price_amount: number | null; currency: string; status: string; origin_type: string;
  variety: string; colour: string | null; shape: string | null; origin: string | null;
  primary_image: string | null; owner_kind: string; created_at: string; quantity: number | null;
}
interface InventoryStats {
  total_items: number; live_items: number; sold_items: number; hidden_items: number;
  total_value: number; currency: string;
}
interface VendorAnalytics {
  totals: { revenue: number; units: number; orders: number };
  series: Array<{ day: string; revenue: number; units: number; orders: number }>;
  top_items: Array<{ name: string; ref: string; revenue: number; units: number }>;
  payments: Array<{ provider: string; count: number; amount: number }>;
}
interface VarietyRow { code: string; slug: string; name: string }
interface CertificateRow {
  id: number; agency: string; cert_no: string; url: string | null; verified: string; issued_at: string | null;
}
interface PaletteEntry {
  id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', DRAFT: 'Draft', SOLD: 'Sold', RESERVED: 'Reserved', ARCHIVED: 'Archived',
  SUBMITTED: 'Submitted', HOLD: 'On hold', APPROVED: 'Approved', REJECTED: 'Rejected',
};
const SUBMISSION_STATUSES = ['APPROVED', 'SUBMITTED', 'HOLD', 'REJECTED'];
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
type ChartRange = 'today' | 'week' | 'month';
const CHART_RANGES: Record<ChartRange, { label: string; previousLabel: string; tab: string; days: number }> = {
  today: { label: 'Today', previousLabel: 'Yesterday', tab: 'Today', days: 1 },
  week: { label: 'This week', previousLabel: 'Last week', tab: 'Week', days: 7 },
  month: { label: 'This month', previousLabel: 'Last month', tab: 'Month', days: 30 },
};

const NAV_GROUPS: Array<{ head: string; items: Array<{ id: Tab; label: string; icon: LucideIcon }> }> = [
  {
    head: 'Shop',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'analytics', label: 'Sales', icon: TrendingUp },
      { id: 'submissions', label: 'My Submissions', icon: PackageSearch },
      { id: 'inventory', label: 'Live Inventory', icon: Package },
      { id: 'new', label: 'Add Product', icon: PlusCircle },
    ],
  },
  {
    head: 'Support',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
];

const statusLabel = (status: string) => STATUS_LABELS[status] ?? status.replaceAll('_', ' ').toLowerCase();

const toneClass = (status: string) => {
  if (['APPROVED', 'ACTIVE'].includes(status)) return 'is-good';
  if (['REJECTED', 'ARCHIVED'].includes(status)) return 'is-late';
  return 'is-pending';
};

const statusColor = (status: string) => {
  if (status === 'APPROVED') return 'var(--p-good-fill)';
  if (status === 'SUBMITTED') return 'var(--p-accent)';
  if (status === 'HOLD') return 'var(--p-warn-fill)';
  if (status === 'REJECTED') return 'var(--p-bad)';
  return 'var(--p-faint)';
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
  const parts = value.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '').join('');
  return (letters.length > 1 ? letters : value.slice(0, 2) || 'MG').toUpperCase();
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

export default function VendorPortalApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'setup' | 'forgot' | 'reset'>('login');
  const [setupCode, setSetupCode] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [varieties, setVarieties] = useState<VarietyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>('gemstone');
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    vendor_ref: '', variety: 'ruby', weight_ct: '', colour: '', origin: '', shape: '',
    clarity: '', jewellery_type: 'RING', metal: 'W14', style: '',
    price_amount: '', currency: 'USD', quantity: '1', description: '', image: '',
  });
  const [certItem, setCertItem] = useState<string | null>(null);
  const [certs, setCerts] = useState<Record<string, CertificateRow[]>>({});
  const [certForm, setCertForm] = useState({ agency: '', cert_no: '', url: '', issued_at: '' });
  const [settingsForm, setSettingsForm] = useState({ current_password: '', new_password: '' });
  const [issuedApiKey, setIssuedApiKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [range, setRange] = useState<ChartRange>('week');
  const [pieceMetric, setPieceMetric] = useState<'price' | 'weight'>('price');
  const [invFilter, setInvFilter] = useState('');

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/fresh${path}`, { ...init, cache: 'no-store' });
    if (response.status === 401) { setAuthed(false); throw new Error('unauthorized'); }
    return response;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const meRes = await authFetch('/vendor/auth/me');
      if (!meRes.ok) { setAuthed(false); return; }
      const me = (await meRes.json()) as { code: string; name: string };
      setVendorName(me.name);
      setVendorCode(me.code);
      const [subsRes, invRes, varRes, analyticsRes] = await Promise.all([
        authFetch(`/vendors/${me.code}/submissions`),
        authFetch(`/vendors/${me.code}/inventory`),
        fetch('/api/fresh/catalogue/varieties', { cache: 'no-store' }),
        authFetch(`/vendors/${me.code}/analytics`),
      ]);
      if (subsRes.ok) setSubmissions(((await subsRes.json()) as SubmissionRow[]) ?? []);
      if (invRes.ok) {
        const inv = (await invRes.json()) as { items: InventoryItem[]; stats: InventoryStats };
        setInventory(inv.items); setStats(inv.stats);
      }
      if (varRes.ok) setVarieties(((await varRes.json()) as { items: VarietyRow[] }).items ?? []);
      if (analyticsRes.ok) setAnalytics((await analyticsRes.json()) as VendorAnalytics);
      setAuthed(true);
    } catch { setAuthed(false); }
  }, [authFetch]);

  useEffect(() => { void loadAll(); }, [loadAll]);

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
    event.preventDefault(); setError(''); setBusy(true);
    const response = await fetch('/api/fresh-vendor-password/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (response.ok) { setPassword(''); await loadAll(); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Invalid email or password');
    }
    setBusy(false);
  };

  const setupAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    const response = await fetch('/api/fresh-vendor-password/setup', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vendor_code: setupCode.trim(), api_key: setupKey.trim(), password: setupPassword }),
    });
    if (response.ok) { setSetupKey(''); setSetupPassword(''); setAuthMode('login'); await loadAll(); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not set up access');
    }
    setBusy(false);
  };

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    const response = await fetch('/api/fresh/vendor/auth/request-reset', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; token?: string };
    if (!response.ok) setError(data.error ?? 'Could not request a reset');
    else {
      setNotice('If that address is registered, a reset token has been issued.');
      if (data.token) setResetToken(data.token);
      setAuthMode('reset');
    }
    setBusy(false);
  };

  const resetAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    const response = await fetch('/api/fresh/vendor/auth/reset', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken.trim(), password: resetPassword }),
    });
    if (response.ok) { setResetPassword(''); setAuthMode('login'); setNotice('Password updated — sign in.'); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Reset failed');
    }
    setBusy(false);
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    const response = await authFetch('/vendor/auth/change-password', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    if (response.ok) { setSettingsForm({ current_password: '', new_password: '' }); setNotice('Password updated.'); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not change the password');
    }
    setBusy(false);
  };

  const loadCertificates = useCallback(async (ref: string) => {
    const response = await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}/certificates`);
    if (response.ok) {
      const data = (await response.json()) as { certificates: CertificateRow[] };
      setCerts((current) => ({ ...current, [ref]: data.certificates }));
    }
  }, [authFetch, vendorCode]);

  const toggleCerts = async (ref: string) => {
    if (certItem === ref) { setCertItem(null); return; }
    setCertItem(ref); setError('');
    await loadCertificates(ref);
  };

  const addCertificate = async (ref: string) => {
    setBusy(true); setError('');
    const response = await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}/certificates`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...certForm, url: certForm.url || undefined, issued_at: certForm.issued_at || undefined }),
    });
    if (response.ok) {
      setCertForm({ agency: '', cert_no: '', url: '', issued_at: '' });
      await loadCertificates(ref);
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not add the certificate');
    }
    setBusy(false);
  };

  const removeCertificate = async (ref: string, id: number) => {
    setBusy(true);
    await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}/certificates/${id}`, { method: 'DELETE' });
    await loadCertificates(ref);
    setBusy(false);
  };

  const rotateApiKey = async () => {
    if (!window.confirm('Rotate the API key? The current key stops working immediately.')) return;
    setError(''); setNotice('');
    const response = await authFetch(`/vendors/${vendorCode}/api-key`, { method: 'POST' });
    if (response.ok) {
      const data = (await response.json()) as { apiKey: string };
      setIssuedApiKey(data.apiKey);
      setNotice('API key rotated — store it now, it is shown once.');
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not rotate the key');
    }
  };

  const logout = async () => {
    await fetch('/api/fresh/vendor/auth/logout', { method: 'POST' });
    setAuthed(false); setSubmissions([]); setInventory([]);
  };

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const payload: Record<string, unknown> = { submission_kind: kind, vendor_ref: form['vendor_ref'] };
    if (kind === 'gemstone') {
      Object.assign(payload, {
        kind: 'SINGLE', variety: form['variety'], weight_ct: Number(form['weight_ct']),
        colour: form['colour'] || undefined, origin: form['origin'] || undefined,
        shape: form['shape'] || undefined, clarity: form['clarity'] || undefined,
        origin_type: 'NATURAL',
        price_amount: form['price_amount'] ? Number(form['price_amount']) : undefined,
        currency: form['currency'], description: form['description'] || undefined,
      });
    } else {
      Object.assign(payload, {
        jewellery_type: form['jewellery_type'], metal: form['metal'], style: form['style'] || undefined,
        price_amount: form['price_amount'] ? Number(form['price_amount']) : undefined,
        currency: form['currency'], description: form['description'] || undefined,
      });
      if (kind === 'product') payload['quantity'] = Math.max(0, Math.min(1000, Number(form['quantity'] || 1)));
    }
    const response = await authFetch(`/vendors/${vendorCode}/submissions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      setForm((current) => ({ ...current, vendor_ref: '', weight_ct: '', price_amount: '', description: '', image: '' }));
      setTab('submissions');
      await loadAll();
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Submission failed');
    }
    setBusy(false);
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

  const updateStatus = async (ref: string, status: string) => {
    setBusy(true);
    await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll(); setBusy(false);
  };

  const toggleVendorSelection = (ref: string) => {
    setSelectedInventory((current) => current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref]);
  };

  const bulkUpdateVendorInventory = async (status: string) => {
    if (selectedInventory.length === 0) return;
    setBusy(true);
    await Promise.all(selectedInventory.map((ref) => authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })));
    setSelectedInventory([]);
    await loadAll();
    setBusy(false);
  };

  const updateQuantity = async (ref: string, quantity: number) => {
    setBusy(true); setError(''); setNotice('');
    const response = await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (response.ok) { setNotice('Stock updated.'); await loadAll(); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not update stock');
    }
    setBusy(false);
  };

  const uploadImage = async (ref: string, file: File) => {
    setUploadingRef(ref); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the image'));
        reader.readAsDataURL(file);
      });
      const response = await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}/images`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, alt: ref }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Upload failed');
      }
      await loadAll();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    }
    setUploadingRef(null);
  };

  const fmt = (value: number | null, currency: string) =>
    value == null || value === 0 ? 'Price on request' : money(value, currency);

  const chartRange = CHART_RANGES[range];
  const series = useMemo(
    () => buildChartSeries(inventory, (item) => new Date(item.created_at), (item) => item.price_amount ?? 0, range),
    [inventory, range],
  );
  const currentTotal = series.reduce((total, day) => total + day.current, 0);
  const previousTotal = series.reduce((total, day) => total + day.previous, 0);
  const rangeStart = useMemo(() => startOfDay(new Date()).getTime() - (chartRange.days - 1) * DAY_MS, [chartRange.days]);
  const currentPeriodItems = useMemo(
    () => inventory.filter((item) => startOfDay(new Date(item.created_at)).getTime() >= rangeStart),
    [inventory, rangeStart],
  );
  const currentAverage = currentPeriodItems.length ? currentTotal / currentPeriodItems.length : 0;
  const onRequestCount = currentPeriodItems.filter((item) => !item.price_amount).length;
  const delta = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const chartMax = niceMax(Math.max(...series.map((day) => Math.max(day.current, day.previous)), 1));
  const hasChartData = series.some((day) => day.current > 0 || day.previous > 0);

  const pendingReview = submissions.filter((submission) => submission.status === 'SUBMITTED').length;
  const latestSubmissions = useMemo(
    () => [...submissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions],
  );
  const timelineSubmissions = latestSubmissions.slice(0, 5);
  const topPieces = useMemo(() => {
    if (pieceMetric === 'weight') {
      return [...inventory].filter((item) => item.weight_ct && item.weight_ct > 0).sort((a, b) => (b.weight_ct ?? 0) - (a.weight_ct ?? 0)).slice(0, 5);
    }
    return [...inventory].filter((item) => item.price_amount && item.price_amount > 0).sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0)).slice(0, 5);
  }, [inventory, pieceMetric]);
  const topPieceMetric = topPieces[0] ? (pieceMetric === 'price' ? topPieces[0].price_amount ?? 0 : topPieces[0].weight_ct ?? 0) : 0;
  const pieceMetricValue = (item: InventoryItem) => (pieceMetric === 'price' ? item.price_amount ?? 0 : item.weight_ct ?? 0);
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const submission of submissions) {
      map.set(submission.status, (map.get(submission.status) ?? 0) + 1);
    }
    return SUBMISSION_STATUSES.filter((status) => map.has(status)).map((status) => ({
      status,
      count: map.get(status) ?? 0,
      color: statusColor(status),
      spark: sparkPath(
        buildChartSeries(
          submissions.filter((submission) => submission.status === status),
          (submission) => new Date(submission.created_at),
          () => 1,
          range,
        ).map((point) => point.current),
      ),
    }));
  }, [submissions, range]);
  const agedInventory = useMemo(
    () => [...inventory]
      .filter((item) => item.status !== 'SOLD')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 4),
    [inventory],
  );
  const filteredInventory = useMemo(() => {
    const query = invFilter.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter((item) => `${item.name} ${item.ref} ${item.variety} ${item.status}`.toLowerCase().includes(query));
  }, [inventory, invFilter]);

  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    const entries: PaletteEntry[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        entries.push({
          id: `tab-${item.id}`, group: 'Navigate', label: item.label, hint: 'Page', icon: item.icon,
          run: () => { setTab(item.id); setMenuOpen(false); },
        });
      }
    }
    for (const submission of latestSubmissions.slice(0, 6)) {
      entries.push({
        id: `sub-${submission.id}`, group: 'Submissions',
        label: String(submission.payload?.['variety'] ?? submission.payload?.['jewellery_type'] ?? `Submission #${submission.id}`),
        hint: `${statusLabel(submission.status)} · ${submission.resulting_ref ?? `#${submission.id}`}`,
        icon: ClipboardCheck,
        run: () => { setTab('submissions'); setSubTab('all'); setMenuOpen(false); },
      });
    }
    for (const item of inventory.slice(0, 6)) {
      entries.push({
        id: `inv-${item.ref}`, group: 'Inventory', label: item.name,
        hint: `${item.ref} · ${item.variety}`, icon: Gem,
        run: () => { setTab('inventory'); setInvFilter(item.ref); setMenuOpen(false); },
      });
    }
    return entries;
  }, [latestSubmissions, inventory]);

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
            <h1 className="portal-auth__title">Partner Atelier</h1>
            <p className="portal-auth__sub">Your house, inside the maison.</p>
            <span className="portal-auth__rule" />
          </div>

          <form
            onSubmit={
              authMode === 'login' ? login
                : authMode === 'setup' ? setupAccount
                : authMode === 'forgot' ? requestReset
                : resetAccount
            }
            className="portal-card portal-auth__card space-y-5"
          >
            {authMode === 'login' ? (
              <>
                <div>
                  <label htmlFor="v-email" className="portal-label">Email</label>
                  <input id="v-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" className="portal-input" autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="v-password" className="portal-label">Password</label>
                  <input id="v-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="portal-input" autoComplete="current-password" />
                </div>
              </>
            ) : null}

            {authMode === 'setup' ? (
              <>
                <div>
                  <label htmlFor="v-setup-code" className="portal-label">Vendor code</label>
                  <input id="v-setup-code" value={setupCode} onChange={(event) => setSetupCode(event.target.value.toUpperCase())} required placeholder="V-AE-004" className="portal-input" autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="v-setup-key" className="portal-label">One-time API key</label>
                  <input id="v-setup-key" type="password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} required placeholder="Issued at onboarding approval" className="portal-input" autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="v-setup-password" className="portal-label">New password</label>
                  <input id="v-setup-password" type="password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} required minLength={8} placeholder="At least 8 characters" className="portal-input" autoComplete="new-password" />
                </div>
              </>
            ) : null}

            {authMode === 'forgot' ? (
              <div>
                <label htmlFor="v-forgot-email" className="portal-label">Account email</label>
                <input id="v-forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" className="portal-input" autoComplete="email" />
                <p className="portal-card__sub" style={{ marginTop: 8 }}>A single-use reset token is sent to the registered partner email.</p>
              </div>
            ) : null}

            {authMode === 'reset' ? (
              <>
                <div>
                  <label htmlFor="v-reset-token" className="portal-label">Reset token</label>
                  <input id="v-reset-token" value={resetToken} onChange={(event) => setResetToken(event.target.value)} required placeholder="Token from the email" className="portal-input" autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="v-reset-password" className="portal-label">New password</label>
                  <input id="v-reset-password" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required minLength={8} placeholder="At least 8 characters" className="portal-input" autoComplete="new-password" />
                </div>
              </>
            ) : null}

            {error ? <p className="portal-notice">{error}</p> : null}
            {notice ? <p className="portal-notice portal-notice--good">{notice}</p> : null}

            <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
              {busy
                ? 'Working…'
                : authMode === 'login' ? 'Enter the atelier'
                : authMode === 'setup' ? 'Set password & enter'
                : authMode === 'forgot' ? 'Send reset token'
                : 'Set new password'}
            </button>
          </form>

          <div className="portal-auth__links">
            <button type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice(''); }}>Sign in</button>
            <button type="button" onClick={() => { setAuthMode('setup'); setError(''); setNotice(''); }}>First-time setup</button>
            <button type="button" onClick={() => { setAuthMode('forgot'); setError(''); setNotice(''); }}>Forgot password</button>
          </div>
          <p className="portal-auth__foot">Access is activated after onboarding approval.</p>
        </div>
      </div>
    );
  }

  const currentTab = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === tab);
  const liveItems = stats?.live_items ?? inventory.filter((item) => item.status === 'ACTIVE').length;
  const recentSubmission = latestSubmissions[0];

  const navCount = (id: Tab) => {
    if (id === 'submissions') return pendingReview;
    if (id === 'inventory') return liveItems;
    return null;
  };

  return (
    <div className="portal-shell" data-portal-theme={theme}>
      {menuOpen ? <button type="button" className="portal-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

      <aside className={`portal-sidebar ${collapsed ? 'is-collapsed' : ''} ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="portal-brand">
          <button type="button" className="portal-brand__logo" onClick={() => setTab('overview')}>
            <span className="portal-brand__mark"><Gem /></span>
            <span className="portal-brand__text">
              <span className="portal-brand__name">{vendorName || 'Partner'}</span>
              <span className="portal-brand__eyebrow">{vendorCode || 'Atelier'}</span>
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
                    onClick={() => { setTab(item.id); setMenuOpen(false); }}
                  >
                    <item.icon />
                    <span className="portal-nav__label">{item.label}</span>
                    {count ? <span className={`portal-nav__count ${item.id === 'submissions' ? 'portal-nav__count--warn' : ''}`}>{count}</span> : null}
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
              <span className="portal-avatar">{initials(vendorName || email || vendorCode || 'Partner')}</span>
              <span className="portal-sidebar__me-text">
                <b>{vendorName || 'Partner'}</b>
                <small>{vendorCode || 'Atelier'}</small>
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
            <span>Search inventory, submissions…</span>
            <kbd className="portal-top__kbd">⌘K</kbd>
          </button>

          <div className="portal-top__tools">
            <span className="portal-chip">
              <Gem />
              <span>Your atelier</span>
              <ChevronDown className="portal-chip__chev" />
            </span>
            <span className="portal-chip portal-chip--live">
              <i className="portal-live-dot" />
              <span>{formatClock(now)}</span>
            </span>
            <div className="portal-notifications">
              <button type="button" className="portal-icon-btn" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell />
                {pendingReview > 0 ? <span className="portal-badge-dot">{pendingReview}</span> : null}
              </button>
              {notificationsOpen ? (
                <>
                  <button type="button" className="portal-notifications__scrim" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} />
                  <div className="portal-notifications__panel">
                  <p className="portal-label" style={{ padding: '2px 8px 8px' }}>Needs attention</p>
                  <button type="button" className="portal-notification__item" onClick={() => { setTab('submissions'); setNotificationsOpen(false); }}>
                    <ClipboardCheck />
                    <span className="portal-notification__text">
                      <span className="portal-notification__title">Awaiting the house</span>
                      <span className="portal-notification__sub">Submissions in review</span>
                    </span>
                    <span className="portal-notification__count">{pendingReview}</span>
                  </button>
                  <button type="button" className="portal-notification__item" onClick={() => { setTab('inventory'); setNotificationsOpen(false); }}>
                    <Package />
                    <span className="portal-notification__text">
                      <span className="portal-notification__title">Live inventory</span>
                      <span className="portal-notification__sub">Pieces visible to clients</span>
                    </span>
                    <span className="portal-notification__count">{liveItems}</span>
                  </button>
                    {pendingReview === 0 ? <p className="portal-notifications__empty">Nothing requires attention.</p> : null}
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
            <button type="button" className="portal-btn portal-btn--gold" onClick={() => setTab('new')}>
              <Plus />
              <span>New</span>
            </button>
          </div>
        </header>

        {tab === 'overview' ? (
          <div className="portal-section">
            <div className="portal-greeting">
              <div>
                <h1 className="portal-greeting__title">{greeting()}, {vendorName || 'Partner'}</h1>
                <p className="portal-greeting__sub">
                  {formatDay(now)} · {liveItems} pieces live · <b>{pendingReview} awaiting the house</b>
                </p>
              </div>
              <div className="portal-greeting__actions">
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => setTab('submissions')}>
                  <ClipboardCheck />
                  <span>My submissions</span>
                </button>
                <button type="button" className="portal-btn portal-btn--gold" onClick={() => setTab('new')}>
                  <PlusCircle />
                  <span>Add product</span>
                </button>
              </div>
            </div>

            <div className="portal-grid--top">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Inventory</h2>
                    <p className="portal-card__sub">{chartRange.label} · value listed against {chartRange.previousLabel.toLowerCase()}</p>
                  </div>
                  <div className="portal-seg" role="group" aria-label="Inventory range">
                    {(Object.keys(CHART_RANGES) as ChartRange[]).map((value) => (
                      <button key={value} type="button" className={`portal-seg__item ${range === value ? 'is-active' : ''}`} onClick={() => setRange(value)}>
                        {CHART_RANGES[value].tab}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="portal-takings__big">
                  <span className="portal-takings__val">{money(currentTotal, stats?.currency ?? 'USD')}</span>
                  <span className={`portal-takings__trend ${delta !== null && delta < 0 ? 'is-down' : ''}`}>
                    {delta !== null && delta < 0 ? <TrendingDown /> : <TrendingUp />}
                    {delta === null
                      ? previousTotal === 0 && currentTotal > 0 ? 'First listed period' : 'Nothing listed yet'
                      : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs ${chartRange.previousLabel.toLowerCase()}`}
                  </span>
                </div>

                <div className="portal-inline" style={{ alignItems: 'center' }}>
                  <dl className="portal-takings__kpis">
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">Pieces listed</dt>
                      <dd className="portal-kpi__value">{currentPeriodItems.length}</dd>
                    </div>
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">Average price</dt>
                      <dd className="portal-kpi__value">{money(currentAverage, stats?.currency ?? 'USD')}</dd>
                    </div>
                    <div className="portal-kpi">
                      <dt className="portal-kpi__label">On request</dt>
                      <dd className="portal-kpi__value">{onRequestCount}</dd>
                    </div>
                  </dl>
                  <div className="portal-legend">
                    <span className="portal-legend__item"><i className="portal-legend__dot is-current" /> {chartRange.label}</span>
                    <span className="portal-legend__item"><i className="portal-legend__dot is-previous" /> {chartRange.previousLabel}</span>
                  </div>
                </div>

                <div className="portal-chart">
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label={`Listed inventory value for ${chartRange.label.toLowerCase()} compared with ${chartRange.previousLabel.toLowerCase()}`}>
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
                  {!hasChartData ? <div className="portal-chart__empty">Nothing listed {chartRange.label.toLowerCase()} yet.</div> : null}
                </div>
              </section>

              <div className="portal-tiles">
                <button type="button" className="portal-tile portal-tile--gold" onClick={() => setTab('inventory')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><Package /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Live items</span>
                    <span className="portal-tile__value">{liveItems}</span>
                    <span className="portal-tile__sub">{stats?.hidden_items ?? 0} hidden from clients</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--butter" onClick={() => setTab('submissions')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><ClipboardCheck /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Awaiting review</span>
                    <span className="portal-tile__value">{pendingReview}</span>
                    <span className="portal-tile__sub">{submissions.length} lifetime submissions</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--sky" onClick={() => setTab('inventory')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><DollarSign /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Sold</span>
                    <span className="portal-tile__value">{stats?.sold_items ?? 0}</span>
                    <span className="portal-tile__sub">lifetime through the house</span>
                  </span>
                </button>

                <button type="button" className="portal-tile portal-tile--mint" onClick={() => setTab('inventory')}>
                  <span className="portal-tile__head">
                    <span className="portal-tile__icon"><Gem /></span>
                    <span className="portal-tile__arrow">↗</span>
                  </span>
                  <span>
                    <span className="portal-tile__title">Inventory value</span>
                    <span className="portal-tile__value">{money(stats?.total_value ?? 0, stats?.currency ?? 'USD')}</span>
                    <span className="portal-tile__sub">{stats?.total_items ?? inventory.length} pieces in the vault</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="portal-grid--mid">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Submission timeline</h2>
                    <p className="portal-card__sub">{pendingReview} awaiting the house · {submissions.length} lifetime</p>
                  </div>
                  <div className="portal-card__actions">
                    <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('submissions')}>
                      All submissions <ArrowUpRight />
                    </button>
                    <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('new')}>
                      + Add
                    </button>
                  </div>
                </header>

                {timelineSubmissions.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><ClipboardCheck /></div>
                    <p className="portal-empty__title">Nothing submitted yet</p>
                    <p className="portal-empty__sub">Your first piece will appear here for review.</p>
                  </div>
                ) : (
                  <div className="portal-timeline">
                    {timelineSubmissions.map((submission) => {
                      const tone = toneClass(submission.status);
                      return (
                        <button
                          type="button"
                          key={submission.id}
                          className="portal-tl"
                          onClick={() => { setTab('submissions'); setSubTab('all'); }}
                        >
                          <span className="portal-tl__time">{new Date(submission.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          <span className={`portal-tl__dot ${tone}`}>
                            {tone === 'is-good' ? <CheckCircle2 /> : tone === 'is-late' ? <XCircle /> : <Clock />}
                          </span>
                          <span className="portal-tl__info">
                            <span className="portal-tl__name">{String(submission.payload?.['variety'] ?? submission.payload?.['jewellery_type'] ?? 'Item')}</span>
                            <span className="portal-tl__sub">{String(submission.payload?.['vendor_ref'] ?? '—')} · {submission.resulting_ref ?? `#${submission.id}`}</span>
                          </span>
                          <span className={`portal-tl__status ${tone}`}>{statusLabel(submission.status)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Best pieces</h2>
                    <p className="portal-card__sub">{pieceMetric === 'price' ? 'Highest asking price in your vault' : 'Heaviest pieces in your vault'}</p>
                  </div>
                  <div className="portal-seg" role="group" aria-label="Piece ranking">
                    <button type="button" className={`portal-seg__item ${pieceMetric === 'price' ? 'is-active' : ''}`} onClick={() => setPieceMetric('price')}>Price</button>
                    <button type="button" className={`portal-seg__item ${pieceMetric === 'weight' ? 'is-active' : ''}`} onClick={() => setPieceMetric('weight')}>Carat</button>
                  </div>
                </header>

                {topPieces.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><Gem /></div>
                    <p className="portal-empty__title">No priced pieces</p>
                    <p className="portal-empty__sub">Priced inventory will rank here.</p>
                  </div>
                ) : (
                  <div className="portal-best">
                    {topPieces.map((item, index) => (
                      <button
                        type="button"
                        key={item.ref}
                        className="portal-best__item"
                        onClick={() => { setTab('inventory'); setInvFilter(item.ref); }}
                      >
                        <span className="portal-best__rank">{index + 1}</span>
                        <span className="portal-best__details">
                          <span className="portal-best__header">
                            <span className="portal-best__name">{item.name} <small>{item.variety}</small></span>
                            <span className="portal-best__value">{pieceMetric === 'price' ? money(item.price_amount ?? 0, item.currency) : `${item.weight_ct ?? 0} ct`}</span>
                          </span>
                          <span className="portal-best__track">
                            <span className={`portal-best__bar ${index === 4 ? 'is-muted' : ''}`} style={{ width: `${topPieceMetric > 0 ? Math.max(4, (pieceMetricValue(item) / topPieceMetric) * 100) : 0}%` }} />
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
                    <h2 className="portal-card__title">Submission states</h2>
                    <p className="portal-card__sub">Where the house stands</p>
                  </div>
                </header>

                {statusBreakdown.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><AlertCircle /></div>
                    <p className="portal-empty__title">Nothing to chart</p>
                    <p className="portal-empty__sub">Submission states appear after the first review.</p>
                  </div>
                ) : (
                  <>
                    <div className="portal-mix__stack">
                      {statusBreakdown.map((item) => (
                        <span
                          key={item.status}
                          className="portal-mix__seg"
                          style={{ flexGrow: item.count, background: item.color }}
                          title={`${statusLabel(item.status)} · ${item.count}`}
                        />
                      ))}
                    </div>
                    <div className="portal-mix__list">
                      {statusBreakdown.map((item) => (
                        <div key={item.status} className="portal-mix__item">
                          <div className="portal-mix__left">
                            <span className="portal-mix__icon">
                              {item.status === 'APPROVED' ? <CheckCircle2 /> : item.status === 'REJECTED' ? <XCircle /> : <Clock />}
                            </span>
                            <span className="portal-mix__label">
                              <b>{statusLabel(item.status)}</b>
                              <small>{Math.round((item.count / Math.max(1, statusBreakdown.reduce((total, entry) => total + entry.count, 0))) * 100)}% · {item.count} submissions</small>
                            </span>
                          </div>
                          <svg className="portal-mix__spark" viewBox="0 0 60 20" aria-hidden="true">
                            <path d={item.spark} fill="none" stroke={item.color} strokeWidth="2" />
                          </svg>
                          <span className="portal-mix__value">{item.count}<small>pieces</small></span>
                        </div>
                      ))}
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
                      Latest activity
                    </h2>
                    <p className="portal-card__sub">The newest submissions from your house</p>
                  </div>
                  <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('submissions')}>
                    All submissions <ArrowUpRight />
                  </button>
                </header>

                {latestSubmissions.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><PackageSearch /></div>
                    <p className="portal-empty__title">No activity yet</p>
                    <p className="portal-empty__sub">Submit your first piece from Add Product.</p>
                  </div>
                ) : (
                  <div className="portal-feed">
                    {latestSubmissions.slice(0, 4).map((submission) => (
                      <button
                        type="button"
                        key={submission.id}
                        className="portal-feed__item"
                        onClick={() => { setTab('submissions'); setSubTab('all'); }}
                      >
                        <span className="portal-feed__avatar">{initials(String(submission.payload?.['variety'] ?? submission.submission_kind))}</span>
                        <span className="portal-feed__info">
                          <span className="portal-feed__name">{String(submission.payload?.['variety'] ?? submission.payload?.['jewellery_type'] ?? 'Item')}</span>
                          <span className="portal-feed__sub">{String(submission.payload?.['vendor_ref'] ?? `#${submission.id}`)} · {new Date(submission.created_at).toLocaleDateString('en-GB')}</span>
                        </span>
                        <span className="portal-feed__meta">{statusLabel(submission.status)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head">
                  <div>
                    <h2 className="portal-card__title">Aged stock</h2>
                    <p className="portal-card__sub">Pieces listed longest</p>
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
                        <div key={item.ref} className="portal-aged__item">
                          <span className="portal-aged__days">{days}</span>
                          <span className="portal-aged__info">
                            <span className="portal-aged__name">{item.name}</span>
                            <span className="portal-aged__sub">{item.variety} · {item.ref} · {fmt(item.price_amount, item.currency)}</span>
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
                  <h2 className="portal-card__title">Vault by status</h2>
                  <p className="portal-card__sub">Your pieces at a glance</p>
                </div>
                <button type="button" className="portal-btn portal-btn--ghost portal-btn--sm" onClick={() => setTab('inventory')}>
                  Manage <ArrowUpRight />
                </button>
              </header>

              <div className="portal-tills">
                {[
                  { status: 'ACTIVE', label: 'Live', items: inventory.filter((item) => item.status === 'ACTIVE') },
                  { status: 'DRAFT', label: 'Hidden', items: inventory.filter((item) => item.status === 'DRAFT') },
                  { status: 'SOLD', label: 'Sold', items: inventory.filter((item) => item.status === 'SOLD') },
                ].map((bucket) => {
                  const value = bucket.items.reduce((total, item) => total + (item.price_amount ?? 0), 0);
                  return (
                    <div key={bucket.status} className="portal-till">
                      <div className="portal-till__left">
                        <span className="portal-till__dot" style={{ background: statusColor(bucket.status === 'ACTIVE' ? 'APPROVED' : bucket.status === 'SOLD' ? 'SUBMITTED' : 'HOLD') }} />
                        <div>
                          <p className="portal-till__name">{bucket.label}</p>
                          <p className="portal-till__sub">{bucket.items.length} pieces</p>
                        </div>
                      </div>
                      <span className="portal-till__value">{money(value, stats?.currency ?? 'USD')}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <footer className="portal-foot">
              <span>❖</span>
              <span>
                Your atelier: <b>{stats?.total_items ?? inventory.length}</b> pieces · <b>{money(stats?.total_value ?? 0, stats?.currency ?? 'USD')}</b> live value · last submission {recentSubmission ? new Date(recentSubmission.created_at).toLocaleDateString('en-GB') : '—'} · data as of just now
              </span>
            </footer>
          </div>
        ) : null}

        {tab === 'analytics' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Settled ledger</p>
                <h1 className="portal-page-title">Sales</h1>
                <p className="portal-page-sub">Your realised sales through the house, attributed to your pieces.</p>
              </div>
            </div>

            <div className="portal-grid--stats">
              <div className="portal-card portal-stat"><p className="portal-stat__label">Settled revenue</p><p className="portal-stat__value">{money(analytics?.totals.revenue ?? 0, stats?.currency ?? 'USD')}</p><p className="portal-stat__meta">paid & fulfilled orders</p></div>
              <div className="portal-card portal-stat"><p className="portal-stat__label">Orders</p><p className="portal-stat__value">{analytics?.totals.orders ?? 0}</p><p className="portal-stat__meta">lifetime settled</p></div>
              <div className="portal-card portal-stat"><p className="portal-stat__label">Units</p><p className="portal-stat__value">{analytics?.totals.units ?? 0}</p><p className="portal-stat__meta">pieces sold</p></div>
              <div className="portal-card portal-stat"><p className="portal-stat__label">Average order</p><p className="portal-stat__value">{money((analytics?.totals.orders ?? 0) > 0 ? (analytics?.totals.revenue ?? 0) / (analytics?.totals.orders ?? 1) : 0, stats?.currency ?? 'USD')}</p><p className="portal-stat__meta">per settled order</p></div>
            </div>

            <section className="portal-card portal-card--pad">
              <header className="portal-card__head">
                <div>
                  <h2 className="portal-card__title">Revenue by day</h2>
                  <p className="portal-card__sub">Last 30 days · settled order lines</p>
                </div>
              </header>
              {analytics && analytics.series.length > 0 ? (
                <div className="portal-chart">
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Settled vendor revenue by day for the last 30 days">
                    {(() => {
                      const max = Math.max(...analytics.series.map((point) => point.revenue), 1);
                      return (
                        <>
                          {[0, 1, 2, 3].map((line) => {
                            const y = 20 + line * (125 / 3);
                            return <line key={line} x1="42" x2="590" y1={y} y2={y} stroke="var(--p-line)" strokeDasharray={line === 3 ? undefined : '2 3'} />;
                          })}
                          {analytics.series.map((point, index) => {
                            const step = (590 - 42) / analytics.series.length;
                            const height = (point.revenue / max) * 125;
                            return (
                              <g key={point.day}>
                                <rect x={42 + index * step + step * 0.2} y={145 - height} width={Math.max(3, step * 0.55)} height={height} rx={3} fill="var(--p-chart-current)" />
                                {index % 5 === 0 || index === analytics.series.length - 1 ? <text x={42 + index * step + step / 2} y="162" fontSize="10" fill="var(--p-muted)" textAnchor="middle">{point.day.slice(5)}</text> : null}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><TrendingUp /></div>
                  <p className="portal-empty__title">No settled sales yet</p>
                  <p className="portal-empty__sub">Revenue appears after the house settles an order containing your pieces.</p>
                </div>
              )}
            </section>

            <div className="client-split">
              <section className="portal-card portal-card--pad">
                <header className="portal-card__head"><div><h2 className="portal-card__title">Top pieces</h2><p className="portal-card__sub">By settled revenue</p></div></header>
                {analytics && analytics.top_items.length > 0 ? (
                  <div className="portal-best">
                    {analytics.top_items.map((item, index) => (
                      <div key={`${item.ref}-${index}`} className="portal-best__item">
                        <span className="portal-best__rank">{index + 1}</span>
                        <span className="portal-best__details">
                          <span className="portal-best__header"><span className="portal-best__name">{item.name} <small>{item.ref}</small></span><span className="portal-best__value">{money(item.revenue, stats?.currency ?? 'USD')}</span></span>
                          <span className="portal-best__track"><span className="portal-best__bar" style={{ width: `${Math.max(4, (item.revenue / Math.max(...analytics.top_items.map((entry) => entry.revenue), 1)) * 100)}%` }} /></span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="portal-card__sub">No settled pieces yet.</p>}
              </section>

              <section className="portal-card portal-card--pad">
                <header className="portal-card__head"><div><h2 className="portal-card__title">Settlement mix</h2><p className="portal-card__sub">How clients paid</p></div></header>
                {analytics && analytics.payments.length > 0 ? (
                  <div className="portal-mix__list">
                    {analytics.payments.map((payment) => (
                      <div key={payment.provider} className="portal-mix__item">
                        <div className="portal-mix__left"><span className="portal-mix__icon"><CreditCard /></span><span className="portal-mix__label"><b>{payment.provider === 'test' ? 'Test card' : payment.provider}</b><small>{payment.count} payment(s)</small></span></div>
                        <span className="portal-mix__value">{money(payment.amount, stats?.currency ?? 'USD')}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="portal-card__sub">No settled payments yet.</p>}
              </section>
            </div>
          </div>
        ) : null}

        {tab === 'submissions' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Dossier</p>
                <h1 className="portal-page-title">My Submissions</h1>
                <p className="portal-page-sub">Every item you submit, with the house&apos;s feedback.</p>
              </div>
              <div className="portal-card__actions">
                <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-partner-submissions.csv', [
                  ['ID', 'Kind', 'Status', 'Resulting ref', 'Created', 'Reviewer note'],
                  ...submissions.map((submission) => [submission.id, submission.submission_kind, submission.status, submission.resulting_ref, submission.created_at, submission.reviewer_note]),
                ])}>Export CSV</button>
                <button type="button" className="portal-btn portal-btn--gold" onClick={() => setTab('new')}>
                  <PlusCircle /> Add product
                </button>
              </div>
            </div>

            <div className="portal-seg">
              {(['all', 'APPROVED', 'SUBMITTED', 'HOLD', 'REJECTED'] as SubTab[]).map((value) => (
                <button key={value} type="button" onClick={() => setSubTab(value)} className={`portal-seg__item ${subTab === value ? 'is-active' : ''}`}>
                  {value === 'all' ? 'All' : statusLabel(value)} ({value === 'all' ? submissions.length : submissions.filter((submission) => submission.status === value).length})
                </button>
              ))}
            </div>

            {submissions.filter((submission) => subTab === 'all' || submission.status === subTab).length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><PackageSearch /></div>
                <p className="portal-empty__title">Nothing here yet</p>
                <p className="portal-empty__sub">Submit your first piece from Add Product.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.filter((submission) => subTab === 'all' || submission.status === subTab).map((submission) => (
                  <div key={submission.id} className="portal-card portal-card--pad space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="portal-kicker" style={{ marginBottom: 2 }}>{submission.submission_kind}</p>
                        <p style={{ margin: 0, fontSize: 'var(--p-fs-xl)', fontWeight: 700 }}>{String(submission.payload?.['variety'] ?? submission.payload?.['jewellery_type'] ?? 'Item')}</p>
                        <p className="portal-card__sub">Your ref · {String(submission.payload?.['vendor_ref'] ?? '—')}</p>
                        {submission.resulting_ref ? <p className="portal-mono" style={{ margin: '6px 0 0' }}>Listed as {submission.resulting_ref}</p> : null}
                      </div>
                      <span className={badgeClass(submission.status)}>{statusLabel(submission.status)}</span>
                    </div>
                    {submission.reviewer_note ? (
                      <div className="portal-feedback">
                        <p className="portal-feedback__label"><AlertCircle /> House feedback</p>
                        <p className="portal-feedback__body">{submission.reviewer_note}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'inventory' ? (
          <div className="portal-section">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Vault</p>
                <h1 className="portal-page-title">Live Inventory</h1>
                <p className="portal-page-sub">Control what clients see — mark sold, hide or remove.</p>
              </div>
              <button type="button" className="portal-btn portal-btn--ghost" onClick={() => downloadCsv('maihan-partner-inventory.csv', [
                ['Reference', 'Name', 'Kind', 'Status', 'Variety', 'Price', 'Currency', 'Quantity', 'Created'],
                ...inventory.map((item) => [item.ref, item.name, item.kind, item.status, item.variety, item.price_amount, item.currency, item.quantity, item.created_at]),
              ])}>Export CSV</button>
            </div>

            <div className="portal-inline">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-3 h-4 w-4" style={{ color: 'var(--p-faint)' }} />
                <input
                  value={invFilter}
                  onChange={(event) => setInvFilter(event.target.value)}
                  placeholder="Filter by name, reference or variety…"
                  className="portal-input portal-input--search"
                />
              </div>
              <span className="portal-badge portal-badge--active">{filteredInventory.length} pieces</span>
            </div>

            {selectedInventory.length > 0 ? (
              <div className="portal-inline">
                <span className="portal-badge portal-badge--pending">{selectedInventory.length} selected</span>
                <button type="button" onClick={() => void bulkUpdateVendorInventory('ACTIVE')} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Publish</button>
                <button type="button" onClick={() => void bulkUpdateVendorInventory('DRAFT')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm">Hide</button>
                <button type="button" onClick={() => void bulkUpdateVendorInventory('SOLD')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm">Mark sold</button>
                <button type="button" onClick={() => setSelectedInventory([])} className="portal-btn portal-btn--ghost portal-btn--sm">Clear</button>
              </div>
            ) : null}

            {error ? <p className="portal-notice">{error}</p> : null}

            {filteredInventory.length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><Package /></div>
                <p className="portal-empty__title">{inventory.length === 0 ? 'No inventory yet' : 'Nothing matches'}</p>
                <p className="portal-empty__sub">{inventory.length === 0 ? 'Approved items appear here with their controls.' : 'Try a different name or reference.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInventory.map((item) => (
                  <div key={item.ref} className="portal-card overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <div className="relative w-[76px] h-[76px] rounded-xl shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--p-well-solid)' }}>
                        {item.primary_image ? (
                          <MediaImage src={item.primary_image} alt={item.name} className="w-full h-full object-cover" sizes="76px" />
                        ) : (
                          <span style={{ fontSize: 24, color: 'var(--p-accent-deep)' }}>{item.variety.charAt(0)}</span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 style={{ margin: 0, fontSize: 'var(--p-fs-lg)', fontWeight: 700 }} className="truncate">{item.name}</h3>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="portal-checkbox"
                              aria-label={`Select ${item.name}`}
                              checked={selectedInventory.includes(item.ref)}
                              onChange={() => toggleVendorSelection(item.ref)}
                            />
                            <span className={badgeClass(item.status)}>{statusLabel(item.status)}</span>
                          </div>
                        </div>
                        <p className="portal-card__sub">{item.variety}{item.shape ? ` · ${item.shape}` : ''}{item.weight_ct ? ` · ${item.weight_ct}ct` : ''}</p>
                        <p style={{ margin: 0, fontSize: 'var(--p-fs-md)', fontWeight: 600, color: 'var(--p-accent-deep)' }}>{fmt(item.price_amount, item.currency)}</p>
                        <p className="portal-card__sub" style={{ fontSize: 10 }}>{item.ref} · {item.origin_type}{item.origin ? ` · ${item.origin}` : ''}{item.owner_kind === 'product' ? ` · stock ${item.quantity ?? 0}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-4 pb-4 flex-wrap">
                      {item.status === 'ACTIVE' ? (
                        <>
                          <button type="button" onClick={() => void updateStatus(item.ref, 'SOLD')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><DollarSign /> Mark sold</button>
                          <button type="button" onClick={() => void updateStatus(item.ref, 'DRAFT')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><EyeOff /> Hide</button>
                          <button type="button" onClick={() => void updateStatus(item.ref, 'ARCHIVED')} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm ml-auto"><Trash2 /> Delete</button>
                        </>
                      ) : item.status === 'DRAFT' ? (
                        <>
                          <button type="button" onClick={() => void updateStatus(item.ref, 'ACTIVE')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><Eye /> Publish</button>
                          <button type="button" onClick={() => void updateStatus(item.ref, 'ARCHIVED')} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm ml-auto"><Trash2 /> Delete</button>
                        </>
                      ) : item.status === 'SOLD' ? (
                        <button type="button" onClick={() => void updateStatus(item.ref, 'ACTIVE')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><ArrowUpRight /> Restock</button>
                      ) : null}
                      {item.owner_kind === 'product' ? (
                        <span className="portal-inline" style={{ gap: 6 }}>
                          <span className="portal-label" style={{ margin: 0 }}>Stock</span>
                          <input
                            type="number" min={0} max={1000} step={1}
                            defaultValue={String(item.quantity ?? 0)}
                            aria-label={`Stock for ${item.name}`}
                            onBlur={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isInteger(value) && value >= 0 && value <= 1000 && value !== item.quantity) void updateQuantity(item.ref, value);
                            }}
                            className="portal-input portal-input--sm" style={{ width: 72 }}
                          />
                        </span>
                      ) : null}
                      <label className="portal-btn portal-btn--ghost portal-btn--sm cursor-pointer">
                        <ImagePlus /> {uploadingRef === item.ref ? 'Uploading…' : 'Add photo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(item.ref, file); event.currentTarget.value = ''; }} />
                      </label>
                    </div>

                    <div className="px-4 pb-4">
                      <button type="button" onClick={() => void toggleCerts(item.ref)} className="portal-btn portal-btn--ghost portal-btn--sm">
                        Certificates {certs[item.ref] ? `(${certs[item.ref]?.length ?? 0})` : ''}
                      </button>
                      {certItem === item.ref ? (
                        <div className="mt-3 rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--p-line)', background: 'var(--p-well)' }}>
                          {(certs[item.ref] ?? []).length === 0 ? (
                            <p className="portal-card__sub">No certificates yet. Only house-verified reports are shown publicly.</p>
                          ) : (
                            <ul>
                              {(certs[item.ref] ?? []).map((certificate) => (
                                <li key={certificate.id} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid var(--p-line)' }}>
                                  <div>
                                    <span className="portal-mono">{certificate.agency} · {certificate.cert_no}</span>
                                    <span className="portal-badge portal-badge--draft" style={{ marginLeft: 8 }}>{certificate.verified}</span>
                                  </div>
                                  <button type="button" onClick={() => void removeCertificate(item.ref, certificate.id)} disabled={busy} aria-label="Remove certificate" className="portal-icon-btn" style={{ width: 26, height: 26 }}><Trash2 /></button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <input value={certForm.agency} onChange={(event) => setCertForm((current) => ({ ...current, agency: event.target.value }))} placeholder="Agency (GRS, GIA…)" className="portal-input portal-input--sm" />
                            <input value={certForm.cert_no} onChange={(event) => setCertForm((current) => ({ ...current, cert_no: event.target.value }))} placeholder="Report number" className="portal-input portal-input--sm" />
                            <input value={certForm.url} onChange={(event) => setCertForm((current) => ({ ...current, url: event.target.value }))} placeholder="https:// report link" className="portal-input portal-input--sm col-span-2" />
                            <button type="button" onClick={() => void addCertificate(item.ref)} disabled={busy || !certForm.agency || !certForm.cert_no} className="portal-btn portal-btn--gold portal-btn--sm col-span-2">Add certificate</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'new' ? (
          <div className="portal-section" style={{ maxWidth: 720 }}>
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Submission</p>
                <h1 className="portal-page-title">Add Product</h1>
                <p className="portal-page-sub">Submit for the house&apos;s approval. You control visibility after approval.</p>
              </div>
            </div>

            <form onSubmit={submit} className="portal-card portal-card--pad space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="v-kind" className="portal-label">Type</label>
                  <select id="v-kind" value={kind} onChange={(event) => setKind(event.target.value as Kind)} className="portal-select">
                    <option value="gemstone">Loose Gemstone</option>
                    <option value="setting">Setting</option>
                    <option value="product">Ready-made Jewellery</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="v-vendor-ref" className="portal-label">Your reference</label>
                  <input id="v-vendor-ref" value={form['vendor_ref']} onChange={set('vendor_ref')} required placeholder="RB-777" className="portal-input" />
                </div>
              </div>

              {kind === 'gemstone' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="v-variety" className="portal-label">Gemstone variety</label>
                    <select id="v-variety" value={form['variety']} onChange={set('variety')} className="portal-select">
                      {varieties.map((variety) => <option key={variety.slug} value={variety.slug}>{variety.name} ({variety.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="v-weight" className="portal-label">Weight (ct)</label>
                    <input id="v-weight" type="number" step="0.001" value={form['weight_ct']} onChange={set('weight_ct')} required className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-colour" className="portal-label">Colour (optional)</label>
                    <input id="v-colour" value={form['colour']} onChange={set('colour')} placeholder="blue" className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-origin" className="portal-label">Origin (optional)</label>
                    <input id="v-origin" value={form['origin']} onChange={set('origin')} placeholder="Mozambique" className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-shape" className="portal-label">Shape (optional)</label>
                    <input id="v-shape" value={form['shape']} onChange={set('shape')} placeholder="oval" className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-clarity" className="portal-label">Clarity (optional)</label>
                    <input id="v-clarity" value={form['clarity']} onChange={set('clarity')} placeholder="VVS" className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-price" className="portal-label">Price USD (blank = on request)</label>
                    <input id="v-price" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className="portal-input" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="v-jt" className="portal-label">Jewellery type</label>
                    <select id="v-jt" value={form['jewellery_type']} onChange={set('jewellery_type')} className="portal-select">
                      <option>RING</option><option>EARRING</option><option>PENDANT</option><option>NECKLACE</option><option>BRACELET</option><option>NOSE_RING</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="v-metal" className="portal-label">Metal code (e.g. W18, PT, Y14)</label>
                    <input id="v-metal" value={form['metal']} onChange={set('metal')} required className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-style" className="portal-label">Style (optional)</label>
                    <input id="v-style" value={form['style']} onChange={set('style')} placeholder="solitaire" className="portal-input" />
                  </div>
                  <div>
                    <label htmlFor="v-price2" className="portal-label">Price USD (blank = on request)</label>
                    <input id="v-price2" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className="portal-input" />
                  </div>
                  {kind === 'product' ? (
                    <div>
                      <label htmlFor="v-quantity" className="portal-label">Stock quantity</label>
                      <input id="v-quantity" type="number" min={0} max={1000} step={1} value={form['quantity']} onChange={set('quantity')} className="portal-input" />
                    </div>
                  ) : null}
                </div>
              )}

              <div>
                <label htmlFor="v-desc" className="portal-label">Description (optional)</label>
                <textarea id="v-desc" value={form['description']} onChange={set('description')} rows={3} className="portal-textarea" placeholder="Describe the stone or piece…" />
              </div>

              {error ? <p className="portal-notice">{error}</p> : null}

              <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
              <p className="portal-card__sub" style={{ lineHeight: 1.6 }}>
                Your reference is yours alone — the house mints its own code when approved. Photos can be added from Live Inventory after approval.
              </p>
            </form>
          </div>
        ) : null}

        {tab === 'settings' ? (
          <div className="portal-section" style={{ maxWidth: 560 }}>
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Account</p>
                <h1 className="portal-page-title">Settings</h1>
                <p className="portal-page-sub">Credentials and programmatic access.</p>
              </div>
            </div>

            <form onSubmit={changePassword} className="portal-card portal-card--pad space-y-3">
              <p className="portal-label">Change password</p>
              <input type="password" required value={settingsForm.current_password} onChange={(event) => setSettingsForm((current) => ({ ...current, current_password: event.target.value }))} placeholder="Current password" autoComplete="current-password" className="portal-input" />
              <input type="password" required minLength={8} value={settingsForm.new_password} onChange={(event) => setSettingsForm((current) => ({ ...current, new_password: event.target.value }))} placeholder="New password (8+ characters)" autoComplete="new-password" className="portal-input" />
              {error ? <p className="portal-notice">{error}</p> : null}
              {notice ? <p className="portal-notice portal-notice--good">{notice}</p> : null}
              <button type="submit" disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Update password</button>
            </form>

            <div className="portal-card portal-card--pad space-y-3">
              <p className="portal-label">API key</p>
              <p className="portal-card__sub">For programmatic access. Your dashboard uses this session instead. Rotating invalidates the previous key immediately.</p>
              <button type="button" onClick={() => void rotateApiKey()} className="portal-btn portal-btn--ghost portal-btn--sm">Rotate API key</button>
              {issuedApiKey ? (
                <div className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--p-accent)', background: 'var(--p-accent-soft)' }}>
                  <p className="portal-label" style={{ marginBottom: 0 }}>New key — shown once</p>
                  <code className="block break-all font-mono text-[10.5px]" style={{ color: 'var(--p-text)' }}>{issuedApiKey}</code>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(issuedApiKey)} className="portal-btn portal-btn--ghost portal-btn--sm">Copy key</button>
                </div>
              ) : null}
            </div>

            <div className="portal-card portal-card--pad space-y-2">
              <p className="portal-label">Settlement & payouts</p>
              <p className="portal-card__sub">Payouts are arranged by the house. Online settlement is not configured in this environment.</p>
              <span className="portal-badge portal-badge--pending">Not configured</span>
            </div>

            <div className="portal-card portal-card--pad space-y-2">
              <p className="portal-label">Account</p>
              <p style={{ margin: 0, fontSize: 'var(--p-fs-md)', color: 'var(--p-text)' }}>{email || '—'}</p>
              <p className="portal-mono" style={{ margin: 0 }}>{vendorCode || '—'}</p>
            </div>
          </div>
        ) : null}
      </main>

      {paletteOpen ? (
        <div className="portal-palette-backdrop" role="presentation" onClick={() => setPaletteOpen(false)}>
          <div className="portal-palette" role="dialog" aria-modal="true" aria-label="Search the atelier" onClick={(event) => event.stopPropagation()}>
            <div className="portal-palette__search">
              <Search />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Search inventory, submissions, pages…"
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
