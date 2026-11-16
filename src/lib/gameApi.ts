import { queryOptions, useQuery } from '@tanstack/react-query';
import { isLeaderboardEligibleGameMode, type GameMode } from '@/game/core/GameState';
import { customFetch, type CustomFetchOptions } from './api-client/custom-fetch';
import type { GamePlayerAvatar } from './gamePlayerAvatar';

export interface GameScoreSubmission {
  gameMode: GameMode;
  score: number;
  waveCleared: number;
  waveReached: number;
  zombiesKilled: number;
  survivalTime: number;
}

export function normalizeGameScoreSubmission(
  score: GameScoreSubmission,
): GameScoreSubmission {
  return {
    ...score,
    survivalTime: Math.floor(score.survivalTime),
  };
}

export interface GameScoreSubmissionResponse {
  message: string;
  scoreReference: string;
  isPersonalBest: boolean;
  bestScore: GameLeaderboardEntry;
}

export interface GamePlayerSession {
  authenticated: true;
  username: string;
  avatar: GamePlayerAvatar;
}

export interface GamePlayerCredentials {
  username: string;
  password: string;
}

export interface GamePlayerUsernameAvailability {
  available: boolean;
}

export interface GameLeaderboardEntry extends Omit<GameScoreSubmission, 'gameMode'> {
  playerName: string;
  avatar: GamePlayerAvatar;
  createdAt: string;
}

export interface GameLeaderboardPage {
  items: GameLeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface GamePlayerBestScoreResponse {
  bestScore: GameLeaderboardEntry | null;
}

export interface GameLeaderboardParams {
  limit?: number;
  offset?: number;
}

const DEFAULT_LEADERBOARD_LIMIT = 20;
const DEFAULT_LEADERBOARD_OFFSET = 0;

function isGameLeaderboardEntry(value: unknown): value is GameLeaderboardEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<GameLeaderboardEntry>;
  const avatar = entry.avatar;
  return typeof entry.playerName === 'string'
    && Number.isSafeInteger(entry.score)
    && Number.isSafeInteger(entry.waveCleared)
    && Number.isSafeInteger(entry.waveReached)
    && Number.isSafeInteger(entry.zombiesKilled)
    && Number.isSafeInteger(entry.survivalTime)
    && typeof entry.createdAt === 'string'
    && Number.isFinite(Date.parse(entry.createdAt))
    && typeof avatar === 'object'
    && avatar !== null
    && typeof avatar.style === 'string'
    && typeof avatar.seed === 'string'
    && typeof avatar.appearance === 'string'
    && typeof avatar.color === 'string'
    && typeof avatar.accessory === 'boolean'
    && typeof avatar.backgroundColor === 'string';
}

export async function submitGameScore(
  score: GameScoreSubmission,
  options?: CustomFetchOptions,
): Promise<GameScoreSubmissionResponse> {
  if (!isLeaderboardEligibleGameMode(score.gameMode)) {
    throw new Error('Level Mode is a campaign experience. Scores here don’t count toward the Survival leaderboard.');
  }

  const normalizedScore = normalizeGameScoreSubmission(score);
  const response = await customFetch<GameScoreSubmissionResponse>('/api/game/scores', {
    ...options,
    method: 'POST',
    skipAuthToken: true,
    body: JSON.stringify(normalizedScore),
  });
  if (
    typeof response.isPersonalBest !== 'boolean'
    || !isGameLeaderboardEntry(response.bestScore)
  ) {
    throw new Error('The game score service returned an invalid best-score response.');
  }
  return response;
}

export async function registerGamePlayer(
  credentials: GamePlayerCredentials,
  avatar: GamePlayerAvatar,
): Promise<GamePlayerSession> {
  return customFetch<GamePlayerSession>('/api/game/account/register', {
    method: 'POST',
    skipAuthToken: true,
    body: JSON.stringify({ ...credentials, avatar }),
  });
}

export async function checkGamePlayerUsernameAvailability(
  username: string,
  options?: CustomFetchOptions,
): Promise<GamePlayerUsernameAvailability> {
  const query = new URLSearchParams({ username });
  return customFetch<GamePlayerUsernameAvailability>(
    `/api/game/account/availability?${query}`,
    {
      ...options,
      method: 'GET',
      skipAuthToken: true,
    },
  );
}

export async function loginGamePlayer(
  credentials: GamePlayerCredentials,
): Promise<GamePlayerSession> {
  return customFetch<GamePlayerSession>('/api/game/account/login', {
    method: 'POST',
    skipAuthToken: true,
    body: JSON.stringify(credentials),
  });
}

export async function getGamePlayerSession(
  options?: CustomFetchOptions,
): Promise<GamePlayerSession | { authenticated: false }> {
  return customFetch<GamePlayerSession | { authenticated: false }>('/api/game/account/session', {
    ...options,
    method: 'GET',
    skipAuthToken: true,
  });
}

export async function saveGamePlayerAvatar(
  avatar: GamePlayerAvatar,
): Promise<GamePlayerSession> {
  return customFetch<GamePlayerSession>('/api/game/account/avatar', {
    method: 'PATCH',
    skipAuthToken: true,
    body: JSON.stringify(avatar),
  });
}

export async function logoutGamePlayer(): Promise<{ authenticated: false }> {
  return customFetch<{ authenticated: false }>('/api/game/account/logout', {
    method: 'POST',
    skipAuthToken: true,
  });
}

export async function getGameLeaderboard(
  params: GameLeaderboardParams = {},
  options?: CustomFetchOptions,
): Promise<GameLeaderboardPage> {
  const query = new URLSearchParams({
    limit: String(params.limit ?? DEFAULT_LEADERBOARD_LIMIT),
    offset: String(params.offset ?? DEFAULT_LEADERBOARD_OFFSET),
  });
  return customFetch<GameLeaderboardPage>(`/api/game/leaderboard?${query}`, {
    ...options,
    method: 'GET',
  });
}

export async function getGamePlayerBestScore(
  options?: CustomFetchOptions,
): Promise<GamePlayerBestScoreResponse> {
  const response = await customFetch<GamePlayerBestScoreResponse>('/api/game/account/best-score', {
    ...options,
    method: 'GET',
    skipAuthToken: true,
  });
  if (
    !response
    || !Object.prototype.hasOwnProperty.call(response, 'bestScore')
    || (response.bestScore !== null && !isGameLeaderboardEntry(response.bestScore))
  ) {
    throw new Error('The game score service returned an invalid best-score response.');
  }
  return response;
}

export function getGameLeaderboardQueryOptions(params: GameLeaderboardParams = {}) {
  const normalizedParams = {
    limit: params.limit ?? DEFAULT_LEADERBOARD_LIMIT,
    offset: params.offset ?? DEFAULT_LEADERBOARD_OFFSET,
  };

  return queryOptions({
    queryKey: ['game', 'leaderboard', normalizedParams] as const,
    queryFn: ({ signal }) => getGameLeaderboard(normalizedParams, { signal }),
  });
}

export function useGameLeaderboard(
  params: GameLeaderboardParams = {},
  enabled = true,
) {
  return useQuery({
    ...getGameLeaderboardQueryOptions(params),
    enabled,
  });
}
