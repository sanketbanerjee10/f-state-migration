export interface ClientPointerPosition {
  readonly x: number;
  readonly y: number;
}

export class MouseAimInput {
  private element: HTMLElement | null = null;
  private onPosition: ((position: ClientPointerPosition) => void) | null = null;
  private isEnabled = true;

  attach(
    element: HTMLElement,
    onPosition: (position: ClientPointerPosition) => void,
  ): void {
    if (this.element) return;

    this.element = element;
    this.onPosition = onPosition;
    element.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mousedown', this.handleMouseMove);
  }

  detach(): void {
    if (!this.element) return;
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mousedown', this.handleMouseMove);
    this.element = null;
    this.onPosition = null;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private readonly handleMouseMove = (event: Event): void => {
    if (!this.isEnabled) return;
    const mouseEvent = event as MouseEvent;
    this.onPosition?.({ x: mouseEvent.clientX, y: mouseEvent.clientY });
  };
}
