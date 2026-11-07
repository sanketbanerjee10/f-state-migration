import { describe, expect, it } from 'vitest';
import { createContaminatedArenaObjects } from '@/game/arena/ContaminatedArenaSystem';
import { getArenaLayoutPool } from '@/game/arena/ArenaSystem';

describe('createContaminatedArenaObjects', () => {
  it('places every contaminated prop once in each layout without overlaps', () => {
    const expectedKinds = [
      'toxic-barrel',
      'chemical-tank',
      'mutagen-container',
      'leaking-pipe',
      'contaminated-puddle',
      'biohazard-waste-bin',
      'broken-ventilation-fan',
    ];

    for (const layout of getArenaLayoutPool('contaminated')) {
      const objects = createContaminatedArenaObjects(layout, 960, 540);

      expect(objects.map((object) => object.kind).sort()).toEqual(
        [...expectedKinds].sort(),
      );
      expect(new Set(objects.map((object) => object.id)).size).toBe(7);
      for (let first = 0; first < objects.length; first += 1) {
        for (let second = first + 1; second < objects.length; second += 1) {
          const a = objects[first]!;
          const b = objects[second]!;
          const overlaps =
            Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
            Math.abs(a.y - b.y) < (a.height + b.height) / 2;
          expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
        }
      }
    }
  });

  it('does not create contaminated props in other arena themes', () => {
    const layout = getArenaLayoutPool('urban')[0]!;
    expect(createContaminatedArenaObjects(layout, 960, 540)).toEqual([]);
  });
});
