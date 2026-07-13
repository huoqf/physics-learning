/* eslint-disable react-refresh/only-export-components */
import React from 'react'

/**
 * 磁感线共享工具函数
 *
 * 被 ParametricMagneticField 和 CoupledCoilField 共用。
 * 包含：三次贝塞尔计算、场方向箭头渲染。
 */

// ── 贝塞尔曲线计算 ──

/** 三次贝塞尔曲线在 t 处的值 */
export const bezierAt = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number => {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

/** 三次贝塞尔曲线在 t 处的切线向量 */
export const bezierTangent = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number => {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

// ── 箭头渲染 ──

interface FieldArrowProps {
  cx: number
  cy: number
  angle: number
  size: number
  color: string
  opacity?: number
}

/** 场方向三角箭头，用于磁感线方向标注 */
export const FieldArrow: React.FC<FieldArrowProps> = ({
  cx,
  cy,
  angle,
  size,
  color,
  opacity = 0.85,
}) => (
  <polygon
    points={`${-size},${-size * 0.7} ${size},0 ${-size},${size * 0.7}`}
    fill={color}
    opacity={opacity}
    transform={`translate(${cx}, ${cy}) rotate(${angle})`}
  />
)
