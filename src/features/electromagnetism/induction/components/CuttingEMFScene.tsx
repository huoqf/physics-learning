import React, { useMemo } from 'react'
import { PHYSICS_COLORS, EM_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { Rails, ConductorRod, VectorArrow, VectorDefs, MagneticFieldSymbols } from '@/components/Physics'
import { worldToDesign } from '@/scene'
import { CuttingEMFHandRule } from '../CuttingEMFHandRule'
import type { CuttingEMFPhysicsResult } from '../hooks/useCuttingEMFPhysics'
import type { SceneScale } from '@/scene'

interface CuttingEMFSceneProps {
  physics: CuttingEMFPhysicsResult
  sceneScale: SceneScale
  font: (v: number) => number
  canvasScale: number
  time: number
  isPlaying: boolean
  mode: number
  showForceAnalysis: number
  F_ext: number
  L: number
  R: number
}

export const CuttingEMFScene = React.memo(function CuttingEMFScene({
  physics, sceneScale, font, canvasScale, time, isPlaying, mode, showForceAnalysis, F_ext, L, R,
}: CuttingEMFSceneProps) {
  const {
    finalX, finalV, finalA, finalI, EMF_current, hasHitLimit,
    B_out, absB, ampForceX, extForceX,
    railSpacing,
  } = physics

  // 用场景自身的 sceneScale 重新计算导轨坐标
  const railLeftDesign = worldToDesign(0, 0, sceneScale)
  const railRightDesign = worldToDesign(10, 0, sceneScale)
  const rodDesign = worldToDesign(finalX, 0, sceneScale)
  const railCx = (railLeftDesign.px + railRightDesign.px) / 2
  const railCy = railLeftDesign.py
  const railLength = railRightDesign.px - railLeftDesign.px

  // 物理坐标→设计坐标转换（用于 VectorArrow originPixel）
  const velArrowOrigin = worldToDesign(finalX, L * 0.8 + 0.3, sceneScale)
  const accelArrowOrigin = worldToDesign(finalX, L * 0.8 + 0.7, sceneScale)
  const forceBelowOrigin = worldToDesign(finalX, -0.15, sceneScale)
  const forceAboveOrigin = worldToDesign(finalX, 0.15, sceneScale)

  const fieldSymbols = useMemo(() => {
    const points: Array<{ x: number; y: number }> = []
    const stepX = 30
    const stepY = 25

    const xStart = railLeftDesign.px + 10
    const xEnd = railRightDesign.px - 10
    const yStart = railCy - railSpacing / 2 + 10
    const yEnd = railCy + railSpacing / 2 - 10

    for (let sx = xStart; sx <= xEnd; sx += stepX) {
      for (let sy = yStart; sy <= yEnd; sy += stepY) {
        points.push({ x: sx, y: sy })
      }
    }

    return (
      <MagneticFieldSymbols
        points={points}
        direction={B_out === 1 ? 'out' : 'in'}
        radius={font(7)}
        strokeWidth={1.5}
        opacity={Math.min(0.75, 0.4 + (absB / 3.0) * 0.25)}
      />
    )
  }, [absB, B_out, railLeftDesign.px, railRightDesign.px, railSpacing, railCy, font])

  return (
    <svg
      viewBox={`0 0 ${CANVAS_PRESETS.splitV.width} ${CANVAS_PRESETS.splitV.height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
        <defs>
          <VectorDefs colors={[
            PHYSICS_COLORS.velocity,
            PHYSICS_COLORS.acceleration,
            PHYSICS_COLORS.forceNet,
            PHYSICS_COLORS.appliedForce,
            PHYSICS_COLORS.lorentzForce
          ]} />
        </defs>

        {/* 导体棒扫过区域底色 */}
        {isPlaying && time > 0 && (
          <rect
            x={0} y={0}
            width={CANVAS_PRESETS.splitV.width} height={CANVAS_PRESETS.splitV.height}
            fill={withAlpha(CANVAS_COLORS.objectFill, 0.18)}
          />
        )}

        {/* 导体棒当前位置高亮 */}
        {isPlaying && time > 0 && (() => {
          const rodW = 6
          const topY = railCy - railSpacing / 2 - 6
          const bottomY = railCy + railSpacing / 2 + 6
          return (
            <rect
              x={rodDesign.px - rodW / 2} y={topY}
              width={rodW} height={bottomY - topY}
              fill={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
            />
          )
        })()}

        <Rails
          type="horizontal"
          width={CANVAS_PRESETS.splitV.width}
          height={CANVAS_PRESETS.splitV.height}
          cx={railCx}
          cy={railCy}
          length={railLength}
          spacing={railSpacing}
        />

        {fieldSymbols}

        <text
          x={20}
          y={20}
          fontSize={font(13)}
          fill={PHYSICS_COLORS.magneticField}
          fontWeight="extrabold"
          alignmentBaseline="middle"
        >
          匀强磁场 B = {absB.toFixed(1)} T {B_out === 1 ? '(⊙ 垂直纸面向外)' : '(⊗ 垂直纸面向里)'}
        </text>

        <g>
          <path
            d={`M ${railLeftDesign.px} ${railCy - railSpacing / 2} L ${railLeftDesign.px - 16} ${railCy - railSpacing / 2} L ${railLeftDesign.px - 16} ${railCy - 20} M ${railLeftDesign.px - 16} ${railCy + 20} L ${railLeftDesign.px - 16} ${railCy + railSpacing / 2} L ${railLeftDesign.px} ${railCy + railSpacing / 2}`}
            fill="none"
            stroke={CANVAS_COLORS.labelText}
            strokeWidth="2.5"
          />
          <rect
            x={railLeftDesign.px - 26}
            y={railCy - 20}
            width={20}
            height={40}
            fill={CANVAS_COLORS.objectFill}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth="2.5"
            rx={2}
          />
          <text
            x={railLeftDesign.px - 16}
            y={railCy}
            fontSize={font(13)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            R
          </text>
          <text
            x={railLeftDesign.px - 38}
            y={railCy}
            fontSize={font(11)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="end"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            电阻 R = {R.toFixed(1)} Ω
          </text>
        </g>

        <ConductorRod
          type="horizontal"
          x={rodDesign.px}
          currentDir={finalI > 1e-4 ? 'in' : finalI < -1e-4 ? 'out' : 'none'}
          spacing={railSpacing}
          height={CANVAS_PRESETS.splitV.height}
        />

        {Math.abs(EMF_current) > 0.01 && (
          <text
            x={rodDesign.px - 15}
            y={railCy - 10}
            fontSize={font(11)}
            fill={PHYSICS_COLORS.emf}
            fontWeight="bold"
            textAnchor="end"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            E_感 = {Math.abs(EMF_current).toFixed(2)} V
          </text>
        )}

        {Math.abs(EMF_current) > 0.01 && (
          <g>
            <text
              x={rodDesign.px + 10}
              y={railCy - railSpacing / 2 - 8}
              fontSize={font(14)}
              fill={EMF_current > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
              fontWeight="extrabold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {EMF_current > 0 ? '+' : '−'}
            </text>
            <text
              x={rodDesign.px + 10}
              y={railCy + railSpacing / 2 + 8}
              fontSize={font(14)}
              fill={EMF_current > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
              fontWeight="extrabold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {EMF_current > 0 ? '−' : '+'}
            </text>
          </g>
        )}

        {Math.abs(finalI) > 1e-4 && (
          <path
            d={`M ${railLeftDesign.px - 16} ${railCy - railSpacing / 2}
                L ${rodDesign.px} ${railCy - railSpacing / 2}
                L ${rodDesign.px} ${railCy + railSpacing / 2}
                L ${railLeftDesign.px - 16} ${railCy + railSpacing / 2}
                Z`}
            fill="none"
            stroke={EM_COLORS.electricCurrent}
            strokeWidth={3}
            strokeDasharray={`${1}, ${15}`}
            strokeLinecap="round"
            strokeDashoffset={finalI >= 0 ? time * 35 : -time * 35}
            opacity={0.85}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {showForceAnalysis === 1 && (
          <g opacity={0.85}>
            <CuttingEMFHandRule
              svgRef={undefined}
              vDir={finalV > 0 ? 1 : finalV < 0 ? -1 : 0}
              B_out={(B_out === 1 ? 1 : 0) as 0 | 1}
              isBack={B_out === 1}
              rule="right"
              fist={false}
              cx={rodDesign.px}
              cy={railCy + railSpacing / 2 + 45}
              scale={canvasScale * 0.42}
              draggable={false}
            />
          </g>
        )}

        {showForceAnalysis === 1 && (
          <g>
            <VectorArrow
              originPixel={{ x: velArrowOrigin.px, y: velArrowOrigin.py }}
              vector={{ x: finalV, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={2.5}
            />
            {Math.abs(finalV) > 0.05 && (
              <text
                x={rodDesign.px + (finalV > 0 ? 30 : -35)}
                y={railCy - railSpacing / 2 - 25}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                v = {finalV.toFixed(2)} m/s
              </text>
            )}

            <VectorArrow
              originPixel={{ x: accelArrowOrigin.px, y: accelArrowOrigin.py }}
              vector={{ x: finalA, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={2.5}
            />
            {Math.abs(finalA) > 0.05 && (
              <text
                x={rodDesign.px + (finalA > 0 ? 30 : -35)}
                y={railCy - railSpacing / 2 - 55}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.acceleration}
                fontWeight="bold"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                a = {finalA.toFixed(2)} m/s²
              </text>
            )}

            {((mode === 1 && F_ext > 0) || (mode === 0 && Math.abs(extForceX) > 0.01)) && (
              <g>
                <VectorArrow
                  originPixel={{ x: forceBelowOrigin.px, y: forceBelowOrigin.py }}
                  vector={{ x: extForceX, y: 0 }}
                  type="appliedForce"
                  sceneScale={sceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodDesign.px + (extForceX > 0 ? 35 : -35)}
                  y={railCy - 20}
                  fontSize={font(11)}
                  fill={PHYSICS_COLORS.appliedForce}
                  fontWeight="bold"
                  textAnchor={extForceX > 0 ? 'start' : 'end'}
                  style={{ userSelect: 'none' }}
                >
                  F_外 = {Math.abs(extForceX).toFixed(2)} N
                </text>
              </g>
            )}

            {Math.abs(ampForceX) > 0.01 && (
              <g>
                <VectorArrow
                  originPixel={{ x: forceBelowOrigin.px, y: forceBelowOrigin.py }}
                  vector={{ x: ampForceX, y: 0 }}
                  type="lorentzForce"
                  sceneScale={sceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodDesign.px + (ampForceX > 0 ? 35 : -35)}
                  y={railCy - 20}
                  fontSize={font(11)}
                  fill={PHYSICS_COLORS.lorentzForce}
                  fontWeight="bold"
                  textAnchor={ampForceX > 0 ? 'start' : 'end'}
                  style={{ userSelect: 'none' }}
                >
                  F_安 = {Math.abs(ampForceX).toFixed(2)} N
                </text>
              </g>
            )}

            {mode === 1 && (
              <g>
                <VectorArrow
                  originPixel={{ x: forceAboveOrigin.px, y: forceAboveOrigin.py }}
                  vector={{ x: F_ext + ampForceX, y: 0 }}
                  type="appliedForce"
                  sceneScale={sceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodDesign.px + (F_ext + ampForceX > 0 ? 25 : -25)}
                  y={railCy + 20}
                  fontSize={font(11)}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                  textAnchor={F_ext + ampForceX > 0 ? 'start' : 'end'}
                  style={{ userSelect: 'none' }}
                >
                  F_合 = {Math.abs(F_ext + ampForceX).toFixed(2)} N
                </text>
              </g>
            )}

            {mode === 0 && Math.abs(finalV) > 0.05 && (
              <text
                x={rodDesign.px - 25}
                y={railCy - railSpacing / 2 - 8}
                fontSize={font(11)}
                fill={PHYSICS_COLORS.labelText}
                fontWeight="bold"
                textAnchor="end"
                style={{ userSelect: 'none' }}
              >
                外力驱动匀速运动 (F_外 = F_安，受力平衡)
              </text>
            )}
          </g>
        )}

        {hasHitLimit && (
          <g>
            <rect
              x={CANVAS_PRESETS.splitV.width / 2 - 100}
              y={15}
              width={200}
              height={25}
              fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)}
              stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)}
              strokeWidth={1.5}
              rx={4}
            />
            <text
              x={CANVAS_PRESETS.splitV.width / 2}
              y={27.5}
              fontSize={font(12)}
              fill={PHYSICS_COLORS.forceArrowRed}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              ⚠️ 已到达导轨边缘限位
            </text>
          </g>
        )}
      </svg>
  )
})
