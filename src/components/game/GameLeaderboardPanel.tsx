import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useGameLeaderboard } from '@/lib/gameApi';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';

const PAGE_SIZE = 10;
const MAX_LEADERBOARD_OFFSET = 10_000;

interface GameLeaderboardPanelProps {
  readonly onBack?: () => void;
  readonly backLabel?: string;
}

function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function GameLeaderboardPanel({
  onBack,
  backLabel,
}: GameLeaderboardPanelProps) {
  const { t } = useTranslation();
  const resolvedBackLabel = backLabel ?? t('game.menu.backToMenu');
  const [offset, setOffset] = useState(0);
  const leaderboard = useGameLeaderboard({ limit: PAGE_SIZE, offset });
  const page = leaderboard.data;

  return (
    <section className="game-leaderboard" aria-labelledby="game-leaderboard-title">
      <header className="game-leaderboard-heading">
        <div className="game-leaderboard-brand">
          {onBack && (
            <button
              className="game-level-back-button"
              type="button"
              onClick={onBack}
              aria-label={resolvedBackLabel}
              autoFocus
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}
          <div>
            <p className="game-dialog-wordmark">
              <GameFranchiseWordmark />
            </p>
            <h1 id="game-leaderboard-title">{t('game.leaderboard.title')}</h1>
          </div>
        </div>
      </header>
      <p className="game-leaderboard-ranking">{t('game.leaderboard.ranking')}</p>
      {leaderboard.isPending ? (
        <p className="game-leaderboard-message" role="status">
          {t('game.leaderboard.loading')}
        </p>
      ) : leaderboard.isError ? (
        <div className="game-leaderboard-message" role="alert">
          <p>
            {leaderboard.error instanceof Error
              ? leaderboard.error.message
              : t('game.leaderboard.loadFailed')}
          </p>
          <button
            className="game-menu-secondary"
            type="button"
            disabled={leaderboard.isFetching}
            onClick={() => void leaderboard.refetch()}
          >
            {t(leaderboard.isFetching ? 'game.leaderboard.retrying' : 'game.leaderboard.retry')}
          </button>
        </div>
      ) : page && page.items.length === 0 ? (
        <p className="game-leaderboard-message" role="status">
          {t('game.leaderboard.empty')}
        </p>
      ) : page ? (
        <>
          <div className="game-leaderboard-table-wrap">
            <table className="game-leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{t('game.leaderboard.player')}</th>
                  <th scope="col">{t('game.leaderboard.cleared')}</th>
                  <th scope="col">{t('game.leaderboard.score')}</th>
                  <th scope="col">{t('game.leaderboard.kills')}</th>
                  <th scope="col">{t('game.leaderboard.time')}</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((entry, index) => {
                  const rank = offset + index + 1;

                  return (
                    <tr
                      className={rank <= 3 ? `game-leaderboard-top-${rank}` : undefined}
                      key={`${entry.createdAt}-${entry.playerName}-${index}`}
                    >
                      <td>
                        <span className="game-leaderboard-rank">
                          {String(rank).padStart(2, '0')}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.playerName}</strong>
                        <span className="game-leaderboard-reached">
                          {t('game.leaderboard.reached', { wave: entry.waveReached })}
                        </span>
                      </td>
                      <td>{entry.waveCleared}</td>
                      <td>{entry.score.toLocaleString()}</td>
                      <td>{entry.zombiesKilled.toLocaleString()}</td>
                      <td>{formatSeconds(entry.survivalTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="game-leaderboard-pagination">
            <span>
              {page.total === 0
                ? t('game.leaderboard.entries', { count: 0 })
                : t('game.leaderboard.range', {
                    start: offset + 1,
                    end: offset + page.items.length,
                    total: page.total,
                  })}
            </span>
            <div>
              <button
                className="game-menu-secondary"
                type="button"
                disabled={offset === 0 || leaderboard.isFetching}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                {t('game.leaderboard.previous')}
              </button>
              <button
                className="game-menu-secondary"
                type="button"
                disabled={
                  !page ||
                  offset + PAGE_SIZE >= page.total ||
                  offset >= MAX_LEADERBOARD_OFFSET ||
                  leaderboard.isFetching
                }
                onClick={() => setOffset(Math.min(MAX_LEADERBOARD_OFFSET, offset + PAGE_SIZE))}
              >
                {t('game.leaderboard.next')}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
