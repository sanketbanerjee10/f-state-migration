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
  saveGamePlayerAvatar,
  type GameLeaderboardEntry,
  type GameScoreSubmission,
} from '@/lib/gameApi';
import type { GamePlayerAvatar } from '@/lib/gamePlayerAvatar';

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
  createAccount: (username: string, password: string, avatar: GamePlayerAvatar) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  updateAvatar: (avatar: GamePlayerAvatar) => Promise<void>;
  signOut: () => Promise<void>;
  refreshBestScore: () => Promise<void>;
  recordScoreIfBest: (score: GameScoreSubmission) => Promise<{
    submitted: boolean;
    isPersonalBest: boolean;
    bestScore: GameLeaderboardEntry | null;
  }>;
}

const GamePlayerAuthContext = createContext<GamePlayerAuthContextValue | null>(null);

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
        setAccount({
          status: 'authenticated',
          username: session.username,
          avatar: session.avatar,
          sessionError: false,
        });
        void loadBestScore(session.username);
      } else {
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
  }, [loadBestScore]);

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

  const value = useMemo<GamePlayerAuthContextValue>(() => ({
    account,
    bestScore,
    async createAccount(username, password, avatar) {
      const session = await registerGamePlayer({ username, password }, avatar);
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
  }), [account, bestScore, loadBestScore]);

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
