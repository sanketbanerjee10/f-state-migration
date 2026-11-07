import { describe, expect, it } from 'vitest';
import { chooseHeader, readHeader, splitMergedNumbers } from '@/lib/ocr/headerNumbers';
import {
  extractByLayout,
  nameCropRect,
  type LayoutResult,
  type OcrWord,
} from '@/lib/ocr/extractByLayout';

describe('header number recovery', () => {
  it('splits power and kills when OCR glues the stats together', () => {
    expect(splitMergedNumbers('234,142,9242,821,828')).toEqual(['234142924', '2821828']);
    expect(readHeader('234,142,9242,821,828', 234142924)).toEqual({
      power: '234142924',
      kills: '2821828',
      matched: true,
    });
  });

  it('chooses the checksum-matched read and majority kills value', () => {
    const choice = chooseHeader([
      { power: '234142924', kills: '2821828', matched: true },
      { power: '234142924', kills: '2821828', matched: true },
      { power: '234142924', kills: '2821823', matched: true },
    ]);

    expect(choice).toEqual({
      power: '234142924',
      kills: '2821828',
      matched: true,
      consistent: true,
    });
  });

  it('marks kills as inconsistent when matched reads do not agree', () => {
    const choice = chooseHeader([
      { power: '234142924', kills: '2821828', matched: true },
      { power: '234142924', kills: '2821823', matched: true },
      { power: '234142924', kills: '2821838', matched: true },
    ]);

    expect(choice.matched).toBe(true);
    expect(choice.consistent).toBe(false);
  });

  it('extracts rows when OCR returns the header as one merged token', () => {
    const words: OcrWord[] = [
      { text: '234,142,9242,821,828', bbox: { x0: 100, y0: 40, x1: 300, y1: 60 } },
      ...['76,172,616', '16,671,414', '82,208,280', '50,173,270', '8,917,344'].map(
        (text, index) => ({
          text,
          bbox: { x0: 220, y0: 90 + index * 35, x1: 300, y1: 110 + index * 35 },
        }),
      ),
    ];

    const result = extractByLayout(words);

    expect(result?.powerBesideName).toBe('234,142,924');
    expect(result?.kills).toBe('2,821,828');
    expect(result?.sumMatches).toBe(true);
    expect(result?.tableRows).toBe(5);
  });

  it('crops the complete name above the header, without clipping its first glyph', () => {
    const layout: LayoutResult = {
      powerBesideName: '294,163,646',
      kills: '4,293,166',
      table: {},
      tableRows: 5,
      sumMatches: true,
      powerBox: { x0: 325, y0: 504, x1: 382, y1: 530 },
      killsBox: { x0: 401, y0: 488, x1: 559, y1: 532 },
    };

    expect(nameCropRect(layout, 716, 1600)).toEqual({
      x: 189,
      y: 441,
      w: 422,
      h: 45,
    });
  });
});
