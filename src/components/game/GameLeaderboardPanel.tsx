import { useState } from 'react';
import { useGameLeaderboard } from '@/lib/gameApi';

const PAGE_SIZE = 10;
const MAX_LEADERBOARD_OFFSET = 10_000;

interface GameLeaderboardPanelProps {
  readonly onBack?: () => void;
}

function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function GameLeaderboardPanel({ onBack }: GameLeaderboardPanelProps) {
  const [offset, setOffset] = useState(0);
  const leaderboard = useGameLeaderboard({ limit: PAGE_SIZE, offset });
  const page = leaderboard.data;

  return (
    <section className="game-leaderboard" aria-labelledby="game-leaderboard-title">
      <div className="game-leaderboard-heading">
        <div>
          <p className="game-panel-eyebrow">All-time rankings</p>
          <h1 id="game-leaderboard-title">Leaderboard</h1>
        </div>
        {onBack && (
          <button
            className="game-menu-secondary game-leaderboard-back"
            type="button"
            onClick={onBack}
          >
            Back
          </button>
        )}
      </div>
      <p className="game-leaderboard-ranking">
        Ranked by waves cleared, score, zombies eliminated, then survival time.
      </p>
      {leaderboard.isPending ? (
        <p className="game-leaderboard-message" role="status">
          Loading leaderboard…
        </p>
      ) : leaderboard.isError ? (
        <div className="game-leaderboard-message" role="alert">
          <p>
            {leaderboard.error instanceof Error
              ? leaderboard.error.message
              : 'Unable to load leaderboard right now.'}
          </p>
          <button
            className="game-menu-secondary"
            type="button"
            disabled={leaderboard.isFetching}
            onClick={() => void leaderboard.refetch()}
          >
            {leaderboard.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : page && page.items.length === 0 ? (
        <p className="game-leaderboard-message" role="status">
          No runs have been submitted yet. Be the first to set a score.
        </p>
      ) : page ? (
        <>
          <div className="game-leaderboard-table-wrap">
            <table className="game-leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Player</th>
                  <th scope="col">Cleared</th>
                  <th scope="col">Score</th>
                  <th scope="col">Kills</th>
                  <th scope="col">Time</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((entry, index) => (
                  <tr key={`${entry.createdAt}-${entry.playerName}-${index}`}>
                    <td>{offset + index + 1}</td>
                    <td>
                      <strong>{entry.playerName}</strong>
                      <span className="game-leaderboard-reached">
                        Reached {entry.waveReached}
                      </span>
                    </td>
                    <td>{entry.waveCleared}</td>
                    <td>{entry.score.toLocaleString()}</td>
                    <td>{entry.zombiesKilled.toLocaleString()}</td>
                    <td>{formatSeconds(entry.survivalTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="game-leaderboard-pagination">
            <span>
              {page.total === 0
                ? '0 entries'
                : `${offset + 1}–${offset + page.items.length} of ${page.total}`}
            </span>
            <div>
              <button
                className="game-menu-secondary"
                type="button"
                disabled={offset === 0 || leaderboard.isFetching}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
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
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
