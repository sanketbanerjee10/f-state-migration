import { describe, expect, it } from 'vitest';
import { chooseHeader, matchSum, readHeader, splitMergedNumbers } from './headerNumbers';

describe('splitMergedNumbers', () => {
  it('splits two numbers glued into one token', () => {
    expect(splitMergedNumbers('234,142,9242,821,828')).toEqual(['234142924', '2821828']);
  });
  it('drops icon digits glued to the front of the first number', () => {
    expect(splitMergedNumbers('11234,142,9242,821,828')).toEqual(['234142924', '2821828']);
  });
  it('reads two separate tokens', () => {
    expect(splitMergedNumbers('234,142,924 2,821,828')).toEqual(['234142924', '2821828']);
  });
  it('treats a dot as a comma', () => {
    expect(splitMergedNumbers('234,142.924 2,821,828')).toEqual(['234142924', '2821828']);
  });
  it('repairs a lost comma ("2 821,828" is 2,821,828)', () => {
    expect(splitMergedNumbers('2 821,828')).toEqual(['2821828']);
  });
  it('returns nothing for empty or non-numeric text', () => {
    expect(splitMergedNumbers('')).toEqual([]);
    expect(splitMergedNumbers('abc')).toEqual([]);
  });
});

describe('matchSum', () => {
  it('strips leading junk digits until the number equals the sum', () => {
    expect(matchSum('11234142924', 234142924)).toBe('234142924');
  });
  it('returns null when no suffix matches', () => {
    expect(matchSum('234142925', 234142924)).toBeNull();
  });
});

describe('readHeader', () => {
  it('finds power by the sum and takes the next number as kills', () => {
    expect(readHeader('234,142,9242,821,828', 234142924)).toEqual({
      power: '234142924',
      kills: '2821828',
      matched: true,
    });
  });
  it('still returns the numbers, but unmatched, when the sum does not fit', () => {
    expect(readHeader('234,142,9242,821,828', 999)).toEqual({
      power: '234142924',
      kills: '2821828',
      matched: false,
    });
  });
  it('handles empty text', () => {
    expect(readHeader('', 1)).toEqual({ power: null, kills: null, matched: false });
  });
});

describe('chooseHeader', () => {
  const read = (kills: string, matched = true) => ({ power: '234142924', kills, matched });

  it('is consistent when most matched reads agree on kills', () => {
    const c = chooseHeader([read('2821828'), read('2821828'), read('2821828'), read('2821823')]);
    expect(c.kills).toBe('2821828');
    expect(c.matched).toBe(true);
    expect(c.consistent).toBe(true);
  });
  it('is not consistent when reads disagree', () => {
    const c = chooseHeader([read('2821828'), read('2821823')]);
    expect(c.consistent).toBe(false);
  });
  it('is not consistent with a single read', () => {
    expect(chooseHeader([read('2821828')]).consistent).toBe(false);
  });
  it('reports unmatched when no read matched the sum', () => {
    const c = chooseHeader([read('2821828', false), read('2821828', false)]);
    expect(c.matched).toBe(false);
  });
  it('handles no reads', () => {
    expect(chooseHeader([])).toEqual({ power: null, kills: null, matched: false, consistent: false });
  });
});
