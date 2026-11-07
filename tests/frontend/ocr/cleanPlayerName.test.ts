import { describe, expect, it } from 'vitest';
import { cleanPlayerName } from '@/lib/ocr/extractPlayerFields';

describe('cleanPlayerName', () => {
  it('leaves mixed Hangul and Latin names unchanged', () => {
    expect(cleanPlayerName('빈체로 Ally')).toBe('빈체로 Ally');
  });
  it('removes spaces inserted between East Asian characters', () => {
    expect(cleanPlayerName('龙 王 战 神')).toBe('龙王战神');
    expect(cleanPlayerName('田 中 太 郎')).toBe('田中太郎');
  });
  it('keeps real spaces and leading name characters', () => {
    expect(cleanPlayerName('Long pro310')).toBe('Long pro310');
    expect(cleanPlayerName('fred')).toBe('fred');
    expect(cleanPlayerName('9Lives')).toBe('9Lives');
  });
  it('strips border noise only at the ends', () => {
    expect(cleanPlayerName('|| Ally ||')).toBe('Ally');
    expect(cleanPlayerName('xX_Dragon_Xx')).toBe('xX_Dragon_Xx');
  });
});
