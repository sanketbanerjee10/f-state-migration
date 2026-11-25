import { SIEGE_DIFFICULTIES, type SiegeDifficulty } from './SiegeRules';

export type SiegeNavigationState =
  | { readonly screen: 'difficulty' }
  | { readonly screen: 'levels'; readonly difficulty: SiegeDifficulty };

const SIEGE_SCREEN_PARAM = 'siege';
const SIEGE_DIFFICULTY_PARAM = 'siegeDifficulty';
const SIEGE_LEVEL_PARAM = 'siegeLevel';

function isSiegeDifficulty(value: string | null): value is SiegeDifficulty {
  return value !== null &&
    SIEGE_DIFFICULTIES.some((difficulty) => difficulty === value);
}

function writeUrl(url: URL, replace: boolean): void {
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function getSiegeNavigationState(search: string): SiegeNavigationState | null {
  const params = new URLSearchParams(search);
  const screen = params.get(SIEGE_SCREEN_PARAM);
  if (screen === 'difficulty') return { screen };

  const difficulty = params.get(SIEGE_DIFFICULTY_PARAM);
  if (!isSiegeDifficulty(difficulty)) return null;
  if (screen === 'levels' || screen === 'playing') {
    return { screen: 'levels', difficulty };
  }
  return null;
}

export function setSiegeNavigationState(
  state: SiegeNavigationState,
  replace = true,
): void {
  const url = new URL(window.location.href);
  url.searchParams.set(SIEGE_SCREEN_PARAM, state.screen);
  if (state.screen === 'difficulty') {
    url.searchParams.delete(SIEGE_DIFFICULTY_PARAM);
  } else {
    url.searchParams.set(SIEGE_DIFFICULTY_PARAM, state.difficulty);
  }
  url.searchParams.delete(SIEGE_LEVEL_PARAM);
  writeUrl(url, replace);
}

export function clearSiegeNavigationState(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SIEGE_SCREEN_PARAM);
  url.searchParams.delete(SIEGE_DIFFICULTY_PARAM);
  url.searchParams.delete(SIEGE_LEVEL_PARAM);
  writeUrl(url, true);
}
