import { describe, expect, it } from 'vitest';
import { createGameState, createZombie } from '@/game/core/GameState';
import {
  SCREAMER_CONFIG,
  updateScreamerAbilities,
} from '@/game/enemies/ScreamerSystem';
import { BOSS_CONFIG } from '@/game/bosses/BossSystem';

describe('Screamer abilities', () => {
  it('calls one walker reinforcement and respects its cooldown', () => {
    const state = createGameState();
    const screamer = createZombie(10, 'screamer', 200, 200, 13);
    state.zombies = [screamer];

    updateScreamerAbilities(state, 0);

    expect(state.zombies.filter(
      (zombie) => zombie.screamerSummonedBy === screamer.id,
    )).toHaveLength(SCREAMER_CONFIG.summonGroupSize);
    expect(state.zombies.find(
      (zombie) => zombie.screamerSummonedBy === screamer.id,
    )?.type).toBe('walker');
    expect(screamer.specialCooldownSeconds)
      .toBe(SCREAMER_CONFIG.summonIntervalSeconds);
    expect(state.impacts.some((impact) => impact.kind === 'telegraph')).toBe(true);

    updateScreamerAbilities(state, 1);
    expect(state.zombies.filter(
      (zombie) => zombie.screamerSummonedBy === screamer.id,
    )).toHaveLength(SCREAMER_CONFIG.summonGroupSize);
    expect(BOSS_CONFIG.summonGroupSize)
      .toBe(SCREAMER_CONFIG.summonGroupSize * 2);
  });

  it('does not summon when its active support limit is reached', () => {
    const state = createGameState();
    const screamer = createZombie(20, 'screamer', 200, 200, 13);
    const summons = Array.from(
      { length: SCREAMER_CONFIG.maximumActiveSummons },
      (_, index) => {
        const summon = createZombie(21 + index, 'walker', 300 + index * 30, 200, 13);
        summon.screamerSummonedBy = screamer.id;
        return summon;
      },
    );
    state.zombies = [screamer, ...summons];

    updateScreamerAbilities(state, 0);

    expect(state.zombies).toHaveLength(1 + SCREAMER_CONFIG.maximumActiveSummons);
    expect(screamer.specialCooldownSeconds)
      .toBe(SCREAMER_CONFIG.retryIntervalSeconds);
  });
});
