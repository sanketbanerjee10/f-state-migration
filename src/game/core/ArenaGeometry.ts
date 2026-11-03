import { ARENA_OBSTACLES, type ArenaObstacle } from './GameConfig';

export interface ArenaRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CirclePosition {
  readonly x: number;
  readonly y: number;
}

export function getArenaObstacleBounds(
  obstacle: ArenaObstacle,
  width: number,
  height: number,
): ArenaRectangle {
  return {
    x: width * obstacle.xFraction - obstacle.width / 2,
    y: height * obstacle.yFraction - obstacle.height / 2,
    width: obstacle.width,
    height: obstacle.height,
  };
}

export function getArenaObstacles(
  width: number,
  height: number,
  arenaObstacles: readonly ArenaObstacle[] = ARENA_OBSTACLES,
): readonly ArenaRectangle[] {
  return arenaObstacles.map((obstacle) =>
    getArenaObstacleBounds(obstacle, width, height),
  );
}

export function circleOverlapsRectangle(
  point: CirclePosition,
  radius: number,
  rectangle: ArenaRectangle,
): boolean {
  const nearestX = Math.max(
    rectangle.x,
    Math.min(point.x, rectangle.x + rectangle.width),
  );
  const nearestY = Math.max(
    rectangle.y,
    Math.min(point.y, rectangle.y + rectangle.height),
  );
  const deltaX = point.x - nearestX;
  const deltaY = point.y - nearestY;
  return deltaX * deltaX + deltaY * deltaY < radius * radius;
}

export function findCirclePositionInArena(
  point: CirclePosition,
  radius: number,
  width: number,
  height: number,
  arenaObstacles: readonly ArenaObstacle[] = ARENA_OBSTACLES,
): { x: number; y: number } {
  const obstacles = getArenaObstacles(width, height, arenaObstacles);
  const position = {
    x: Math.min(Math.max(point.x, radius), Math.max(radius, width - radius)),
    y: Math.min(Math.max(point.y, radius), Math.max(radius, height - radius)),
  };

  for (let pass = 0; pass < obstacles.length; pass += 1) {
    const overlapping = obstacles.find((obstacle) =>
      circleOverlapsRectangle(position, radius, obstacle),
    );
    if (!overlapping) return position;

    const candidates = [
      { x: overlapping.x - radius, y: position.y },
      { x: overlapping.x + overlapping.width + radius, y: position.y },
      { x: position.x, y: overlapping.y - radius },
      { x: position.x, y: overlapping.y + overlapping.height + radius },
    ].map((candidate) => ({
      x: Math.min(Math.max(candidate.x, radius), Math.max(radius, width - radius)),
      y: Math.min(Math.max(candidate.y, radius), Math.max(radius, height - radius)),
    })).filter((candidate) =>
      !circleOverlapsRectangle(candidate, radius, overlapping),
    );
    if (candidates.length === 0) break;

    candidates.sort((left, right) =>
      Math.hypot(left.x - position.x, left.y - position.y) -
      Math.hypot(right.x - position.x, right.y - position.y),
    );
    position.x = candidates[0].x;
    position.y = candidates[0].y;
  }
  return position;
}

export function moveCircleInArena(
  point: CirclePosition,
  radius: number,
  deltaX: number,
  deltaY: number,
  width: number,
  height: number,
  arenaObstacles: readonly ArenaObstacle[] = ARENA_OBSTACLES,
): { x: number; y: number } {
  const obstacles = getArenaObstacles(width, height, arenaObstacles);
  const next = findCirclePositionInArena(
    point,
    radius,
    width,
    height,
    arenaObstacles,
  );
  const moveAxis = (
    axis: 'x' | 'y',
    delta: number,
    minimum: number,
    maximum: number,
  ): void => {
    const start = next[axis];
    const end = Math.min(Math.max(start + delta, minimum), maximum);
    const overlaps = (value: number): boolean => {
      const candidate = { ...next, [axis]: value };
      return obstacles.some((obstacle) =>
        circleOverlapsRectangle(candidate, radius, obstacle),
      );
    };
    if (overlaps(start)) {
      if (!overlaps(end)) next[axis] = end;
      return;
    }

    let safeFraction = 0;
    let blockedFraction: number | undefined;
    const stepCount = Math.max(
      1,
      Math.ceil(Math.abs(end - start) / Math.max(radius, 1)),
    );
    for (let step = 1; step <= stepCount; step += 1) {
      const fraction = step / stepCount;
      if (overlaps(start + (end - start) * fraction)) {
        blockedFraction = fraction;
        break;
      }
      safeFraction = fraction;
    }
    if (blockedFraction === undefined) {
      next[axis] = end;
      return;
    }

    let low = safeFraction;
    let high = blockedFraction;
    for (let iteration = 0; iteration < 16; iteration += 1) {
      const fraction = (low + high) / 2;
      if (overlaps(start + (end - start) * fraction)) {
        high = fraction;
      } else {
        low = fraction;
      }
    }
    next[axis] = start + (end - start) * low;
  };

  moveAxis('x', deltaX, radius, Math.max(radius, width - radius));
  moveAxis('y', deltaY, radius, Math.max(radius, height - radius));
  return next;
}

export function segmentIntersectsRectangle(
  start: CirclePosition,
  end: CirclePosition,
  rectangle: ArenaRectangle,
  padding = 0,
): boolean {
  const minX = rectangle.x - padding;
  const maxX = rectangle.x + rectangle.width + padding;
  const minY = rectangle.y - padding;
  const maxY = rectangle.y + rectangle.height + padding;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let minimum = 0;
  let maximum = 1;

  for (const [origin, delta, lower, upper] of [
    [start.x, deltaX, minX, maxX],
    [start.y, deltaY, minY, maxY],
  ] as const) {
    if (delta === 0) {
      if (origin < lower || origin > upper) return false;
      continue;
    }

    let first = (lower - origin) / delta;
    let second = (upper - origin) / delta;
    if (first > second) [first, second] = [second, first];
    minimum = Math.max(minimum, first);
    maximum = Math.min(maximum, second);
    if (minimum > maximum) return false;
  }
  return true;
}

export function findNextPathWaypointInArena(
  start: CirclePosition,
  target: CirclePosition,
  radius: number,
  width: number,
  height: number,
  arenaObstacles: readonly ArenaObstacle[] = ARENA_OBSTACLES,
): CirclePosition {
  const obstacles = getArenaObstacles(width, height, arenaObstacles);
  const padding = radius + 1;
  const isPathClear = (from: CirclePosition, to: CirclePosition): boolean =>
    obstacles.every((obstacle) =>
      !segmentIntersectsRectangle(from, to, obstacle, padding),
    );
  if (isPathClear(start, target)) return target;

  const clearance = radius + 3;
  const waypoints: CirclePosition[] = [start, target];
  for (const obstacle of obstacles) {
    for (const x of [
      obstacle.x - clearance,
      obstacle.x + obstacle.width + clearance,
    ]) {
      for (const y of [
        obstacle.y - clearance,
        obstacle.y + obstacle.height + clearance,
      ]) {
        const corner = { x, y };
        if (
          x < radius ||
          x > width - radius ||
          y < radius ||
          y > height - radius ||
          !isPathClear(corner, corner)
        ) {
          continue;
        }
        waypoints.push(corner);
      }
    }
  }

  const distances = waypoints.map((_, index) =>
    index === 0 ? 0 : Number.POSITIVE_INFINITY,
  );
  const previous = waypoints.map(() => -1);
  const visited = waypoints.map(() => false);

  for (let iteration = 0; iteration < waypoints.length; iteration += 1) {
    let current = -1;
    for (let index = 0; index < waypoints.length; index += 1) {
      if (
        !visited[index] &&
        (current < 0 || distances[index] < distances[current])
      ) {
        current = index;
      }
    }
    if (current < 0 || !Number.isFinite(distances[current])) break;
    if (current === 1) break;
    visited[current] = true;

    for (let neighbor = 0; neighbor < waypoints.length; neighbor += 1) {
      if (
        neighbor === current ||
        visited[neighbor] ||
        !isPathClear(waypoints[current], waypoints[neighbor])
      ) {
        continue;
      }
      const candidateDistance = distances[current] + Math.hypot(
        waypoints[neighbor].x - waypoints[current].x,
        waypoints[neighbor].y - waypoints[current].y,
      );
      if (candidateDistance < distances[neighbor]) {
        distances[neighbor] = candidateDistance;
        previous[neighbor] = current;
      }
    }
  }

  if (previous[1] < 0) return target;
  let next = 1;
  while (previous[next] !== 0 && previous[next] >= 0) {
    next = previous[next];
  }
  return waypoints[next];
}
