import { describe, expect, it, vi } from 'vitest';
import {
  drawCircle,
  drawLine,
  drawPolygon,
  drawRect,
  drawRing,
  drawRoundedRectangle,
  drawStarburst,
  drawSymbol,
} from '@/game/rendering/ShapeLibrary';

function createContext() {
  const stateStack: Array<{
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
  }> = [];
  const context = {
    fillStyle: '#000000',
    strokeStyle: '#ffffff',
    lineWidth: 1,
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(() => {
      const state = stateStack.pop();
      if (state) Object.assign(context, state);
    }),
    save: vi.fn(() => {
      stateStack.push({
        fillStyle: context.fillStyle,
        strokeStyle: context.strokeStyle,
        lineWidth: context.lineWidth,
      });
    }),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  };
  return context as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };
}

describe('ShapeLibrary', () => {
  it('draws a circle and restores the caller canvas state', () => {
    const context = createContext();

    drawCircle(context, 12, 20, 8, {
      fill: '#123456',
      stroke: '#abcdef',
      lineWidth: 3,
    });

    expect(context.arc).toHaveBeenCalledWith(12, 20, 8, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalledOnce();
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(context.fillStyle).toBe('#000000');
    expect(context.strokeStyle).toBe('#ffffff');
    expect(context.lineWidth).toBe(1);
    expect(context.save).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it('does not draw a polygon with fewer than three points', () => {
    const context = createContext();

    drawPolygon(context, [{ x: 0, y: 0 }, { x: 2, y: 2 }], { fill: '#ffffff' });

    expect(context.beginPath).not.toHaveBeenCalled();
    expect(context.save).not.toHaveBeenCalled();
  });

  it('draws a rounded rectangle with bounded corners', () => {
    const context = createContext();

    drawRoundedRectangle(context, 10, 20, 40, 30, 100, { fill: '#abcdef' });

    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(4);
    expect(context.closePath).toHaveBeenCalledOnce();
    expect(context.fill).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it('restores canvas state for lines, rings, rectangles, and symbols', () => {
    const context = createContext();

    drawLine(context, { x: 1, y: 2 }, { x: 3, y: 4 }, '#123456', 2);
    drawRing(context, 10, 12, 5, '#abcdef', 3, 0, Math.PI);
    drawRect(context, 0, 0, 20, 10, { fill: '#111111', stroke: '#eeeeee' });
    drawSymbol(context, 'shield', 10, 10, 8, '#ffffff');

    expect(context.save).toHaveBeenCalledTimes(4);
    expect(context.restore).toHaveBeenCalledTimes(4);
    expect(context.stroke).toHaveBeenCalledTimes(3);
    expect(context.fillRect).toHaveBeenCalledOnce();
    expect(context.fillStyle).toBe('#000000');
    expect(context.strokeStyle).toBe('#ffffff');
    expect(context.lineWidth).toBe(1);
  });

  it.each([
    'plus',
    'crosshair',
    'speed',
    'shield',
    'starburst',
    'snowflake',
    'chevron',
    'star',
  ] as const)('draws the %s symbol', (symbol) => {
    const context = createContext();

    drawSymbol(context, symbol, 12, 14, 8, '#ffffff');

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();
  });

  it('rejects invalid starburst point counts without leaking canvas state', () => {
    const context = createContext();

    expect(() =>
      drawStarburst(context, 0, 0, 10, 5, 1, { fill: '#ffffff' }),
    ).toThrow(RangeError);
    expect(context.save).not.toHaveBeenCalled();
    expect(context.restore).not.toHaveBeenCalled();
  });

  it('restores canvas state even when a drawing operation throws', () => {
    const context = createContext();
    context.beginPath.mockImplementationOnce(() => {
      throw new Error('Canvas path error');
    });

    expect(() => drawCircle(context, 0, 0, 5, { fill: '#ffffff' })).toThrow(
      'Canvas path error',
    );
    expect(context.restore).toHaveBeenCalledOnce();
    expect(context.fillStyle).toBe('#000000');
  });
});
