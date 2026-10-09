import { Ball, PhysicsVectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useState, useEffect, useCallback } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

import {
  CANVAS_STYLE,
  CHART_COLORS,
  PHYSICS_COLORS,
} from '@/theme/physics'
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
} from '@/physics/intermolecularForces'
import IntermolecularForcesDualChart from './IntermolecularForcesDualChart'

export default function IntermolecularForcesAnimation() {
  const { params, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const { font } = canvasSize

  const rParam = params.r ?? 2.0

  const w = vp.visibleW
  const h = vp.visibleH

  const centerY = h / 2
  const moleculeR = Math.min(w, h) * 0.08

  // 设计坐标映射：以中心为基准，1 r₀ 对应像素宽度
  const r0Pixel = Math.min(w * 0.15, 120)
  const centerX = w / 2

  // 固定分子偏左，移动分子随 r 变化
  const fixedX = centerX - r0Pixel * 0.8
  const movableX = fixedX + rParam * r0Pixel

  const fRep = repulsiveForce(rParam)
  const fAtt = attractiveForce(rParam)
  const fNet = netMolecularForce(rParam)

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'viewport',
    physicsWidth: w,
    physicsHeight: h,
    originSource: 'topLeft',
    refMagnitudes: { force: Math.max(fRep, fAtt, Math.abs(fNet), 0.5) * 1.5 },
  })

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
    const newR = (svgP.x - fixedX) / r0Pixel
    const clampedR = Math.max(0.5, Math.min(4.0, newR))
    setDragR(clampedR)
    updateParam('r', clampedR)
  }, [dragging, fixedX, r0Pixel, updateParam])

  const handleMouseUp = useCallback(() => setDragging(false), [])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50/70 rounded-xl">
      {/* 上半部：纯分子交互仿真画布 (SVG) */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 中心基准参考线 */}
          <line
            x1={20}
            y1={centerY}
            x2={w - 20}
            y2={centerY}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            strokeDasharray="4,4"
            opacity={0.3}
          />

          {/* 平衡位置 r0 标记虚线 */}
          <line
            x1={fixedX + r0Pixel}
            y1={centerY - 50}
            x2={fixedX + r0Pixel}
            y2={centerY + 50}
            stroke={CHART_COLORS.equilibrium}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <text
            x={fixedX + r0Pixel}
            y={centerY - 56}
            fontSize={font(10)}
            fill={CHART_COLORS.equilibrium}
            textAnchor="middle"
            fontWeight="bold"
          >
            r₀ (平衡位置)
          </text>

          {/* 距离双箭头与标注 */}
          <line
            x1={fixedX}
            y1={centerY + 45}
            x2={movableX}
            y2={centerY + 45}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={CANVAS_STYLE.stroke.reference}
          />
          <line
            x1={fixedX}
            y1={centerY + 40}
            x2={fixedX}
            y2={centerY + 50}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={CANVAS_STYLE.stroke.reference}
          />
          <line
            x1={movableX}
            y1={centerY + 40}
            x2={movableX}
            y2={centerY + 50}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={CANVAS_STYLE.stroke.reference}
          />
          <text
            x={(fixedX + movableX) / 2}
            y={centerY + 62}
            fontSize={font(11)}
            fill={CHART_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            r = {currentR.toFixed(2)} r₀
          </text>

          {/* 矢量箭头标注 */}
          {showVectors && (
            <g>
              {/* 斥力（红色，向右） */}
              <PhysicsVectorArrow
                originDesign={{ x: movableX, y: centerY }}
                vector={{ x: fRep, y: 0 }}
                type="force"
                color={CHART_COLORS.criticalPt}
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              />
              <text
                x={movableX + 38}
                y={centerY - 10}
                fontSize={font(10)}
                fill={CHART_COLORS.criticalPt}
                textAnchor="start"
                fontWeight="bold"
              >
                F_斥 ({fRep.toFixed(2)})
              </text>

              {/* 引力（蓝色，向左） */}
              <PhysicsVectorArrow
                originDesign={{ x: movableX, y: centerY }}
                vector={{ x: -fAtt, y: 0 }}
                type="force"
                color={CHART_COLORS.primary}
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              />
              <text
                x={movableX - 38}
                y={centerY - 10}
                fontSize={font(10)}
                fill={CHART_COLORS.primary}
                textAnchor="end"
                fontWeight="bold"
              >
                F_引 ({fAtt.toFixed(2)})
              </text>

              {/* 合力（橙色） */}
              <PhysicsVectorArrow
                originDesign={{ x: movableX, y: centerY + 24 }}
                vector={{ x: fNet, y: 0 }}
                type="force"
                color={PHYSICS_COLORS.forceNet}
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              />
              <text
                x={movableX + (fNet >= 0 ? 38 : -38)}
                y={centerY + 24 - 8}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.forceNet}
                textAnchor={fNet >= 0 ? 'start' : 'end'}
                fontWeight="bold"
              >
                F_合 = {fNet >= 0 ? `+${fNet.toFixed(2)}` : fNet.toFixed(2)}
              </text>
            </g>
          )}

          {/* 固定分子（左侧） */}
          <Ball
            cx={fixedX}
            cy={centerY}
            r={moleculeR}
            type="steel"
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
          />
          <text
            x={fixedX}
            y={centerY - moleculeR - 10}
            fontSize={font(10)}
            fill={CHART_COLORS.labelText}
            textAnchor="middle"
            fontWeight="medium"
          >
            分子 A (固定)
          </text>

          {/* 可拖拽移动分子（右侧） */}
          <Ball
            cx={movableX}
            cy={centerY}
            r={moleculeR}
            type="steelGhost"
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
          />
          <text
            x={movableX}
            y={centerY - moleculeR - 10}
            fontSize={font(10)}
            fill={CHART_COLORS.labelText}
            textAnchor="middle"
            fontWeight="medium"
          >
            分子 B (可水平拖拽)
          </text>
        </AnimationSvgCanvas>
      </div>

      {/* 下半部：严格同轴双关系图表（F-r 与 Ep-r） */}
      <div className="flex-1 min-h-0">
        <IntermolecularForcesDualChart currentR={currentR} />
      </div>
    </div>
  )
}
