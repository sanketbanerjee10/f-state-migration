import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkGamePlayerUsernameAvailability,
  getGameLeaderboard,
  getGamePlayerBestScore,
  getGamePlayerSession,
  loginGamePlayer,
  logoutGamePlayer,
  registerGamePlayer,
  saveGamePlayerAvatar,
  submitGameScore,
} from '@/lib/gameApi';
import {
  clearGamePlayerBestScoreCache,
  forgetGamePlayerBestScoreCache,
  isGameScoreBetter,
  recordGameScoreIfPersonalBest,
  retryPendingGameScore,
} from '@/lib/gameScoreTracker';
import { setAuthTokenGetter } from '@/lib/api-client/custom-fetch';
import {
  createDefaultGamePlayerAvatar,
  GAME_PLAYER_AVATAR_APPEARANCES,
  GAME_PLAYER_AVATAR_STYLES,
  normalizeGamePlayerAvatar,
  renderGamePlayerAvatar,
} from '@/lib/gamePlayerAvatar';

const avatar = {
  style: 'micah' as const,
  seed: 'afterhours-ace',
  appearance: 'full',
  color: 'ffeba4',
  accessory: true,
  backgroundColor: '2f1e3e',
};

const score = {
  gameMode: 'survival' as const,
  score: 12_000,
  waveCleared: 3,
  waveReached: 4,
  zombiesKilled: 25,
  survivalTime: 300,
};

const bestScore = {
  playerName: 'Aster',
  avatar,
  score: score.score,
  waveCleared: score.waveCleared,
  waveReached: score.waveReached,
  zombiesKilled: score.zombiesKilled,
  survivalTime: score.survivalTime,
  createdAt: '2026-11-01T10:00:00.000Z',
};

describe('game API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthTokenGetter(null);
    clearGamePlayerBestScoreCache('Aster');
  });

  it('submits a completed run using the game score API contract', async () => {
    const fractionalScore = { ...score, survivalTime: 67.41957200000063 };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        message: 'Game score submitted.',
        scoreReference: 'public-score-reference',
        isPersonalBest: true,
        bestScore,
      }), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(submitGameScore(fractionalScore)).resolves.toEqual({
      message: 'Game score submitted.',
      scoreReference: 'public-score-reference',
      isPersonalBest: true,
      bestScore,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/game/scores');
    expect(options.method).toBe('POST');
    expect(JSON.parse(String(options.body))).toEqual({
      ...fractionalScore,
      survivalTime: 67,
    });
    expect(options.credentials).toBe('include');
  });

  it.each(GAME_PLAYER_AVATAR_STYLES)('renders the %s DiceBear style to a local SVG', (style) => {
    const avatar = {
      ...createDefaultGamePlayerAvatar('render-test'),
      style,
      appearance: GAME_PLAYER_AVATAR_APPEARANCES[style][0]!,
    };

    expect(renderGamePlayerAvatar(avatar)).toMatch(/^data:image\/svg\+xml/);
  });

  it('falls back safely when an account still has a retired DiceBear style', () => {
    const avatar = normalizeGamePlayerAvatar({
      style: 'adventurer',
      seed: 'legacy-player',
      appearance: 'short01',
      color: '603a14',
      accessory: false,
      backgroundColor: '18243b',
    });

    expect(avatar).toMatchObject({
      style: 'avataaars',
      seed: 'legacy-player',
      appearance: 'shortRound',
    });
    expect(renderGamePlayerAvatar(avatar)).toMatch(/^data:image\/svg\+xml/);
  });

  it('requests a leaderboard page with the requested pagination', async () => {
    const page = {
      items: [{
        playerName: 'Aster',
        avatar,
        score: score.score,
        waveCleared: score.waveCleared,
        waveReached: score.waveReached,
        zombiesKilled: score.zombiesKilled,
        survivalTime: score.survivalTime,
        createdAt: '2026-11-01T10:00:00.000Z',
      }],
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

  it('fetches the signed-in player best score through the cookie-backed endpoint', async () => {
    const response = { bestScore };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(getGamePlayerBestScore()).resolves.toEqual(response);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/game/account/best-score');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).has('authorization')).toBe(false);
  });

  it('compares records using the leaderboard ordering', () => {
    expect(isGameScoreBetter({ ...score, waveCleared: 4, score: 1 }, bestScore)).toBe(true);
    expect(isGameScoreBetter({ ...score, waveCleared: 2, score: 1_000_000 }, bestScore)).toBe(false);
    expect(isGameScoreBetter(score, bestScore)).toBe(false);
  });

  it('loads the best once and does not submit runs that fail the local best comparison', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(recordGameScoreIfPersonalBest('Aster', {
      ...score,
      score: 1,
      waveCleared: 2,
    })).resolves.toEqual({
      submitted: false,
      isPersonalBest: false,
      bestScore,
    });
    await recordGameScoreIfPersonalBest('Aster', { ...score, score: 2, waveCleared: 2 });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/game/account/best-score');
  });

  it('submits a new best and caches the authoritative result for later runs', async () => {
    const improvedScore = { ...bestScore, score: 18_000, waveCleared: 4 };
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: 'New personal best recorded.',
        scoreReference: 'new-score-reference',
        isPersonalBest: true,
        bestScore: improvedScore,
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);

    await expect(recordGameScoreIfPersonalBest('Aster', {
      ...score,
      score: improvedScore.score,
      waveCleared: improvedScore.waveCleared,
    })).resolves.toMatchObject({
      submitted: true,
      isPersonalBest: true,
      bestScore: improvedScore,
    });
    await recordGameScoreIfPersonalBest('Aster', {
      ...score,
      score: 1,
      waveCleared: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toBe('/api/game/scores');
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('floors fractional survival time before comparing, persisting, and submitting a run', async () => {
    const improvedScore = {
      ...bestScore,
      score: 18_000,
      waveCleared: 4,
      survivalTime: 67,
    };
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: 'New personal best recorded.',
        scoreReference: 'new-score-reference',
        isPersonalBest: true,
        bestScore: improvedScore,
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);

    await recordGameScoreIfPersonalBest('Aster', {
      ...score,
      score: improvedScore.score,
      waveCleared: improvedScore.waveCleared,
      survivalTime: 67.41957200000063,
    });

    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      survivalTime: 67,
    });
  });

  it('keeps a failed best pending and retries that best before a lower run', async () => {
    const improvedScore = { ...bestScore, score: 18_000, waveCleared: 4 };
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: 'New personal best recorded.',
        scoreReference: 'new-score-reference',
        isPersonalBest: true,
        bestScore: improvedScore,
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);

    await expect(recordGameScoreIfPersonalBest('Aster', {
      ...score,
      score: improvedScore.score,
      waveCleared: improvedScore.waveCleared,
    })).rejects.toMatchObject({ status: 503 });
    await recordGameScoreIfPersonalBest('Aster', { ...score, waveCleared: 3 });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetch.mock.calls[2]?.[1]?.body))).toMatchObject({
      score: improvedScore.score,
      waveCleared: improvedScore.waveCleared,
    });
  });

  it('restores a pending best after the score tracker is reinitialized', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    const improvedScore = { ...score, score: 18_000, waveCleared: 4 };
    const firstFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', firstFetch);

    await expect(recordGameScoreIfPersonalBest('Aster', improvedScore))
      .rejects.toMatchObject({ status: 503 });
    expect(storage.size).toBe(1);
    forgetGamePlayerBestScoreCache('Aster');

    const retryFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bestScore }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        message: 'New personal best recorded.',
        scoreReference: 'new-score-reference',
        isPersonalBest: true,
        bestScore: {
          ...bestScore,
          score: improvedScore.score,
          waveCleared: improvedScore.waveCleared,
        },
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', retryFetch);

    await expect(retryPendingGameScore('Aster')).resolves.toMatchObject({
      submitted: true,
      isPersonalBest: true,
    });
    expect(retryFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(retryFetch.mock.calls[1]?.[1]?.body))).toMatchObject(improvedScore);
    expect(storage.size).toBe(0);
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

  it('does not send non-Survival runs to the score API', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(submitGameScore({ ...score, gameMode: 'level' })).rejects.toThrow(
      'Level Mode is a campaign experience.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the cookie-backed account endpoints without attaching leadership bearer tokens', async () => {
    setAuthTokenGetter(() => 'leadership-session-token');
    const session = { authenticated: true, username: 'Aster', avatar };
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);

    await expect(registerGamePlayer({ username: 'Aster', password: 'a secure passphrase' }, avatar))
      .resolves.toEqual(session);
    await expect(loginGamePlayer({ username: 'Aster', password: 'a secure passphrase' }))
      .resolves.toEqual(session);
    await expect(getGamePlayerSession()).resolves.toEqual(session);
    await expect(saveGamePlayerAvatar(avatar)).resolves.toEqual(session);
    await expect(logoutGamePlayer()).resolves.toEqual({ authenticated: false });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/game/account/register',
      '/api/game/account/login',
      '/api/game/account/session',
      '/api/game/account/avatar',
      '/api/game/account/logout',
    ]);
    expect(fetch.mock.calls.every(([, options]) => options?.credentials === 'include')).toBe(true);
    expect(fetch.mock.calls.every(([, options]) =>
      !new Headers(options?.headers).has('authorization'),
    )).toBe(true);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ username: 'Aster', password: 'a secure passphrase', avatar }),
    });
    expect(fetch.mock.calls[3]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify(avatar),
    });
  });

  it('checks username availability using the cookie-free game account API', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ available: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(checkGamePlayerUsernameAvailability('Aster Name'))
      .resolves.toEqual({ available: false });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      '/api/game/account/availability?username=Aster+Name',
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).has('authorization')).toBe(false);
  });
});
