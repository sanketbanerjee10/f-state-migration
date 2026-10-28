import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GroupMember, MigrationTier, MigrationType } from '../types/application';
import type { ExtractedPlayerFields } from '../lib/ocr';
import { parseMagnitude, parseStateNumber } from '../lib/parsers';
import { isApplicationDeletedError, useApplicationDetails } from '../lib/applicationDetailsCache';

const DRAFT_STORAGE_KEY = 'state565_application_draft_v4';

function calculatePowerOnRecord(
  powers: Pick<ApplicationDraft, 'structurePower' | 'techPower' | 'troopPower' | 'heroPower' | 'modVehiclePower'>,
): string {
  return Math.round(
    [
      powers.structurePower,
      powers.techPower,
      powers.troopPower,
      powers.heroPower,
      powers.modVehiclePower,
    ].reduce((total, power) => total + (parseMagnitude(power) || 0), 0),
  ).toLocaleString('en-US');
}

export interface ApplicationDraft {
  // Step 1: Character Details (OCR-prefillable)
  playerName: string;
  highestPowerOnRecord: string; // calculated total of the five power breakdown fields
  structurePower: string;
  techPower: string;
  troopPower: string;
  heroPower: string;
  modVehiclePower: string;
  kills: string;
  hasScreenshot: boolean;
  screenshotFileName: string;

  // Step 2: Combat Power
  currentState: string;
  currentAlliance: string;
  f1: string;
  f2: string;
  f3: string;

  // Step 3: Migration Details
  preferredAlliances: string[];
  tier: MigrationTier | '';
  migrationType: MigrationType | '';
  representative: string;
  reason: string;
  comments: string;

  // Step 4: Group Migration Roster (Bulk OCR imports)
  groupMembers: GroupMember[];
  hasGroupScreenshot: boolean;
  groupScreenshotFileName: string;

  // Edit mode tracking
  editingApplicationId?: string | null;
  editingReference?: string | null;

  // Dirty fields tracker
  dirtyFields: Record<string, boolean>;
}

export const initialDraft: ApplicationDraft = {
  playerName: '',
  highestPowerOnRecord: '',
  structurePower: '',
  techPower: '',
  troopPower: '',
  heroPower: '',
  modVehiclePower: '',
  kills: '',
  hasScreenshot: false,
  screenshotFileName: '',

  currentState: '',
  currentAlliance: '',

  f1: '',
  f2: '',
  f3: '',

  preferredAlliances: [],
  tier: '',
  migrationType: 'Individual',
  representative: '',
  reason: '',
  comments: '',

  groupMembers: [],
  hasGroupScreenshot: false,
  groupScreenshotFileName: '',

  editingApplicationId: null,
  editingReference: null,

  dirtyFields: {},
};

export type StepErrors = Record<string, string>;

interface ApplicationDraftContextValue {
  draft: ApplicationDraft;
  screenshotFile: File | null;
  groupScreenshotFile: File | null;
  isLoadingEdit: boolean;
  editApplicationDeleted: boolean;
  editApplicationError: string;
  cancelEdit: () => void;
  setDraftField: <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K], isUserEdit?: boolean) => void;
  applyOcrResults: (extracted: ExtractedPlayerFields, file?: File | null) => void;
  setScreenshotFile: (file: File | null) => void;
  setGroupScreenshotFile: (file: File | null) => void;
  removeScreenshot: () => void;
  removeGroupScreenshot: () => void;
  addGroupMember: (member: GroupMember) => void;
  updateGroupMember: (id: string, updates: Partial<GroupMember>) => void;
  removeGroupMember: (id: string) => void;
  clearDraft: (preserveMigrationType?: boolean) => void;
  validateStep: (stepRouteOrKey: string) => StepErrors;
  validateAll: () => StepErrors;
}

const ApplicationDraftContext = createContext<ApplicationDraftContextValue | null>(null);

function loadStoredDraft(): ApplicationDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return initialDraft;
    const parsed = JSON.parse(raw);
    const draft = {
      ...initialDraft,
      ...parsed,
      groupMembers: parsed.groupMembers || [],
      dirtyFields: parsed.dirtyFields || {},
    };
    return {
      ...draft,
      highestPowerOnRecord: calculatePowerOnRecord(draft),
    };
  } catch {
    return initialDraft;
  }
}

function saveStoredDraft(draft: ApplicationDraft) {
  try {
    const serialized = JSON.stringify(draft);
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }
}

export function ApplicationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ApplicationDraft>(loadStoredDraft);
  const [screenshotFile, setScreenshotFileState] = useState<File | null>(null);
  const [groupScreenshotFile, setGroupScreenshotFileState] = useState<File | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [editApplicationDeleted, setEditApplicationDeleted] = useState(false);
  const [editApplicationError, setEditApplicationError] = useState('');
  const editId = new URLSearchParams(window.location.search).get('edit') || '';
  const editApplication = useApplicationDetails(editId, Boolean(editId) && draft.editingApplicationId !== editId);

  useEffect(() => {
    setIsLoadingEdit(editApplication.isFetching);
    setEditApplicationDeleted(isApplicationDeletedError(editApplication.error));
    setEditApplicationError(editApplication.error instanceof Error ? editApplication.error.message : '');

    const data = editApplication.data;
    if (!data) return;

        const applicantPlayer = data.players?.find((p: any) => p.isApplicant);
        const groupPlayers = data.players?.filter((p: any) => !p.isApplicant) || [];
        const ref = `565-${data.id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        const structurePower = applicantPlayer?.structurePower ? String(applicantPlayer.structurePower) : '';
        const techPower = applicantPlayer?.techPower ? String(applicantPlayer.techPower) : '';
        const troopPower = applicantPlayer?.troopPower ? String(applicantPlayer.troopPower) : '';
        const heroPower = applicantPlayer?.heroPower ? String(applicantPlayer.heroPower) : '';
        const modVehiclePower = applicantPlayer?.modVehiclePower ? String(applicantPlayer.modVehiclePower) : '';

        setDraft({
          ...initialDraft,
          editingApplicationId: data.id,
          editingReference: ref,
          playerName: data.gameName || '',
          highestPowerOnRecord: calculatePowerOnRecord({
            structurePower,
            techPower,
            troopPower,
            heroPower,
            modVehiclePower,
          }),
          structurePower,
          techPower,
          troopPower,
          heroPower,
          modVehiclePower,
          kills: String(applicantPlayer?.kills ?? data.kills ?? ''),
          hasScreenshot: Boolean(applicantPlayer?.isScreenshotVerified),
          screenshotFileName: applicantPlayer?.isScreenshotVerified ? 'Verified Screenshot Record' : '',

          currentState: String(data.currentState || ''),
          currentAlliance: data.currentAlliance || '',
          f1: String(data.f1ArenaPower || ''),
          f2: String(data.f2ArenaPower || ''),
          f3: String(data.f3ArenaPower || ''),

          preferredAlliances: data.anyAlliance
            ? ['any']
            : (data.preferredAlliances?.map((a: any) => String(a.id)) || []),
          tier: data.migrationTier || '',
          migrationType: data.migrationType || 'Individual',
          representative: data.groupRepresentative || '',
          reason: data.migrationReason || '',
          comments: data.additionalComments || '',

          groupMembers: groupPlayers.map((gp: any) => ({
            id: gp.id || crypto.randomUUID(),
            playerName: gp.playerName,
            currentState: String(gp.currentState ?? data.currentState ?? ''),
            f1ArenaPower: gp.f1ArenaPower == null ? '' : String(gp.f1ArenaPower),
            f2ArenaPower: gp.f2ArenaPower == null ? '' : String(gp.f2ArenaPower),
            f3ArenaPower: gp.f3ArenaPower == null ? '' : String(gp.f3ArenaPower),
            highestPowerOnRecord: String(gp.highestPowerOnRecord),
            structurePower: String(gp.structurePower),
            techPower: String(gp.techPower),
            troopPower: String(gp.troopPower),
            heroPower: String(gp.heroPower),
            modVehiclePower: String(gp.modVehiclePower),
            kills: String(gp.kills ?? ''),
            currentAlliance: gp.currentAlliance,
            isScreenshotVerified: Boolean(gp.isScreenshotVerified),
          })),
          hasGroupScreenshot: false,
          groupScreenshotFileName: '',
          dirtyFields: {},
        });
  }, [editApplication.data, editApplication.error, editApplication.isFetching]);

  // Sync draft to storage on changes
  useEffect(() => {
    saveStoredDraft(draft);
  }, [draft]);

  const cancelEdit = () => {
    clearDraft();
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.pathname);
  };

  const setDraftField = <K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
    isUserEdit = true,
  ) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        [key]: value,
        dirtyFields: isUserEdit
          ? { ...prev.dirtyFields, [key]: true }
          : prev.dirtyFields,
      };

      if (
        key === 'structurePower' ||
        key === 'techPower' ||
        key === 'troopPower' ||
        key === 'heroPower' ||
        key === 'modVehiclePower'
      ) {
        next.highestPowerOnRecord = calculatePowerOnRecord(next);
        next.dirtyFields = { ...next.dirtyFields, highestPowerOnRecord: false };
      }

      return next;
    });
  };

  const setScreenshotFile = (file: File | null) => {
    setScreenshotFileState(file);
    if (file) {
      setDraft((prev) => ({
        ...prev,
        hasScreenshot: true,
        screenshotFileName: file.name,
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        hasScreenshot: false,
        screenshotFileName: '',
      }));
    }
  };

  const setGroupScreenshotFile = (file: File | null) => {
    setGroupScreenshotFileState(file);
    if (file) {
      setDraft((prev) => ({
        ...prev,
        hasGroupScreenshot: true,
        groupScreenshotFileName: file.name,
      }));
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setDraft((prev) => {
      const dirtyFields = { ...prev.dirtyFields };
      delete dirtyFields.playerName;
      delete dirtyFields.structurePower;
      delete dirtyFields.techPower;
      delete dirtyFields.troopPower;
      delete dirtyFields.heroPower;
      delete dirtyFields.modVehiclePower;
      delete dirtyFields.kills;
      delete dirtyFields.highestPowerOnRecord;

      return {
        ...prev,
        playerName: initialDraft.playerName,
        highestPowerOnRecord: initialDraft.highestPowerOnRecord,
        structurePower: initialDraft.structurePower,
        techPower: initialDraft.techPower,
        troopPower: initialDraft.troopPower,
        heroPower: initialDraft.heroPower,
        modVehiclePower: initialDraft.modVehiclePower,
        kills: initialDraft.kills,
        dirtyFields,
      };
    });
  };

  const removeGroupScreenshot = () => {
    setGroupScreenshotFileState(null);
    setDraft((prev) => ({
      ...prev,
      hasGroupScreenshot: false,
      groupScreenshotFileName: '',
    }));
  };

  const addGroupMember = (member: GroupMember) => {
    setDraft((prev) => ({
      ...prev,
      groupMembers: [...prev.groupMembers, member],
    }));
  };

  const updateGroupMember = (id: string, updates: Partial<GroupMember>) => {
    setDraft((prev) => ({
      ...prev,
      groupMembers: prev.groupMembers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const removeGroupMember = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      groupMembers: prev.groupMembers.filter((m) => m.id !== id),
    }));
  };

  const applyOcrResults = (extracted: ExtractedPlayerFields, file?: File | null) => {
    if (file) {
      setScreenshotFileState(file);
    }
    setDraft((prev) => {
      const dirtyFields = { ...prev.dirtyFields };
      const updated: Partial<ApplicationDraft> = {
        hasScreenshot: true,
        screenshotFileName: file?.name || prev.screenshotFileName || 'screenshot.png',
      };

      if (extracted.playerName) {
        updated.playerName = extracted.playerName;
        dirtyFields.playerName = false;
      }
      if (extracted.structurePower) {
        updated.structurePower = extracted.structurePower;
        dirtyFields.structurePower = false;
      }
      if (extracted.techPower) {
        updated.techPower = extracted.techPower;
        dirtyFields.techPower = false;
      }
      if (extracted.troopPower) {
        updated.troopPower = extracted.troopPower;
        dirtyFields.troopPower = false;
      }
      if (extracted.heroPower) {
        updated.heroPower = extracted.heroPower;
        dirtyFields.heroPower = false;
      }
      if (extracted.modVehiclePower) {
        updated.modVehiclePower = extracted.modVehiclePower;
        dirtyFields.modVehiclePower = false;
      }
      if (extracted.kills) {
        updated.kills = extracted.kills;
        dirtyFields.kills = false;
      }

      const next = {
        ...prev,
        ...updated,
        dirtyFields,
      };
      next.highestPowerOnRecord = calculatePowerOnRecord(next);
      next.dirtyFields = { ...next.dirtyFields, highestPowerOnRecord: false };
      return next;
    });
  };

  const clearDraft = (preserveMigrationType = false) => {
    setDraft(
      preserveMigrationType
        ? { ...initialDraft, migrationType: draft.migrationType }
        : initialDraft,
    );
    setScreenshotFileState(null);
    setGroupScreenshotFileState(null);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const validateStep = (stepRouteOrKey: string): StepErrors => {
    const errors: StepErrors = {};

    switch (stepRouteOrKey) {
      case 'character':
      case '/': {
        // Step 1: Character Details — screenshot is optional; manual entry is allowed
        if (!draft.playerName.trim()) {
          errors.playerName = 'wizard.validation.gameName';
        }
        if (!parseMagnitude(draft.highestPowerOnRecord)) {
          errors.highestPowerOnRecord = 'wizard.validation.powerBreakdown';
        }
        if (draft.kills.trim() && parseMagnitude(draft.kills, true) === null) {
          errors.kills = 'wizard.validation.kills';
        }
        // Power breakdown — required whether or not screenshot was uploaded
        if (!parseMagnitude(draft.structurePower)) {
          errors.structurePower = 'wizard.validation.structure';
        }
        if (!parseMagnitude(draft.techPower)) {
          errors.techPower = 'wizard.validation.tech';
        }
        if (!parseMagnitude(draft.troopPower)) {
          errors.troopPower = 'wizard.validation.troop';
        }
        if (!parseMagnitude(draft.heroPower)) {
          errors.heroPower = 'wizard.validation.hero';
        }
        if (!parseMagnitude(draft.modVehiclePower)) {
          errors.modVehiclePower = 'wizard.validation.vehicle';
        }
        break;
      }

      case 'combat':
      case '/apply/combat': {
        // Step 2: Combat Power — state, alliance, arena powers
        if (!parseStateNumber(draft.currentState)) {
          errors.currentState = 'wizard.validation.state';
        }
        if (!draft.currentAlliance.trim()) {
          errors.currentAlliance = 'wizard.validation.alliance';
        }
        if (!parseMagnitude(draft.f1)) {
          errors.f1 = 'wizard.validation.f1';
        }
        if (!parseMagnitude(draft.f2)) {
          errors.f2 = 'wizard.validation.f2';
        }
        if (!parseMagnitude(draft.f3)) {
          errors.f3 = 'wizard.validation.f3';
        }
        break;
      }

      case 'migration':
      case '/apply/migration': {
        // Step 3: Migration Details
        if (!draft.migrationType) {
          errors.migrationType = 'wizard.validation.migrationType';
        }
        if (draft.migrationType === 'Group' && !draft.representative.trim()) {
          errors.representative = 'wizard.validation.representative';
        }
        if (!draft.preferredAlliances.length) {
          errors.preferredAlliances = 'wizard.validation.destinations';
        }
        if (draft.reason.trim().length < 10) {
          errors.reason = 'wizard.validation.reason';
        }
        if (draft.reason.length > 1000) {
          errors.reason = 'wizard.validation.reasonMax';
        }
        if (draft.comments.length > 1000) {
          errors.comments = 'wizard.validation.commentsMax';
        }
        break;
      }

      case 'group-roster':
      case '/apply/group-roster': {
        // Step 4 (Group only): Group Roster
        // Optional to have extra members, but if there's any invalid member we can catch it
        break;
      }

      case 'review':
      case '/apply/review': {
        // Final review stage - no new fields
        break;
      }

      default:
        break;
    }

    return errors;
  };

  const validateAll = (): StepErrors => {
    return {
      ...validateStep('character'),
      ...validateStep('combat'),
      ...validateStep('migration'),
    };
  };

  return (
    <ApplicationDraftContext.Provider
      value={{
        draft,
        screenshotFile,
        groupScreenshotFile,
        isLoadingEdit,
        editApplicationDeleted,
        editApplicationError,
        cancelEdit,
        setDraftField,
        applyOcrResults,
        setScreenshotFile,
        setGroupScreenshotFile,
        removeScreenshot,
        removeGroupScreenshot,
        addGroupMember,
        updateGroupMember,
        removeGroupMember,
        clearDraft,
        validateStep,
        validateAll,
      }}
    >
      {children}
    </ApplicationDraftContext.Provider>
  );
}

export function useApplicationDraft(): ApplicationDraftContextValue {
  const ctx = useContext(ApplicationDraftContext);
  if (!ctx) {
    throw new Error('useApplicationDraft must be used within an ApplicationDraftProvider');
  }
  return ctx;
}
