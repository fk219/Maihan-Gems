import React from 'react';

export function EvidenceValue({
  value,
  mono = false,
}: {
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return (
      <span
        data-testid="not-evidenced"
        className="italic text-[#78756F] font-normal"
        title="This attribute is not evidenced in the accompanying laboratory or parcel dossier."
      >
        Not evidenced
      </span>
    );
  }
  return (
    <span className={mono ? 'font-[family-name:var(--font-mono)] tabular-nums' : ''}>
      {value}
    </span>
  );
}
