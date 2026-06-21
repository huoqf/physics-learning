import { useCanvasSize, useViewport } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, OPACITY, withAlpha, CANVAS_COLORS } from '@/theme/physics'
import {
  calculateWorkBasic,
  calculateWorkAdvanced,
  classifyWorkType,
  calculateWorkKinematicsBasic,
  calculateWorkKinematicsAdvanced,
  computeWorkEnergyBars,
} from '@/physics/work'
import type { WorkKinematics } from '@/physics/work'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import { WorkVTChart } from './WorkVTChart'
import { WorkFSChart } from './WorkFSChart'
import { WorkEnergyBar } from './WorkEnergyBar'

/** 布局常量（语义化比例，禁止裸数字） */
const WORK_LAYOUT = {
  designWidth: 700,
  designHeight: 650,
  chartTopRatio: 0.03,
  chartBottomRatio: 0.48,
  chartLeftRatio: 0.02,
  chartMidRatio: 0.50,
  chartRightRatio: 0.98,
  dividerRatio: 0.50,
  sceneTopRatio: 0.52,
  sceneBottomRatio: 0.97,
  paddingRatio: 0.07,
} as const

/**
 * 恒力做功动画 —— "力与位移的夹角投影"
 *
 * 双轨模式：
 * - 基础模式（mode=0）：理想恒力与方向投影，μ=0
 * - 进阶模式（mode=1）：摩擦力做功与脱地临界
 *
 * 上下分区布局：图表区（上）+ 场景区（下）
 */
export default function WorkAnimation() {
  const { params, time, showVectors, showGrid } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 650 })
  const { font } = canvasSize

  const mode = (params.mode ?? 0) as 0 | 1

  const vp = useViewport(canvasSize, {
    designWidth: WORK_LAYOUT.designWidth,
    designHeight: WORK_LAYOUT.designHeight,
  })

  const F = params.F ?? 10
  const angleDeg = params.angleDeg ?? 30
  const s = params.s ?? 5
  const m = params.m ?? 2
  const mu = params.mu ?? 0.3
  const g = params.g ?? 9.8

  const chartTop = canvasSize.height * WORK_LAYOUT.chartTopRatio
  const chartBottom = canvasSize.height * WORK_LAYOUT.chartBottomRatio
  const chartH = chartBottom - chartTop
  const chartLeft = canvasSize.width * WORK_LAYOUT.chartLeftRatio
  const chartMid = canvasSize.width * WORK_LAYOUT.chartMidRatio
  const chartRight = canvasSize.width * WORK_LAYOUT.chartRightRatio
  const leftChartW = chartMid - chartLeft
  const rightChartW = chartRight - chartMid
  const dividerY = canvasSize.height * WORK_LAYOUT.dividerRatio

  const sceneOffsetY = canvasSize.height * WORK_LAYOUT.sceneTopRatio
  const sceneHeight = canvasSize.height * (WORK_LAYOUT.sceneBottomRatio - WORK_LAYOUT.sceneTopRatio)

  const padding = vp.visibleW * WORK_LAYOUT.paddingRatio
  const groundYInScene = sceneHeight * 0.72
  const scale = (vp.visibleW - 2 * padding) / 12
  const startX = vp.visibleX + padding
  const maxVisibleX = vp.visibleX + vp.visibleW - padding

  const objW = vp.visibleW * 0.06
  const objH = objW * 0.7

  const maxAnimTime = 4
  const progress = Math.min(time / maxAnimTime, 1)
  const currentS = s * progress * progress
  const blockX = startX + currentS * scale

  const workType = classifyWorkType(angleDeg)

  const basicResult = useMemo(
    () => calculateWorkBasic(F, s, angleDeg),
    [F, s, angleDeg]
  )

  const advancedResult = useMemo(
    () => calculateWorkAdvanced(F, s, angleDeg, m, mu, g),
    [F, s, angleDeg, m, mu, g]
  )

  const currentWorkBasic = useMemo(
    () => calculateWorkBasic(F, currentS, angleDeg),
    [F, currentS, angleDeg]
  )

  const currentWorkAdvanced = useMemo(
    () => calculateWorkAdvanced(F, currentS, angleDeg, m, mu, g),
    [F, currentS, angleDeg, m, mu, g]
  )

  const kinematics: WorkKinematics = useMemo(
    () => mode === 0
      ? calculateWorkKinematicsBasic(F, s, angleDeg, m)
      : calculateWorkKinematicsAdvanced(F, s, angleDeg, m, mu, g),
    [mode, F, s, angleDeg, m, mu, g]
  )

  const energyBars = useMemo(
    () => computeWorkEnergyBars(currentS, F, angleDeg, m, mu, g),
    [currentS, F, angleDeg, m, mu, g]
  )

  const maxWorkRef = useMemo(() => {
    const angleRad = (angleDeg * Math.PI) / 180
    return Math.abs(F * Math.cos(angleRad) * s)
  }, [F, angleDeg, s])

  const isLiftedOff = mode === 1 && advancedResult.isLiftedOff
  const floatOffset = isLiftedOff ? 6 * Math.sin(time * 4) : 0

  const projectionColor = useMemo((): string => {
    if (workType === 'positive') return PHYSICS_COLORS.work
    if (workType === 'negative') return PHYSICS_COLORS.friction
    return PHYSICS_COLORS.labelTextLight
  }, [workType])

  const sceneFontSize = font(11)
  const sceneSmallFont = font(9)

  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: { x: number; key: string }[] = []
    const gridCount = Math.max(8, Math.floor(vp.visibleW / 60))
    for (let i = 0; i <= gridCount; i++) {
      lines.push({ x: startX + (i * (maxVisibleX - startX)) / gridCount, key: `grid-${i}` })
    }
    return lines
  }, [showGrid, vp.visibleW, startX, maxVisibleX])

  const landmarkLabels = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = (12 * i) / count
      labels.push({ x: startX + dist * scale, text: `${dist.toFixed(0)}m` })
    }
    return labels
  }, [scale, startX])

  const forceArrowLen = Math.min(F * 2.5, 80)
  const angleRad = (angleDeg * Math.PI) / 180
  const forceDx = forceArrowLen * Math.cos(angleRad)
  const forceDy = -forceArrowLen * Math.sin(angleRad)
  const projEndX = forceDx
  const originX = startX

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <linearGradient id="block-body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.southMid} />
          </linearGradient>
          <linearGradient id="block-wheel-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </linearGradient>
        </defs>

        {/* ═══ 上半部: 图表区（左右并列）═══ */}
        {mode === 0 ? (
          <>
            {/* 基础模式：左 v-t，右 F-s */}
            <g transform={`translate(${chartLeft}, ${chartTop})`}>
              <WorkVTChart
                canvasSize={{ width: leftChartW, height: chartH }}
                font={font}
                kinematics={kinematics}
                currentTime={time}
                maxAnimTime={maxAnimTime}
              />
            </g>
            <line x1={chartMid} y1={chartTop} x2={chartMid} y2={chartBottom}
              stroke={CANVAS_COLORS.grid} strokeWidth={STROKE.groundLine} />
            <g transform={`translate(${chartMid}, ${chartTop})`}>
              <WorkFSChart
                canvasSize={{ width: rightChartW, height: chartH }}
                font={font}
                F={F}
                angleDeg={angleDeg}
                m={m}
                mu={mu}
                g={g}
                sTarget={s}
                currentS={currentS}
                mode={mode}
              />
            </g>
          </>
        ) : (
          <>
            {/* 进阶模式：左 F-s 复合，右 能量柱 */}
            <g transform={`translate(${chartLeft}, ${chartTop})`}>
              <WorkFSChart
                canvasSize={{ width: leftChartW, height: chartH }}
                font={font}
                F={F}
                angleDeg={angleDeg}
                m={m}
                mu={mu}
                g={g}
                sTarget={s}
                currentS={currentS}
                mode={mode}
              />
            </g>
            <line x1={chartMid} y1={chartTop} x2={chartMid} y2={chartBottom}
              stroke={CANVAS_COLORS.grid} strokeWidth={STROKE.groundLine} />
            <g transform={`translate(${chartMid}, ${chartTop})`}>
              <WorkEnergyBar
                canvasSize={{ width: rightChartW, height: chartH }}
                font={font}
                energyBars={energyBars}
                maxWorkRef={maxWorkRef}
              />
            </g>
          </>
        )}

        {/* 分隔线 */}
        <line x1={padding} y1={dividerY} x2={maxVisibleX} y2={dividerY}
          stroke={CANVAS_COLORS.grid} strokeWidth={STROKE.groundLine} />

        {/* ═══ 下半部: 场景区 ═══ */}
        <g transform={`translate(0, ${sceneOffsetY})`}>
          <line x1={startX} y1={groundYInScene} x2={maxVisibleX} y2={groundYInScene}
            stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
          {landmarkLabels.map((lm, i) => (
            <g key={`lm-${i}`}>
              <line x1={lm.x} y1={groundYInScene} x2={lm.x} y2={groundYInScene + 6}
                stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tick} />
              <text x={lm.x} y={groundYInScene + sceneFontSize + 6}
                fontSize={sceneSmallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                {lm.text}
              </text>
            </g>
          ))}

          {gridLines.map((gl) => (
            <line key={gl.key} x1={gl.x} y1={groundYInScene - objH * 2.5}
              x2={gl.x} y2={groundYInScene + 4}
              stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid}
              strokeDasharray={DASH.guide.join(',')} />
          ))}

          <line x1={originX} y1={groundYInScene - objH * 2.5}
            x2={originX} y2={groundYInScene + 4}
            stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold}
            strokeDasharray={DASH.boundary.join(',')} />
          <text x={originX - sceneFontSize} y={groundYInScene + sceneFontSize + 6}
            fontSize={sceneFontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

          <g transform={`translate(${blockX}, ${groundYInScene - objH + floatOffset})`}>
            <rect width={objW} height={objH - 4} rx={4} fill="url(#block-body-grad)"
              stroke={SCENE_COLORS.magnet.southMid} strokeWidth={1.5} />
            <rect x={objW * 0.1} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1}
              fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <rect x={objW * 0.4} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1}
              fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <rect x={objW * 0.7} y={objH * 0.15} width={objW * 0.2} height={objH * 0.3} rx={1}
              fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <line x1={objW * 0.15} y1={objH * 0.15} x2={objW * 0.22} y2={objH * 0.45}
              stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
            <line x1={objW * 0.45} y1={objH * 0.15} x2={objW * 0.52} y2={objH * 0.45}
              stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
            <line x1={objW * 0.05} y1={objH * 0.55} x2={objW * 0.95} y2={objH * 0.55}
              stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} opacity={0.5} />
            <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#block-wheel-grad)" />
              <circle r={objH * 0.09} fill={SCENE_COLORS.circuit.bulbGlassStroke}
                stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.04} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
            <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#block-wheel-grad)" />
              <circle r={objH * 0.09} fill={SCENE_COLORS.circuit.bulbGlassStroke}
                stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.04} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
          </g>

          {showVectors && F > 0 && (
            <g>
              <VectorArrow
                origin={{ x: blockX + objW * 0.5, y: -(groundYInScene - objH * 0.5 + floatOffset) }}
                vector={{ x: forceDx, y: -forceDy }}
                type="appliedForce"
                sceneScale={sceneScale}
                strokeWidth={STROKE.vectorMain}
                pixelLength={Math.sqrt(forceDx ** 2 + forceDy ** 2)}
              />
              <text x={blockX + objW * 0.5 + forceDx + sceneFontSize * 0.3}
                y={groundYInScene - objH * 0.5 + forceDy + floatOffset}
                fontSize={sceneFontSize} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold">
                F
              </text>

              {Math.abs(basicResult.Fx) > 0.01 && (
                <g>
                  <line x1={blockX + objW * 0.5 + forceDx}
                    y1={groundYInScene - objH * 0.5 + forceDy + floatOffset}
                    x2={blockX + objW * 0.5 + projEndX}
                    y2={groundYInScene - objH * 0.5 + floatOffset}
                    stroke={projectionColor} strokeWidth={STROKE.vectorThin}
                    strokeDasharray={DASH.guide.join(',')} opacity={OPACITY.guide} />
                  <VectorArrow
                    origin={{ x: blockX + objW * 0.5, y: -(groundYInScene - objH * 0.5 + floatOffset) }}
                    vector={{ x: projEndX, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={projectionColor}
                    strokeWidth={STROKE.vectorSub}
                    pixelLength={Math.abs(projEndX)}
                  />
                  <text x={blockX + objW * 0.5 + projEndX / 2}
                    y={groundYInScene - objH * 0.5 - sceneFontSize * 0.5 + floatOffset}
                    fontSize={sceneSmallFont} fill={projectionColor} fontWeight="bold" textAnchor="middle">
                    Fx
                  </text>
                </g>
              )}

              {Math.abs(basicResult.Fx) <= 0.01 && (
                <circle cx={blockX + objW * 0.5} cy={groundYInScene - objH * 0.5 + floatOffset}
                  r={3} fill={projectionColor} />
              )}

              {angleDeg > 0 && angleDeg < 180 && (
                <g>
                  {(() => {
                    const arcR = Math.min(20, forceArrowLen * 0.4)
                    const endAngle = -angleRad
                    const x1 = blockX + objW * 0.5 + arcR
                    const y1 = groundYInScene - objH * 0.5 + floatOffset
                    const x2 = blockX + objW * 0.5 + arcR * Math.cos(endAngle)
                    const y2 = groundYInScene - objH * 0.5 + arcR * Math.sin(endAngle) + floatOffset
                    const largeArc = angleDeg > 180 ? 1 : 0
                    return (
                      <path d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 0 ${x2} ${y2}`}
                        fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={STROKE.guide} />
                    )
                  })()}
                  <text x={blockX + objW * 0.5 + Math.cos(-angleRad / 2) * 28}
                    y={groundYInScene - objH * 0.5 + Math.sin(-angleRad / 2) * 28 + sceneFontSize * 0.35 + floatOffset}
                    fontSize={sceneSmallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                    θ
                  </text>
                </g>
              )}
            </g>
          )}

          {mode === 1 && showVectors && (
            <g>
              <VectorArrow
                origin={{ x: blockX + objW * 0.5, y: -(groundYInScene - objH * 0.5 + floatOffset) }}
                vector={{ x: 0, y: -Math.min(advancedResult.weight * 1.5, 50) }}
                type="gravity"
                sceneScale={sceneScale}
                strokeWidth={STROKE.vectorSub}
                pixelLength={Math.min(advancedResult.weight * 1.5, 50)}
              />
              <text x={blockX + objW * 0.5 - sceneFontSize}
                y={groundYInScene - objH * 0.5 + Math.min(advancedResult.weight * 1.5, 50) + floatOffset}
                fontSize={sceneSmallFont} fill={PHYSICS_COLORS.gravity} fontWeight="bold">
                mg
              </text>

              {!isLiftedOff && advancedResult.F_N > 0 && (
                <g>
                  <VectorArrow
                    origin={{ x: blockX + objW * 0.5 + 8, y: -(groundYInScene + floatOffset) }}
                    vector={{ x: 0, y: Math.min(advancedResult.F_N * 1.5, 40) }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    strokeWidth={STROKE.vectorSub}
                    pixelLength={Math.min(advancedResult.F_N * 1.5, 40)}
                  />
                  <text x={blockX + objW * 0.5 + 8 + sceneFontSize * 0.5}
                    y={groundYInScene - Math.min(advancedResult.F_N * 1.5, 40) + floatOffset}
                    fontSize={sceneSmallFont} fill={PHYSICS_COLORS.normalForce} fontWeight="bold">
                    FN
                  </text>
                </g>
              )}

              {!isLiftedOff && advancedResult.f > 0 && (
                <g>
                  <VectorArrow
                    origin={{ x: blockX + objW * 0.3, y: -(groundYInScene - objH * 0.15 + floatOffset) }}
                    vector={{ x: -Math.min(advancedResult.f * 3, 40), y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    strokeWidth={STROKE.vectorSub}
                    pixelLength={Math.min(advancedResult.f * 3, 40)}
                  />
                  <text x={blockX + objW * 0.3 - Math.min(advancedResult.f * 3, 40) - sceneFontSize * 0.5}
                    y={groundYInScene - objH * 0.15 + sceneFontSize * 0.35 + floatOffset}
                    fontSize={sceneSmallFont} fill={PHYSICS_COLORS.friction} fontWeight="bold">
                    f
                  </text>
                </g>
              )}
            </g>
          )}

          {showVectors && currentS > 0.1 && (
            <g>
              <line x1={originX} y1={groundYInScene + 16} x2={blockX} y2={groundYInScene + 16}
                stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <line x1={originX} y1={groundYInScene + 12} x2={originX} y2={groundYInScene + 20}
                stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <line x1={blockX} y1={groundYInScene + 12} x2={blockX} y2={groundYInScene + 20}
                stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <text x={(originX + blockX) / 2} y={groundYInScene + 30}
                fontSize={sceneSmallFont} fill={PHYSICS_COLORS.displacement} textAnchor="middle">
                s={currentS.toFixed(1)}m
              </text>
            </g>
          )}

          {isLiftedOff && (
            <g>
              <rect x={vp.centerX - 160} y={sceneOffsetY * 0.1}
                width={320} height={36} rx={6}
                fill={withAlpha(PHYSICS_COLORS.forceNet, 0.1)}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={STROKE.groundLine} />
              <text x={vp.centerX} y={sceneOffsetY * 0.1 + 22}
                fontSize={sceneSmallFont} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle">
                滑块脱离地面！FN=0，滑动摩擦力降为 0
              </text>
            </g>
          )}

          <text x={startX} y={sceneOffsetY * 0.08 + sceneFontSize}
            fontSize={sceneFontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            {mode === 0 ? '恒力做功 · 基础模式' : '恒力做功 · 进阶模式（含摩擦力）'}
          </text>

          {showVectors && (
            <g transform={`translate(${maxVisibleX - 90}, ${groundYInScene - objH * 2.5})`}>
              <rect width={90} height={28} rx={4} fill={
                workType === 'positive' ? withAlpha(PHYSICS_COLORS.work, 0.15) :
                workType === 'negative' ? withAlpha(PHYSICS_COLORS.heatLoss, 0.15) : CANVAS_COLORS.grid
              } stroke={projectionColor} strokeWidth={STROKE.groundLine} />
              <text x={45} y={18} fontSize={sceneSmallFont} fill={projectionColor} fontWeight="bold" textAnchor="middle">
                {workType === 'positive' ? '正功 W>0' : workType === 'negative' ? '负功 W<0' : '不做功 W=0'}
              </text>
            </g>
          )}

          <g transform={`translate(${maxVisibleX - 120}, ${groundYInScene - objH * 1.5})`}>
            {mode === 0 ? (
              <g>
                <text x={0} y={0} fontSize={sceneSmallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
                  W = {currentWorkBasic.W.toFixed(1)} J
                </text>
                <text x={0} y={sceneFontSize * 1.3} fontSize={sceneSmallFont} fill={PHYSICS_COLORS.labelTextLight}>
                  Fx = {currentWorkBasic.Fx.toFixed(1)} N
                </text>
              </g>
            ) : (
              <g>
                <text x={0} y={0} fontSize={sceneSmallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
                  WF = {currentWorkAdvanced.W_F.toFixed(1)} J
                </text>
                <text x={0} y={sceneFontSize * 1.3} fontSize={sceneSmallFont} fill={PHYSICS_COLORS.friction}>
                  Wf = {currentWorkAdvanced.W_f.toFixed(1)} J
                </text>
                <text x={0} y={sceneFontSize * 2.6} fontSize={sceneSmallFont} fill={PHYSICS_COLORS.forceNet}>
                  Wnet = {currentWorkAdvanced.W_net.toFixed(1)} J
                </text>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  )
}
