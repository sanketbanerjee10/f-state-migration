import { describe, expect, it } from 'vitest';
import { cleanPlayerName, extractPlayerFields } from '@/lib/ocr/extractPlayerFields';
import { normalizeOcrNumber } from '@/lib/ocr/normalizeOcrNumbers';

describe('extractPlayerFields', () => {
  const referenceScreenshotOcrPsm3 = `
[| GOD) Sdnkeyyy,
PE i 111242}242,381) 5,453,196

Power
Structure Power 84,785,628
Tech Power 19,187,725
Troop Power 66,198,020
Hero Power 62,634,222
Mod Vehicle Power 9,436,786

Combat Statistics

Highest Power on Record 281,459,207
Victory 52,949

Defeat 6,934
`;

  const referenceScreenshotOcrPsm4 = `
Details
f GODISankeyy,
| 0 lil1242/242,381] °=- 5,453,196

Power
Structure Power 84,785,628
Tech Power 19,187,725
Troop Power 66,198,020
Hero Power 62,634,222
Mod Vehicle Power 9,436,786

Combat Statistics

Highest Power on Record 281,459,207
Victory 52,949

Defeat 6,934
`;

  it('extracts player and power fields from reference screenshot OCR output (PSM 3)', () => {
    const extracted = extractPlayerFields(referenceScreenshotOcrPsm3, 85);

    expect(extracted.playerName).toBe('GOD Sankeyyy');
    expect(extracted.powerBesideName).toBe('242,242,381');
    expect(extracted.kills).toBe('5,453,196');
    expect(extracted.structurePower).toBe('84,785,628');
    expect(extracted.techPower).toBe('19,187,725');
    expect(extracted.troopPower).toBe('66,198,020');
    expect(extracted.heroPower).toBe('62,634,222');
    expect(extracted.modVehiclePower).toBe('9,436,786');
    expect(extracted.highestPowerOnRecord).toBeUndefined();
  });

  it('extracts player and power fields from reference screenshot OCR output (PSM 4)', () => {
    const extracted = extractPlayerFields(referenceScreenshotOcrPsm4, 88);

    expect(extracted.playerName).toBe('GOD Sankeyyy');
    expect(extracted.powerBesideName).toBe('242,242,381');
    expect(extracted.kills).toBe('5,453,196');
    expect(extracted.structurePower).toBe('84,785,628');
    expect(extracted.techPower).toBe('19,187,725');
    expect(extracted.troopPower).toBe('66,198,020');
    expect(extracted.heroPower).toBe('62,634,222');
    expect(extracted.modVehiclePower).toBe('9,436,786');
    expect(extracted.highestPowerOnRecord).toBeUndefined();
  });

  it('normalizes numbers with comma separators without altering value precision', () => {
    expect(normalizeOcrNumber('84,785,628')).toBe('84,785,628');
    expect(normalizeOcrNumber('242/242,381')).toBe('242,242,381');
    expect(normalizeOcrNumber('281.459.207')).toBe('281,459,207');
    expect(normalizeOcrNumber('5,453,196')).toBe('5,453,196');
  });

  it('preserves Hangul names and removes OCR-added CJK spacing', () => {
    expect(cleanPlayerName('박 차 르')).toBe('박차르');
  });
});
