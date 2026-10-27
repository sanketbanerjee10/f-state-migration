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
  it('prefers the Tesseract spelling when both engines agree', () => {
    expect(chooseName(tess('Long pro310', 70), [pad('Longpro310', 60)])).toBe('Long pro310');
  });
  it('prefers accented spelling when both engines agree on the letters', () => {
    expect(chooseName(tess('Trần Đức', 86), [pad('Tran Duc', 95)])).toBe('Trần Đức');
    expect(chooseName(tess('Saban', 92), [pad('Şaban', 80)])).toBe('Şaban');
  });
  it('trusts confident Tesseract over Paddle disagreement', () => {
    expect(chooseName(tess('Long pro310', 95), [pad('Longpro31o x', 99)])).toBe('Long pro310');
  });
  it('uses confident or acceptable Paddle reads when Tesseract is weak', () => {
    expect(chooseName(tess('Xyz', 70), [pad('박차르', 92)])).toBe('박차르');
    expect(chooseName(null, [pad('박차르', 82)])).toBe('박차르');
    expect(chooseName(null, [pad('aaa', 86), pad('bbb', 97)])).toBe('bbb');
  });
  it('returns an empty name when no read is reliable', () => {
    expect(chooseName(null, [pad('junk', 69)])).toBe('');
    expect(chooseName(tess('x', 40), [pad('y', 50)])).toBe('');
  });
});

describe('needMoreNameReads', () => {
  it('stops for a confident Tesseract, confident Paddle, or agreement', () => {
    expect(needMoreNameReads(tess('Ally', 95), [])).toBe(false);
    expect(needMoreNameReads(null, [pad('Ally', 90)])).toBe(false);
    expect(needMoreNameReads(tess('Ally', 70), [pad('ally', 60)])).toBe(false);
  });
  it('requests more reads when neither engine is reliable', () => {
    expect(needMoreNameReads(null, [])).toBe(true);
    expect(needMoreNameReads(tess('x', 70), [pad('y', 69)])).toBe(true);
  });
});
