import Link from 'next/link';

import { Button } from '../ui/button.js';

export function OperatorChart({ rows }: { rows: readonly { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const width = 420;
  const height = rows.length * 32;
  return (
    <figure className="operator-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Counts read from the live database">
        {rows.map((row, index) => {
          const bar = row.value === 0 ? 0 : Math.max(4, (row.value / max) * 180);
          return (
            <g key={row.label} transform={`translate(0 ${index * 32})`}>
              <text x="0" y="20" fill="#5c5344" fontSize="12">
                {row.label}
              </text>
              <rect x="190" y="10" width={bar} height="8" fill="#16110c" />
              <text x={width} y="20" textAnchor="end" fill="#16110c" fontSize="12">
                {row.value}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function OperatorEmpty({
  title,
  copy,
  href,
  action,
}: {
  title: string;
  copy: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="operator-empty">
      <p>{title}</p>
      <span>{copy}</span>
      {href && action ? (
        <Button asChild>
          <Link href={href}>{action}</Link>
        </Button>
      ) : null}
    </div>
  );
}
