import React from 'react'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import type { ChargeSign } from './types'

export interface ParticleTrajectoryProps {
  /** 已走过的历史点集 */
  historyPoints?: { x: number; y: number }[]
  /** 预测的理论全轨迹点集 */
  predictedPoints?: { x: number; y: number }[]
  /** 短拖尾点集（运动增强，非完整轨迹） */
  tailPoints?: { x: number; y: number }[]
  /** 是否焦点粒子 */
  isFocus?: boolean
  /** 电荷极性 */
  chargeSign?: ChargeSign
  /** 是否显示拖尾 */
  showTail?: boolean
  /** 自定义基准色（经典力学场景） */
  customBaseColor?: string
}

/**
 * 粒子轨迹统一渲染组件（SVG）。
 *
 * 遵循"SVG 控 opacity，无硬编码，无 withAlpha 颜色混合"的透明度统一策略。
 * 所有线宽、透明度、虚线 Dash 参数均从 CANVAS_STYLE 统一读取，
 * 颜色复用电性色或小球主色，禁止硬编码。
 *
 * 渲染层级（从底到顶）：
 * A. 底层理论预测虚线（更淡、更密）
 * B. 历史走过虚线
 * C. 运动强度实线拖尾
 * D. 粒子本体球
 */
export const ParticleTrajectory: React.FC<ParticleTrajectoryProps> = ({
  historyPoints = [],
  predictedPoints = [],
  tailPoints = [],
  isFocus = true,
  chargeSign = '+',
  showTail = true,
  customBaseColor,
}) => {
  if (historyPoints.length === 0 && predictedPoints.length === 0) return null

  // 1. 基准色确定（纯 Hex，禁止 withAlpha）
  let baseColor = customBaseColor ?? PHYSICS_COLORS.labelText
  if (chargeSign === '+') {
    baseColor = PHYSICS_COLORS.positiveCharge
  } else if (chargeSign === '-') {
    baseColor = PHYSICS_COLORS.negativeCharge
  }

  // 2. 完整历史轨迹 Path
  const historyD = historyPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    '',
  )

  // 3. 完整理论预测轨迹 Path
  const predictedD = predictedPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    '',
  )

  // 4. 拖尾 Path
  const tailD =
    showTail && tailPoints.length > 1
      ? tailPoints.reduce(
          (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
          '',
        )
      : null

  // 5. 本体坐标与半径
  const currentPt =
    historyPoints.length > 0
      ? historyPoints[historyPoints.length - 1]
      : predictedPoints[0]

  const radius = isFocus
    ? CANVAS_STYLE.object.pointMassRadius
    : CANVAS_STYLE.object.pointMassRadius * 0.7

  return (
    <g className="physics-particle-system">
      {/* A. 底层理论预测虚线（更淡、更密） */}
      {predictedD && (
        <path
          d={predictedD}
          fill="none"
          stroke={baseColor}
          strokeWidth={CANVAS_STYLE.stroke.trackHistory}
          strokeDasharray={CANVAS_STYLE.dash.predictedTrajectory.join(' ')}
          opacity={
            isFocus
              ? CANVAS_STYLE.opacity.trackHistory * 0.5
              : CANVAS_STYLE.opacity.unfocusedTrackHistory * 0.5
          }
        />
      )}

      {/* B. 历史走过虚线 */}
      {historyD && (
        <path
          d={historyD}
          fill="none"
          stroke={baseColor}
          strokeWidth={CANVAS_STYLE.stroke.trackHistory}
          strokeDasharray={CANVAS_STYLE.dash.trajectory.join(' ')}
          opacity={
            isFocus
              ? CANVAS_STYLE.opacity.trackHistory
              : CANVAS_STYLE.opacity.unfocusedTrackHistory
          }
        />
      )}

      {/* C. 运动强度实线拖尾 */}
      {tailD && (
        <path
          d={tailD}
          fill="none"
          stroke={baseColor}
          strokeWidth={CANVAS_STYLE.stroke.tailLineWidth}
          opacity={isFocus ? 0.6 : 0.25}
          strokeLinecap="round"
        />
      )}

      {/* D. 粒子本体球 */}
      {currentPt && (
        <circle
          cx={currentPt.x}
          cy={currentPt.y}
          r={radius}
          fill={baseColor}
          stroke={PHYSICS_COLORS.white}
          strokeWidth={isFocus ? 1.5 : 1}
        />
      )}
    </g>
  )
}
