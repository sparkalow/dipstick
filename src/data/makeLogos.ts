/**
 * Maps a vehicle's `make` to a logo in `public/automotive-logos/`.
 *
 * `Vehicle.make` is optional and unconstrained (see `vehicleMakes.ts`), so there
 * are three ways a make can have no logo: it's absent, it's a custom value the
 * user typed, or it's a suggested make we happen to ship no file for (BYD,
 * Lucid, Pagani, Polestar, Rivian). The first is handled here; the other two
 * can only be detected when the request 404s, so views pair `makeLogoUrl` with
 * `onMakeLogoError` as an `@error` handler.
 */

export const DEFAULT_MAKE_LOGO = '/automotive-logos/default.svg';

/**
 * Slugifies a make to its filename stem: lowercase, diacritics folded, and any
 * run of non-alphanumerics collapsed to a single hyphen — so `Alfa Romeo` finds
 * `alfa-romeo`, `Citroën` finds `citroen`, and `Mercedes-Benz` stays intact.
 */
export function makeLogoSlug(make: string): string {
  return make
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining marks left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Logo URL for a make, falling back to the generic car icon when there's nothing to slugify. */
export function makeLogoUrl(make?: string): string {
  const slug = make ? makeLogoSlug(make) : '';
  return slug ? `/automotive-logos/${slug}.svg` : DEFAULT_MAKE_LOGO;
}

/** `@error` handler: swaps in the generic icon when a make has no logo file. */
export function onMakeLogoError(event: Event): void {
  const img = event.target as HTMLImageElement;
  // Guard against a loop if default.svg itself ever fails to load.
  if (!img.src.endsWith(DEFAULT_MAKE_LOGO)) {
    img.src = DEFAULT_MAKE_LOGO;
  }
}
