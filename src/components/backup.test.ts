import { describe, expect, it } from 'vitest';
import { backupFilename } from './backup';

describe('backupFilename', () => {
  it('backupFilename_singleDigitMonthAndDay_zeroPadsBothParts', () => {
    expect(backupFilename(new Date(2026, 0, 5, 12))).toBe('dipstick-backup-2026-01-05.json');
  });

  it('backupFilename_lateEveningLocalTime_usesLocalDateNotUtc', () => {
    // 9pm on the 20th is already the 21st in UTC for anyone behind it; the
    // filename should still say the 20th.
    expect(backupFilename(new Date(2026, 7, 20, 21, 30))).toBe('dipstick-backup-2026-08-20.json');
  });
});
