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

/** 物理世界边界（物理单位，如米） */
export interface WorldBounds {
  xMin: number; xMax: number
  yMin: number; yMax: number
}

/**
 * 根据画布尺寸和物理世界范围计算缩放比 (px/unit)。
 *
 * @param canvasW 画布宽度 (px)
 * @param canvasH 画布高度 (px)
 * @param world   物理世界边界（物理单位）
 * @param padding 画布两侧预留边距 (px)，默认 0
 * @returns 缩放比 (px/unit)，取 x/y 中较小值以保证完整显示
 */
export function computeScale(
  canvasW: number,
  canvasH: number,
  world: WorldBounds,
  padding = 0
): number {
  const sx = (canvasW - 2 * padding) / (world.xMax - world.xMin)
  const sy = (canvasH - 2 * padding) / (world.yMax - world.yMin)
  return Math.min(sx, sy)
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

/** 画布矩形边界 */
export interface CanvasBounds {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * 沿向量方向等比例缩短端点，使其不超出画布边界。
 *
 * 保持向量方向不变，仅按比例缩放到边界内。
 * 适用于力矢量箭头端点裁剪，防止溢出画布。
 *
 * @param raw 原始端点（未裁剪）
 * @param origin 向量起点（不动点）
 * @param bounds 画布边界
 * @returns 裁剪后的端点，方向与原始端点一致
 */
export function clampEndpoint(
  raw: CanvasPoint,
  origin: CanvasPoint,
  bounds: CanvasBounds,
): CanvasPoint {
  const dx = raw.cx - origin.cx
  const dy = raw.cy - origin.cy
  if (dx === 0 && dy === 0) return raw

  // 计算各方向允许的最大延伸比例
  let tMax = Infinity
  if (dx > 0) tMax = Math.min(tMax, (bounds.right - origin.cx) / dx)
  else if (dx < 0) tMax = Math.min(tMax, (bounds.left - origin.cx) / dx)
  if (dy > 0) tMax = Math.min(tMax, (bounds.bottom - origin.cy) / dy)
  else if (dy < 0) tMax = Math.min(tMax, (bounds.top - origin.cy) / dy)

  // 原始长度对应的比例为 1，若 tMax >= 1 则无需裁剪
  if (tMax >= 1) return raw

  return {
    cx: origin.cx + dx * tMax,
    cy: origin.cy + dy * tMax,
  }
}

/**
 * 标签位置边界保护。
 *
 * 文字标签有宽度/高度和锚点偏移，clampEndpoint 保证端点在画布内，
 * 但文字仍可能贴边被裁。本函数检查标签矩形是否超出边界，
 * 若超出则翻转偏移方向。
 *
 * @param anchor 标签锚点坐标
 * @param offset 原始偏移 { dx, dy }
 * @param labelW 标签宽度 (px)
 * @param labelH 标签高度 (px)
 * @param bounds 画布边界
 * @returns 修正后的锚点坐标
 */
export function clampLabelPosition(
  anchor: CanvasPoint,
  offset: { dx: number; dy: number },
  labelW: number,
  labelH: number,
  bounds: CanvasBounds,
): CanvasPoint {
  let cx = anchor.cx + offset.dx
  let cy = anchor.cy + offset.dy

  // 水平翻转
  if (cx - labelW / 2 < bounds.left) cx = anchor.cx - offset.dx
  if (cx + labelW / 2 > bounds.right) cx = anchor.cx - offset.dx

  // 垂直翻转
  if (cy - labelH / 2 < bounds.top) cy = anchor.cy - offset.dy
  if (cy + labelH / 2 > bounds.bottom) cy = anchor.cy - offset.dy

  return { cx, cy }
}
