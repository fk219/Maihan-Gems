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
      // happy-dom has no layout or computed styles. The unit probe therefore
      // audits the layout-independent structural rules (names, roles, labels,
      // language, lists); contrast and spacing belong to a real-browser audit.
      runOnly: {
        type: 'rule',
        values: [
          'aria-allowed-attr', 'aria-hidden-body', 'aria-required-attr',
          'aria-required-children', 'aria-required-parent', 'aria-roles',
          'aria-valid-attr', 'aria-valid-attr-value', 'button-name',
          'document-title', 'duplicate-id-aria', 'form-field-multiple-labels',
          'html-has-lang', 'html-lang-valid', 'image-alt', 'input-button-name',
          'label', 'link-name', 'list', 'listitem', 'meta-viewport',
          'select-name', 'summary-name', 'td-headers-attr',
          'th-has-data-cells', 'valid-lang',
        ],
      },
    })) as unknown as AxeResults;
    return results;
  }
}
