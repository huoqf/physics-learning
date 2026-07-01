/**
 * MagneticFieldGrid — 通用磁场方向点阵组件
 *
 * 在矩形区域内渲染均匀分布的 ⊗（入纸面）或 ⊙（出纸面）符号。
 * SVG 组件：直接在 <svg> 中作为 <MagneticFieldGrid /> 使用。
 * Canvas 辅助函数已拆分到 drawMagneticFieldGrid.ts，避免 Fast Refresh warning。
 */
import React, { useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'

// ─── 共享类型 ───────────────────────────────────────────────

export type FieldDirection = 'in' | 'out'

export interface GridPoint {
  x: number
  y: number
}

// ─── 网格点计算 ─────────────────────────────────────────────

function computeGridPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  cols: number,
): GridPoint[] {
  const points: GridPoint[] = []
  const dx = w / (cols + 1)
  const dy = h / (rows + 1)
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      points.push({ x: x + c * dx, y: y + r * dy })
    }
  }
  return points
}

// ─── SVG 符号渲染 ───────────────────────────────────────────

const CrossSymbol: React.FC<{ radius: number; strokeWidth: number }> = ({
  radius,
  strokeWidth,
}) => {
  const arm = radius * 0.6
  return (
    <g>
      <circle cx={0} cy={0} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <line x1={-arm} y1={-arm} x2={arm} y2={arm} stroke="currentColor" strokeWidth={strokeWidth} />
      <line x1={arm} y1={-arm} x2={-arm} y2={arm} stroke="currentColor" strokeWidth={strokeWidth} />
    </g>
  )
}

const DotSymbol: React.FC<{ radius: number; strokeWidth: number }> = ({
  radius,
  strokeWidth,
}) => {
  return (
    <g>
      <circle cx={0} cy={0} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx={0} cy={0} r={radius * 0.3} fill="currentColor" />
    </g>
  )
}

// ─── SVG 组件 ───────────────────────────────────────────────

export interface MagneticFieldGridProps {
  /** 区域左上角 x */
  x: number
  /** 区域左上角 y */
  y: number
  /** 区域宽度 */
  w: number
  /** 区域高度 */
  h: number
  /**
   * 磁场方向：
   * - 'in'  → ⊗（入纸面）
   * - 'out' → ⊙（出纸面）
   */
  direction: FieldDirection
  /** 网格行数（默认 4） */
  rows?: number
  /** 网格列数（默认 6） */
  cols?: number
  /** 符号圆圈半径（默认 6） */
  radius?: number
  /** 线条粗细（默认 1.2） */
  strokeWidth?: number
  /** 整体不透明度（默认 0.35） */
  opacity?: number
  /** 颜色覆盖（默认跟随 direction 自动选择主题色） */
  color?: string
}

export const MagneticFieldGrid: React.FC<MagneticFieldGridProps> = ({
  x,
  y,
  w,
  h,
  direction,
  rows = 4,
  cols = 6,
  radius = 6,
  strokeWidth = 1.2,
  opacity = 0.35,
  color,
}) => {
  const fillColor = color ?? (direction === 'in' ? PHYSICS_COLORS.magneticFieldCross : PHYSICS_COLORS.magneticFieldDot)

  const points = useMemo(
    () => (Math.abs(w) < 1e-4 || Math.abs(h) < 1e-4 ? [] : computeGridPoints(x, y, w, h, rows, cols)),
    [x, y, w, h, rows, cols],
  )

  if (points.length === 0) return null

  return (
    <g style={{ color: fillColor }} opacity={opacity}>
      {points.map((pt, i) => (
        <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
          {direction === 'in' ? (
            <CrossSymbol radius={radius} strokeWidth={strokeWidth} />
          ) : (
            <DotSymbol radius={radius} strokeWidth={strokeWidth} />
          )}
        </g>
      ))}
    </g>
  )
}

// ─── 预计算点模式 ───────────────────────────────────────────
// 用于调用方已自行计算好坐标的场景（如 ForceMotionSandbox）

export interface MagneticFieldSymbolsProps {
  /** 预计算的网格点坐标 */
  points: GridPoint[]
  /** 磁场方向 */
  direction: FieldDirection
  /** 符号圆圈半径（默认 6） */
  radius?: number
  /** 线条粗细（默认 1.2） */
  strokeWidth?: number
  /** 整体不透明度（默认 0.35） */
  opacity?: number
  /** 颜色覆盖 */
  color?: string
}

/**
 * 在预计算好的坐标点上渲染磁场方向符号。
 * 适用于调用方已自行计算布局坐标的场景。
 */
export const MagneticFieldSymbols: React.FC<MagneticFieldSymbolsProps> = ({
  points,
  direction,
  radius = 6,
  strokeWidth = 1.2,
  opacity = 0.35,
  color,
}) => {
  const fillColor = color ?? (direction === 'in' ? PHYSICS_COLORS.magneticFieldCross : PHYSICS_COLORS.magneticFieldDot)

  return (
    <g style={{ color: fillColor }} opacity={opacity}>
      {points.map((pt, i) => (
        <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
          {direction === 'in' ? (
            <CrossSymbol radius={radius} strokeWidth={strokeWidth} />
          ) : (
            <DotSymbol radius={radius} strokeWidth={strokeWidth} />
          )}
        </g>
      ))}
    </g>
  )
}

export default MagneticFieldGrid
