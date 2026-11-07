import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGameLeaderboard, submitGameScore } from '@/lib/gameApi';

const score = {
  playerName: 'Aster',
  score: 12_000,
  waveCleared: 3,
  waveReached: 4,
  zombiesKilled: 25,
  survivalTime: 300,
};

describe('game API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits a completed run using the game score API contract', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        message: 'Game score submitted.',
        scoreReference: 'public-score-reference',
      }), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(submitGameScore(score)).resolves.toEqual({
      message: 'Game score submitted.',
      scoreReference: 'public-score-reference',
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/game/scores');
    expect(options.method).toBe('POST');
    expect(JSON.parse(String(options.body))).toEqual(score);
  });

  it('requests a leaderboard page with the requested pagination', async () => {
    const page = {
      items: [{ ...score, createdAt: '2026-11-01T10:00:00.000Z' }],
      total: 1,
      limit: 10,
      offset: 20,
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(getGameLeaderboard({ limit: 10, offset: 20 })).resolves.toEqual(page);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/game/leaderboard?limit=10&offset=20');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
  });

  it('preserves API errors for the caller to handle', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid game score.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(submitGameScore(score)).rejects.toMatchObject({ status: 400 });
  });
});
