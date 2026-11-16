import { GameCanvas } from '@/components/game/GameCanvas';
import { GamePlayerAuthProvider } from '@/components/game/GamePlayerAuthProvider';

export function GamePage() {
  return (
    <main className="game-screen" data-testid="game-page">
      <GamePlayerAuthProvider>
        <GameCanvas />
      </GamePlayerAuthProvider>
    </main>
  );
}
