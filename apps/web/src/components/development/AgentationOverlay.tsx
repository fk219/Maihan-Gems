'use client';

import { useEffect, useState } from 'react';

type AgentationComponent = typeof import('agentation').Agentation;

export function AgentationOverlay() {
  const [Agentation, setAgentation] = useState<AgentationComponent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (process.env['NEXT_PUBLIC_AGENTATION'] !== '1') return;

    import('agentation').then((module) => setAgentation(() => module.Agentation));
  }, []);

  if (process.env.NODE_ENV !== 'development' || process.env['NEXT_PUBLIC_AGENTATION'] !== '1' || Agentation === null) {
    return null;
  }

  return <Agentation appName="Maihan Gems" />;
}
