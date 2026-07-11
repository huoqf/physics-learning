import React, { useEffect, useRef, useMemo, useState } from 'react'
import { PHYSICS_COLORS, EM_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { Rails, ConductorRod, VectorArrow, VectorDefs, MagneticFieldSymbols } from '@/components/Physics'
import { CuttingEMFHandRule } from '../CuttingEMFHandRule'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { CuttingEMFPhysicsResult } from '../hooks/useCuttingEMFPhysics'

interface CuttingEMFSceneProps {
  physics: CuttingEMFPhysicsResult
  canvasSize: CanvasSize
  time: number
  isPlaying: boolean
  mode: number
  showForceAnalysis: number
  F_ext: number
  L: number
  R: number
}

export const CuttingEMFScene = React.memo(function CuttingEMFScene({
  physics, canvasSize, time, isPlaying, mode, showForceAnalysis, F_ext, L, R,
}: CuttingEMFSceneProps) {
  const {
    finalX, finalV, finalA, finalI, EMF_current, hasHitLimit,
    B_out, absB, ampForceX, extForceX,
    railLeftPos, railRightPos, rodPos,
    railSpacing, railLength, railCx, railCy,
    localSceneScale, sceneHeight,
  } = physics

  const { px, font } = canvasSize

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [actualHeight, setActualHeight] = useState(sceneHeight)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const h = Math.round(entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height)
      if (h > 0) setActualHeight(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fieldSymbols = useMemo(() => {
    const points: Array<{ x: number; y: number }> = []
    const stepX = px(30)
    const stepY = px(25)

    const xStart = railLeftPos.cx + px(10)
    const xEnd = railRightPos.cx - px(10)
    const yStart = railCy - railSpacing / 2 + px(10)
    const yEnd = railCy + railSpacing / 2 - px(10)

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
  }, [absB, B_out, railLeftPos.cx, railRightPos.cx, railSpacing, railCy, px, font])

  return (
    <div ref={containerRef} className="w-full relative bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm flex-1 min-h-0">
      <svg
        width={canvasSize.width}
        height={actualHeight}
        className="absolute inset-0 z-10 w-full h-full bg-transparent"
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
            width={canvasSize.width} height={actualHeight}
            fill={withAlpha(CANVAS_COLORS.objectFill, 0.18)}
          />
        )}

        {/* 导体棒当前位置高亮 */}
        {isPlaying && time > 0 && (() => {
          const rodW = px(6)
          const topY = railCy - railSpacing / 2 - px(6)
          const bottomY = railCy + railSpacing / 2 + px(6)
          return (
            <rect
              x={rodPos.cx - rodW / 2} y={topY}
              width={rodW} height={bottomY - topY}
              fill={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
            />
          )
        })()}

        <Rails
          type="horizontal"
          width={canvasSize.width}
          height={actualHeight}
          cx={railCx}
          cy={railCy}
          length={railLength}
          spacing={railSpacing}
        />

        {fieldSymbols}

        <text
          x={px(20)}
          y={px(20)}
          fontSize={font(13)}
          fill={PHYSICS_COLORS.magneticField}
          fontWeight="extrabold"
          alignmentBaseline="middle"
        >
          匀强磁场 B = {absB.toFixed(1)} T {B_out === 1 ? '(⊙ 垂直纸面向外)' : '(⊗ 垂直纸面向里)'}
        </text>

        <g>
          <path
            d={`M ${railLeftPos.cx} ${railCy - railSpacing / 2} L ${railLeftPos.cx - px(16)} ${railCy - railSpacing / 2} L ${railLeftPos.cx - px(16)} ${railCy - px(20)} M ${railLeftPos.cx - px(16)} ${railCy + px(20)} L ${railLeftPos.cx - px(16)} ${railCy + railSpacing / 2} L ${railLeftPos.cx} ${railCy + railSpacing / 2}`}
            fill="none"
            stroke={CANVAS_COLORS.labelText}
            strokeWidth="2.5"
          />
          <rect
            x={railLeftPos.cx - px(26)}
            y={railCy - px(20)}
            width={px(20)}
            height={px(40)}
            fill={CANVAS_COLORS.objectFill}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth="2.5"
            rx={px(2)}
          />
          <text
            x={railLeftPos.cx - px(16)}
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
            x={railLeftPos.cx - px(38)}
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
          x={rodPos.cx}
          currentDir={finalI > 1e-4 ? 'in' : finalI < -1e-4 ? 'out' : 'none'}
          spacing={railSpacing}
          height={actualHeight}
        />

        {Math.abs(EMF_current) > 0.01 && (
          <text
            x={rodPos.cx - px(15)}
            y={railCy - px(10)}
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
              x={rodPos.cx + px(10)}
              y={railCy - railSpacing / 2 - px(8)}
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
              x={rodPos.cx + px(10)}
              y={railCy + railSpacing / 2 + px(8)}
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
            d={`M ${railLeftPos.cx - px(16)} ${railCy - railSpacing / 2} 
                L ${rodPos.cx} ${railCy - railSpacing / 2} 
                L ${rodPos.cx} ${railCy + railSpacing / 2} 
                L ${railLeftPos.cx - px(16)} ${railCy + railSpacing / 2} 
                Z`}
            fill="none"
            stroke={EM_COLORS.electricCurrent}
            strokeWidth={px(3)}
            strokeDasharray={`${px(1)}, ${px(15)}`}
            strokeLinecap="round"
            strokeDashoffset={finalI >= 0 ? time * px(35) : -time * px(35)}
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
              cx={rodPos.cx}
              cy={railCy + railSpacing / 2 + px(45)}
              scale={canvasSize.scale * 0.42}
              draggable={false}
            />
          </g>
        )}

        {showForceAnalysis === 1 && (
          <g>
            <VectorArrow
              origin={{ x: finalX, y: L * 0.8 + 0.3 }}
              vector={{ x: finalV, y: 0 }}
              type="velocity"
              sceneScale={localSceneScale}
              strokeWidth={2.5}
            />
            {Math.abs(finalV) > 0.05 && (
              <text
                x={rodPos.cx + (finalV > 0 ? px(30) : -px(35))}
                y={railCy - railSpacing / 2 - px(25)}
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
              origin={{ x: finalX, y: L * 0.8 + 0.7 }}
              vector={{ x: finalA, y: 0 }}
              type="acceleration"
              sceneScale={localSceneScale}
              strokeWidth={2.5}
            />
            {Math.abs(finalA) > 0.05 && (
              <text
                x={rodPos.cx + (finalA > 0 ? px(30) : -px(35))}
                y={railCy - railSpacing / 2 - px(55)}
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
                  origin={{ x: finalX, y: 0.15 }}
                  vector={{ x: extForceX, y: 0 }}
                  type="appliedForce"
                  sceneScale={localSceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodPos.cx + (extForceX > 0 ? px(35) : -px(35))}
                  y={railCy - px(20)}
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
                  origin={{ x: finalX, y: 0.15 }}
                  vector={{ x: ampForceX, y: 0 }}
                  type="lorentzForce"
                  sceneScale={localSceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodPos.cx + (ampForceX > 0 ? px(35) : -px(35))}
                  y={railCy - px(20)}
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
                  origin={{ x: finalX, y: -0.15 }}
                  vector={{ x: F_ext + ampForceX, y: 0 }}
                  type="appliedForce"
                  sceneScale={localSceneScale}
                  strokeWidth={2.5}
                />
                <text
                  x={rodPos.cx + (F_ext + ampForceX > 0 ? px(25) : -px(25))}
                  y={railCy + px(20)}
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
                x={rodPos.cx - px(25)}
                y={railCy - railSpacing / 2 - px(8)}
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
              x={canvasSize.width / 2 - px(100)}
              y={px(15)}
              width={px(200)}
              height={px(25)}
              fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)}
              stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)}
              strokeWidth={1.5}
              rx={px(4)}
            />
            <text
              x={canvasSize.width / 2}
              y={px(27.5)}
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
    </div>
  )
})
