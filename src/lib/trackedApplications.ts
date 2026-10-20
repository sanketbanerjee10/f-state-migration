export interface TrackedApplicationMeta {
  id: string; // UUID
  reference: string; // 565-XXXXXXXXXXXX
  gameName: string;
  migrationType: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  submittedAt: string;
  lastUpdated: string;
}

const STORAGE_KEY = 'state565_tracked_applications';
const PROMPT_SESSION_KEY = 'state565_welcome_prompt_dismissed_session';

export function getTrackedApplications(): TrackedApplicationMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrackedApplication(meta: TrackedApplicationMeta): void {
  try {
    const current = getTrackedApplications();
    const existingIndex = current.findIndex(
      (item) => item.id.toLowerCase() === meta.id.toLowerCase() || item.reference.toUpperCase() === meta.reference.toUpperCase()
    );

    if (existingIndex >= 0) {
      current[existingIndex] = {
        ...current[existingIndex],
        ...meta,
        lastUpdated: meta.lastUpdated || new Date().toISOString(),
      };
    } else {
      current.unshift({
        ...meta,
        submittedAt: meta.submittedAt || new Date().toISOString(),
        lastUpdated: meta.lastUpdated || new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save tracked application:', err);
  }
}

export function removeTrackedApplication(idOrRef: string): void {
  try {
    const current = getTrackedApplications();
    const filtered = current.filter(
      (item) =>
        item.id.toLowerCase() !== idOrRef.toLowerCase() &&
        item.reference.toUpperCase() !== idOrRef.toUpperCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove tracked application:', err);
  }
}

export function isWelcomePromptDismissed(): boolean {
  try {
    return sessionStorage.getItem(PROMPT_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markWelcomePromptDismissed(): void {
  try {
    sessionStorage.setItem(PROMPT_SESSION_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}
