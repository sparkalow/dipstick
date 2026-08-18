import { describe, expect, it } from 'vitest';
import { DEFAULT_MAKE_LOGO, makeLogoUrl, onMakeLogoError } from './makeLogos';

describe('makeLogoUrl', () => {
  it('singleWordMake_lowercasesToFilename', () => {
    expect(makeLogoUrl('Toyota')).toBe('/automotive-logos/toyota.svg');
  });

  it('multiWordMake_replacesSpaceWithHyphen', () => {
    expect(makeLogoUrl('Alfa Romeo')).toBe('/automotive-logos/alfa-romeo.svg');
    expect(makeLogoUrl('Land Rover')).toBe('/automotive-logos/land-rover.svg');
  });

  it('hyphenatedMake_keepsSingleHyphen', () => {
    expect(makeLogoUrl('Mercedes-Benz')).toBe('/automotive-logos/mercedes-benz.svg');
    expect(makeLogoUrl('Rolls-Royce')).toBe('/automotive-logos/rolls-royce.svg');
  });

  it('makeWithDiacritics_foldsToAscii', () => {
    expect(makeLogoUrl('Citroën')).toBe('/automotive-logos/citroen.svg');
    expect(makeLogoUrl('Škoda')).toBe('/automotive-logos/skoda.svg');
  });

  it('undefinedMake_returnsDefaultLogo', () => {
    expect(makeLogoUrl(undefined)).toBe(DEFAULT_MAKE_LOGO);
  });

  it('makeWithNoSluggableCharacters_returnsDefaultLogo', () => {
    expect(makeLogoUrl('   ')).toBe(DEFAULT_MAKE_LOGO);
    expect(makeLogoUrl('!!!')).toBe(DEFAULT_MAKE_LOGO);
  });
});

describe('onMakeLogoError', () => {
  it('missingLogo_swapsInDefault', () => {
    const img = { src: 'https://app.test/automotive-logos/delorean.svg' } as HTMLImageElement;

    onMakeLogoError({ target: img } as unknown as Event);

    expect(img.src).toBe(DEFAULT_MAKE_LOGO);
  });

  it('defaultLogoItselfFails_leavesSrcAloneRatherThanLooping', () => {
    const img = { src: `https://app.test${DEFAULT_MAKE_LOGO}` } as HTMLImageElement;

    onMakeLogoError({ target: img } as unknown as Event);

    expect(img.src).toBe(`https://app.test${DEFAULT_MAKE_LOGO}`);
  });
});
