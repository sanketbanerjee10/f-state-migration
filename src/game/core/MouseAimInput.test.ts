import { describe, expect, it, vi } from 'vitest';
import { MouseAimInput } from './MouseAimInput';

function mouseEvent(type: 'mousemove' | 'mousedown', clientX: number, clientY: number) {
  const event = new Event(type) as MouseEvent;
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

describe('MouseAimInput', () => {
  it('forwards mouse positions and detaches listeners on teardown', () => {
    const input = new MouseAimInput();
    const canvas = new EventTarget();
    const onPosition = vi.fn();
    input.attach(canvas as HTMLElement, onPosition);

    canvas.dispatchEvent(mouseEvent('mousemove', 320, 180));
    canvas.dispatchEvent(mouseEvent('mousedown', 321, 181));

    expect(onPosition).toHaveBeenNthCalledWith(1, { x: 320, y: 180 });
    expect(onPosition).toHaveBeenNthCalledWith(2, { x: 321, y: 181 });

    input.detach();
    canvas.dispatchEvent(mouseEvent('mousemove', 400, 200));
    expect(onPosition).toHaveBeenCalledTimes(2);
  });

  it('ignores pointer changes while disabled and resumes after reenabling', () => {
    const input = new MouseAimInput();
    const canvas = new EventTarget();
    const onPosition = vi.fn();
    input.attach(canvas as HTMLElement, onPosition);

    input.setEnabled(false);
    canvas.dispatchEvent(mouseEvent('mousemove', 320, 180));
    expect(onPosition).not.toHaveBeenCalled();

    input.setEnabled(true);
    canvas.dispatchEvent(mouseEvent('mousemove', 400, 200));
    expect(onPosition).toHaveBeenCalledWith({ x: 400, y: 200 });
    input.detach();
  });
});
