/**
 * Matching logic for TypeaheadInput, kept separate from the component so it can be
 * unit-tested directly.
 */

/**
 * Lowercases and strips diacritics so a plain-ASCII query matches accented options
 * ("citroen" → Citroën, "skoda" → Škoda).
 */
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Filters options by query, ranking prefix matches above interior substring matches.
 * Ties keep the source list's order. An empty/whitespace query returns everything.
 */
export function filterOptions(options: readonly string[], query: string): string[] {
  const needle = normalize(query.trim());
  if (!needle) return [...options];

  const prefix: string[] = [];
  const substring: string[] = [];

  for (const option of options) {
    const index = normalize(option).indexOf(needle);
    if (index === 0) prefix.push(option);
    else if (index > 0) substring.push(option);
  }

  return [...prefix, ...substring];
}

/** True when `query` already equals one of the options (ignoring case, accents, and surrounding space). */
export function hasExactMatch(options: readonly string[], query: string): boolean {
  const needle = normalize(query.trim());
  return options.some((option) => normalize(option) === needle);
}
