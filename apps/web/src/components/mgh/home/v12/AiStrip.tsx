/**
 * The AI gemologist is a service strip, not a full section: one line, one
 * honest entry and one refusal note. The entry is a real GET form to the
 * shipped concierge route — no script, no invented answer.
 */
export function AiStrip() {
  return (
    <section
      className="mh12-band mh12-band--paper mh12-ai"
      data-section="ai"
      data-surface="paper"
      aria-labelledby="mh12-ai-title"
    >
      <div className="mh12-wrap mh12-ai__inner">
        <div>
          <h2 id="mh12-ai-title" className="mh12-h2 mh12-ai__title">
            Ask the gemologist.
          </h2>
          <p className="mh12-body mh12-ai__note">
            No record, no answer: the assistant refuses rather than guessing.
          </p>
        </div>

        <form
          action="/concierge"
          method="get"
          className="mh12-ai__form"
          role="search"
          aria-label="Ask the AI gemologist about a stone"
        >
          <label htmlFor="mh12-ai-ask" className="sr-only">
            Ask about origin, treatment, shape or budget
          </label>
          <input
            id="mh12-ai-ask"
            name="q"
            type="text"
            autoComplete="off"
            placeholder="Ask about origin, treatment, shape or budget"
            className="mh12-ai__input"
          />
          <button type="submit" className="mh12-ai__submit">
            Ask
            <span aria-hidden="true" className="mh12-action__arrow">
              →
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
