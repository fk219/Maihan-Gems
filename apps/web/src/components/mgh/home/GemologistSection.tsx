import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const QUESTIONS = [
  { label: 'Blue sapphires under $6,000', query: 'Blue sapphires under $6,000' },
  { label: 'Compare an unheated ruby with a spinel', query: 'Compare an unheated ruby with a spinel' },
  { label: 'Matched pairs in emerald', query: 'Matched pairs in emerald' },
];

/**
 * One statement, three real questions. The links carry the text into the
 * concierge's own query parameter; nothing is pre-answered and no transcript
 * is staged to look like a conversation.
 */
export function GemologistSection() {
  return (
    <section className="mh6-ai" aria-labelledby="mh6-ai-title" data-reveal>
      <div className="mh6-home__wrap mh6-ai__grid">
        <div className="mh6-ai__intro">
          <h2 id="mh6-ai-title" className="mh6-section-title">
            A gemologist’s eye, on request.
          </h2>
          <p className="mh6-ai__copy">
            Read a budget, compare two stones in plain language, and hear why one costs more
            than another. Every answer is quoted from the catalogue; a field the record does
            not carry is refused, not guessed.
          </p>
        </div>

        <ul className="mh6-ai__questions">
          {QUESTIONS.map((question) => (
            <li key={question.query}>
              <Link
                href={`/concierge?q=${encodeURIComponent(question.query)}`}
                className="mh6-ai__question"
              >
                <span>{question.label}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
