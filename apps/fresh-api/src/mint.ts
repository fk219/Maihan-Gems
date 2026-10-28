import type { AnyClient } from './db.js';

// Semantic code minting over fresh.code_counters (technical_design/42 §6).
// Allocation is atomic: the counter row is locked by its UPDATE, so two
// concurrent callers can never receive the same number. Absent scopes are
// created with the caller-provided initial next value (1 unless the scope
// continues an existing series, e.g. design codes seeded from max+1).

export interface MintOptions {
  initialNext?: number; // used only when the scope row does not exist yet
}

export async function mintNumber(client: AnyClient, scopeKey: string, opts: MintOptions = {}): Promise<number> {
  const locked = await client.query(
    `UPDATE fresh.code_counters SET next_no = next_no + 1 WHERE scope_key = $1 RETURNING next_no`,
    [scopeKey],
  );
  if (locked.rowCount && locked.rowCount > 0) return Number(locked.rows[0]!.next_no) - 1;

  const initial = opts.initialNext ?? 1;
  // Absent scope: seed the counter at initial+1 and allocate `initial`.
  // (xmax = 0) identifies a fresh INSERT vs the conflict-path UPDATE.
  const created = await client.query(
    `INSERT INTO fresh.code_counters (scope_key, next_no) VALUES ($1, $2)
     ON CONFLICT (scope_key) DO UPDATE SET next_no = fresh.code_counters.next_no + 1
     RETURNING next_no, (xmax = 0) AS inserted`,
    [scopeKey, initial + 1],
  );
  const row = created.rows[0]!;
  return row.inserted ? initial : Number(row.next_no) - 1;
}

export const pad = (n: number, width: number): string => String(n).padStart(width, '0');

// vendor code V-{CC}-{NNN}
export async function mintVendorCode(client: AnyClient, country: string): Promise<string> {
  const cc = country.toUpperCase();
  const n = await mintNumber(client, `V|${cc}`);
  return `V-${cc}-${pad(n, 3)}`;
}

// gemstone/pair codes: G-{FAM}-{VAR}-{CCVV}-{seq} (doc 42 §2)
export async function mintGemstoneCode(
  client: AnyClient,
  kind: 'SINGLE' | 'PAIR',
  familyCode: string,
  varietyCode: string,
  vendorSegment: string,
): Promise<string> {
  const prefix = kind === 'SINGLE' ? 'G' : 'P';
  const scopeKey = `${prefix}|${familyCode}|${varietyCode}|${vendorSegment}`;
  const n = await mintNumber(client, scopeKey);
  return `${prefix}-${familyCode}-${varietyCode}-${vendorSegment}-${pad(n, 5)}`;
}

// jewellery codes: J-{JT}-C/M-{MET}-{CCVV}-{seq}
export async function mintProductCode(
  client: AnyClient,
  jtLetter: string,
  kind: 'C' | 'M',
  metalCode: string,
  vendorSegment: string,
): Promise<string> {
  const scopeKey = `J|${jtLetter}|${kind}|${metalCode}|${vendorSegment}`;
  const n = await mintNumber(client, scopeKey);
  return `J-${jtLetter}-${kind}-${metalCode}-${vendorSegment}-${pad(n, 5)}`;
}

// design codes continue the legacy numeric series; counter 'DESIGN' seeded from max+1
export async function mintDesignCode(client: AnyClient): Promise<string> {
  const max = await client.query(
    `SELECT COALESCE(max(substring(design_code from '[0-9]+')::int), 0) AS m FROM fresh.settings`,
  );
  const next = Number(max.rows[0]!.m) + 1;
  const n = await mintNumber(client, 'DESIGN', { initialNext: next });
  return `JS${n}`;
}

// setting codes: S-{JT}-{DSGN}-{MET}-{CCVV} (unique by design+metal+vendor — no seq)
export function settingCode(jtLetter: string, designCode: string, metalCode: string, vendorSegment: string): string {
  return `S-${jtLetter}-${designCode}-${metalCode}-${vendorSegment}`;
}
