/**
 * packages/domain/src/search/synonyms.ts
 *
 * Synonym map and query expansion with evidence provenance (Phase 5 Task 8).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 8:
 *     "Implement the synonym map seeded from observed evidence, distinguishing
 *      observed from curated."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14.7
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §120-138
 */

export type SynonymProvenance = 'OBSERVED' | 'CURATED';

export interface SynonymEntry {
  readonly canonical: string;
  readonly variants: readonly string[];
  readonly provenance: SynonymProvenance;
  readonly basis: string;
}

/**
 * Authoritative seed synonym registry from technical_design/12_SEARCH_ARCHITECTURE.md §124-136.
 */
export const SYNONYM_ENTRIES: readonly SynonymEntry[] = Object.freeze([
  Object.freeze({
    canonical: 'tsavorite',
    variants: Object.freeze(['tsavorite garnet', 'green grossular']),
    provenance: 'OBSERVED',
    basis: 'route tsavorite-garnet',
  }),
  Object.freeze({
    canonical: 'paraiba tourmaline',
    variants: Object.freeze(['paraiba', 'blue-green tourmaline']),
    provenance: 'OBSERVED',
    basis: 'observed source route & product title',
  }),
  Object.freeze({
    canonical: 'sphene',
    variants: Object.freeze(['titanite', 'sphene titanite']),
    provenance: 'OBSERVED',
    basis: 'observed source specification',
  }),
  Object.freeze({
    canonical: 'padparadscha',
    variants: Object.freeze(['padparadscha sapphire', 'pink-orange sapphire']),
    provenance: 'OBSERVED',
    basis: 'observed source route',
  }),
  Object.freeze({
    canonical: 'chrome diopside',
    variants: Object.freeze(['chrome', 'chrome diopside']),
    provenance: 'OBSERVED',
    basis: 'observed variety name',
  }),
  Object.freeze({
    canonical: 'precious topaz',
    variants: Object.freeze(['imperial topaz', 'precious topaz']),
    provenance: 'OBSERVED',
    basis: 'route imperial-topaz',
  }),
  Object.freeze({
    canonical: 'grossular garnet',
    variants: Object.freeze(['grossular', 'hessonite', 'tsavorite']),
    provenance: 'CURATED',
    basis: 'gemological grouping',
  }),
  Object.freeze({
    canonical: 'emerald cut',
    variants: Object.freeze(['step cut', 'emerald']),
    provenance: 'CURATED',
    basis: 'gemological synonym',
  }),
  Object.freeze({
    canonical: 'ceylon',
    variants: Object.freeze(['sri lankan', 'ceylon (sri lanka)', 'sri lanka']),
    provenance: 'OBSERVED',
    basis: 'observed origin designation',
  }),
  Object.freeze({
    canonical: 'high polish',
    variants: Object.freeze(['polished']),
    provenance: 'OBSERVED',
    basis: 'highPolish filter asset',
  }),
]);

export interface SynonymExpansionResult {
  readonly originalQuery: string;
  readonly expandedQuery: string;
  readonly appliedSynonyms: readonly SynonymEntry[];
}

/**
 * Expands a query with synonyms for full-text search:
 * Replaces matching terms with "(canonical OR variant)" without introducing loops
 * or creating duplicate catalogue entities.
 */
export function expandQueryWithSynonyms(
  queryText: string,
  synonyms: readonly SynonymEntry[] = SYNONYM_ENTRIES,
): SynonymExpansionResult {
  if (!queryText || queryText.trim().length === 0) {
    return Object.freeze({
      originalQuery: queryText,
      expandedQuery: '',
      appliedSynonyms: Object.freeze([]),
    });
  }

  let working = queryText.trim();
  const applied: SynonymEntry[] = [];
  const processedPhrases = new Set<string>();

  // Process longer phrases first to avoid partial substring corruption
  const sortedEntries = [...synonyms].sort((a, b) => {
    const maxA = Math.max(a.canonical.length, ...a.variants.map((v) => v.length));
    const maxB = Math.max(b.canonical.length, ...b.variants.map((v) => v.length));
    return maxB - maxA;
  });

  for (const entry of sortedEntries) {
    const termsToMatch = [entry.canonical, ...entry.variants].sort((a, b) => b.length - a.length);

    for (const term of termsToMatch) {
      if (processedPhrases.has(term.toLowerCase())) continue;

      // Regex matching whole word/phrase
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');

      if (regex.test(working)) {
        if (!applied.includes(entry)) {
          applied.push(entry);
        }
        // Build expansion: if searching for variant, expand to "(canonical OR variant)"
        // In PostgreSQL websearch_to_tsquery, OR works between terms
        const replacement = term.toLowerCase() === entry.canonical.toLowerCase()
          ? `${entry.canonical} OR "${entry.variants[0]}"`
          : `"${entry.canonical}" OR "${term}"`;

        working = working.replace(regex, `(${replacement})`);

        // Mark all related terms as processed to prevent infinite loops / cycles
        processedPhrases.add(entry.canonical.toLowerCase());
        for (const v of entry.variants) {
          processedPhrases.add(v.toLowerCase());
        }
        break; // Advance to next entry
      }
    }
  }

  return Object.freeze({
    originalQuery: queryText,
    expandedQuery: working,
    appliedSynonyms: Object.freeze(applied),
  });
}
