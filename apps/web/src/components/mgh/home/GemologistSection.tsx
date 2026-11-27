import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const QUESTIONS = [
  { label: 'Blue sapphires under $6,000', query: 'Blue sapphires under $6,000' },
  { label: 'Compare an unheated ruby with a spinel', query: 'Compare an unheated ruby with a spinel' },
  { label: 'Matched pairs in emerald', query: 'Matched pairs in emerald' },
];

/**
 * The gemologist band is the page's instrument: a full-bleed strip of one
 * stone across the top, then a wide statement and a three-cell desk of real
 * questions. The links carry their text into the concierge's own query
 * parameter; nothing is pre-answered and no transcript is staged to look like
 * a conversation. The answers are quoted from the catalogue, and a field the
 * record does not carry is refused, not guessed.
 */
export function GemologistSection() {
  return (
    <section className="mh6-gemologist" aria-labelledby="mh6-gemologist-title" data-reveal>
      <div className="mh6-gemologist__band" aria-hidden="true">
        <img
          src="/media/stone-sapphire.jpg"
          alt=""
          width={1152}
          height={864}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="mh6-home__wrap mh6-gemologist__inner">
        <div className="mh6-gemologist__head">
          <p className="mh6-eyebrow mh6-eyebrow--dark">The gemologist</p>
          <h2 id="mh6-gemologist-title" className="mh6-gemologist__title">
            A gemologist’s eye, on request.
          </h2>
          <p className="mh6-gemologist__copy">
            Read a budget, compare two stones in plain language, and hear why one costs more than
            another. Answers are quoted from the catalogue, never written over it.
          </p>
        </div>

        <ul className="mh6-gemologist__questions">
          {QUESTIONS.map((question) => (
            <li key={question.query}>
              <Link
                href={`/concierge?q=${encodeURIComponent(question.query)}`}
                className="mh6-gemologist__question"
              >
                {question.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mh6-gemologist__foot">
          <Link href="/concierge" className="mh6-button mh6-button--dark">
            Ask the gemologist
            <ArrowRight aria-hidden="true" />
          </Link>
          <p className="mh6-gemologist__note">
            A field the record does not carry comes back as a refusal. It is never filled with a
            plausible value.
          </p>
        </div>
      </div>
    </section>
  );
}
