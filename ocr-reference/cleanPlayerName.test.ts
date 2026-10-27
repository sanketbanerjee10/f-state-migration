import { describe, expect, it } from 'vitest';
import { cleanPlayerName } from './extractPlayerFields';

describe('cleanPlayerName', () => {
  it('leaves a mixed Hangul and Latin name unchanged', () => {
    expect(cleanPlayerName('빈체로 Ally')).toBe('빈체로 Ally');
  });
  it('removes spaces Tesseract inserts between Chinese or Japanese characters', () => {
    expect(cleanPlayerName('龙 王 战 神')).toBe('龙王战神');
    expect(cleanPlayerName('田 中 太 郎')).toBe('田中太郎');
  });
  it('keeps real spaces between Latin words', () => {
    expect(cleanPlayerName('Long pro310')).toBe('Long pro310');
  });
  it('keeps a leading letter f or digit that belongs to the name', () => {
    expect(cleanPlayerName('fred')).toBe('fred');
    expect(cleanPlayerName('9Lives')).toBe('9Lives');
  });
  it('strips border noise at the ends only', () => {
    expect(cleanPlayerName('|| Ally ||')).toBe('Ally');
    expect(cleanPlayerName('xX_Dragon_Xx')).toBe('xX_Dragon_Xx');
  });
});
