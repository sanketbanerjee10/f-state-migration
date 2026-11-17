import { useEffect, useState } from 'react';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GamePlayerAuthProvider } from '@/components/game/GamePlayerAuthProvider';
import { SiegeGame } from '@/components/game/SiegeGame';
import {
  clearSiegeNavigationState,
  getSiegeNavigationState,
  setSiegeNavigationState,
} from '@/game/siege/SiegeNavigation';

function hasSiegeRequest(): boolean {
  if (typeof window === 'undefined') return false;
  return getSiegeNavigationState(window.location.search) !== null ||
    (import.meta.env.DEV &&
      new URLSearchParams(window.location.search).has('siegeLevel'));
}

export function GamePage() {
  const [siegeModeOpen, setSiegeModeOpen] = useState(hasSiegeRequest);

  useEffect(() => {
    const handlePopState = () => setSiegeModeOpen(hasSiegeRequest());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSiege = () => {
    setSiegeNavigationState({ screen: 'difficulty' }, false);
    setSiegeModeOpen(true);
  };

  const closeSiege = () => {
    clearSiegeNavigationState();
    setSiegeModeOpen(false);
  };

  return (
    <main className="game-screen" data-testid="game-page">
      <GamePlayerAuthProvider>
        <GameCanvas onOpenSiege={openSiege} />
        {siegeModeOpen && <SiegeGame onExit={closeSiege} />}
      </GamePlayerAuthProvider>
    </main>
  );
}
