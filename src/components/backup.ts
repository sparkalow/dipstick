/**
 * Backup helpers kept out of the component so the pure bits stay unit-testable
 * (no component-test harness in this project — same reason as `typeahead.ts`).
 */

/** e.g. `dipstick-backup-2026-08-20.json` */
export function backupFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  // Local date parts, not toISOString — a backup taken at 9pm should carry
  // today's date, not tomorrow's in UTC.
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `dipstick-backup-${stamp}.json`;
}

/** Hands a Blob to the browser as a file download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
