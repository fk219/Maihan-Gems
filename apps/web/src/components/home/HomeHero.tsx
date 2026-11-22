/**
 * apps/web/src/components/home/HomeHero.tsx
 *
 * The storefront hero — DESIGN_DIRECTION.md §4.1, "Hero: refracted scroll".
 *
 * One stone, one raking key light, one signature motion. The light composition
 * is built from layered CSS gradients (see lib/home-hero-styles.ts); there is
 * no photograph, no canvas, no shader and no client component. Everything here
 * is server-rendered text plus decorative divs, so the hero adds ZERO bytes to
 * the initial JS budget and cannot block LCP on an image.
 *
 * Editorial honesty: this is a generic composition of light through a step-cut
 * stone. It names no product, carat, price, certificate or treatment. The
 * caption describes the lighting, not an inventory record.
 *
 * Typography: Cormorant Garamond, oversized, revealed word by word through a
 * clip mask — never letter by letter — staggered by the shared
 * `--motion-stagger` token (48 ms). Reduced motion is honoured by the global
 * token switch in lib/light-tokens.ts: the reveal resolves in 1 ms with zero
 * travel and the Pass primitive is removed. No media query lives here.
 *
 * The light tokens are injected from this section because the root layout
 * (outside this task's scope) does not yet ship LIGHT_TOKENS_CSS. React 19
 * hoists the href+precedence style into <head> and de-duplicates it, so the
 * document stays valid and navigation cannot inject it twice.
 */
import Link from 'next/link';

import { LIGHT_TOKENS_CSS } from '../../lib/light-tokens.js';
import { HOME_HERO_CSS } from '../../lib/home-hero-styles.js';

/** Cast shadow, escaping caustic, and six surfaces inside the cut. All
 *  decorative: the figure carries its meaning through the visible caption. */
function HeroStone() {
  return (
    <div className="mh-stone" aria-hidden="true">
      <div className="mh-stone__shadow" />
      <div className="mh-stone__caustic" />
      <div className="mh-stone__shape">
        <div className="mh-stone__key" />
        <div className="mh-stone__spectrum" />
        <div className="mh-stone__facets" />
        <div className="mh-stone__vignette" />
        <div className="mh-stone__specular" />
        <div className="mh-stone__exit" />
        {/* The shared Pass primitive: the only signature motion in the hero. */}
        <span className="mh-light-pass" />
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="mh-hero" aria-labelledby="mh-hero-title">
      {/* React 19 hoists href+precedence styles into <head> and de-duplicates
          them: valid document structure, no duplicate injection on navigation. */}
      <style
        href="mh-home-hero"
        precedence="default"
        dangerouslySetInnerHTML={{ __html: LIGHT_TOKENS_CSS + HOME_HERO_CSS }}
      />

      <div className="mh-hero__stage">
        <div className="mh-hero__glow" aria-hidden="true" />

        <div className="mh-hero__inner">
          <div className="mh-hero__copy">
            <p className="mh-hero__eyebrow">Natural gemstones · Atelier settings</p>

            <h1 className="mh-hero__title" id="mh-hero-title">
              <span className="mh-hero__line">
                <span className="mh-word" data-word="0">
                  Light
                </span>
              </span>{' '}
              <span className="mh-hero__line">
                <span className="mh-word" data-word="1">
                  <em>through</em>
                </span>{' '}
                <span className="mh-word" data-word="2">
                  stone.
                </span>
              </span>
            </h1>

            <p className="mh-hero__lead">
              Natural gemstones and master goldsmith settings, chosen one stone at a time — and disclosed
              exactly as they are.
            </p>

            <div className="mh-hero__actions">
              <Link className="mh-hero__cta" href="/search">
                Enter the collection
                <span aria-hidden="true">→</span>
              </Link>
              <Link className="mh-hero__link" href="/design-your-own">
                Design your own
              </Link>
            </div>
          </div>

          <figure className="mh-hero__figure">
            <HeroStone />
            <figcaption className="mh-hero__caption">
              Light entering the crown, refracted and returned
            </figcaption>
          </figure>
        </div>

        <div className="mh-hero__foot">
          <p className="mh-hero__footline">Natural · Fully disclosed · Hand-set in the atelier</p>
          <p className="mh-hero__scroll" aria-hidden="true">
            Scroll
          </p>
        </div>
      </div>
    </section>
  );
}
