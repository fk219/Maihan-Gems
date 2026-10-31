export interface CompareSetting {
  ref: string;
  name: string;
  jewelleryType: string;
  metal: string;
  style: string | null;
  minCt: number | null;
  maxCt: number | null;
  compatibleShapes: string[];
  price: number;
  currency: string;
}

interface FreshSettingRow {
  ref: string;
  name: string;
  jewellery_type: string;
  metal: string;
  style: string | null;
  min_ct: string | number | null;
  max_ct: string | number | null;
  compatible_shapes: string[] | null;
  price_amount: string | number | null;
  currency: string;
}

const numOrNull = (v: string | number | null): number | null => (v == null ? null : Number(v));

export async function fetchCompareSettings(refs: string[]): Promise<CompareSetting[]> {
  const unique = [...new Set(refs)].filter(Boolean).slice(0, 100);
  if (!unique.length) return [];
  const res = await fetch(`/api/fresh/catalogue/settings?refs=${encodeURIComponent(unique.join(','))}&limit=100`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { items?: FreshSettingRow[] };
  const order = new Map(unique.map((ref, i) => [ref, i]));
  return (data.items ?? [])
    .map((row) => ({
      ref: row.ref,
      name: row.name,
      jewelleryType: row.jewellery_type,
      metal: row.metal,
      style: row.style,
      minCt: numOrNull(row.min_ct),
      maxCt: numOrNull(row.max_ct),
      compatibleShapes: row.compatible_shapes ?? [],
      price: numOrNull(row.price_amount) ?? 0,
      currency: row.currency || 'USD',
    }))
    .sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0));
}
