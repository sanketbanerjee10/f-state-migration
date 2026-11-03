import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch, type CustomFetchOptions } from './api-client/custom-fetch';

export interface GameScoreSubmission {
  playerName: string;
  score: number;
  waveCleared: number;
  waveReached: number;
  zombiesKilled: number;
  survivalTime: number;
}

export interface GameScoreSubmissionResponse {
  message: string;
  scoreReference: string;
}

export interface GameLeaderboardEntry extends GameScoreSubmission {
  createdAt: string;
}

export interface GameLeaderboardPage {
  items: GameLeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface GameLeaderboardParams {
  limit?: number;
  offset?: number;
}

const DEFAULT_LEADERBOARD_LIMIT = 20;
const DEFAULT_LEADERBOARD_OFFSET = 0;

export async function submitGameScore(
  score: GameScoreSubmission,
  options?: CustomFetchOptions,
): Promise<GameScoreSubmissionResponse> {
  return customFetch<GameScoreSubmissionResponse>('/api/game/scores', {
    ...options,
    method: 'POST',
    body: JSON.stringify(score),
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

export function useSubmitGameScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (score: GameScoreSubmission) => submitGameScore(score),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['game', 'leaderboard'] });
    },
  });
}
