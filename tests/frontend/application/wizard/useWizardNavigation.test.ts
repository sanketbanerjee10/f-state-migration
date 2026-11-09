import { describe, expect, it } from 'vitest';
import {
  BASE_STEPS,
  findFirstInvalidStep,
  GROUP_ROSTER_STEP,
  REVIEW_STEP,
} from '@/hooks/useWizardNavigation';
import { hasApplicationDraftData, initialDraft } from '@/hooks/useApplicationDraft';
import { parseMagnitude, parseStateNumber } from '@/lib/parsers';

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
    expect(BASE_STEPS[0].titleKey).toBe('wizard.navigation.character');
    expect(BASE_STEPS[1].titleKey).toBe('wizard.navigation.combat');
    expect(BASE_STEPS[2].titleKey).toBe('wizard.navigation.migration');
  });

  it('defines group roster and standalone review steps', () => {
    expect(GROUP_ROSTER_STEP.key).toBe('group-roster');
    expect(GROUP_ROSTER_STEP.titleKey).toBe('wizard.navigation.roster');
    expect(REVIEW_STEP.key).toBe('review');
    expect(REVIEW_STEP.titleKey).toBe('wizard.navigation.review');
  });

  it('finds the earliest invalid prerequisite when a later step is requested', () => {
    const result = findFirstInvalidStep(BASE_STEPS, 2, (stepKey) =>
      stepKey === 'combat' ? { currentState: 'wizard.validation.state' } : {},
    );

    expect(result).toEqual({
      index: 1,
      errors: { currentState: 'wizard.validation.state' },
    });
  });

  it('does not validate the requested step itself', () => {
    const validatedSteps: string[] = [];
    const validateStep = (stepKey: string) => {
      validatedSteps.push(stepKey);
      return {};
    };

    expect(findFirstInvalidStep(BASE_STEPS, 1, validateStep)).toBeNull();
    expect(validatedSteps).toEqual(['character']);
  });
});

describe('Wizard draft validation rules', () => {
  it('shows draft data only when there is user-entered or uploaded data to clear', () => {
    expect(hasApplicationDraftData(initialDraft)).toBe(false);
    expect(hasApplicationDraftData({ ...initialDraft, playerName: 'Player' })).toBe(true);
    expect(hasApplicationDraftData(initialDraft, true)).toBe(true);
    expect(hasApplicationDraftData({ ...initialDraft, migrationType: 'Group' })).toBe(true);
  });

  it('validates state numbers between 1 and 9999', () => {
    expect(parseStateNumber('565')).toBe(565);
    expect(parseStateNumber('1')).toBe(1);
    expect(parseStateNumber('9999')).toBe(9999);
    expect(parseStateNumber('0')).toBeNull();
    expect(parseStateNumber('10000')).toBeNull();
    expect(parseStateNumber('32767')).toBeNull();
    expect(parseStateNumber('abc')).toBeNull();
    expect(parseStateNumber('1.5')).toBeNull();
    expect(parseStateNumber(' 565')).toBeNull();
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
