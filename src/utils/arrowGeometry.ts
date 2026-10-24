/**
 * 箭头几何量的派生规则（VectorArrow 专用）。
 *
 * 背景：`calculateVectorPixelLength` 取消了「有效基准下的 14px 硬下限」之后，
 * 箭头长度可以小到几像素。此时若继续沿用固定的 `headLen = max(7, …)`、
 * `stroke = max(3, …)`，一个 4px 的箭头会被 7px 的三角头 + 3px 的线宽吞掉，
 * 变成一坨无法读出方向的色块。所以头部与线宽必须随长度一起缩小。
 *
 * 设计约束：
 * - **常规尺寸完全不变**：长度 ≥ 25px 时头部与旧公式逐位相同，
 *   长度 ≥ 33.3px 时线宽与旧公式逐位相同 —— 不给既有页面造成视觉回归；
 * - **短箭头等比缩小**：头部长度按 0.28 比例下滑，最低到 3px（再小三角尖已不可辨）；
 * - **头部不超过总长**：否则三角形底边会落到起点背后，箭头方向被反向画出。
 */

/** 头部长度占总长的比例（与旧实现一致） */
const HEAD_RATIO = 0.28;
/** 头部长度上限（与旧实现一致） */
const HEAD_MAX = 16;
/** 头部长度下限：低于 3px 的三角尖在屏幕上已不可辨，继续等比缩只会变成噪点 */
const HEAD_MIN = 3;
/** 头部宽度 / 头部长度 */
const HEAD_WIDTH_RATIO = 0.6;
/**
 * 头部宽度至少为线宽的多少倍。
 *
 * 线宽可以被调用方显式覆盖（如分量箭头统一传 2px），此时若头部仍按 0.6·headLen 算，
 * 短箭头的三角会比箭杆还窄 —— 圆头线段的端点没有方向，箭头就退化成一条无向短棒。
 */
const HEAD_MIN_STROKE_RATIO = 1.4;
/**
 * 头部宽度相对头部长度的上限。
 *
 * 上面那条线宽约束在箭头只剩零点几像素时会本末倒置：一个 0.6px 长的三角被撑到 2.8px 宽，
 * 竖直矢量就变成一条横向细线，方向反而读错。所以头部宽高比钳在 1.2 以内。
 */
const HEAD_MAX_WIDTH_RATIO = 1.2;
/** 线宽比例（与旧实现一致） */
const STROKE_RATIO = 0.04;
/** 线宽平台值：旧实现的硬下限 3px，现在只作为「常规尺寸臂」的固定值保留 */
const STROKE_PLATEAU = 3;
/** 长度低于 PLATEAU / TAPER ≈ 33.3px 时，线宽开始按此比例变细 */
const STROKE_TAPER = 0.09;

export interface ArrowGeometry {
  /** 箭头总长（含头部），px */
  totalLength: number;
  /** 头部（三角）长度，px */
  headLen: number;
  /** 头部（三角）底边宽度，px */
  headWidth: number;
  /** 箭杆长度（总长 − 头部），px */
  lineLen: number;
  /** 箭杆线宽，px */
  strokeWidth: number;
}

/**
 * 由总长派生箭头各几何量。
 *
 * @param totalLength 箭头总长（`calculateVectorPixelLength` 的返回值或调用方自定义长度）
 * @param overrideStrokeWidth 调用方显式指定的线宽，给定时不再按长度派生
 */
export function resolveArrowGeometry(
  totalLength: number,
  overrideStrokeWidth?: number,
): ArrowGeometry {
  const total = Number.isFinite(totalLength) ? Math.max(0, totalLength) : 0;

  // 头部：max(total·0.28, min(3, total)) 保证 short 箭头时下限不反超总长；
  // 外层 min(16, …) 保证长箭头头部不失控。
  const headLen = Math.min(HEAD_MAX, Math.max(total * HEAD_RATIO, Math.min(HEAD_MIN, total)));

  // 线宽：常规尺寸取旧公式 max(3, total·0.04)；短箭头改为按 total·0.09 收细，
  // 两者在 total ≈ 33.3px 处连续。
  const strokeWidth =
    overrideStrokeWidth ??
    Math.max(Math.min(STROKE_PLATEAU, total * STROKE_TAPER), total * STROKE_RATIO);

  // 头部宽度同时受三面约束：
  // - 下界 0.6·headLen：常规尺寸的形状（与旧实现一致）
  // - 线宽的 1.4 倍：短箭头 + 粗线宽时保住方向可读性
  // - 不超过 headLen 的 1.2 倍：否则零点几像素的箭头会变成一条横向细线
  const headWidth = Math.max(
    headLen * HEAD_WIDTH_RATIO,
    Math.min(strokeWidth * HEAD_MIN_STROKE_RATIO, headLen * HEAD_MAX_WIDTH_RATIO),
  );
  const lineLen = Math.max(0, total - headLen);

  return { totalLength: total, headLen, headWidth, lineLen, strokeWidth };
}
