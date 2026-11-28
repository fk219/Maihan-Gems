import Link from 'next/link';

/**
 * Screen two is three kinds of object, not a promise: loose stones, matched
 * pairs, settings. Tiles are 4:5 with the label under, as Cartier and Pandora
 * both do when the commerce first appears. The photography is illustrative
 * while the catalogue carries no media, and the rail says so.
 */
const CATEGORIES = [
  {
    name: 'Loose stones',
    hint: 'The catalogue',
    href: '/gemstones',
    image: '/media/stock/tanzanite.jpg',
    alt: 'A faceted violet-blue tanzanite on a dark ground',
  },
  {
    name: 'Matched pairs',
    hint: 'Cut as two',
    href: '/pairs',
    image: '/mgh/images/gems/earrings-pair.jpg',
    alt: 'Two matched gemstones photographed together',
  },
  {
    name: 'Settings',
    hint: 'The mounting',
    href: '/settings',
    image: '/mgh/images/gems/setting-ring.jpg',
    alt: 'A ring setting photographed on a pale ground',
  },
] as const;

export function CategoryRail() {
  return (
    <nav
      className="mh12-band mh12-band--paper mh12-cats"
      data-section="categories"
      data-surface="paper"
      aria-label="Browse the catalogue by kind"
    >
      <div className="mh12-wrap">
        <ul className="mh12-cats__grid" role="list">
          {CATEGORIES.map((category) => (
            <li key={category.href}>
              <Link href={category.href} className="mh12-cat">
                <span className="mh12-cat__frame">
                  <img
                    src={category.image}
                    alt={category.alt}
                    width={900}
                    height={1125}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="mh12-cat__body">
                  <span className="mh12-cardname mh12-cat__name">
                    <span className="mh12-cat__draw">{category.name}</span>
                  </span>
                  <span className="mh12-label mh12-cat__hint">{category.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mh12-price mh12-cats__note">
          Category photography is illustrative; each tile opens its catalogue.
        </p>
      </div>
    </nav>
  );
}
