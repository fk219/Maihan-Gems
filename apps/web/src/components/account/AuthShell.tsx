/**
 * apps/web/src/components/account/AuthShell.tsx
 *
 * The visual frame shared by `/account/login` and `/account/register`.
 *
 * Deliberately the same language as `admin/login`: ivory card, hairline gold
 * border, a small letterspaced eyebrow, a Cormorant heading and one gold
 * action. It differs in placement only — these pages live inside the
 * storefront group, so the card sits on the storefront background rather than
 * on a full-height navy field that would fight the header.
 *
 * Server component: no state, no hooks, no data access. The forms it wraps are
 * the client islands.
 */
import type { ReactNode } from 'react';

export interface AuthShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  /** Footer links (register from sign-in, sign-in from register). */
  readonly footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps): React.JSX.Element {
  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(40px, 7vw, 88px) 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FAFAF8',
          border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: '14px',
          padding: 'clamp(28px, 5vw, 40px)',
          boxShadow: '0 24px 60px -36px rgba(8,18,30,0.55)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#6B6455',
          }}
        >
          Maihan Gems
        </p>
        <h1
          style={{
            margin: '8px 0 6px',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '32px',
            lineHeight: 1.15,
            color: '#08121E',
          }}
        >
          {title}
        </h1>
        <p style={{ margin: '0 0 26px', fontSize: '13px', lineHeight: 1.6, color: '#5A5448' }}>
          {subtitle}
        </p>
        {children}
        {footer === undefined ? null : (
          <div
            style={{
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(201,168,76,0.22)',
              fontSize: '13px',
              color: '#5A5448',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}

/** Shared input styling, exported so both forms are pixel-identical. */
export const AUTH_INPUT_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(201,168,76,0.45)',
  borderRadius: '8px',
  padding: '11px 12px',
  fontSize: '14px',
  color: '#08121E',
  width: '100%',
};

/** Shared button styling. Height clears the 44px touch-target floor. */
export const AUTH_BUTTON_STYLE: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '8px',
  padding: '13px 18px',
  minHeight: '44px',
  fontSize: '13px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  width: '100%',
};

/** Label styling: small, letterspaced, never the only cue (a real <label>). */
export const AUTH_LABEL_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: '6px',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#3B362C',
};

/** Error region styling. Colour is never the only signal (role + text). */
export const AUTH_ERROR_STYLE: React.CSSProperties = {
  margin: 0,
  minHeight: '18px',
  color: '#B3261E',
  fontSize: '13px',
  lineHeight: 1.5,
};
