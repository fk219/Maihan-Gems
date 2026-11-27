import Link from 'next/link';
import type { SettingItem } from '@/lib/mgh/fixtures';
import { formatUsd } from '../format';
import type { HomePiece } from '../PiecesSection';

/**
 * The atelier is the page's photographic spread: two records' own images at
 * plate scale — the largest plates on the page — each captioned with that
 * record's name, weight, form and price. The ledger under the plates carries
 * the rest of the register.
 *
 * Only images that belong to the named record are captioned with its name.
 * A record with no image stays in the ledger and is not given a borrowed
 * photograph.
 */
export function AtelierSection({
  pieces,
  settings,
}: {
  pieces: readonly HomePiece[];
  settings: readonly SettingItem[];
}) {
  const plates = pieces.filter((piece) => piece.image !== null).slice(0, 2);
  const mountings = settings.slice(0, 3);

  return (
    <section className="v9-atelier" aria-labelledby="v9-atelier-title" data-reveal>
      <div className="v9-wrap v9-atelier__head">
        <div>
          <p className="v9-eyebrow">Jewellery &amp; mountings</p>
          <h2 id="v9-atelier-title" className="v9-display v9-atelier__title">
            The finished piece, and the bench that holds it.
          </h2>
        </div>
        <p className="v9-promise">
          Buy a finished jewel, or choose a mounting made for the stone you have already
          selected. Metal, weight and price are read from the record.
        </p>
      </div>

      {plates.length > 0 ? (
        <div className="v9-atelier__plates">
          {plates.map((piece) => (
            <figure key={piece.href} className="v9-atelier__plate">
              <div className="v9-atelier__image">
                <img
                  src={piece.image ?? ''}
                  alt={`${piece.name}, photographed for the record`}
                  width={900}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption className="v9-atelier__caption">
                <span className="v9-atelier__name">{piece.name}</span>
                <span className="v9-atelier__meta">
                  {piece.spec} · {piece.price}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <div className="v9-wrap v9-atelier__ledger">
        {pieces.length > 0 ? (
          <div className="v9-atelier__register">
            <p className="v9-atelier__kicker">Ready-made</p>
            <ul className="v9-atelier__list">
              {pieces.map((piece) => (
                <li key={piece.href}>
                  <Link href={piece.href} className="v9-atelier__row">
                    <span className="v9-atelier__row-name">{piece.name}</span>
                    <span className="v9-atelier__row-spec">{piece.spec}</span>
                    <span className="v9-atelier__row-price">{piece.price}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {mountings.length > 0 ? (
          <div className="v9-atelier__register">
            <p className="v9-atelier__kicker">Mountings</p>
            <ul className="v9-atelier__list">
              {mountings.map((setting) => (
                <li key={setting.sku}>
                  <Link href={`/settings/${setting.sku}`} className="v9-atelier__row">
                    <span className="v9-atelier__row-name">{setting.name}</span>
                    <span className="v9-atelier__row-spec">
                      {setting.style || 'Mounting'}
                      {setting.metals.length > 0
                        ? ` · ${setting.metals.length} metal ${setting.metals.length === 1 ? 'option' : 'options'}`
                        : ''}
                    </span>
                    <span className="v9-atelier__row-price">{formatUsd(setting.basePrice)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="v9-atelier__close">
          <Link href="/jewellery" className="v9-action">
            Enter the jewellery rooms
            <span aria-hidden="true" className="v9-action__arrow">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
