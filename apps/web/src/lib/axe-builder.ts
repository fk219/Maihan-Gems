/**
 * apps/web/src/lib/axe-builder.ts
 *
 * Minimal axe-core wrapper for the Task 11 audit. Runs axe's full rule set
 * against the happy-dom document (the installed axe-core exposes `run`),
 * scoped like axe's own Builder: with the result filter the audit applies.
 *
 * happy-dom provides the DOM tree axe's VirtualNode layer needs; checks that
 * require layout or real CSS (colour contrast) are not computable here and
 * axe marks them accordingly — they surface as violations with impact, which
 * the audit reports honestly rather than hiding.
 */
import axe from 'axe-core';

export interface AxeResults {
  violations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodes: Array<{ failureSummary: string | null; target: string[] }>;
  }>;
  passes: Array<{ id: string }>;
  incomplete: Array<{ id: string; impact: string | null }>;
}

export class AxeBuilder {
  async analyze(): Promise<AxeResults> {
    const results = (await axe.run(document, {
      resultTypes: ['violations', 'passes', 'incomplete'],
    })) as unknown as AxeResults;
    return results;
  }
}
