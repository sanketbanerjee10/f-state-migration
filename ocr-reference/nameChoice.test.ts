import { describe, expect, it } from 'vitest';
import { chooseName, needMoreNameReads, nameKey, type NameCandidate } from './nameChoice';

const tess = (text: string, conf: number): NameCandidate => ({ text, conf, source: 'tesseract' });
const pad = (text: string, conf: number): NameCandidate => ({ text, conf, source: 'paddle' });

describe('nameKey', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(nameKey('Long pro310')).toBe(nameKey('LONGPRO310'));
    expect(nameKey('xX_Dragon_Xx')).toBe(nameKey('xx dragon xx'));
  });
});

describe('chooseName', () => {
  it('1. returns the Tesseract text when both engines agree', () => {
    expect(chooseName(tess('Long pro310', 70), [pad('Longpro310', 60)])).toBe('Long pro310');
  });
  it('1b. prefers the accented spelling when both engines agree on the letters', () => {
    expect(chooseName(tess('Trần Đức', 86), [pad('Tran Duc', 95)])).toBe('Trần Đức');
    expect(chooseName(tess('Saban', 92), [pad('Şaban', 80)])).toBe('Şaban');
  });
  it('2. trusts a confident Tesseract read even if PaddleOCR disagrees', () => {
    expect(chooseName(tess('Long pro310', 95), [pad('Longpro31o x', 99)])).toBe('Long pro310');
  });
  it('3. uses a confident PaddleOCR read when Tesseract is unsure', () => {
    expect(chooseName(tess('Xyz', 70), [pad('박차르', 92)])).toBe('박차르');
  });
  it('3b. uses the most confident PaddleOCR candidate', () => {
    expect(chooseName(null, [pad('aaa', 86), pad('bbb', 97)])).toBe('bbb');
  });
  it('4. falls back to an acceptable Tesseract read', () => {
    expect(chooseName(tess('Ally', 65), [])).toBe('Ally');
    expect(chooseName(tess('Ally', 65), [pad('junk', 60)])).toBe('Ally');
  });
  it('5. uses PaddleOCR alone when it is at least 80 and Tesseract found nothing', () => {
    expect(chooseName(null, [pad('박차르', 82)])).toBe('박차르');
  });
  it('6. returns an empty string when nothing is reliable', () => {
    expect(chooseName(null, [pad('junk', 69)])).toBe('');
    expect(chooseName(tess('x', 40), [pad('y', 50)])).toBe('');
    expect(chooseName(null, [])).toBe('');
  });
  it('ignores empty candidates', () => {
    expect(chooseName(tess('  ', 99), [pad('Ally', 90)])).toBe('Ally');
  });
});

describe('needMoreNameReads', () => {
  it('is false when Tesseract is confident', () => {
    expect(needMoreNameReads(tess('Ally', 95), [])).toBe(false);
  });
  it('is false when PaddleOCR is confident', () => {
    expect(needMoreNameReads(null, [pad('Ally', 90)])).toBe(false);
  });
  it('is false when both agree', () => {
    expect(needMoreNameReads(tess('Ally', 70), [pad('ally', 60)])).toBe(false);
  });
  it('is true when nothing is confident', () => {
    expect(needMoreNameReads(null, [])).toBe(true);
    expect(needMoreNameReads(tess('x', 70), [pad('y', 69)])).toBe(true);
  });
});
