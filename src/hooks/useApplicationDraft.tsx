import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GroupMember, MigrationTier, MigrationType } from '../types/application';
import type { ExtractedPlayerFields } from '../lib/ocr';
import { parseMagnitude, parseStateNumber } from '../lib/parsers';

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

  // Check URL query parameters for edit=<id>
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const editId = searchParams.get('edit');
    if (!editId) return;

    if (draft.editingApplicationId === editId) return;

    setIsLoadingEdit(true);
    fetch(`/api/applications/${encodeURIComponent(editId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load application');
        return res.json();
      })
      .then((data) => {
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
      })
      .catch((err) => {
        console.error('Error loading application for editing:', err);
      })
      .finally(() => {
        setIsLoadingEdit(false);
      });
  }, [window.location.search]);

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
          errors.playerName = 'Enter your in-game name.';
        }
        if (!parseMagnitude(draft.highestPowerOnRecord)) {
          errors.highestPowerOnRecord = 'Enter the five power breakdown values to calculate Power on Record.';
        }
        if (draft.kills.trim() && parseMagnitude(draft.kills, true) === null) {
          errors.kills = 'Enter zero or a valid kills value (e.g. 5,453,196 or 5.4M).';
        }
        // Power breakdown — required whether or not screenshot was uploaded
        if (!parseMagnitude(draft.structurePower)) {
          errors.structurePower = 'Enter Structure Power (e.g. 84,785,628 or 84M).';
        }
        if (!parseMagnitude(draft.techPower)) {
          errors.techPower = 'Enter Tech Power (e.g. 19,187,725 or 19M).';
        }
        if (!parseMagnitude(draft.troopPower)) {
          errors.troopPower = 'Enter Troop Power (e.g. 66,198,020 or 66M).';
        }
        if (!parseMagnitude(draft.heroPower)) {
          errors.heroPower = 'Enter Hero Power (e.g. 62,634,222 or 62M).';
        }
        if (!parseMagnitude(draft.modVehiclePower)) {
          errors.modVehiclePower = 'Enter Mod Vehicle Power (e.g. 9,436,786 or 9M).';
        }
        break;
      }

      case 'combat':
      case '/apply/combat': {
        // Step 2: Combat Power — state, alliance, arena powers
        if (!parseStateNumber(draft.currentState)) {
          errors.currentState = 'Enter a valid state';
        }
        if (!draft.currentAlliance.trim()) {
          errors.currentAlliance = 'Enter your current alliance name or tag.';
        }
        if (!parseMagnitude(draft.f1)) {
          errors.f1 = 'Enter a positive F1 arena power (e.g. 12.5M).';
        }
        if (!parseMagnitude(draft.f2)) {
          errors.f2 = 'Enter a positive F2 arena power (e.g. 11M).';
        }
        if (!parseMagnitude(draft.f3)) {
          errors.f3 = 'Enter a positive F3 arena power (e.g. 10M).';
        }
        break;
      }

      case 'migration':
      case '/apply/migration': {
        // Step 3: Migration Details
        if (!draft.migrationType) {
          errors.migrationType = 'Select individual or group migration.';
        }
        if (draft.migrationType === 'Group' && !draft.representative.trim()) {
          errors.representative = "Enter the group representative's in-game name.";
        }
        if (!draft.preferredAlliances.length) {
          errors.preferredAlliances = 'Choose "Any alliance" or select at least one destination.';
        }
        if (draft.reason.trim().length < 10) {
          errors.reason = 'Please write at least 10 characters explaining why you want to migrate.';
        }
        if (draft.reason.length > 1000) {
          errors.reason = 'Keep your reason to 1,000 characters or fewer.';
        }
        if (draft.comments.length > 1000) {
          errors.comments = 'Keep additional comments to 1,000 characters or fewer.';
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
