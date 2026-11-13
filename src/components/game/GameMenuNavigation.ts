import type { GameMenuView } from './GameMenuTypes';

const GAME_MENU_QUERY_PARAM = 'gameMenu';
export type GameMenuNavigationState = GameMenuView | 'playing';
const GAME_MENU_VIEWS: ReadonlySet<string> = new Set([
  'home',
  'settings',
  'leaderboard',
  'enemy-guide',
  'level-select',
]);

function isGameMenuNavigationState(
  value: string,
): value is GameMenuNavigationState {
  return value === 'playing' || GAME_MENU_VIEWS.has(value);
}

export function getGameMenuNavigationState(
  search: string,
): GameMenuNavigationState | null {
  const view = new URLSearchParams(search).get(GAME_MENU_QUERY_PARAM);
  return view && isGameMenuNavigationState(view) ? view : null;
}

export function getGameMenuView(
  search: string,
  fallback: GameMenuView,
): GameMenuView {
  const state = getGameMenuNavigationState(search);
  return state && state !== 'playing' ? state : fallback;
}

export function pushGameMenuNavigationState(
  state: GameMenuNavigationState,
): void {
  const url = new URL(window.location.href);
  url.searchParams.set(GAME_MENU_QUERY_PARAM, state);
  window.history.pushState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}
