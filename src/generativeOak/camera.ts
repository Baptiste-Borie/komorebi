export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraController {
  state: CameraState;
  dispose(): void;
  reset(zoom?: number): void;
}

export function attachCamera(
  canvas: HTMLCanvasElement,
  initialZoom: number,
  onChange: () => void,
): CameraController {
  const state: CameraState = { x: 0, y: 0, zoom: initialZoom };
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;

  const pointerDown = (event: PointerEvent): void => {
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  };
  const pointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    state.x += event.clientX - pointerX;
    state.y += event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
    onChange();
  };
  const pointerUp = (event: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
  };
  const wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const previous = state.zoom;
    state.zoom = Math.max(0.56, Math.min(2.4, state.zoom * Math.exp(-event.deltaY * 0.0011)));
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left - rect.width * 0.5;
    const my = event.clientY - rect.top - rect.height * 0.5;
    const ratio = state.zoom / previous;
    state.x = mx - (mx - state.x) * ratio;
    state.y = my - (my - state.y) * ratio;
    onChange();
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('wheel', wheel, { passive: false });

  return {
    state,
    reset(zoom = initialZoom) {
      state.x = 0;
      state.y = 0;
      state.zoom = zoom;
      onChange();
    },
    dispose() {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('wheel', wheel);
    },
  };
}
