import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Four rooms, four plates, one band. Captions sit under the photograph rather
 * than on it, so nothing is read through a scrim. The row is staggered at
 * desktop widths and becomes a snap rail on a phone; no two cards are alike
 * in height by accident.
 */
const ROOMS = [
  {
    title: 'Rings',
    copy: 'Solitaires, signets and trilogy mountings, set by hand.',
    image: '/mgh/images/elysian-ring.jpg',
    width: 900,
    height: 1200,
    alt: 'A large emerald-cut diamond set in a yellow-gold solitaire ring',
    href: '/jewellery#rings',
  },
  {
    title: 'Necklaces',
    copy: 'Pendant mountings and drops, from one stone to a line.',
    image: '/mgh/images/verdant-drop.jpg',
    width: 900,
    height: 1200,
    alt: 'An emerald pendant in a diamond halo on a gold chain',
    href: '/jewellery#necklaces',
  },
  {
    title: 'Earrings',
    copy: 'Studs and matched pairs, calibrated for symmetry.',
    image: '/mgh/images/gems/earrings-pair.jpg',
    width: 1200,
    height: 1562,
    alt: 'A pair of blue gemstone drop earrings on gold hooks',
    href: '/pairs',
  },
  {
    title: 'Settings',
    copy: 'The mounting catalogue, made for a stone you choose.',
    image: '/mgh/images/gems/setting-ring.jpg',
    width: 1200,
    height: 800,
    alt: 'A diamond ring in a rose-gold halo setting on a dark surface',
    href: '/settings',
  },
];

export function RoomsSection() {
  return (
    <section className="mh6-rooms" aria-labelledby="mh6-rooms-title" data-reveal>
      <div className="mh6-home__wrap">
        <div className="mh6-rooms__head">
          <div>
            <h2 id="mh6-rooms-title" className="mh6-section-title">
              Four ways in.
            </h2>
            <p className="mh6-rooms__note">
              If you know the form, start here. If you do not, begin with the stone.
            </p>
          </div>
          <Link href="/jewellery" className="mh6-link">
            The jewellery rooms
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <ul className="mh6-rooms__grid">
          {ROOMS.map((room) => (
            <li key={room.title} className="mh6-room">
              <Link href={room.href} className="mh6-room__link">
                <span className="mh6-room__plate">
                  <img
                    src={room.image}
                    alt={room.alt}
                    width={room.width}
                    height={room.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <div className="mh6-room__body">
                  <h3 className="mh6-room__title">{room.title}</h3>
                  <p className="mh6-room__copy">{room.copy}</p>
                  <span className="mh6-room__more">
                    Enter
                    <ArrowRight aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
