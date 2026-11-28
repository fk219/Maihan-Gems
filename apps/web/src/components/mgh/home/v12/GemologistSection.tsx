/**
 * The gemologist is one question and one real entry. The form is a plain GET
 * to the shipped concierge route; there is no script here and no invented
 * answer. A question the records cannot support comes back as a refusal, and
 * the note says so before the visitor types.
 */
export function GemologistSection() {
  return (
    <section className="mh12-ask" data-section="gemologist" aria-labelledby="mh12-ask-title">
      <div className="mh12-wrap mh12-ask__grid">
        <div className="mh12-ask__head">
          <span className="mh12-rule" aria-hidden="true" />
          <h2 id="mh12-ask-title" className="mh12-h1">
            Where was this stone mined<span className="mh12-ask__mark">?</span>
          </h2>
        </div>

        <div className="mh12-ask__body">
          <form
            action="/concierge"
            method="get"
            className="mh12-ask__form"
            role="search"
            aria-label="Ask the AI gemologist about a stone"
          >
            <label htmlFor="mh12-ask-stone" className="sr-only">
              Ask about origin, treatment, shape or budget
            </label>
            <input
              id="mh12-ask-stone"
              name="q"
              type="text"
              autoComplete="off"
              placeholder="Ask about a stone"
              className="mh12-ask__input"
            />
            <button type="submit" className="mh12-ask__submit">
              Ask
              <span aria-hidden="true" className="mh12-ask__arrow">
                &rarr;
              </span>
            </button>
          </form>
          <p className="mh12-meta mh12-ask__note">
            Answers come from the record, or they do not come.
          </p>
        </div>
      </div>
    </section>
  );
}
