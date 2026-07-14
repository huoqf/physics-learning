import { useMemo } from 'react'
import { PHYSICS_COLORS, STROKE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { ParticleTrajectory, MagneticFieldSymbols } from '@/components/Physics'
import type { GridPoint } from '@/components/Physics/MagneticFieldGrid'
import { CYCLOTRON } from '../model/combinedFieldsModel'
import type { CyclotronSimulation, TrajectoryPoint, ParticleConstants } from '../model/combinedFieldsModel'
import { renderVectorArrow, REF_MAGNITUDES } from './renderVectorArrow'
import type { CanvasSize } from '@/utils/useCanvasSize'

interface CyclotronSceneProps {
  pos: TrajectoryPoint
  cyclotron: CyclotronSimulation
  p: ParticleConstants
  omegaAC: number
  U: number
  timeSec: number
  visibleTrajectory: TrajectoryPoint[]
  predictedPoints: { x: number; y: number }[]
  tailPoints: { x: number; y: number }[]
  historyPoints: { x: number; y: number }[]
  cyclotronBFieldPoints: GridPoint[]
  font: CanvasSize['font']
}

export function CyclotronScene({
  pos,
  cyclotron,
  p,
  omegaAC,
  U,
  timeSec,
  visibleTrajectory,
  predictedPoints,
  tailPoints,
  historyPoints,
  cyclotronBFieldPoints,
  font,
}: CyclotronSceneProps) {
  const { cx: ccx, cy: ccy } = CYCLOTRON
  const rMaxPx = 135
  const isCycGap = Math.abs(pos.x - ccx) <= 4

  const isLeftPositive = Math.sin(omegaAC * timeSec) >= 0

  const leftDColor = useMemo(() => {
    return isLeftPositive ? withAlpha(PHYSICS_COLORS.positiveCharge, 0.1) : withAlpha(PHYSICS_COLORS.negativeCharge, 0.05)
  }, [isLeftPositive])

  const rightDColor = useMemo(() => {
    return !isLeftPositive ? withAlpha(PHYSICS_COLORS.positiveCharge, 0.1) : withAlpha(PHYSICS_COLORS.negativeCharge, 0.05)
  }, [isLeftPositive])

  return (
    <g>
      {/* 磁场背景 */}
      <MagneticFieldSymbols points={cyclotronBFieldPoints} direction="in" opacity={0.3} />

      {/* 理想回旋半圆轨道对比线 (高考：半径越来越密) */}
      {Array.from({ length: 6 }).map((_, idx) => {
        const n = idx + 1
        const r1 = 48
        const rn = r1 * Math.sqrt(n)
        if (rn > rMaxPx) return null
        return (
          <g key={`ideal-orbit-${n}`} opacity={0.15}>
            <path
              d={`M ${ccx + 3} ${ccy - rn} A ${rn} ${rn} 0 0 1 ${ccx + 3} ${ccy + rn}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <path
              d={`M ${ccx - 3} ${ccy + rn} A ${rn} ${rn} 0 0 1 ${ccx - 3} ${ccy - rn}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {(n === 1 || n === 3) && (
              <text x={ccx + rn + 4} y={ccy - 2} fontSize={font(9)} fill={colors.neutral[500]} textAnchor="start">
                R_{n}
              </text>
            )}
          </g>
        )
      })}

      {/* D 形盒 (左、右) */}
      <path
        d={`M ${ccx - 3} ${ccy - rMaxPx} A ${rMaxPx} ${rMaxPx} 0 0 0 ${ccx - 3} ${ccy + rMaxPx} Z`}
        fill={leftDColor}
        stroke={colors.neutral[400]}
        strokeWidth={STROKE.objectLine}
      />
      <path
        d={`M ${ccx + 3} ${ccy - rMaxPx} A ${rMaxPx} ${rMaxPx} 0 0 1 ${ccx + 3} ${ccy + rMaxPx} Z`}
        fill={rightDColor}
        stroke={colors.neutral[400]}
        strokeWidth={STROKE.objectLine}
      />

      {/* 极板边缘极性动态文本 */}
      <text x={ccx - 18} y={ccy + 6} fontSize={font(20)} fill={isLeftPositive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge} textAnchor="middle" fontWeight="black" opacity={0.7}>
        {isLeftPositive ? '+' : '−'}
      </text>
      <text x={ccx + 18} y={ccy + 6} fontSize={font(20)} fill={!isLeftPositive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge} textAnchor="middle" fontWeight="black" opacity={0.7}>
        {!isLeftPositive ? '+' : '−'}
      </text>

      {/* D形金属盒外框文字标注 */}
      <text x={ccx - 70} y={ccy - rMaxPx - 8} fontSize={font(10)} fill={colors.neutral[500]} textAnchor="middle">D₁金属盒</text>
      <text x={ccx + 70} y={ccy - rMaxPx - 8} fontSize={font(10)} fill={colors.neutral[500]} textAnchor="middle">D₂金属盒</text>

      {/* 狭缝辅助交变电场线 */}
      {Array.from({ length: 5 }).map((_, idx) => {
        const y = ccy - 120 + idx * 60
        const arrowDx = isLeftPositive ? 1 : -1
        return (
          <g key={`gap-e-${idx}`} opacity={0.4}>
            <line x1={ccx - 3} y1={y} x2={ccx + 3} y2={y} stroke={PHYSICS_COLORS.electricFieldLine} strokeWidth={1.5} />
            <path
              d={arrowDx > 0 ? `M ${ccx - 1} ${y - 3} L ${ccx + 2} ${y} L ${ccx - 1} ${y + 3}` : `M ${ccx + 1} ${y - 3} L ${ccx - 2} ${y} L ${ccx + 1} ${y + 3}`}
              fill={PHYSICS_COLORS.electricFieldLine}
            />
          </g>
        )
      })}

      {/* 加速受力矢量 (仅粒子在狭缝中时渲染) */}
      {isCycGap && (
        <g>
          <line x1={ccx - 3} y1={pos.y} x2={ccx + 3} y2={pos.y} stroke={PHYSICS_COLORS.electricField} strokeWidth={3} />
          {renderVectorArrow(
            pos.x,
            pos.y,
            isLeftPositive ? 1 : -1,
            0,
            p.q * U / 0.006,
            REF_MAGNITUDES.electricForce,
            PHYSICS_COLORS.electricField,
            'electricField',
            'F_e',
            font,
          )}
        </g>
      )}

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
          customBaseColor={PHYSICS_COLORS.magneticField}
        />
      )}

      {/* 逃逸口与提示：仅在动画进度抵达轨迹末尾时显示 */}
      {cyclotron.escaped && timeSec >= cyclotron.endTime * 0.95 && (
        <g transform={`translate(${ccx}, ${ccy - 20})`}>
          <rect x={-90} y={-15} width={180} height={30} rx={4} fill="rgba(255, 255, 255, 0.9)" stroke={colors.success[200]} strokeWidth={1} />
          <text fontSize={font(10)} fill={colors.success[600]} fontWeight="bold" textAnchor="middle" y={4}>
            ✓ 达到最大半径，粒子出射
          </text>
        </g>
      )}

      {/* 底部高考重点结论面板 */}
      <g transform={`translate(${ccx - 140}, ${ccy + rMaxPx + 15})`}>
        <rect width={280} height={20} rx={3} fill={colors.neutral[100]} />
        <text x={140} y={13} fontSize={font(9)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
          交变电场频率 f_AC = qB / (2πm) = {cyclotron.fMag > 0 ? (cyclotron.fMag / 1000).toFixed(1) : 0} kHz
        </text>
      </g>
    </g>
  )
}
