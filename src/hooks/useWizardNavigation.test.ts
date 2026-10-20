import { describe, expect, it } from 'vitest';
import { BASE_STEPS, GROUP_ROSTER_STEP, REVIEW_STEP } from './useWizardNavigation';
import { initialDraft } from './useApplicationDraft';
import { parseMagnitude, parseStateNumber } from '../lib/parsers';

describe('Wizard navigation step configuration', () => {
  it('configures 3 base steps before group/review', () => {
    expect(BASE_STEPS).toHaveLength(3);
    expect(BASE_STEPS.map((s) => s.key)).toEqual([
      'character',
      'combat',
      'migration',
    ]);
  });

  it('has correct titles for base steps', () => {
    expect(BASE_STEPS[0].title).toBe('Character Details');
    expect(BASE_STEPS[1].title).toBe('Combat Power');
    expect(BASE_STEPS[2].title).toBe('Migration Details');
  });

  it('defines group roster and standalone review steps', () => {
    expect(GROUP_ROSTER_STEP.key).toBe('group-roster');
    expect(GROUP_ROSTER_STEP.title).toBe('Group Roster');
    expect(REVIEW_STEP.key).toBe('review');
    expect(REVIEW_STEP.title).toBe('Review & Submit');
  });
});

describe('Wizard draft validation rules', () => {
  it('validates state numbers strictly between 1 and 32767', () => {
    expect(parseStateNumber('565')).toBe(565);
    expect(parseStateNumber('1')).toBe(1);
    expect(parseStateNumber('32767')).toBe(32767);
    expect(parseStateNumber('0')).toBeNull();
    expect(parseStateNumber('32768')).toBeNull();
    expect(parseStateNumber('abc')).toBeNull();
  });

  it('validates arena powers and kills magnitudes with shorthand M/B/K support', () => {
    expect(parseMagnitude('12.5M')).toBe(12500000);
    expect(parseMagnitude('11M')).toBe(11000000);
    expect(parseMagnitude('10M')).toBe(10000000);
    expect(parseMagnitude('5,453,196')).toBe(5453196);
    expect(parseMagnitude('0')).toBeNull();
    expect(parseMagnitude('')).toBeNull();
  });

  it('initial draft state sets Individual migration type by default with empty groupMembers', () => {
    expect(initialDraft.migrationType).toBe('Individual');
    expect(initialDraft.groupMembers).toEqual([]);
    expect(initialDraft.dirtyFields).toEqual({});
    expect(initialDraft.hasScreenshot).toBe(false);
  });

  it('initial draft does not contain powerBesideName field', () => {
    expect('powerBesideName' in initialDraft).toBe(false);
  });
});
