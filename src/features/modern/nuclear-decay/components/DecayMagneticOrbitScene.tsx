import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import type { MagneticDecayModeData } from '../hooks/useDecayMagneticOrbitPhysics'
import { NuclearParticleDefs } from './NuclearParticleDefs'

interface DecayMagneticOrbitSceneProps {
  decayData: MagneticDecayModeData
  canvasSize: {
    font: (size: number) => number
  }
  sceneScale: SceneScale
}

/**
 * 静止核在匀强磁场中衰变径迹（外切圆 / 内切圆）SVG 场景组件
 */
export const DecayMagneticOrbitScene: React.FC<DecayMagneticOrbitSceneProps> = ({
  decayData,
  canvasSize,
  sceneScale,
}) => {
  const { font } = canvasSize

  const origin = worldToDesign(0, 0, sceneScale)
  const pCenter = worldToDesign(decayData.particleCenter.x, decayData.particleCenter.y, sceneScale)
  const dCenter = worldToDesign(decayData.daughterCenter.x, decayData.daughterCenter.y, sceneScale)

  const pPos = worldToDesign(decayData.particlePos.x, decayData.particlePos.y, sceneScale)
  const dPos = worldToDesign(decayData.daughterPos.x, decayData.daughterPos.y, sceneScale)

  const pRadiusPx = Math.abs(pCenter.py - origin.py) || 120
  const dRadiusPx = Math.abs(dCenter.py - origin.py) || 45

  const markers = []
  for (let x = origin.px - 360; x <= origin.px + 360; x += 60) {
    for (let y = origin.py - 160; y <= origin.py + 160; y += 45) {
      markers.push(
        <path
          key={`decay-b-${x}-${y}`}
          d={`M ${x - 4} ${y - 4} L ${x + 4} ${y + 4} M ${x + 4} ${y - 4} L ${x - 4} ${y + 4}`}
          stroke={PHYSICS_COLORS.magneticFieldCross}
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.22}
        />,
      )
    }
  }

  return (
    <g>
      <NuclearParticleDefs />

      <rect
        x={origin.px - 390}
        y={origin.py - 170}
        width={780}
        height={340}
        fill={withAlpha(PHYSICS_COLORS.magneticField, 0.04)}
        stroke={withAlpha(PHYSICS_COLORS.magneticField, 0.4)}
        strokeWidth={1}
        strokeDasharray="4,4"
        rx={8}
      />
      {markers}

      <text
        x={origin.px - 375}
        y={origin.py - 150}
        fill={PHYSICS_COLORS.magneticField}
        fontSize={font(11)}
        fontWeight="bold"
      >
        匀强磁场 B (垂直纸面向里)
      </text>

      <text
        x={origin.px - 375}
        y={origin.py - 132}
        fill={CANVAS_COLORS.textMuted}
        fontSize={font(10)}
      >
        注：圆半径为示意放大，真实 R ∝ 1/|q| 详见上方曲线图
      </text>

      {/* 水平公切线 */}
      <line
        x1={origin.px - 260}
        y1={origin.py}
        x2={origin.px + 260}
        y2={origin.py}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1}
        strokeDasharray="3,3"
        opacity={0.7}
      />
      <text
        x={origin.px + 265}
        y={origin.py + 3}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
        textAnchor="start"
      >
        切线方向 (初始出射速度轴)
      </text>

      {/* 粒子轨迹圆周 */}
      {decayData.hasDecayed && (
        <g>
          <circle
            cx={pCenter.px}
            cy={pCenter.py}
            r={pRadiusPx}
            fill="none"
            stroke={decayData.decayType === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            strokeWidth={1.8}
            strokeDasharray="5,3"
            opacity={0.85}
          />
          <circle
            cx={pCenter.px}
            cy={pCenter.py}
            r={3}
            fill={decayData.decayType === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
          />
          <text
            x={pCenter.px + 8}
            y={pCenter.py + 3}
            fill={decayData.decayType === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            fontSize={font(9)}
            fontWeight="bold"
          >
            {decayData.decayType === 0 ? 'O_α' : 'O_β'}
          </text>

          <circle
            cx={dCenter.px}
            cy={dCenter.py}
            r={dRadiusPx}
            fill="none"
            stroke={PHYSICS_COLORS.appliedForce}
            strokeWidth={1.8}
            strokeDasharray="5,3"
            opacity={0.85}
          />
          <circle cx={dCenter.px} cy={dCenter.py} r={3} fill={PHYSICS_COLORS.appliedForce} />
          <text
            x={dCenter.px + 8}
            y={dCenter.py + 3}
            fill={PHYSICS_COLORS.appliedForce}
            fontSize={font(9)}
            fontWeight="bold"
          >
            O_新核
          </text>

          <line
            x1={pCenter.px}
            y1={pCenter.py}
            x2={origin.px}
            y2={origin.py}
            stroke={decayData.decayType === 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.6}
          />
          <line
            x1={dCenter.px}
            y1={dCenter.py}
            x2={origin.px}
            y2={origin.py}
            stroke={PHYSICS_COLORS.appliedForce}
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.6}
          />

          <text
            x={origin.px - 140}
            y={origin.py + (decayData.isTangentialOuter ? -dRadiusPx - 10 : dRadiusPx + 20)}
            fill={decayData.isTangentialOuter ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.velocity}
            fontSize={font(11)}
            fontWeight="bold"
          >
            {decayData.isTangentialOuter ? '外切圆：同种正电荷，受力反向' : '内切圆：一正一负，受力同向'}
          </text>
        </g>
      )}

      {/* 衰变起始点 (原点) */}
      <circle cx={origin.px} cy={origin.py} r={5} fill={CANVAS_COLORS.referencePoint} />
      <text
        x={origin.px}
        y={origin.py + (decayData.decayType === 0 ? 16 : -8)}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(9)}
        textAnchor="middle"
        fontWeight="bold"
      >
        静止衰变原点 (0, 0)
      </text>

      {!decayData.hasDecayed && (
        <g filter="url(#sphereShadow)">
          <circle
            cx={origin.px}
            cy={origin.py}
            r={16}
            fill="url(#protonGrad)"
            stroke={PHYSICS_COLORS.forceArrowRed}
            strokeWidth={2}
          />
          <text
            x={origin.px}
            y={origin.py + 4}
            fill={PHYSICS_COLORS.white}
            fontSize={font(10)}
            fontWeight="bold"
            textAnchor="middle"
          >
            {decayData.decayType === 0 ? '²³⁸U' : '¹⁴C'}
          </text>
          <text
            x={origin.px}
            y={origin.py - 22}
            fill={PHYSICS_COLORS.alertRed}
            fontSize={font(11)}
            fontWeight="bold"
            textAnchor="middle"
          >
            静止母核即将自发衰变...
          </text>
        </g>
      )}

      {decayData.hasDecayed && (
        <g>
          <g filter="url(#sphereShadow)">
            <circle
              cx={pPos.px}
              cy={pPos.py}
              r={decayData.decayType === 0 ? 9 : 6}
              fill={decayData.decayType === 0 ? 'url(#protonGrad)' : 'url(#neutronGrad)'}
              stroke={decayData.decayType === 0 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.negativeCharge}
              strokeWidth={1.5}
            />
            <text
              x={pPos.px}
              y={pPos.py + 3.5}
              fill={PHYSICS_COLORS.white}
              fontSize={font(8)}
              fontWeight="bold"
              textAnchor="middle"
            >
              {decayData.decayType === 0 ? 'α' : 'β'}
            </text>
            <text
              x={pPos.px}
              y={pPos.py - 12}
              fill={decayData.decayType === 0 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.negativeCharge}
              fontSize={font(10)}
              fontWeight="bold"
              textAnchor="middle"
            >
              {decayData.particleName}
            </text>
          </g>

          <g filter="url(#sphereShadow)">
            <circle
              cx={dPos.px}
              cy={dPos.py}
              r={13}
              fill="url(#neutronGrad)"
              stroke={PHYSICS_COLORS.appliedForce}
              strokeWidth={1.5}
            />
            <text
              x={dPos.px}
              y={dPos.py + 4}
              fill={PHYSICS_COLORS.white}
              fontSize={font(9)}
              fontWeight="bold"
              textAnchor="middle"
            >
              {decayData.decayType === 0 ? 'Th' : 'N'}
            </text>
            <text
              x={dPos.px}
              y={dPos.py + 25}
              fill={PHYSICS_COLORS.appliedForce}
              fontSize={font(10)}
              fontWeight="bold"
              textAnchor="middle"
            >
              {decayData.daughterName} (大质量反冲)
            </text>
          </g>
        </g>
      )}
    </g>
  )
}
