import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SettingItem } from '@/lib/mgh/fixtures';
import { formatUsd } from './format';
import type { HomePiece } from './PiecesSection';

/**
 * The jewellery room is one composition, not a third card grid: a tall plate
 * on the left, a two-register ledger on the right. Ready-made pieces keep the
 * price the record carries; mountings show the base price of the design and
 * the metal is chosen in the studio. No product, price or metal is invented.
 */
export function JewellerySection({
  pieces,
  settings,
}: {
  pieces: readonly HomePiece[];
  settings: readonly SettingItem[];
}) {
  const mountings = settings.slice(0, 3);
  const feature = pieces[0] ?? null;

  return (
    <section className="mh6-jewellery" aria-labelledby="mh6-jewellery-title" data-reveal>
      <div className="mh6-home__wrap">
        <div className="mh6-jewellery__head">
          <div>
            <h2 id="mh6-jewellery-title" className="mh6-section-title">
              The finished piece, and the bench that holds it.
            </h2>
            <p className="mh6-jewellery__note">
              Ready-made jewels on one register; mountings made for a stone you choose on the
              other. The weight, metal and price are read from the record.
            </p>
          </div>
          <Link href="/jewellery" className="mh6-link">
            The jewellery rooms
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <div className="mh6-jewellery__stage">
          <figure className="mh6-jewellery__figure">
            <div className="mh6-jewellery__plate">
              <img
                src="/mgh/images/elysian-ring.jpg"
                alt="An emerald-cut diamond set in a yellow-gold solitaire ring"
                width={900}
                height={1200}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption className="mh6-jewellery__caption">
              {feature ? (
                <>
                  <span className="mh6-jewellery__caption-name">{feature.name}</span>
                  <span className="mh6-jewellery__caption-meta">
                    {feature.spec} · {feature.price}
                  </span>
                </>
              ) : (
                'The atelier, photographed on the bench.'
              )}
            </figcaption>
          </figure>

          <div className="mh6-jewellery__ledger">
            <div className="mh6-jewellery__register">
              <p className="mh6-jewellery__kicker">Ready-made</p>
              <ul className="mh6-jewellery__list">
                {pieces.map((piece) => (
                  <li key={piece.href}>
                    <Link href={piece.href} className="mh6-jewellery__row">
                      <span className="mh6-jewellery__row-main">
                        <span className="mh6-jewellery__row-name">{piece.name}</span>
                        <span className="mh6-jewellery__row-spec">{piece.spec}</span>
                      </span>
                      <span className="mh6-jewellery__row-price">{piece.price}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mh6-jewellery__register">
              <p className="mh6-jewellery__kicker">Mountings</p>
              <ul className="mh6-jewellery__list">
                {mountings.map((setting) => (
                  <li key={setting.sku}>
                    <Link
                      href={`/settings/${setting.sku}`}
                      className="mh6-jewellery__row"
                    >
                      <span className="mh6-jewellery__row-main">
                        <span className="mh6-jewellery__row-name">{setting.name}</span>
                        <span className="mh6-jewellery__row-spec">
                          {setting.style || 'Mounting'}
                          {setting.metals.length > 0
                            ? ` · ${setting.metals.length} metal ${setting.metals.length === 1 ? 'option' : 'options'}`
                            : ''}
                        </span>
                      </span>
                      <span className="mh6-jewellery__row-price">
                        {formatUsd(setting.basePrice)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/settings" className="mh6-button mh6-jewellery__action">
              Open the mounting catalogue
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
