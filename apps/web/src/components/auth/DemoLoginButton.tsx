'use client';

/**
 * The demo-account affordance.
 *
 * This component is only mounted by a server surface that has already read
 * `DEMO_LOGIN_ENABLED`. It holds no email, password or seeded identity: it
 * asks the gated route for a session and follows the redirect the server
 * returns. When the flag is off, the route 404s and this component is not
 * rendered at all.
 */
import { useState } from 'react';

export type DemoLoginSurface = 'admin' | 'vendor' | 'customer';

interface DemoLoginButtonProps {
  readonly surface: DemoLoginSurface;
  readonly redirectTo: string;
  readonly quiet?: boolean;
}

export function DemoLoginButton({
  surface,
  redirectTo,
  quiet = false,
}: DemoLoginButtonProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ surface }),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        setError(
          response.status === 404
            ? 'Demo access is not enabled.'
            : 'The demo account could not be opened.',
        );
        return;
      }
      const body = (await response.json()) as { redirectTo?: string };
      window.location.assign(body.redirectTo ?? redirectTo);
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={quiet ? 'mh-demo mh-demo--quiet' : 'mh-demo'}>
      <button
        type="button"
        className="mh-demo__button"
        onClick={signIn}
        disabled={busy}
        data-demo-surface={surface}
      >
        {busy ? 'Opening the demo…' : 'View demo account'}
      </button>
      {!quiet || error !== null ? (
        <p className="mh-demo__note" role={error === null ? undefined : 'alert'}>
          {error ??
            'Opens the seeded demo identity for this surface. No password is required.'}
        </p>
      ) : null}
    </div>
  );
}
