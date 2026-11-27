import React from 'react'
import {
  CANVAS_COLORS,
  DASH,
  PHYSICS_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { formatRelativityBeta } from '@/physics/relativity'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'
import { SPLITV_LAYOUT } from '../relativityLayout'

interface EnergyExtensionSceneProps {
  physics: RelativityPhysicsState
  font: (size: number) => number
}

export const EnergyExtensionScene: React.FC<EnergyExtensionSceneProps> = ({
  physics,
  font,
}) => {
  const { m0, accelState } = physics
  const {
    targetGamma,
    duration,
    groundTime,
    currentBeta,
    currentGamma,
    currentEnergy,
    currentClassicalEk,
    targetEnergy,
    targetClassicalEk,
  } = accelState

  const {
    cardX,
    cardW,
    topCardY,
    topCardH,
    bottomCardY,
    bottomCardH,
    barX,
    barMaxW,
  } = SPLITV_LAYOUT.energy

  const unitW = barMaxW / 3.25
  const restW = unitW
  const targetTotalW = targetGamma * unitW
  const curKineticW = (currentGamma - 1) * unitW

  const rest10_16 = (currentEnergy.restEnergy / 1e16).toFixed(2)
  const ek10_16 = (currentEnergy.kineticEnergy / 1e16).toFixed(2)
  const tot10_16 = (currentEnergy.totalEnergy / 1e16).toFixed(2)

  const maxCompareEk = Math.max(targetEnergy.kineticEnergy, targetClassicalEk, 1e-12)
  const compareBarMaxW = 540
  const classicalBarW = Math.max(4, (currentClassicalEk / maxCompareEk) * compareBarMaxW)
  const relBarW = Math.max(4, (currentEnergy.kineticEnergy / maxCompareEk) * compareBarMaxW)

  return (
    <g className="mode-energy-extension">
      {/* ── 上半卡：静能 + 动态增长的相对论动能构成条 ── */}
      <rect
        x={cardX}
        y={topCardY}
        width={cardW}
        height={topCardH}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <text x={barX} y={36} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
        实时能量构成：E(t) = γ(t)·m₀c² = E₀ + E_k(t)  (t = {groundTime.toFixed(2)} / {duration.toFixed(1)} s)
      </text>

      {/* 目标总能虚线边框 */}
      <rect
        x={barX}
        y={50}
        width={targetTotalW}
        height={32}
        rx={4}
        fill={withAlpha(CANVAS_COLORS.grid, 0.25)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.guide.join(' ')}
      />
      <rect
        x={barX}
        y={50}
        width={restW}
        height={32}
        rx={4}
        fill={PHYSICS_COLORS.potentialEnergy}
      />
      {curKineticW > 0.5 && (
        <rect
          x={barX + restW}
          y={50}
          width={curKineticW}
          height={32}
          rx={4}
          fill={PHYSICS_COLORS.kineticEnergy}
        />
      )}
      <text
        x={barX + restW / 2}
        y={102}
        textAnchor="middle"
        fill={PHYSICS_COLORS.potentialEnergy}
        fontSize={font(11)}
        fontWeight="bold"
      >
        静能 E₀ = m₀c²
      </text>
      <text
        x={barX + restW + Math.max(curKineticW / 2, 92)}
        y={102}
        textAnchor="middle"
        fill={PHYSICS_COLORS.kineticEnergy}
        fontSize={font(11)}
        fontWeight="bold"
      >
        相对论动能 E_k(t) = (γ − 1)m₀c²
      </text>

      {/* 四列读数 */}
      <text x={barX} y={134} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
        m₀ = {m0.toFixed(1)} kg · β = {formatRelativityBeta(currentBeta)}
      </text>
      <text x={260} y={134} fill={PHYSICS_COLORS.potentialEnergy} fontSize={font(11)}>
        E₀ = {rest10_16} ×10¹⁶ J
      </text>
      <text x={450} y={134} fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(11)}>
        E_k = {ek10_16} ×10¹⁶ J
      </text>
      <text x={640} y={134} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
        E = {tot10_16} ×10¹⁶ J
      </text>

      {/* ── 下半卡：牛顿经典动能 vs 相对论动能动态对比 ── */}
      <rect
        x={cardX}
        y={bottomCardY}
        width={cardW}
        height={bottomCardH}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <text x={barX} y={190} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
        动能对比：低速时 E_k ≈ ½m₀v²，接近光速时形成无限能量壁垒
      </text>

      <text x={barX} y={214} fill={PHYSICS_COLORS.velocity} fontSize={font(11)} fontWeight="bold">
        经典 ½m₀v²
      </text>
      <rect
        x={142}
        y={200}
        width={classicalBarW}
        height={20}
        rx={4}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.78)}
      />
      <text x={152 + classicalBarW} y={214} fill={PHYSICS_COLORS.velocity} fontSize={font(11)}>
        {(currentClassicalEk / 1e16).toFixed(2)} ×10¹⁶ J
      </text>

      <text x={barX} y={248} fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(11)} fontWeight="bold">
        相对论 E_k
      </text>
      <rect
        x={142}
        y={234}
        width={relBarW}
        height={20}
        rx={4}
        fill={PHYSICS_COLORS.kineticEnergy}
      />
      <text
        x={152 + relBarW}
        y={248}
        fill={PHYSICS_COLORS.kineticEnergy}
        fontSize={font(11)}
        fontWeight="bold"
      >
        {ek10_16} ×10¹⁶ J
      </text>

      <text x={barX} y={290} fill={CANVAS_COLORS.textMuted} fontSize={font(11)}>
        结论：v → c 时 E_k → ∞，有静质量物体无法加速至光速
      </text>
    </g>
  )
}
