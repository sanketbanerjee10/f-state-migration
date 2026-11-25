const MAP_SEGMENT_HEIGHT = 560;
const ROAD_WIDTH_FRACTION = 0.68;

function hash(value: number): number {
  const mixed = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return mixed - Math.floor(mixed);
}

function roadCenter(width: number, worldY: number): number {
  return width * (
    0.5 +
    Math.sin(worldY * 0.0017) * 0.095 +
    Math.sin(worldY * 0.00063 + 1.4) * 0.055
  );
}

function drawRubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(hash(seed) * Math.PI);
  context.fillStyle = 'rgba(13, 19, 17, 0.56)';
  context.strokeStyle = 'rgba(154, 151, 124, 0.24)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-size, -size * 0.15);
  context.lineTo(-size * 0.45, -size * 0.82);
  context.lineTo(size * 0.62, -size * 0.58);
  context.lineTo(size, size * 0.18);
  context.lineTo(size * 0.28, size * 0.72);
  context.lineTo(-size * 0.75, size * 0.58);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawRoadsideDebris(
  context: CanvasRenderingContext2D,
  width: number,
  worldY: number,
  segment: number,
): void {
  const side = hash(segment + 91) < 0.5 ? -1 : 1;
  const edge = roadCenter(width, worldY) +
    side * width * ROAD_WIDTH_FRACTION * 0.54;
  const x = edge + side * (24 + hash(segment + 13) * width * 0.085);
  const y = worldY;
  const scale = Math.max(0.55, Math.min(1.35, width / 1000));

  context.save();
  context.translate(x, y);
  context.rotate((hash(segment + 24) - 0.5) * 0.48);
  context.fillStyle = 'rgba(13, 19, 17, 0.72)';
  context.strokeStyle = 'rgba(179, 157, 111, 0.46)';
  context.lineWidth = 2 * scale;
  context.fillRect(-34 * scale, -18 * scale, 68 * scale, 36 * scale);
  context.strokeRect(-34 * scale, -18 * scale, 68 * scale, 36 * scale);
  context.fillStyle = 'rgba(173, 125, 73, 0.48)';
  context.fillRect(-26 * scale, -12 * scale, 52 * scale, 4 * scale);
  context.strokeStyle = 'rgba(5, 10, 9, 0.64)';
  context.beginPath();
  context.moveTo(-17 * scale, -18 * scale);
  context.lineTo(-17 * scale, 18 * scale);
  context.moveTo(16 * scale, -18 * scale);
  context.lineTo(16 * scale, 18 * scale);
  context.stroke();
  context.restore();
}

function drawMapSegment(
  context: CanvasRenderingContext2D,
  width: number,
  top: number,
  segment: number,
): void {
  const scale = Math.max(0.55, Math.min(1.35, width / 1000));
  for (let detail = 0; detail < 18; detail += 1) {
    const worldY = top + hash(segment * 23 + detail * 3) * MAP_SEGMENT_HEIGHT;
    const x = hash(segment * 31 + detail * 7) * width;
    const size = (1.5 + hash(segment * 47 + detail) * 3.8) * scale;
    drawRubble(context, x, worldY, size, segment * 59 + detail);
  }

  const craterY = top + hash(segment + 782) * MAP_SEGMENT_HEIGHT;
  const craterX = roadCenter(width, craterY) +
    (hash(segment + 91) - 0.5) * width * ROAD_WIDTH_FRACTION * 0.76;
  const craterRadius = (15 + hash(segment + 502) * 23) * scale;
  context.fillStyle = 'rgba(11, 16, 15, 0.42)';
  context.strokeStyle = 'rgba(161, 150, 117, 0.2)';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(craterX, craterY, craterRadius * 1.35, craterRadius, -0.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = 'rgba(4, 8, 8, 0.28)';
  context.beginPath();
  context.ellipse(
    craterX + craterRadius * 0.12,
    craterY + craterRadius * 0.16,
    craterRadius * 0.74,
    craterRadius * 0.48,
    -0.2,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (segment % 2 === 0) drawRoadsideDebris(context, width, top + MAP_SEGMENT_HEIGHT * 0.52, segment);
}

export function drawSiegeBattlefield(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollDistance: number,
): void {
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();

  context.fillStyle = '#30362d';
  context.fillRect(0, 0, width, height);

  const firstWorldY = -scrollDistance;
  const firstSegment = Math.floor(firstWorldY / MAP_SEGMENT_HEIGHT) - 1;
  const lastSegment = Math.ceil((height - scrollDistance) / MAP_SEGMENT_HEIGHT) + 1;
  const firstY = firstSegment * MAP_SEGMENT_HEIGHT + scrollDistance;
  const lastY = lastSegment * MAP_SEGMENT_HEIGHT + scrollDistance;
  const roadHalfWidth = width * ROAD_WIDTH_FRACTION / 2;

  context.beginPath();
  for (let y = firstY; y <= lastY; y += 72) {
    const worldY = y - scrollDistance;
    const x = roadCenter(width, worldY) - roadHalfWidth;
    if (y === firstY) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  for (let y = lastY; y >= firstY; y -= 72) {
    const worldY = y - scrollDistance;
    context.lineTo(roadCenter(width, worldY) + roadHalfWidth, y);
  }
  context.closePath();
  context.fillStyle = '#424640';
  context.fill();

  for (const side of [-1, 1] as const) {
    context.beginPath();
    for (let y = firstY; y <= lastY; y += 72) {
      const worldY = y - scrollDistance;
      const x = roadCenter(width, worldY) +
        side * (roadHalfWidth - 5 * Math.max(0.55, Math.min(1.35, width / 1000)));
      if (y === firstY) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = 'rgba(190, 174, 133, 0.2)';
    context.lineWidth = 2;
    context.stroke();
  }

  const firstDetailSegment = Math.floor(firstWorldY / MAP_SEGMENT_HEIGHT) - 1;
  const lastDetailSegment = Math.ceil((height - scrollDistance) / MAP_SEGMENT_HEIGHT) + 1;
  for (let segment = firstDetailSegment; segment <= lastDetailSegment; segment += 1) {
    const worldTop = segment * MAP_SEGMENT_HEIGHT;
    context.save();
    context.translate(0, scrollDistance);
    drawMapSegment(context, width, worldTop, segment);
    context.restore();
  }

  for (const side of [-1, 1] as const) {
    context.beginPath();
    for (let y = firstY; y <= lastY; y += 72) {
      const worldY = y - scrollDistance;
      const x = roadCenter(width, worldY) +
        side * (roadHalfWidth + 8);
      if (y === firstY) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = 'rgba(21, 28, 24, 0.62)';
    context.lineWidth = 7;
    context.stroke();
  }

  context.restore();
}
