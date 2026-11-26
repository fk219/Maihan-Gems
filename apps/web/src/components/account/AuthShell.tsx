/**
 * apps/web/src/components/account/AuthShell.tsx
 *
 * The frame shared by sign-in, registration, email verification and the
 * signed-in account home.
 *
 * One dark plate carries the brand; one paper panel carries the task. The
 * split is the same idea as the header: ink for the house, paper for the
 * instrument. Server component; the forms inside remain the client islands.
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
    <main className="auth-shell">
      <div className="auth-shell__frame">
        <aside className="auth-shell__aside" aria-label="Maihan Gems">
          <p className="auth-shell__brand">Maihan Gems</p>
          <p className="auth-shell__aside-note">
            A private account keeps your enquiries, saved pieces and the stones you have been
            considering in one place. It does not reserve a stone.
          </p>
        </aside>

        <div className="auth-shell__panel">
          <p className="auth-shell__eyebrow">Client access</p>
          <h1 className="auth-shell__title">{title}</h1>
          <p className="auth-shell__subtitle">{subtitle}</p>
          {children}
          {footer === undefined ? null : <div className="auth-shell__footer">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

/** Shared input styling, exported so both forms are pixel-identical. */
export const AUTH_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
};

/** Shared button styling is owned by the `.auth-shell` stylesheet. */
export const AUTH_BUTTON_STYLE: React.CSSProperties = {};

/** Label styling: small, letterspaced, never the only cue (a real <label>). */
export const AUTH_LABEL_STYLE: React.CSSProperties = {};

/** Error region styling. Colour is never the only signal (role + text). */
export const AUTH_ERROR_STYLE: React.CSSProperties = {
  margin: 0,
  minHeight: '18px',
  color: '#9a3412',
  fontSize: '13px',
  lineHeight: 1.5,
};
