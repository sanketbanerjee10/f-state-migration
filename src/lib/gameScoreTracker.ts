import { isLeaderboardEligibleGameMode } from '@/game/core/GameState';
import {
  getGamePlayerBestScore,
  normalizeGameScoreSubmission,
  submitGameScore,
  type GameLeaderboardEntry,
  type GameScoreSubmission,
  type GameScoreSubmissionResponse,
} from './gameApi';

type CachedPlayerScore =
  | { status: 'ready'; bestScore: GameLeaderboardEntry | null; pendingScore: GameScoreSubmission | null }
  | { status: 'failed'; error: unknown };

export interface GameScoreRecordingResult {
  submitted: boolean;
  isPersonalBest: boolean;
  bestScore: GameLeaderboardEntry | null;
}

const scoreCache = new Map<string, CachedPlayerScore>();
const scoreLoads = new Map<string, Promise<GameLeaderboardEntry | null>>();
const scoreSubmissions = new Map<string, Promise<GameScoreRecordingResult>>();
const PENDING_SCORE_KEY_PREFIX = 'state565.gameScorePending.v1.';

function getAccountCacheKey(username: string): string {
  const cacheKey = username.trim().toLowerCase();
  if (!cacheKey) throw new Error('A signed-in player username is required to track a best score.');
  return cacheKey;
}

function getPendingScoreStorageKey(cacheKey: string): string {
  return `${PENDING_SCORE_KEY_PREFIX}${cacheKey}`;
}

function isValidPendingScore(value: unknown): value is GameScoreSubmission {
  if (!value || typeof value !== 'object') return false;
  const score = value as Partial<GameScoreSubmission>;
  return isLeaderboardEligibleGameMode(score.gameMode)
    && Number.isSafeInteger(score.score) && score.score! >= 0 && score.score! <= 1_000_000_000
    && Number.isSafeInteger(score.waveCleared) && score.waveCleared! >= 0 && score.waveCleared! <= 10_000
    && Number.isSafeInteger(score.waveReached) && score.waveReached! >= score.waveCleared!
    && score.waveReached! <= 10_000
    && Number.isSafeInteger(score.zombiesKilled) && score.zombiesKilled! >= 0
    && score.zombiesKilled! <= 1_000_000
    && Number.isSafeInteger(score.survivalTime) && score.survivalTime! >= 0
    && score.survivalTime! <= 86_400;
}

function readPendingScore(cacheKey: string): GameScoreSubmission | null {
  if (typeof localStorage === 'undefined') return null;
  const storageKey = getPendingScoreStorageKey(cacheKey);
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (isValidPendingScore(parsed)) return parsed;
    localStorage.removeItem(storageKey);
    return null;
  } catch (error) {
    console.error('Unable to read a pending game score from browser storage.', error);
    return null;
  }
}

function writePendingScore(cacheKey: string, score: GameScoreSubmission | null): void {
  if (typeof localStorage === 'undefined') return;
  const storageKey = getPendingScoreStorageKey(cacheKey);
  try {
    if (score) localStorage.setItem(storageKey, JSON.stringify(score));
    else localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Unable to persist a pending game score in browser storage.', error);
  }
}

function setCache(cacheKey: string, value: CachedPlayerScore): void {
  scoreCache.set(cacheKey, value);
  if (value.status === 'ready') writePendingScore(cacheKey, value.pendingScore);
}

export function isGameScoreBetter(
  candidate: Pick<GameScoreSubmission, 'waveCleared' | 'score' | 'zombiesKilled' | 'survivalTime'>,
  currentBest: Pick<GameLeaderboardEntry, 'waveCleared' | 'score' | 'zombiesKilled' | 'survivalTime'> | null,
): boolean {
  if (!currentBest) return true;
  return candidate.waveCleared > currentBest.waveCleared ||
    (candidate.waveCleared === currentBest.waveCleared && candidate.score > currentBest.score) ||
    (candidate.waveCleared === currentBest.waveCleared
      && candidate.score === currentBest.score
      && candidate.zombiesKilled > currentBest.zombiesKilled) ||
    (candidate.waveCleared === currentBest.waveCleared
      && candidate.score === currentBest.score
      && candidate.zombiesKilled === currentBest.zombiesKilled
      && candidate.survivalTime > currentBest.survivalTime);
}

export async function loadGamePlayerBestScore(username: string): Promise<GameLeaderboardEntry | null> {
  const cacheKey = getAccountCacheKey(username);
  const cached = scoreCache.get(cacheKey);
  if (cached?.status === 'ready') return cached.bestScore;
  if (cached?.status === 'failed') throw cached.error;
  const pendingLoad = scoreLoads.get(cacheKey);
  if (pendingLoad) return pendingLoad;

  const load = getGamePlayerBestScore().then(({ bestScore }) => {
    setCache(cacheKey, {
      status: 'ready',
      bestScore,
      pendingScore: readPendingScore(cacheKey),
    });
    return bestScore;
  }).catch((error: unknown) => {
    const pendingScore = readPendingScore(cacheKey);
    if (pendingScore) {
      setCache(cacheKey, { status: 'ready', bestScore: null, pendingScore });
      return null;
    }
    scoreCache.set(cacheKey, { status: 'failed', error });
    throw error;
  }).finally(() => {
    scoreLoads.delete(cacheKey);
  });
  scoreLoads.set(cacheKey, load);
  return load;
}

export async function refreshGamePlayerBestScore(
  username: string,
): Promise<GameLeaderboardEntry | null> {
  const cacheKey = getAccountCacheKey(username);
  try {
    const { bestScore } = await getGamePlayerBestScore();
    const cached = scoreCache.get(cacheKey);
    setCache(cacheKey, {
      status: 'ready',
      bestScore,
      pendingScore: cached?.status === 'ready'
        ? cached.pendingScore
        : readPendingScore(cacheKey),
    });
    scoreLoads.delete(cacheKey);
    return bestScore;
  } catch (error) {
    const cached = scoreCache.get(cacheKey);
    const pendingScore = cached?.status === 'ready'
      ? cached.pendingScore
      : readPendingScore(cacheKey);
    if (pendingScore) {
      setCache(cacheKey, {
        status: 'ready',
        bestScore: cached?.status === 'ready' ? cached.bestScore : null,
        pendingScore,
      });
    } else {
      scoreCache.set(cacheKey, { status: 'failed', error });
    }
    scoreLoads.delete(cacheKey);
    throw error;
  }
}

async function recordLoadedGameScoreIfPersonalBest(
  username: string,
  score: GameScoreSubmission,
): Promise<GameScoreRecordingResult> {
  const cacheKey = getAccountCacheKey(username);
  const cached = scoreCache.get(cacheKey);
  if (!cached || cached.status === 'failed') {
    throw cached?.error ?? new Error('The player best score has not been loaded.');
  }

  const pendingScore = cached.pendingScore;
  const shouldSubmitCurrentScore = isGameScoreBetter(score, cached.bestScore);
  if (!pendingScore && !shouldSubmitCurrentScore) {
    return {
      submitted: false,
      isPersonalBest: false,
      bestScore: cached.bestScore,
    };
  }

  const scoreToSubmit = pendingScore && !isGameScoreBetter(score, pendingScore)
    ? pendingScore
    : score;
  setCache(cacheKey, {
    status: 'ready',
    bestScore: cached.bestScore,
    pendingScore: scoreToSubmit,
  });

  const response: GameScoreSubmissionResponse = await submitGameScore(scoreToSubmit);

  setCache(cacheKey, {
    status: 'ready',
    bestScore: response.bestScore,
    pendingScore: null,
  });
  return {
    submitted: true,
    isPersonalBest: response.isPersonalBest,
    bestScore: response.bestScore,
  };
}

export async function recordGameScoreIfPersonalBest(
  username: string,
  score: GameScoreSubmission,
): Promise<GameScoreRecordingResult> {
  const normalizedScore = normalizeGameScoreSubmission(score);
  if (!isLeaderboardEligibleGameMode(normalizedScore.gameMode)) {
    throw new Error('Only Survival runs can be recorded on the leaderboard.');
  }

  const cacheKey = getAccountCacheKey(username);
  if (!scoreCache.has(cacheKey)) await loadGamePlayerBestScore(username);
  const previousSubmission = scoreSubmissions.get(cacheKey);
  if (previousSubmission) await previousSubmission.catch(() => undefined);

  const submission = recordLoadedGameScoreIfPersonalBest(username, normalizedScore);
  scoreSubmissions.set(cacheKey, submission);
  try {
    return await submission;
  } finally {
    if (scoreSubmissions.get(cacheKey) === submission) scoreSubmissions.delete(cacheKey);
  }
}

export async function retryPendingGameScore(
  username: string,
): Promise<GameScoreRecordingResult | null> {
  const cacheKey = getAccountCacheKey(username);
  const activeSubmission = scoreSubmissions.get(cacheKey);
  if (activeSubmission) return activeSubmission;

  let cached = scoreCache.get(cacheKey);
  if (!cached) {
    await loadGamePlayerBestScore(username);
    cached = scoreCache.get(cacheKey);
  }
  if (!cached || cached.status === 'failed' || !cached.pendingScore) return null;

  const submission = submitGameScore(cached.pendingScore).then((response) => {
    setCache(cacheKey, {
      status: 'ready',
      bestScore: response.bestScore,
      pendingScore: null,
    });
    return {
      submitted: true,
      isPersonalBest: response.isPersonalBest,
      bestScore: response.bestScore,
    };
  });
  scoreSubmissions.set(cacheKey, submission);
  try {
    return await submission;
  } finally {
    if (scoreSubmissions.get(cacheKey) === submission) scoreSubmissions.delete(cacheKey);
  }
}

export function clearGamePlayerBestScoreCache(username: string): void {
  forgetGamePlayerBestScoreCache(username);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getPendingScoreStorageKey(getAccountCacheKey(username)));
    } catch (error) {
      console.error('Unable to clear a pending game score from browser storage.', error);
    }
  }
}

export function forgetGamePlayerBestScoreCache(username: string): void {
  const cacheKey = getAccountCacheKey(username);
  scoreCache.delete(cacheKey);
  scoreLoads.delete(cacheKey);
  scoreSubmissions.delete(cacheKey);
}
