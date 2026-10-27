import { describe, expect, it } from 'vitest';
import { bannerRegion, buildLayout, extractTable, sumOfTable } from './extractByLayout';

// A number word at the right edge (x1 = 622) of the power table, glyph height 22.
const num = (text: string, y0: number, x1 = 622) => ({
  text,
  bbox: { x0: x1 - 120, y0, x1, y1: y0 + 22 },
});

const FIVE = [
  num('76,172,616', 646),
  num('16,671,414', 714),
  num('82,208,280', 783),
  num('50,173,270', 852),
  num('8,917,344', 921),
];
const label = (text: string, y0: number) => ({ text, bbox: { x0: 94, y0, x1: 290, y1: y0 + 22 } });

describe('extractTable', () => {
  it('reads the five power rows in order and finds no extra row on a short card', () => {
    const t = extractTable(FIVE);
    expect(t).not.toBeNull();
    expect(t!.values).toEqual([76172616, 16671414, 82208280, 50173270, 8917344]);
    expect(t!.extra).toBeNull();
    expect(sumOfTable(t!)).toBe(234142924);
  });

  it('finds Highest Power on Record as the row after the five on a full card', () => {
    const full = [...FIVE, num('319,377,435', 1049), num('77,748', 1118), num('6,379', 1187)];
    const t = extractTable(full);
    expect(t!.values).toHaveLength(5);
    expect(t!.extra).toBe(319377435);
  });

  it('ignores labels (any language) because they never contain three digits', () => {
    const words = [label('Structure Power', 646), label('건축물 전투력', 714), ...FIVE];
    expect(extractTable(words)!.values).toHaveLength(5);
  });

  it('is not confused by a merged header token above the table', () => {
    const header = { text: '234,142,9242,821,828', bbox: { x0: 228, y0: 500, x1: 562, y1: 524 } };
    const t = extractTable([header, ...FIVE]);
    expect(t!.values).toEqual([76172616, 16671414, 82208280, 50173270, 8917344]);
  });

  it('returns null when fewer than five aligned rows exist', () => {
    expect(extractTable(FIVE.slice(0, 4))).toBeNull();
  });

  it('returns null when the rows are not evenly spaced', () => {
    const uneven = [num('1,111,111', 100), num('2,222,222', 150), num('3,333,333', 400), num('4,444,444', 410), num('5,555,555', 900)];
    expect(extractTable(uneven)).toBeNull();
  });
});

describe('bannerRegion', () => {
  it('sits above the table and stays inside the image', () => {
    const t = extractTable(FIVE)!;
    const r = bannerRegion(t, 716, 1600);
    expect(r.y + r.h).toBeLessThan(t.firstTop - t.pitch);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(716);
    expect(r.w).toBeGreaterThan(300);
  });
});

describe('buildLayout', () => {
  const header = { power: '234142924', kills: '2821828', matched: true, consistent: true };

  it('formats every value with commas and maps the five rows to their fields', () => {
    const l = buildLayout(extractTable(FIVE)!, header);
    expect(l.powerBesideName).toBe('234,142,924');
    expect(l.kills).toBe('2,821,828');
    expect(l.table.structurePower).toBe('76,172,616');
    expect(l.table.modVehiclePower).toBe('8,917,344');
    expect(l.highestPowerOnRecord).toBeUndefined();
    expect(l.sumMatches).toBe(true);
    expect(l.killsConsistent).toBe(true);
  });

  it('keeps Highest Power on Record when it is at least current power', () => {
    const full = [...FIVE, num('319,377,435', 1049)];
    expect(buildLayout(extractTable(full)!, header).highestPowerOnRecord).toBe('319,377,435');
  });

  it('drops Highest Power on Record when it is lower than current power (a digit was misread)', () => {
    const full = [...FIVE, num('119,377,435', 1049)];
    expect(buildLayout(extractTable(full)!, header).highestPowerOnRecord).toBeUndefined();
  });

  it('still returns the table when the header could not be read', () => {
    const l = buildLayout(extractTable(FIVE)!, { power: null, kills: null, matched: false, consistent: false });
    expect(l.powerBesideName).toBeUndefined();
    expect(l.kills).toBeUndefined();
    expect(l.table.techPower).toBe('16,671,414');
    expect(l.sumMatches).toBe(false);
  });
});
