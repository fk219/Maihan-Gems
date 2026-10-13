'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  getCompare,
  removeFromCompare,
  subscribeAtelier,
  type AtelierItem,
} from '../../lib/atelier-store.js';
import { itemImage } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultEmpty } from './VaultEmpty.js';

const ROWS: ReadonlyArray<{ key: keyof AtelierItem | 'price'; label: string }> = [
  { key: 'kind', label: 'Kind' },
  { key: 'stoneType', label: 'Stone' },
  { key: 'caratTotal', label: 'Carat' },
  { key: 'shape', label: 'Shape' },
  { key: 'colorHue', label: 'Colour' },
  { key: 'originCountry', label: 'Origin' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'jewelryType', label: 'Jewellery' },
  { key: 'metalColor', label: 'Metal' },
  { key: 'settingFor', label: 'Setting for' },
  { key: 'price', label: 'Price' },
];

function cell(item: AtelierItem, key: (typeof ROWS)[number]['key'], currency: 'USD' | 'AED' | 'THB', rates: Record<'USD' | 'AED' | 'THB', number>): string {
  if (key === 'price') return formatMoney(item.priceUsd, currency, rates);
  const value = item[key];
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'caratTotal') return `${value} ct`;
  return String(value).replace(/_/g, ' ');
}

export function CompareView({
  forceEmpty = false,
}: {
  demoItems: AtelierItem[];
  forceEmpty?: boolean;
}) {
  const { currency, rates } = useStorefront();
  const [items, setItems] = useState<AtelierItem[]>([]);

  useEffect(() => {
    if (forceEmpty) {
      setItems([]);
      return;
    }
    setItems(getCompare());
    return subscribeAtelier(() => setItems(getCompare()));
  }, [forceEmpty]);

  const columns = useMemo(() => items.slice(0, 4), [items]);

  if (columns.length === 0) {
    return (
      <VaultEmpty
        kicker="Gemmological analysis"
        title="No stones on the table."
        copy="Add up to four vault pieces from a card’s quick view. The dossier reads as a specification table."
        primaryHref="/browse"
        primaryLabel="Browse mineral varieties"
        secondaryHref="/search"
        secondaryLabel="Search the vault"
      />
    );
  }

  return (
    <div className="lx-compare">
      <div className="lx-compare__scroll">
        <table className="lx-spec">
          <thead>
            <tr>
              <th scope="col">Specification</th>
              {columns.map((item) => (
                <th key={item.id} scope="col">
                  <Link href={`/product/${item.slug}`} className="lx-spec__thumb">
                    <img src={itemImage(item)} alt="" />
                  </Link>
                  <Link href={`/product/${item.slug}`} className="lx-spec__name">{item.title}</Link>
                  <button type="button" className="lx-text-btn" onClick={() => removeFromCompare(item.id)}>
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {columns.map((item) => (
                  <td key={`${item.id}-${row.key}`}>{cell(item, row.key, currency, rates)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
