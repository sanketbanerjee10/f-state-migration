import { GameCanvas } from '@/components/game/GameCanvas';

export function GamePage() {
  return (
    <main className="game-screen" data-testid="game-page">
      <GameCanvas />
    </main>
  );
}
