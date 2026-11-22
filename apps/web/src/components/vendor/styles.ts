/**
 * apps/web/src/components/vendor/styles.ts
 *
 * Shared presentation values for the vendor portal. Data only: no component,
 * no client directive, so a server component and a client form can both import
 * it without pulling either boundary across.
 *
 * The palette is the atelier one (ink / brass / paper) used by the admin
 * console, deliberately distinct from the storefront's light-through-stone
 * treatment. The portal is an operator surface, not a shop window.
 */
import type { CSSProperties } from 'react';

export const VENDOR_INK = '#08121E';
export const VENDOR_PAPER = '#F6F4EF';
export const VENDOR_BRASS = '#C9A84C';
export const VENDOR_MUTED = '#5A5448';
export const VENDOR_DANGER = '#B3261E';

export const pageTitle: CSSProperties = {
  margin: '0 0 6px',
  fontFamily: 'Cormorant Garamond, Georgia, serif',
  fontSize: '30px',
  fontWeight: 500,
  color: VENDOR_INK,
};

export const pageLead: CSSProperties = {
  margin: '0 0 24px',
  fontSize: '13px',
  lineHeight: 1.6,
  color: VENDOR_MUTED,
  maxWidth: '62ch',
};

export const card: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(201,168,76,0.32)',
  borderRadius: '12px',
  padding: '20px 22px',
};

export const grid: CSSProperties = {
  display: 'grid',
  gap: '14px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  marginBottom: '28px',
};

export const metricLabel: CSSProperties = {
  margin: 0,
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: VENDOR_MUTED,
};

export const metricValue: CSSProperties = {
  margin: '8px 0 0',
  fontFamily: 'Cormorant Garamond, Georgia, serif',
  fontSize: '26px',
  color: VENDOR_INK,
};

export const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#FFFFFF',
  fontSize: '13px',
};

export const tableHead: CSSProperties = {
  textAlign: 'left',
  background: '#EDEAE3',
};

export const cell: CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
  borderTop: '1px solid rgba(8,18,30,0.08)',
};

export const alert: CSSProperties = {
  margin: '0 0 18px',
  padding: '12px 14px',
  border: `1px solid ${VENDOR_DANGER}`,
  borderRadius: '8px',
  background: '#FDF3F2',
  color: VENDOR_DANGER,
  fontSize: '13px',
};

export const notice: CSSProperties = {
  margin: '0 0 18px',
  padding: '12px 14px',
  border: '1px solid rgba(201,168,76,0.55)',
  borderRadius: '8px',
  background: '#FBF7EA',
  color: VENDOR_INK,
  fontSize: '13px',
};

export const badge = (state: string): CSSProperties => ({
  display: 'inline-block',
  border: '1px solid rgba(8,18,30,0.25)',
  borderRadius: '999px',
  padding: '2px 10px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: state === 'APPROVED' ? '#1E5B3A' : VENDOR_INK,
  background: state === 'APPROVED' ? '#EAF4EE' : 'transparent',
});

export const link: CSSProperties = {
  color: VENDOR_INK,
  textDecoration: 'underline',
  textDecorationColor: 'rgba(201,168,76,0.8)',
  textUnderlineOffset: '3px',
};

export const field: CSSProperties = {
  display: 'grid',
  gap: '6px',
};

export const fieldLabel: CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: VENDOR_MUTED,
};

export const input: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(201,168,76,0.45)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  color: VENDOR_INK,
  fontFamily: 'inherit',
};

export const primaryButton: CSSProperties = {
  background: VENDOR_BRASS,
  color: VENDOR_INK,
  border: 'none',
  borderRadius: '8px',
  padding: '11px 18px',
  fontSize: '12px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
