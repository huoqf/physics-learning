export interface Point {
  x: number;
  y: number;
}

export interface CanvasPoint {
  cx: number;
  cy: number;
}

/** 默认物理-像素比例尺：30px = 1m（适用于水平单向运动场景） */
export const PX_PER_METER = 30

/**
 * 物理距离（m）转像素距离（px）
 *
 * 适用于水平单向运动场景（如连接体、摩擦力模型）。
 * 二维运动场景应使用 physicsToCanvas()。
 *
 * @param meters 物理距离 (m)
 * @returns 像素距离 (px)
 */
export function metersToPx(meters: number): number {
  return meters * PX_PER_METER
}

/**
 * 像素距离（px）转物理距离（m）
 *
 * @param px 像素距离 (px)
 * @returns 物理距离 (m)
 */
export function pxToMeters(px: number): number {
  return px / PX_PER_METER
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

/**
 * 物理坐标 → Canvas 坐标（自定义原点）
 *
 * 与 physicsToCanvas() 的区别：原点不在 Canvas 中心，而是由调用方指定。
 * 适用于平抛运动、斜抛运动等需要将抛出点设在画面特定位置的场景。
 *
 * 坐标约定：物理 y 轴向上为正，Canvas y 轴向下为正，函数内部完成反转。
 *
 * @param x 物理横坐标 (m)
 * @param y 物理纵坐标 (m)，向上为正
 * @param originX Canvas 中物理原点的 X 像素位置 (px)
 * @param originY Canvas 中物理原点的 Y 像素位置 (px)
 * @param scale 物理单位到像素的缩放比 (px/m)
 * @returns Canvas 像素坐标 { cx, cy }
 */
export function physicsToCanvasWithOrigin(
  x: number,
  y: number,
  originX: number,
  originY: number,
  scale: number
): CanvasPoint {
  const cx = originX + x * scale;
  const cy = originY - y * scale;
  return { cx, cy };
}

/**
 * Canvas 坐标 → 物理坐标（自定义原点）
 *
 * physicsToCanvasWithOrigin 的逆变换。
 *
 * @param cx Canvas 像素横坐标 (px)
 * @param cy Canvas 像素纵坐标 (px)
 * @param originX Canvas 中物理原点的 X 像素位置 (px)
 * @param originY Canvas 中物理原点的 Y 像素位置 (px)
 * @param scale 物理单位到像素的缩放比 (px/m)
 * @returns 物理坐标 { x, y }，y 向上为正
 */
export function canvasToPhysicsWithOrigin(
  cx: number,
  cy: number,
  originX: number,
  originY: number,
  scale: number
): Point {
  const x = (cx - originX) / scale;
  const y = (originY - cy) / scale;
  return { x, y };
}
