import React, { type RefObject } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { ElectricPotentialPhysicsResult } from './hooks/useElectricPotentialPhysics'

interface Props {
  w: number
  hChart: number
  physics: ElectricPotentialPhysicsResult
  isPlaying: boolean
  particlePhysicsPos: { x: number; y: number }
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  chartSvgRef: RefObject<SVGSVGElement | null>
  font: (v: number) => number
}

export function ElectricPotentialChartScene({
  w,
  hChart,
  physics,
  isPlaying,
  particlePhysicsPos,
  onPointerMove,
  chartSvgRef,
  font,
}: Props) {
  const {
    chartYLimit,
    chartPathD,
    chartPadding,
    chartWidth,
    chartHeight,
    chartPhysToCanvas,
    hoverPhysX,
    hoverPhysics,
    tangentLinePath,
  } = physics

  const xStartPhys = 1.0
  const xEndPhys = 6.0

  return (
    <div className="w-full flex-1 relative border-b border-neutral-200 bg-white">
      <svg
        ref={chartSvgRef}
        width={w}
        height={hChart}
        className="w-full h-full block cursor-ew-resize"
        onPointerMove={onPointerMove}
      >
        {/* 网格背景线 */}
        {Array.from({ length: 6 }).map((_, i) => {
          const xp = xStartPhys + (i / 5) * (xEndPhys - xStartPhys)
          const p = chartPhysToCanvas(xp, chartYLimit.min)
          return (
            <line
              key={`grid-x-${i}`}
              x1={p.cx}
              y1={chartPadding.top}
              x2={p.cx}
              y2={chartPadding.top + chartHeight}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1}
              strokeDasharray="2,3"
            />
          )
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const phi = chartYLimit.min + (i / 4) * (chartYLimit.max - chartYLimit.min)
          const p = chartPhysToCanvas(xStartPhys, phi)
          return (
            <line
              key={`grid-y-${i}`}
              x1={chartPadding.left}
              y1={p.cy}
              x2={chartPadding.left + chartWidth}
              y2={p.cy}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1}
              strokeDasharray="2,3"
            />
          )
        })}

        {/* A点 / B点 垂直界限指示线 */}
        {(() => {
          const pA = chartPhysToCanvas(1.5, 0)
          const pB = chartPhysToCanvas(5.5, 0)
          return (
            <g opacity={0.65}>
              <line
                x1={pA.cx}
                y1={chartPadding.top}
                x2={pA.cx}
                y2={chartPadding.top + chartHeight}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
              <line
                x1={pB.cx}
                y1={chartPadding.top}
                x2={pB.cx}
                y2={chartPadding.top + chartHeight}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
              <text x={pA.cx} y={chartPadding.top - 8} fontSize={font(10)} fontWeight="bold" fill={colors.neutral[500]} textAnchor="middle">
                A点 (x=1.5m)
              </text>
              <text x={pB.cx} y={chartPadding.top - 8} fontSize={font(10)} fontWeight="bold" fill={colors.neutral[500]} textAnchor="middle">
                B点 (x=5.5m)
              </text>
            </g>
          )
        })()}

        {/* 坐标轴轴线 */}
        <line
          x1={chartPadding.left}
          y1={chartPadding.top + chartHeight}
          x2={chartPadding.left + chartWidth}
          y2={chartPadding.top + chartHeight}
          stroke={colors.neutral[400]}
          strokeWidth={1.5}
        />
        <line
          x1={chartPadding.left}
          y1={chartPadding.top}
          x2={chartPadding.left}
          y2={chartPadding.top + chartHeight}
          stroke={colors.neutral[400]}
          strokeWidth={1.5}
        />

        {/* 坐标轴标签 */}
        <text
          x={chartPadding.left + chartWidth}
          y={chartPadding.top + chartHeight + 22}
          fontSize={font(10)}
          fill={colors.neutral[600]}
          textAnchor="end"
          fontWeight="bold"
        >
          位移 x / m
        </text>
        <text
          x={chartPadding.left - 12}
          y={chartPadding.top - 8}
          fontSize={font(10)}
          fill={colors.neutral[600]}
          textAnchor="middle"
          fontWeight="bold"
        >
          电势 φ / V
        </text>

        {/* 坐标轴刻度与数值 */}
        {Array.from({ length: 6 }).map((_, i) => {
          const xp = xStartPhys + (i / 5) * (xEndPhys - xStartPhys)
          const p = chartPhysToCanvas(xp, chartYLimit.min)
          return (
            <g key={`lbl-x-${i}`}>
              <line x1={p.cx} y1={p.cy} x2={p.cx} y2={p.cy + 4} stroke={colors.neutral[400]} strokeWidth={1.5} />
              <text x={p.cx} y={p.cy + 16} fontSize={font(9.5)} fill={colors.neutral[600]} textAnchor="middle" className="font-mono">
                {xp.toFixed(1)}
              </text>
            </g>
          )
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const phi = chartYLimit.min + (i / 4) * (chartYLimit.max - chartYLimit.min)
          const p = chartPhysToCanvas(xStartPhys, phi)
          return (
            <g key={`lbl-y-${i}`}>
              <line x1={p.cx} y1={p.cy} x2={p.cx - 4} y2={p.cy} stroke={colors.neutral[400]} strokeWidth={1.5} />
              <text x={p.cx - 8} y={p.cy + 3.5} fontSize={font(9.5)} fill={colors.neutral[600]} textAnchor="end" className="font-mono">
                {Math.round(phi)}
              </text>
            </g>
          )
        })}

        {/* φ-x 关系曲线 */}
        <path
          d={chartPathD}
          fill="none"
          stroke={PHYSICS_COLORS.electricPotential}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* 实时 Hover 的黄色切线与切点 */}
        {(() => {
          const pCut = chartPhysToCanvas(hoverPhysX, hoverPhysics.phi)
          return (
            <g>
              <line
                x1={tangentLinePath.x1}
                y1={tangentLinePath.y1}
                x2={tangentLinePath.x2}
                y2={tangentLinePath.y2}
                stroke={PHYSICS_COLORS.tangentLine}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle cx={pCut.cx} cy={pCut.cy} r={5} fill={PHYSICS_COLORS.tangentLine} className="drop-shadow-sm" />
              {/* 悬浮数值卡片 */}
              <g transform={`translate(${pCut.cx + 12}, ${pCut.cy - 12})`}>
                <rect
                  width={110}
                  height={38}
                  rx={4}
                  fill="white"
                  stroke={PHYSICS_COLORS.tangentLine}
                  strokeWidth={1}
                  fillOpacity={0.9}
                  className="shadow-sm"
                />
                <text x={8} y={15} fontSize={font(9)} fill={colors.neutral[800]} fontWeight="bold">
                  k = -Eₓ = {hoverPhysics.slope.toFixed(1)} V/m
                </text>
                <text x={8} y={28} fontSize={font(9)} fill={PHYSICS_COLORS.electricPotential} fontWeight="bold">
                  φ = {hoverPhysics.phi.toFixed(1)} V
                </text>
              </g>
            </g>
          )
        })()}

        {/* 播放过程中粒子的实时 x 位置指示线 */}
        {isPlaying && (
          (() => {
            const pPart = chartPhysToCanvas(particlePhysicsPos.x, hoverPhysics.phi)
            return (
              <g>
                <line
                  x1={pPart.cx}
                  y1={chartPadding.top}
                  x2={pPart.cx}
                  y2={chartPadding.top + chartHeight}
                  stroke={PHYSICS_COLORS.kineticEnergy}
                  strokeWidth={1.5}
                  strokeDasharray="3,2"
                />
                <circle cx={pPart.cx} cy={pPart.cy} r={6} fill={PHYSICS_COLORS.kineticEnergy} stroke="white" strokeWidth={1.5} className="drop-shadow-sm animate-pulse" />
              </g>
            )
          })()
        )}
      </svg>

      {/* 标题与操作提示 */}
      <div className="absolute left-4 top-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-2 border border-neutral-200/50 shadow-sm">
        <span className="font-bold text-neutral-600">φ - x 关系图线 (一维水平路径)</span>
        <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/40 animate-pulse" style={{ fontSize: font(10) }}>
          ↔ 左右移动鼠标滑动求导
        </span>
      </div>
    </div>
  )
}
