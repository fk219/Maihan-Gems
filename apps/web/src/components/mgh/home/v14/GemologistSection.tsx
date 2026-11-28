import { SectionAction } from './SectionAction';

/**
 * The AI gemologist is one question and one way in. There is no second form on
 * the homepage: the hero already carries the catalogue search, and the
 * concierge surface owns the question flow, including the honest refusal when
 * a record cannot support an answer.
 *
 * The question is the section's headline, set as the page's largest text after
 * the hero, with a single gold question mark. The action sits on the opposite
 * baseline at desktop and directly beneath on a phone.
 */
export function GemologistSection() {
  return (
    <section className="mh14-gemologist" data-section="gemologist" aria-labelledby="mh14-ask-title">
      <div className="mh14-wrap mh14-gemologist__grid">
        <h2 id="mh14-ask-title" className="mh14-gemologist__question">
          Where was this stone mined<span className="mh14-gemologist__mark">?</span>
        </h2>

        <div className="mh14-gemologist__foot">
          <p className="mh14-gemologist__line">Answers come from the record, or they do not come.</p>
          <SectionAction href="/concierge">Ask the AI gemologist</SectionAction>
        </div>
      </div>
    </section>
  );
}
