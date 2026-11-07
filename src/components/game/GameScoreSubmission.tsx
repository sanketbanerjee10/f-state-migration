import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isLeaderboardEligibleGameMode,
  type GameStateSnapshot,
} from '@/game/core/GameState';
import { useSubmitGameScore } from '@/lib/gameApi';

interface GameScoreSubmissionProps {
  readonly gameState: GameStateSnapshot;
}

export function GameScoreSubmission({ gameState }: GameScoreSubmissionProps) {
  const { t } = useTranslation();
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const submission = useSubmitGameScore();

  if (!isLeaderboardEligibleGameMode(gameState.gameMode)) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = playerName.trim();
    if (!normalizedName) {
      setNameError(t('game.submission.enterName'));
      return;
    }

    setNameError(null);
    submission.mutate({
      gameMode: gameState.gameMode,
      playerName: normalizedName,
      score: gameState.score,
      waveCleared: gameState.statistics.highestWaveCleared,
      waveReached: gameState.statistics.highestWaveReached,
      zombiesKilled: gameState.statistics.zombiesKilled,
      survivalTime: Math.floor(gameState.statistics.survivalSeconds),
    });
  };

  return (
    <section className="game-score-submission" aria-labelledby="game-submit-score-title">
      <h2 id="game-submit-score-title">{t('game.submission.title')}</h2>
      <form onSubmit={submit}>
        <label htmlFor="game-player-name">{t('game.submission.name')}</label>
        <div className="game-score-submit-row">
          <input
            id="game-player-name"
            name="playerName"
            type="text"
            autoComplete="nickname"
            maxLength={32}
            required
            value={playerName}
            disabled={submission.isPending || submission.isSuccess}
            onChange={(event) => setPlayerName(event.currentTarget.value)}
          />
          <button
            className="game-menu-primary"
            type="submit"
            disabled={submission.isPending || submission.isSuccess}
          >
            {submission.isPending
              ? t('game.submission.submitting')
              : submission.isError
                ? t('game.submission.retry')
                : submission.isSuccess
                  ? t('game.submission.submitted')
                  : t('game.submission.submit')}
          </button>
        </div>
      </form>
      {nameError && <p className="game-score-error" role="alert">{nameError}</p>}
      {submission.isSuccess && (
        <p className="game-score-success" role="status">
          {t('game.submission.success')}
        </p>
      )}
      {submission.isError && (
        <p className="game-score-error" role="alert">
          {submission.error instanceof Error
            ? submission.error.message
            : t('game.submission.failed')}
        </p>
      )}
    </section>
  );
}
