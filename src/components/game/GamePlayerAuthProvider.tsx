import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  forgetGamePlayerBestScoreCache,
  loadGamePlayerBestScore,
  recordGameScoreIfPersonalBest,
  refreshGamePlayerBestScore,
  retryPendingGameScore,
} from '@/lib/gameScoreTracker';
import {
  getGamePlayerSession,
  loginGamePlayer,
  logoutGamePlayer,
  registerGamePlayer,
  saveGamePlayerCampaignProgress,
  saveGamePlayerAvatar,
  saveGamePlayerDiscoveries,
  saveGamePlayerSiegeProgress,
  type GameLeaderboardEntry,
  type GamePlayerProgress,
  type GameScoreSubmission,
} from '@/lib/gameApi';
import type { GamePlayerAvatar } from '@/lib/gamePlayerAvatar';
import {
  createDefaultLevelCampaignProgress,
  readLevelCampaignProgress,
  saveLevelCampaignProgress as saveLocalCampaignProgress,
} from '@/game/core/LevelCampaign';
import {
  createDefaultSiegeProgress,
  readSiegeProgress,
  saveSiegeProgress as saveLocalSiegeProgress,
} from '@/game/siege/SiegeProgress';
import {
  getEnemyDiscoveryStorage,
  readDiscoveredBosses,
  readDiscoveredEnemies,
  writeDiscoveredBosses,
  writeDiscoveredEnemies,
} from '@/game/discovery/EnemyDiscovery';

type GamePlayerAccountState =
  | { status: 'loading'; username: null; avatar: null; sessionError: false }
  | { status: 'guest'; username: null; avatar: null; sessionError: boolean }
  | { status: 'authenticated'; username: string; avatar: GamePlayerAvatar; sessionError: false };

export type GamePlayerBestScoreState =
  | { status: 'loading'; score: null; error: null }
  | { status: 'ready'; score: GameLeaderboardEntry | null; error: null }
  | { status: 'error'; score: null; error: unknown };

interface GamePlayerAuthContextValue {
  account: GamePlayerAccountState;
  bestScore: GamePlayerBestScoreState;
  playerProgress: GamePlayerProgress | null;
  createAccount: (username: string, password: string, avatar: GamePlayerAvatar) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  updateAvatar: (avatar: GamePlayerAvatar) => Promise<void>;
  signOut: () => Promise<void>;
  saveCampaignProgress: (progress: GamePlayerProgress['campaign']) => Promise<void>;
  saveSiegeProgress: (progress: GamePlayerProgress['siege']) => Promise<void>;
  saveDiscoveries: (discoveries: GamePlayerProgress['discoveries']) => Promise<void>;
  refreshBestScore: () => Promise<void>;
  recordScoreIfBest: (score: GameScoreSubmission) => Promise<{
    submitted: boolean;
    isPersonalBest: boolean;
    bestScore: GameLeaderboardEntry | null;
  }>;
}

const GamePlayerAuthContext = createContext<GamePlayerAuthContextValue | null>(null);
const PENDING_PROGRESS_KEY_PREFIX = 'state565.gameProgressPending.v1.';

type PendingGamePlayerProgress = Partial<GamePlayerProgress>;

function getPendingProgressKey(username: string): string {
  return `${PENDING_PROGRESS_KEY_PREFIX}${encodeURIComponent(username.trim().toLowerCase())}`;
}

function readPendingProgress(username: string): PendingGamePlayerProgress {
  try {
    const raw = localStorage.getItem(getPendingProgressKey(username));
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    return value as PendingGamePlayerProgress;
  } catch (error) {
    console.error('Unable to read pending player progress from browser storage.', error);
    return {};
  }
}

function writePendingProgress(
  username: string,
  progress: PendingGamePlayerProgress,
): void {
  try {
    const key = getPendingProgressKey(username);
    if (Object.keys(progress).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Unable to persist pending player progress in browser storage.', error);
  }
}

function readLocalPlayerProgress(): GamePlayerProgress {
  const discoveryStorage = getEnemyDiscoveryStorage();
  return {
    campaign: readLevelCampaignProgress(),
    siege: readSiegeProgress(),
    discoveries: {
      enemies: [...readDiscoveredEnemies(discoveryStorage)],
      bosses: [...readDiscoveredBosses(discoveryStorage)],
    },
  };
}

function hasSavedPlayerProgress(progress: GamePlayerProgress): boolean {
  return progress.campaign.completedLevelIds.length > 0
    || progress.campaign.statPoints > 0
    || progress.campaign.rarePoints > 0
    || Object.keys(progress.siege.levels).length > 0
    || progress.discoveries.enemies.length > 0
    || progress.discoveries.bosses.length > 0;
}

function applyPlayerProgressLocally(progress: GamePlayerProgress): void {
  saveLocalCampaignProgress(progress.campaign);
  saveLocalSiegeProgress(progress.siege);
  const storage = getEnemyDiscoveryStorage();
  writeDiscoveredEnemies(storage, progress.discoveries.enemies);
  writeDiscoveredBosses(storage, progress.discoveries.bosses);
}

export function GamePlayerAuthProvider({ children }: { readonly children: ReactNode }) {
  const [account, setAccount] = useState<GamePlayerAccountState>({
    status: 'loading',
    username: null,
    avatar: null,
    sessionError: false,
  });
  const [bestScore, setBestScore] = useState<GamePlayerBestScoreState>({
    status: 'loading',
    score: null,
    error: null,
  });
  const [playerProgress, setPlayerProgress] = useState<GamePlayerProgress | null>(null);

  const hydratePlayerProgress = useCallback(async (username: string, serverProgress: GamePlayerProgress) => {
    let resolvedProgress = serverProgress;
    const localProgress = readLocalPlayerProgress();
    const importedLegacyProgress = !hasSavedPlayerProgress(serverProgress)
      && hasSavedPlayerProgress(localProgress);
    if (importedLegacyProgress) resolvedProgress = localProgress;

    const pending = readPendingProgress(username);
    resolvedProgress = {
      campaign: pending.campaign ?? resolvedProgress.campaign,
      siege: pending.siege ?? resolvedProgress.siege,
      discoveries: pending.discoveries ?? resolvedProgress.discoveries,
    };
    try {
      applyPlayerProgressLocally(resolvedProgress);
    } catch (error) {
      console.error('Unable to hydrate player progress into browser storage.', error);
    }
    setPlayerProgress(resolvedProgress);

    const nextPending: PendingGamePlayerProgress = { ...pending };
    const shouldUploadCampaign = importedLegacyProgress || pending.campaign !== undefined;
    const shouldUploadSiege = importedLegacyProgress || pending.siege !== undefined;
    const shouldUploadDiscoveries = importedLegacyProgress || pending.discoveries !== undefined;
    if (shouldUploadCampaign) {
      try {
        await saveGamePlayerCampaignProgress(resolvedProgress.campaign);
        delete nextPending.campaign;
      } catch (error) {
        nextPending.campaign = resolvedProgress.campaign;
        console.error('Unable to sync campaign progress after sign-in.', error);
      }
    }
    if (shouldUploadSiege) {
      try {
        await saveGamePlayerSiegeProgress(resolvedProgress.siege);
        delete nextPending.siege;
      } catch (error) {
        nextPending.siege = resolvedProgress.siege;
        console.error('Unable to sync Siege progress after sign-in.', error);
      }
    }
    if (shouldUploadDiscoveries) {
      try {
        await saveGamePlayerDiscoveries(resolvedProgress.discoveries);
        delete nextPending.discoveries;
      } catch (error) {
        nextPending.discoveries = resolvedProgress.discoveries;
        console.error('Unable to sync guide discoveries after sign-in.', error);
      }
    }
    writePendingProgress(username, nextPending);
  }, []);

  const loadBestScore = useCallback(async (username: string) => {
    setBestScore({ status: 'loading', score: null, error: null });
    try {
      const score = await loadGamePlayerBestScore(username);
      setBestScore({ status: 'ready', score, error: null });
    } catch (error) {
      setBestScore({ status: 'error', score: null, error });
    }
  }, []);

  useEffect(() => {
    let active = true;
    getGamePlayerSession().then((session) => {
      if (!active) return;
      if (session.authenticated) {
        await hydratePlayerProgress(session.username, session.progress);
        if (!active) return;
        setAccount({
          status: 'authenticated',
          username: session.username,
          avatar: session.avatar,
          sessionError: false,
        });
        void loadBestScore(session.username);
      } else {
        setPlayerProgress(null);
        setAccount({ status: 'guest', username: null, avatar: null, sessionError: false });
        setBestScore({ status: 'ready', score: null, error: null });
      }
    }).catch(() => {
      if (!active) return;
      setAccount({
        status: 'guest',
        username: null,
        avatar: null,
        sessionError: true,
      });
      setBestScore({ status: 'error', score: null, error: new Error('Could not load player session.') });
    });
    return () => {
      active = false;
    };
  }, [hydratePlayerProgress, loadBestScore]);

  useEffect(() => {
    if (account.status !== 'authenticated' || bestScore.status !== 'ready') return;

    const retryPending = () => {
      if (!navigator.onLine) return;
      void retryPendingGameScore(account.username).catch((error: unknown) => {
        console.error('Unable to retry the pending game best score.', error);
      });
    };
    retryPending();
    window.addEventListener('online', retryPending);
    return () => window.removeEventListener('online', retryPending);
  }, [account, bestScore.status]);

  useEffect(() => {
    if (account.status !== 'authenticated' || !navigator.onLine) return;
    const pending = readPendingProgress(account.username);
    const retryPending = async () => {
      const current = readPendingProgress(account.username);
      if (current.campaign) {
        try {
          await saveGamePlayerCampaignProgress(current.campaign);
          delete current.campaign;
        } catch (error) {
          console.error('Unable to retry pending campaign progress.', error);
        }
      }
      if (current.siege) {
        try {
          await saveGamePlayerSiegeProgress(current.siege);
          delete current.siege;
        } catch (error) {
          console.error('Unable to retry pending Siege progress.', error);
        }
      }
      if (current.discoveries) {
        try {
          await saveGamePlayerDiscoveries(current.discoveries);
          delete current.discoveries;
        } catch (error) {
          console.error('Unable to retry pending guide discoveries.', error);
        }
      }
      writePendingProgress(account.username, current);
    };
    if (Object.keys(pending).length > 0) void retryPending();
    window.addEventListener('online', retryPending);
    return () => window.removeEventListener('online', retryPending);
  }, [account]);

  const value = useMemo<GamePlayerAuthContextValue>(() => ({
    account,
    bestScore,
    playerProgress,
    async createAccount(username, password, avatar) {
      const session = await registerGamePlayer({ username, password }, avatar);
      await hydratePlayerProgress(session.username, session.progress);
      setAccount({
        status: 'authenticated',
        username: session.username,
        avatar: session.avatar,
        sessionError: false,
      });
      await loadBestScore(session.username);
    },
    async signIn(username, password) {
      const session = await loginGamePlayer({ username, password });
      await hydratePlayerProgress(session.username, session.progress);
      setAccount({
        status: 'authenticated',
        username: session.username,
        avatar: session.avatar,
        sessionError: false,
      });
      await loadBestScore(session.username);
    },
    async updateAvatar(avatar) {
      const session = await saveGamePlayerAvatar(avatar);
      setAccount({
        status: 'authenticated',
        username: session.username,
        avatar: session.avatar,
        sessionError: false,
      });
    },
    async signOut() {
      await logoutGamePlayer();
      if (account.status === 'authenticated') {
        forgetGamePlayerBestScoreCache(account.username);
      }
      setAccount({ status: 'guest', username: null, avatar: null, sessionError: false });
      setBestScore({ status: 'ready', score: null, error: null });
      setPlayerProgress(null);
    },
    async saveCampaignProgress(progress) {
      try {
        saveLocalCampaignProgress(progress);
      } catch (error) {
        console.error('Unable to save campaign progress locally.', error);
        throw error;
      }
      const next = {
        ...(playerProgress ?? {
          campaign: createDefaultLevelCampaignProgress(),
          siege: createDefaultSiegeProgress(),
          discoveries: { enemies: [], bosses: [] },
        }),
        campaign: progress,
      };
      setPlayerProgress(next);
      if (account.status !== 'authenticated') return;
      try {
        await saveGamePlayerCampaignProgress(progress);
        const pending = readPendingProgress(account.username);
        delete pending.campaign;
        writePendingProgress(account.username, pending);
      } catch (error) {
        writePendingProgress(account.username, {
          ...readPendingProgress(account.username),
          campaign: progress,
        });
        throw error;
      }
    },
    async saveSiegeProgress(progress) {
      try {
        saveLocalSiegeProgress(progress);
      } catch (error) {
        console.error('Unable to save Siege progress locally.', error);
        throw error;
      }
      const next = {
        ...(playerProgress ?? {
          campaign: createDefaultLevelCampaignProgress(),
          siege: createDefaultSiegeProgress(),
          discoveries: { enemies: [], bosses: [] },
        }),
        siege: progress,
      };
      setPlayerProgress(next);
      if (account.status !== 'authenticated') return;
      try {
        await saveGamePlayerSiegeProgress(progress);
        const pending = readPendingProgress(account.username);
        delete pending.siege;
        writePendingProgress(account.username, pending);
      } catch (error) {
        writePendingProgress(account.username, {
          ...readPendingProgress(account.username),
          siege: progress,
        });
        throw error;
      }
    },
    async saveDiscoveries(discoveries) {
      const storage = getEnemyDiscoveryStorage();
      writeDiscoveredEnemies(storage, discoveries.enemies);
      writeDiscoveredBosses(storage, discoveries.bosses);
      const next = {
        ...(playerProgress ?? {
          campaign: createDefaultLevelCampaignProgress(),
          siege: createDefaultSiegeProgress(),
          discoveries: { enemies: [], bosses: [] },
        }),
        discoveries,
      };
      setPlayerProgress(next);
      if (account.status !== 'authenticated') return;
      try {
        await saveGamePlayerDiscoveries(discoveries);
        const pending = readPendingProgress(account.username);
        delete pending.discoveries;
        writePendingProgress(account.username, pending);
      } catch (error) {
        writePendingProgress(account.username, {
          ...readPendingProgress(account.username),
          discoveries,
        });
        throw error;
      }
    },
    async refreshBestScore() {
      if (account.status !== 'authenticated') {
        throw new Error('Sign in before refreshing the player best score.');
      }
      setBestScore({ status: 'loading', score: null, error: null });
      try {
        const score = await refreshGamePlayerBestScore(account.username);
        setBestScore({ status: 'ready', score, error: null });
      } catch (error) {
        setBestScore({ status: 'error', score: null, error });
        throw error;
      }
    },
    async recordScoreIfBest(score) {
      if (account.status !== 'authenticated') {
        throw new Error('Sign in before recording a Survival leaderboard score.');
      }
      const result = await recordGameScoreIfPersonalBest(account.username, score);
      setBestScore({ status: 'ready', score: result.bestScore, error: null });
      return result;
    },
  }), [account, bestScore, hydratePlayerProgress, loadBestScore, playerProgress]);

  return (
    <GamePlayerAuthContext.Provider value={value}>
      {children}
    </GamePlayerAuthContext.Provider>
  );
}

export function useGamePlayerAuth(): GamePlayerAuthContextValue {
  const context = useContext(GamePlayerAuthContext);
  if (!context) throw new Error('useGamePlayerAuth must be used within GamePlayerAuthProvider.');
  return context;
}
