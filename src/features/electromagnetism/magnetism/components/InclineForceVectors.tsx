import { VectorArrow } from '@/components/Physics'
import React from 'react'
import { CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import type { SceneScale } from '@/scene'

interface InclineForceVectorsProps {
  px: number
  py: number
  I: number
  G_phys: { x: number; y: number }
  N_phys: { x: number; y: number }
  Fa_phys: { x: number; y: number }
  f_phys: { x: number; y: number }
  localScale: SceneScale
  physicsResult: AdvancedAmperePhysicsResult
  forceScale: number
  G_mag: number
  thetaRad: number
  font: (size: number) => number
}

export const InclineForceVectors: React.FC<InclineForceVectorsProps> = ({
  px,
  py,
  I,
  G_phys,
  N_phys,
  Fa_phys,
  f_phys,
  localScale,
  physicsResult,
  forceScale,
  G_mag,
  thetaRad,
  font,
}) => {
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)

  return (
    <>
      {/* 导体棒侧视圆截面 */}
      <g transform={`translate(${px}, ${py})`}>
        <circle
          cx="0"
          cy="0"
          r="7"
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth="1.5"
        />
        {/* 电流方向符号 */}
        {I > 0 ? (
          /* 向里 ⊗ */
          <g opacity="0.6">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
          </g>
        ) : I < 0 ? (
          /* 向外 ⊙ */
          <circle cx="0" cy="0" r="1.8" fill={PHYSICS_COLORS.electricCurrent} />
        ) : null}
      </g>

      {/* 受力矢量箭头 */}
      {/* 重力 G (红色/深灰色) */}
      <VectorArrow
        vector={G_phys}
        type="gravity"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={G_mag}
      />
      <text
        x={px + 3}
        y={py + G_mag - 2}
        fontSize={font(6.5)}
        fill={PHYSICS_COLORS.gravity}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        G
      </text>

      {/* 支持力 N (蓝色) */}
      <VectorArrow
        vector={N_phys}
        type="normalForce"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={physicsResult.N * forceScale}
      />
      <text
        x={px + N_phys.x * forceScale - 9}
        y={py - N_phys.y * forceScale + 2}
        fontSize={font(6.5)}
        fill={PHYSICS_COLORS.normalForce}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        N
      </text>

      {/* 安培力 F_安 (橙色) */}
      {Math.abs(physicsResult.F_ampere) > 1e-4 && (
        <g>
          <VectorArrow
            vector={Fa_phys}
            type="lorentzForce"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.hypot(Fa_phys.x, Fa_phys.y) * forceScale}
          />
          <text
            x={px + Fa_phys.x * forceScale + (Fa_phys.x >= 0 ? 4 : -18)}
            y={py - Fa_phys.y * forceScale + (Fa_phys.y > 0 ? -5 : 11)}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
            textAnchor={Fa_phys.x < 0 ? 'end' : 'start'}
            style={{ userSelect: 'none' }}
          >
            F_安
          </text>
        </g>
      )}

      {/* 摩擦力 f */}
      {Math.abs(physicsResult.f) > 1e-4 && (
        <g>
          <VectorArrow
            vector={f_phys}
            type="friction"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.abs(physicsResult.f * forceScale)}
          />
          <text
            x={px + f_phys.x * forceScale + (physicsResult.f > 0 ? 3 : -14)}
            y={py - f_phys.y * forceScale - 3}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.friction}
            fontWeight="bold"
            style={{ userSelect: 'none' }}
          >
            f
          </text>
        </g>
      )}

      {/* 运动失稳时的合外力粗红色箭头 */}
      {Math.abs(physicsResult.a) > 0.05 && (
        <g>
          <VectorArrow
            vector={{
              x: physicsResult.a > 0 ? 2.5 * cosT : -2.5 * cosT,
              y: physicsResult.a > 0 ? 2.5 * sinT : -2.5 * sinT,
            }}
            type="acceleration"
            sceneScale={localScale}
            strokeWidth={2.5}
            pixelLength={2.5 * forceScale}
          />
          <text
            x={px + (physicsResult.a > 0 ? 15 * cosT + 4 : -15 * cosT - 12)}
            y={py - (physicsResult.a > 0 ? 15 * sinT + 12 : -15 * sinT + 3)}
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.acceleration}
            fontWeight="extrabold"
            style={{ userSelect: 'none' }}
          >
            F_合
          </text>
        </g>
      )}
    </>
  )
}
