import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SettingItem } from '@/lib/mgh/fixtures';
import { formatUsd } from './format';
import type { HomePiece } from './PiecesSection';

/**
 * The jewellery room is the page's dark register: a two-register ledger of
 * records on the left, one tall plate of the piece itself on the right. The
 * plate is the record's own image, and the caption names that record, so the
 * photograph and the ledger describe the same object.
 *
 * Ready-made pieces keep the price the record carries; mountings show the base
 * price of the design and the metal is chosen in the studio. No product, price
 * or metal is invented.
 */
export function JewellerySection({
  pieces,
  settings,
  figure,
}: {
  pieces: readonly HomePiece[];
  settings: readonly SettingItem[];
  figure: HomePiece | null;
}) {
  const mountings = settings.slice(0, 3);

  return (
    <section className="mh6-jewellery" aria-labelledby="mh6-jewellery-title" data-reveal>
      <div className="mh6-home__wrap">
        <div className="mh6-jewellery__grid">
          <div className="mh6-jewellery__head">
            <p className="mh6-eyebrow mh6-eyebrow--dark">Jewellery</p>
            <h2 id="mh6-jewellery-title" className="mh6-section-title mh6-jewellery__title">
              The finished piece, and the bench that holds it.
            </h2>
            <p className="mh6-jewellery__note">
              Ready-made jewels on one register; mountings made for a stone you choose on the
              other. Weight, metal and price are read from the record.
            </p>
          </div>

          {figure !== null ? (
            <figure className="mh6-jewellery__figure">
              <div className="mh6-jewellery__plate">
                {figure.image !== null ? (
                  <img
                    src={figure.image}
                    alt={`${figure.name}, photographed on a dark ground`}
                    width={900}
                    height={1200}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <figcaption className="mh6-jewellery__caption">
                <span className="mh6-jewellery__caption-name">{figure.name}</span>
                <span className="mh6-jewellery__caption-meta">
                  {figure.spec} · {figure.price}
                </span>
              </figcaption>
            </figure>
          ) : null}

          <div className="mh6-jewellery__ledger">
            {pieces.length > 0 ? (
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
            ) : null}

            {mountings.length > 0 ? (
              <div className="mh6-jewellery__register">
                <p className="mh6-jewellery__kicker">Mountings</p>
                <ul className="mh6-jewellery__list">
                  {mountings.map((setting) => (
                    <li key={setting.sku}>
                      <Link href={`/settings/${setting.sku}`} className="mh6-jewellery__row">
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
            ) : null}

            <Link href="/jewellery" className="mh6-button mh6-button--dark mh6-jewellery__action">
              Enter the jewellery rooms
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
