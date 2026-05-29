export interface Point {
  x: number;
  y: number;
}

export interface CanvasPoint {
  cx: number;
  cy: number;
}

export function physicsToCanvas(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): CanvasPoint {
  if (canvasWidth === 0 || canvasHeight === 0) {
    return { cx: 0, cy: 0 };
  }
  const cx = canvasWidth / 2 + x * scale;
  const cy = canvasHeight / 2 - y * scale;
  return { cx, cy };
}

export function canvasToPhysics(
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): Point {
  const x = (cx - canvasWidth / 2) / scale;
  const y = (canvasHeight / 2 - cy) / scale;
  return { x, y };
}
