/**
 * apps/web/src/components/system/Toaster.tsx
 *
 * Sileo (ADR-031) — the single toast surface for the portal and the storefront.
 *
 * Cost discipline: Sileo + its `motion` runtime is a ~52 KB gzip chunk. It is
 * therefore not mounted eagerly. `<Toaster>` renders nothing until the first
 * notification is queued; that notification mounts it, which downloads the
 * chunk once and flushes the queue. A page that never shows a toast pays one
 * empty client component.
 *
 * Visual recipe (the design system's): 16px radius, navy-deep at 95%, gold at
 * 25% border, Manrope copy — see styles/maihan-system.css.
 *
 * Policy: success 4000ms, error 6000ms, duplicates by title+description are
 * suppressed while the first is on screen, and no more than three are live.
 */
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SileoToaster = dynamic(() => import('sileo').then((module) => module.Toaster), {
  ssr: false,
  loading: () => null,
});

export const TOAST_SUCCESS_MS = 4000;
export const TOAST_ERROR_MS = 6000;
export const TOAST_MAX = 3;

type SileoModule = typeof import('sileo');
type ToastKind = 'success' | 'error' | 'info' | 'warning';

let sileoPromise: Promise<SileoModule> | null = null;
const loadSileo = (): Promise<SileoModule> => {
  sileoPromise ??= import('sileo');
  return sileoPromise;
};

export interface NotifyOptions {
  readonly title: string;
  readonly description?: string;
  /** Overrides the policy duration; omit to use 4000ms success / 6000ms error. */
  readonly duration?: number;
  readonly type?: ToastKind;
  readonly action?: { title: string; onClick: () => void };
}

/** The first notification mounts the toaster; the queue is drained on mount. */
const listeners = new Set<() => void>();
let pending: NotifyOptions[] = [];
/** Live toasts, oldest first. Used only to enforce the three-toast ceiling. */
const live = new Map<string, { id: string; timer: number }>();

const toastKey = (type: ToastKind, title: string, description: string): string =>
  `${type}:${title}:${description}`;

const show = ({ sileo }: SileoModule, options: NotifyOptions): void => {
  const type = options.type ?? 'success';
  const description = options.description ?? '';
  const key = toastKey(type, options.title, description);
  if (live.has(key)) return;

  while (live.size >= TOAST_MAX) {
    const oldest = live.entries().next().value as [string, { id: string; timer: number }] | undefined;
    if (oldest === undefined) break;
    window.clearTimeout(oldest[1].timer);
    live.delete(oldest[0]);
    sileo.dismiss(oldest[1].id);
  }

  const duration = options.duration ?? (type === 'error' ? TOAST_ERROR_MS : TOAST_SUCCESS_MS);
  /* sileo's runtime keys its store on `id` (default "sileo-default"), so two
     toasts without one collapse into a single updating toast. The 0.1.6 types
     omit `id`; the runtime accepts it, and the three-toast ceiling needs it. */
  const payload = {
    id: key,
    title: options.title,
    description: description.length > 0 ? description : undefined,
    duration,
    ...(options.action !== undefined ? { button: options.action } : {}),
  } as Parameters<typeof sileo.success>[0] & { id: string };

  const id =
    type === 'error'
      ? sileo.error(payload)
      : type === 'info'
        ? sileo.info(payload)
        : type === 'warning'
          ? sileo.warning(payload)
          : sileo.success(payload);

  const timer = window.setTimeout(() => {
    live.delete(key);
  }, duration + 600);
  live.set(key, { id, timer });
};

const drain = (module: SileoModule): void => {
  const queue = pending;
  pending = [];
  for (const options of queue) show(module, options);
};

/**
 * Show one toast. Fire-and-forget: the call returns immediately, wakes the
 * toaster and never throws into the caller.
 */
export function notify(options: NotifyOptions): void {
  pending.push(options);
  if (listeners.size === 0) return;
  for (const listener of listeners) listener();
}

export function notifySuccess(title: string, description?: string): void {
  notify({ type: 'success', title, ...(description !== undefined ? { description } : {}) });
}

export function notifyError(title: string, description?: string): void {
  notify({ type: 'error', title, ...(description !== undefined ? { description } : {}) });
}

/**
 * Mount once per root: the portal root (admin + vendor) and the storefront root.
 * Two mounts on one page would double every toast, so each root owns exactly one.
 */
export function Toaster() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const wake = (): void => setArmed(true);
    listeners.add(wake);
    if (pending.length > 0) setArmed(true);
    return () => {
      listeners.delete(wake);
    };
  }, []);

  useEffect(() => {
    if (!armed || pending.length === 0) return;
    let cancelled = false;
    void loadSileo()
      .then((module) => {
        if (!cancelled) drain(module);
      })
      .catch(() => {
        pending = [];
      });
    return () => {
      cancelled = true;
    };
  }, [armed]);

  if (!armed) return null;

  return (
    <SileoToaster
      position="top-right"
      theme="dark"
      offset={{ top: 20, right: 20, bottom: 20, left: 20 }}
      options={{
        fill: 'var(--mi-toast-bg)',
        roundness: 16,
        duration: TOAST_SUCCESS_MS,
        autopilot: { expand: 6000, collapse: 4000 },
      }}
    />
  );
}
