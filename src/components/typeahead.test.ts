import { describe, expect, it } from 'vitest';
import { filterOptions, hasExactMatch } from './typeahead';
import { vehicleMakes } from '../data/vehicleMakes';

describe('filterOptions', () => {
  it('filterOptions_emptyQuery_returnsAllOptions', () => {
    expect(filterOptions(vehicleMakes, '   ')).toEqual([...vehicleMakes]);
  });

  it('filterOptions_asciiQuery_matchesAccentedOptions', () => {
    expect(filterOptions(vehicleMakes, 'citroen')).toEqual(['Citroën']);
    expect(filterOptions(vehicleMakes, 'skoda')).toEqual(['Škoda']);
  });

  it('filterOptions_mixedCaseQuery_ignoresCase', () => {
    expect(filterOptions(vehicleMakes, 'ChEvY')).toEqual([]);
    expect(filterOptions(vehicleMakes, 'ChEvR')).toEqual(['Chevrolet']);
  });

  it('filterOptions_query_ranksPrefixMatchesAboveInteriorMatches', () => {
    // "Ram" is a prefix match; "Aston Martin"/"Ferrari" only contain "ra" mid-word.
    const result = filterOptions(vehicleMakes, 'ra');
    expect(result[0]).toBe('Ram');
    expect(result).toContain('Ferrari');
    expect(result.indexOf('Ram')).toBeLessThan(result.indexOf('Ferrari'));
  });

  it('filterOptions_tiedMatches_preservesSourceOrder', () => {
    const options = ['Lotus', 'Volvo', 'Lexus', 'Tesla', 'Ford'];
    // Prefix hits first (source order), then interior hits (source order); no-hit dropped.
    expect(filterOptions(options, 'l')).toEqual(['Lotus', 'Lexus', 'Volvo', 'Tesla']);
  });

  it('filterOptions_unmatchedQuery_returnsEmpty', () => {
    expect(filterOptions(vehicleMakes, 'Wartburg')).toEqual([]);
  });

  it('filterOptions_doesNotMutateSourceOptions', () => {
    const options = ['Ford', 'Fiat'];
    filterOptions(options, '');
    expect(options).toEqual(['Ford', 'Fiat']);
  });
});

describe('hasExactMatch', () => {
  it('hasExactMatch_valueDifferingByCaseAccentOrSpace_returnsTrue', () => {
    expect(hasExactMatch(vehicleMakes, 'skoda')).toBe(true);
    expect(hasExactMatch(vehicleMakes, '  ford ')).toBe(true);
  });

  it('hasExactMatch_partialValue_returnsFalse', () => {
    // A prefix is a filter hit but not an exact value — the custom-value row must still show.
    expect(filterOptions(vehicleMakes, 'For')).toEqual(['Ford']);
    expect(hasExactMatch(vehicleMakes, 'For')).toBe(false);
  });

  it('hasExactMatch_unlistedValue_returnsFalse', () => {
    expect(hasExactMatch(vehicleMakes, 'Wartburg')).toBe(false);
  });
});
