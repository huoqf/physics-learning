import { useState, useEffect, useCallback } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { Ball } from '@/components/Physics/Ball'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import {
  CANVAS_STYLE,
  CHART_COLORS,
} from '@/theme/physics'
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
} from '@/physics/intermolecularForces'
import IntermolecularForceChart from './IntermolecularForceChart'

const LAYOUT = {
  stageWidthRatio: 0.55,
  moleculeRadiusRatio: 0.04,
  gapPerUnit: 0.06,
  distanceLabelOffsetRatio: 0.15,
  chartPadding: 16,
} as const

export default function IntermolecularForcesAnimation() {
  const { params, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 400 })
  const { font } = canvasSize

  const mode = params.mode ?? 0
  const rParam = params.r ?? 2.0

  const w = vp.visibleW
  const h = vp.visibleH

  const stageWidth = w * LAYOUT.stageWidthRatio
  const centerX = stageWidth / 2
  const centerY = h / 2

  const moleculeR = Math.min(w, h) * LAYOUT.moleculeRadiusRatio
  const gap = rParam * (stageWidth * LAYOUT.gapPerUnit)

  const fixedX = centerX - gap / 2
  const movableX = centerX + gap / 2

  const fRep = repulsiveForce(rParam)
  const fAtt = attractiveForce(rParam)
  const fNet = netMolecularForce(rParam)

  const sceneConfig: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: h },
    originX: 0,
    originY: 0,
    refMagnitudes: { force: Math.max(fRep, fAtt, fNet, 0.5) * 1.2 },
  }
  const sceneScale = createSceneScale(sceneConfig)

  const [dragging, setDragging] = useState(false)
  const [dragR, setDragR] = useState(rParam)
  const updateParam = useAnimationStore((s) => s.updateParam)

  useEffect(() => {
    setDragR(rParam)
  }, [rParam])

  const currentR = dragging ? dragR : rParam

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const newR = (svgP.x - fixedX) / (stageWidth * LAYOUT.gapPerUnit)
    const clampedR = Math.max(0.5, Math.min(10, newR))
    setDragR(clampedR)
    updateParam('r', clampedR)
  }, [dragging, fixedX, stageWidth, updateParam])

  const handleMouseUp = useCallback(() => setDragging(false), [])

  const chartWidth = w - stageWidth - LAYOUT.chartPadding * 3
  const chartHeight = h - LAYOUT.chartPadding * 2

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={w} height={h} className="bg-white rounded-lg shadow-inner"
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        {/* 参考线 */}
        <line x1={20} y1={centerY} x2={stageWidth - 20} y2={centerY}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

        {/* 距离标注 */}
        <line x1={fixedX} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio}
          x2={movableX} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={fixedX} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio - 5}
          x2={fixedX} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio + 5}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={movableX} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio - 5}
          x2={movableX} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio + 5}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <text x={(fixedX + movableX) / 2} y={centerY + h * LAYOUT.distanceLabelOffsetRatio + 16}
          fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle">
          r = {currentR.toFixed(2)} r₀
        </text>

        {/* 矢量箭头 */}
        {showVectors && (
          <g>
            {/* 斥力（红色，向右） */}
            <VectorArrow
              origin={{ x: movableX, y: -centerY }}
              vector={{ x: fRep, y: 0 }}
              type="force"
              color={CHART_COLORS.criticalPt}
              sceneScale={sceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            />
            <text x={movableX + 35} y={centerY - 8}
              fontSize={font(8)} fill={CHART_COLORS.criticalPt} textAnchor="start" fontWeight="bold">F_斥</text>

            {/* 引力（蓝色，向左） */}
            <VectorArrow
              origin={{ x: movableX, y: -centerY }}
              vector={{ x: -fAtt, y: 0 }}
              type="force"
              color={CHART_COLORS.primary}
              sceneScale={sceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            />
            <text x={movableX - 35} y={centerY - 8}
              fontSize={font(8)} fill={CHART_COLORS.primary} textAnchor="end" fontWeight="bold">F_引</text>

            {/* 合力（橙色） */}
            <VectorArrow
              origin={{ x: movableX, y: -(centerY + 20) }}
              vector={{ x: fNet, y: 0 }}
              type="force"
              color={CHART_COLORS.compareC}
              sceneScale={sceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            />
            <text x={movableX + (fNet >= 0 ? 35 : -35)} y={centerY + 20 - 8}
              fontSize={font(9)} fill={CHART_COLORS.compareC}
              textAnchor={fNet >= 0 ? 'start' : 'end'} fontWeight="bold">F_合</text>
          </g>
        )}

        {/* 固定分子 */}
        <Ball cx={fixedX} cy={centerY} r={moleculeR} type="steel" strokeWidth={CANVAS_STYLE.stroke.objectThin} />
        <text x={fixedX} y={centerY - moleculeR - 8}
          fontSize={font(9)} fill={CHART_COLORS.labelText} textAnchor="middle">固定分子</text>

        {/* 可拖拽分子 */}
        <Ball cx={movableX} cy={centerY} r={moleculeR} type="steelGhost" strokeWidth={CANVAS_STYLE.stroke.objectThin}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown} />
        <text x={movableX} y={centerY - moleculeR - 8}
          fontSize={font(9)} fill={CHART_COLORS.labelText} textAnchor="middle">移动分子</text>
        <text x={movableX} y={centerY + moleculeR + 16}
          fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">(拖拽改变距离)</text>

        {/* 右侧图表 */}
        <g transform={`translate(${stageWidth + LAYOUT.chartPadding}, ${LAYOUT.chartPadding})`}>
          <IntermolecularForceChart
            currentR={currentR}
            mode={mode === 1 ? 'energy' : 'force'}
            width={chartWidth}
            height={chartHeight}
            font={font}
          />
        </g>
      </svg>
    </div>
  )
}
