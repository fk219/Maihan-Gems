import Link from 'next/link';

/**
 * Four service facts with hairlines. Nothing here promises a term the house
 * has not decided: delivery and returns say they publish when settled, the
 * certificate says what the records actually do, and the viewing says how it
 * is arranged. All four link to a route that exists.
 */
const SERVICES = [
  {
    label: 'Delivery',
    line: 'Terms are published when they are settled.',
    href: '/policy/shipping-and-returns',
  },
  {
    label: 'Returns',
    line: 'No window is promised until one is decided.',
    href: '/policy/shipping-and-returns',
  },
  {
    label: 'Certificate',
    line: 'A report appears where the record holds one.',
    href: '/policy/treatment-disclosure',
  },
  {
    label: 'Private viewing',
    line: 'Arranged with the house, personally.',
    href: '/showrooms',
  },
] as const;

export function ServiceStrip() {
  return (
    <section
      className="mh12-band mh12-band--paper mh12-service"
      data-section="service"
      data-surface="paper"
      aria-label="Service"
    >
      <div className="mh12-wrap mh12-service__grid">
        {SERVICES.map((service) => (
          <Link key={service.label} href={service.href} className="mh12-service__item">
            <span className="mh12-label mh12-service__label">{service.label}</span>
            <span className="mh12-body mh12-service__line">
              <span className="mh12-service__draw">{service.line}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
