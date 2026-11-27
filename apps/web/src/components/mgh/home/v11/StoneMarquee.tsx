import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { formatCarat } from '../format';

/**
 * The marquee is typographic only: stone name, carat, origin, read from the
 * records. Nothing is invented to fill a gap — a stone with no recorded
 * origin says so. The band is gold on obsidian, one slow loop, paused on
 * hover and on focus; under reduced motion it does not move.
 *
 * The track is two identical halves, and the animation slides exactly one
 * half, so the loop is seamless. The second half is hidden from assistive
 * technology; the first is real text.
 */
export function StoneMarquee({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  const items = records.slice(0, 12).map((record) => ({
    id: record.id,
    name: record.variety || record.name,
    carat: formatCarat(record.carat),
    origin: record.origin.trim() || 'Origin not recorded',
  }));

  /** Each half carries the list enough times to cover an ultrawide viewport. */
  const half = [...items, ...items, ...items];

  return (
    <section
      className="v11-marquee"
      role="region"
      aria-label="Stones currently published in the collection"
      tabIndex={0}
    >
      <div className="v11-marquee__track">
        <ul className="v11-marquee__list">
          {half.map((item, index) => (
            <li key={`${item.id}-${index}`} className="v11-marquee__item">
              <span className="v11-marquee__name">{item.name}</span>
              <span className="v11-marquee__meta">
                {item.carat} · {item.origin}
              </span>
            </li>
          ))}
        </ul>
        <ul className="v11-marquee__list" aria-hidden="true">
          {half.map((item, index) => (
            <li key={`${item.id}-b-${index}`} className="v11-marquee__item">
              <span className="v11-marquee__name">{item.name}</span>
              <span className="v11-marquee__meta">
                {item.carat} · {item.origin}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
