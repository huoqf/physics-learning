import { useCanvasSize } from '@/utils'
import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  CANVAS_STYLE,
} from '@/theme/physics'
import { useVerticalThrowPhysics } from './useVerticalThrowPhysics'
import { useVerticalThrowChartLayout } from './useVerticalThrowChartLayout'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Ball } from '@/components/Physics/Ball'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

export default function VerticalThrowAnimation() {
    const {params, time, isPlaying, showVectors, setIsPlaying, setTime} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    showVectors: s.showVectors,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })

  const { v0 = 15, g = 9.8, advancedMode = 0, sliceDensity = 0, airResistance = 0, targetHeight = 0, showVacuumCompare = 1 } = params

  // ── 物理计算（Hook 提取） ──
  const physics = useVerticalThrowPhysics(v0, g, airResistance, time, advancedMode, targetHeight)
  const {
    trajectory,
    totalTime,
    maxHeight,
    maxHeightTime,
    landTimeVac,
    maxHeightVac,
    effectiveTime,
    effectiveV,
    effectiveY,
    vacuumV,
    vacuumY,
    isLanded,
    isAtPeak,
    interpolatePoints,
    areaValues,
    targetHeightIntersections,
    vT1,
    vT2,
  } = physics

  // ── 双轨模式判定 ──
  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  const clampedY = Math.max(effectiveY, 0)
  const clampedVacuumY = Math.max(vacuumY, 0)

  // ── 图表布局（Hook 提取） ──
  const layout = useVerticalThrowChartLayout(
    canvasSize.width,
    canvasSize.height,
    totalTime,
    maxHeight,
    maxHeightTime,
    landTimeVac,
    maxHeightVac,
    effectiveTime,
    v0,
    advancedMode,
    sliceDensity,
    trajectory.points,
    trajectory.vacuumPoints,
    interpolatePoints,
  )

  const {
    stageWidth,
    dataX,
    dataWidth,
    originY,
    groundY,
    stageHeight,
    ballX,
    displayMaxHeight,
    scale,
    vtChartTop,
    vtChartHeight,
    vtInnerPad,
    vtInnerW,
    vtInnerH,
    vtVMax,
    xMax,
    vtToX,
    vtToY,
    ytChartTop,
    ytChartHeight,
    ytInnerPad,
    ytInnerW,
    ytInnerH,
    ytYMax,
    ytToX,
    ytToY,
    vtYTicks,
    xticks,
    ytYTicks,
    vtData,
    ytData,
    vtPositiveAreaD,
    vtNegativeAreaD,
    ytAreaD,
    sliceRects,
    ghostBalls,
  } = layout

  const leftBallX = ballX
  const rightBallX = showDoubleTrack ? ballX + 40 : ballX

  const vtScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: v0, acceleration: g },
  }
  const vtSceneScale = createSceneScale(vtScene)

  const currentBallY = originY + (displayMaxHeight - clampedY) * scale
  const currentVacuumBallY = originY + (displayMaxHeight - clampedVacuumY) * scale

  // ── 落地自动暂停 ──
  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // ── 最高点自动暂停 1 秒后继续 ──
  const hasPausedAtPeakRef = useRef(false)
  const peakTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (isAtPeak && isPlaying && !hasPausedAtPeakRef.current) {
      setIsPlaying(false)
      hasPausedAtPeakRef.current = true
      peakTimerRef.current = setTimeout(() => {
        setIsPlaying(true)
      }, 1000)
    }
    if (!isAtPeak) {
      hasPausedAtPeakRef.current = false
    }
  }, [isAtPeak, isPlaying, setIsPlaying])

  useEffect(() => {
    return () => {
      if (peakTimerRef.current) clearTimeout(peakTimerRef.current)
    }
  }, [])

  // ── 时间轴拖拽 ──
  const isDraggingRef = useRef(false)

  const handleChartMouseDown = useCallback((e: React.MouseEvent<SVGElement>, chartType: 'vt' | 'yt') => {
    isDraggingRef.current = true
    const svg = e.currentTarget.closest('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const pad = chartType === 'vt' ? vtInnerPad : ytInnerPad
    const innerW = chartType === 'vt' ? vtInnerW : ytInnerW
    const chartDataX = dataX + pad.left
    const tClick = ((clickX - chartDataX) / innerW) * xMax
    if (tClick >= 0 && tClick <= totalTime) {
      setTime(tClick)
      setIsPlaying(false)
    }
  }, [dataX, vtInnerPad, ytInnerPad, vtInnerW, ytInnerW, xMax, totalTime, setTime, setIsPlaying])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!isDraggingRef.current) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const chartDataX = dataX + vtInnerPad.left
    const tClick = ((clickX - chartDataX) / vtInnerW) * xMax
    if (tClick >= 0 && tClick <= totalTime) {
      setTime(tClick)
      setIsPlaying(false)
    }
  }, [dataX, vtInnerPad, vtInnerW, xMax, totalTime, setTime, setIsPlaying])

  const handleSvgMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartClick = useCallback((e: React.MouseEvent<SVGGElement>, chartType: 'vt' | 'yt') => {
    const svg = e.currentTarget.closest('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const pad = chartType === 'vt' ? vtInnerPad : ytInnerPad
    const innerW = chartType === 'vt' ? vtInnerW : ytInnerW
    const chartDataX = dataX + pad.left
    const tClick = ((clickX - chartDataX) / innerW) * xMax
    if (tClick >= 0 && tClick <= totalTime) {
      setTime(tClick)
      setIsPlaying(false)
    }
  }, [dataX, vtInnerPad, ytInnerPad, vtInnerW, ytInnerW, xMax, totalTime, setTime, setIsPlaying])
  // ── 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
      >

        {/* ========== defs ========== */}
        <defs>


          <filter id="glow-filter-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="aurora-blue-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.effects.auroraBlueGrad[0]} stopOpacity={0.45} />
            <stop offset="100%" stopColor={SCENE_COLORS.effects.auroraBlueGrad[1]} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="aurora-red-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.effects.auroraRedGrad[0]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SCENE_COLORS.effects.auroraRedGrad[1]} stopOpacity={0.05} />
          </linearGradient>

          <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration]} />

          <pattern id="gridPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0L8 8M8 0L0 8" stroke={SCENE_COLORS.effects.patternGrid} strokeWidth="0.5" opacity={0.35} />
          </pattern>
          <pattern id="stripePattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0" stroke={SCENE_COLORS.effects.patternStripe} strokeWidth="1" opacity={0.35} />
          </pattern>
        </defs>

        {/* ========== 左侧：物理演练区 ========== */}
        <line x1={30} y1={groundY} x2={stageWidth - 20} y2={groundY}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        <text x={25} y={originY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">
          {displayMaxHeight.toFixed(1)}m
        </text>
        <text x={25} y={groundY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">0</text>
        <text x={leftBallX + (showDoubleTrack ? -20 : 18)} y={groundY + 14} fontSize={FONT.small} fill={PHYSICS_COLORS.axis}>y=0</text>

        <line x1={30} y1={originY + (displayMaxHeight - maxHeight) * scale} x2={stageWidth - 20} y2={originY + (displayMaxHeight - maxHeight) * scale}
          stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')} opacity={0.5} />
        <text x={stageWidth - 18} y={originY + (displayMaxHeight - maxHeight) * scale - 4} fontSize={FONT.small}
          fill={PHYSICS_COLORS.potentialEnergy} textAnchor="end" opacity={0.7}>
          最高点 H = {maxHeight.toFixed(2)}m
        </text>

        {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
          <>
            <line
              x1={30} y1={originY + (displayMaxHeight - targetHeight) * scale}
              x2={stageWidth - 20} y2={originY + (displayMaxHeight - targetHeight) * scale}
              stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
              strokeDasharray={DASH.reference.join(' ')} opacity={0.7}
            />
            <text
              x={stageWidth - 18}
              y={originY + (displayMaxHeight - targetHeight) * scale - 4}
              fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="end" opacity={0.8}
            >
              目标 y = {targetHeight}m
            </text>
          </>
        )}

        {ghostBalls.map((ball, idx) => (
          <circle key={`ghost-${idx}`} cx={leftBallX} cy={ball.cy} r={5}
            fill={PHYSICS_COLORS.velocityX} opacity={0.25} />
        ))}

        {showDoubleTrack && !isLanded && (
          <Ball
            cx={rightBallX}
            cy={currentVacuumBallY}
            r={13}
            type="steelGhost"
            stroke={PHYSICS_COLORS.deltaHighlight}
            strokeWidth={1}
          />
        )}

        <Ball
          cx={leftBallX}
          cy={currentBallY}
          r={14}
          type="steel"
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {advancedMode === 1 && sliceDensity > 0 && effectiveTime > 0 && !isLanded && (
          <line
            x1={leftBallX} y1={currentBallY}
            x2={dataX + vtToX(effectiveTime)} y2={vtChartTop + vtToY(effectiveV)}
            stroke={effectiveV >= 0 ? PHYSICS_COLORS.velocityY : CHART_COLORS.reference}
            strokeWidth={1.5}
            strokeDasharray="2,1"
            opacity={0.6}
            filter={`drop-shadow(0 0 2px ${PHYSICS_COLORS.velocityX})`}
          />
        )}

        {showVectors && effectiveV !== 0 && !isLanded && (
          <g>
            <VectorArrow
              origin={{ x: leftBallX + 18, y: -currentBallY }}
              vector={{ x: 0, y: effectiveV }}
              type="velocity"
              sceneScale={vtSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={leftBallX + 30} y={currentBallY - vtSceneScale.maxVectorLength * 0.3 + 3}
              fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v
            </text>
          </g>
        )}

        {showVectors && !isLanded && (
          <g>
            <VectorArrow
              origin={{ x: leftBallX - 18, y: -currentBallY }}
              vector={{ x: 0, y: -g }}
              type="acceleration"
              sceneScale={vtSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={leftBallX - 30} y={currentBallY + vtSceneScale.maxVectorLength * 0.5}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a
            </text>
          </g>
        )}

        {isAtPeak && (
          <g>
            <g>
              <VectorArrow
                origin={{ x: leftBallX - 18, y: -currentBallY }}
                vector={{ x: 0, y: -g }}
                type="acceleration"
                sceneScale={vtSceneScale}
                strokeWidth={STROKE.vectorMain}
              />
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </g>
            <text x={leftBallX - 30} y={currentBallY + vtSceneScale.maxVectorLength * 0.5}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </text>
          </g>
        )}

        {isAtPeak && (
          <g transform={`translate(${leftBallX + (showDoubleTrack ? -122 : 24)}, ${currentBallY - 45})`}>
            <rect width={116} height={42} fill={SCENE_COLORS.labels.panelBg} opacity={0.92} rx={4} stroke={CHART_COLORS.criticalPt} strokeWidth={1} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
            <polygon points={showDoubleTrack ? "116 21, 122 21, 116 26" : "0 21, -6 21, 0 26"} fill={SCENE_COLORS.labels.panelBg} stroke={CHART_COLORS.criticalPt} strokeWidth={0.5} />
            <text x={58} y={13} fontSize={9} fill={SCENE_COLORS.labels.panelText} textAnchor="middle" fontWeight="bold">瞬时状态 v = 0</text>
            <text x={58} y={25} fontSize={8} fill={SCENE_COLORS.labels.panelTextMuted} textAnchor="middle">但 a = -g = -{g} m/s²</text>
            <text x={58} y={35} fontSize={8} fill={SCENE_COLORS.labels.panelTextMuted} textAnchor="middle">合力 F_合 = mg 向下</text>
          </g>
        )}

        {advancedMode === 1 && targetHeightIntersections && !isLanded && (
          <>
            {Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.15 && (
              <g transform={`translate(${leftBallX + 24}, ${currentBallY - 15})`}>
                <rect width={95} height={26} fill={SCENE_COLORS.labels.panelBg} opacity={0.88} rx={3} stroke={CHART_COLORS.highlight} strokeWidth={0.8} />
                <text x={47} y={11} fontSize={8} fill={SCENE_COLORS.labels.panelText} textAnchor="middle" fontWeight="bold">① 上升阶段经过</text>
                <text x={47} y={20} fontSize={8} fill={PHYSICS_COLORS.deltaHighlight} textAnchor="middle">v = +{effectiveV.toFixed(1)} m/s</text>
              </g>
            )}
            {Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.15 && (
              <g transform={`translate(${leftBallX + 24}, ${currentBallY - 15})`}>
                <rect width={95} height={26} fill={SCENE_COLORS.labels.panelBg} opacity={0.88} rx={3} stroke={CHART_COLORS.highlight} strokeWidth={0.8} />
                <text x={47} y={11} fontSize={8} fill={SCENE_COLORS.labels.panelText} textAnchor="middle" fontWeight="bold">② 下落阶段经过</text>
                <text x={47} y={20} fontSize={8} fill={SCENE_COLORS.labels.panelTextMuted} textAnchor="middle">v = {effectiveV.toFixed(1)} m/s</text>
              </g>
            )}
          </>
        )}

        {isLanded && (
          <text x={leftBallX} y={groundY - 30} fontSize={FONT.small} fill={PHYSICS_COLORS.forceNet}
            textAnchor="middle" fontWeight="bold">落地</text>
        )}

        {/* ========== 右侧：v-t 图 ========== */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            速度-时间图像 (v-t 图)
          </text>

          <line x1={vtInnerPad.left} y1={vtInnerPad.top} x2={vtInnerPad.left} y2={vtInnerPad.top + vtInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={vtInnerPad.left} y1={vtToY(0)} x2={vtInnerPad.left + vtInnerW} y2={vtToY(0)}
            stroke={CHART_COLORS.zeroline} strokeWidth={STROKE.axisBold} />

          {xticks.map(t => (
            <g key={`vt-xt-${t}`}>
              <line x1={vtToX(t)} y1={vtToY(0) - 4} x2={vtToX(t)} y2={vtToY(0) + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtToX(t)} y={vtToY(0) + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {vtYTicks.map(v => (
            <g key={`vt-yt-${v}`}>
              <line x1={vtInnerPad.left - 4} y1={vtToY(v)} x2={vtInnerPad.left} y2={vtToY(v)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtInnerPad.left - 8} y={vtToY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
            </g>
          ))}

          <text x={vtInnerPad.left + vtInnerW / 2} y={vtInnerPad.top + vtInnerH + 28}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={vtInnerPad.left - 30} y={vtInnerPad.top + vtInnerH / 2}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${vtInnerPad.left - 30}, ${vtInnerPad.top + vtInnerH / 2})`}>v/(m·s⁻¹)</text>

          {advancedMode === 1 && sliceDensity > 0 ? (
            sliceRects.map((rect, idx) => (
              <rect key={`slice-${idx}`}
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                fill={rect.positive ? 'url(#gridPattern)' : 'url(#stripePattern)'}
                opacity={0.55}
              />
            ))
          ) : (
            <>
              {vtPositiveAreaD && (
                <path d={vtPositiveAreaD} fill="url(#aurora-blue-grad)" />
              )}
              {vtNegativeAreaD && (
                <path d={vtNegativeAreaD} fill="url(#aurora-red-grad)" />
              )}
            </>
          )}

          {airResistance > 0 && vtData.vacFull && (
            <path d={vtData.vacFull} fill="none" stroke={CHART_COLORS.asymptote} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {vtData.airFull && (
            <path d={vtData.airFull} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={1} opacity={0.15} />
          )}

          {showDoubleTrack && vtData.vacActive && (
            <path d={vtData.vacActive} fill="none" stroke={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.7} />
          )}

          {vtData.airActive && (
            <path d={vtData.airActive} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
          )}

          {isAtPeak && (
            <g>
              <line
                x1={vtToX(Math.max(maxHeightTime - 0.5, 0))} y1={vtToY(g * 0.5)}
                x2={vtToX(Math.min(maxHeightTime + 0.5, xMax))} y2={vtToY(-g * 0.5)}
                stroke={CHART_COLORS.criticalPt} strokeWidth={1} strokeDasharray="2,2"
              />
              <text x={vtToX(maxHeightTime) + 8} y={vtToY(0) - 8} fontSize={8} fill={CHART_COLORS.criticalPt}>切线斜率 k = -g</text>

              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={6}
                fill={VT_CHART_COLORS.zeroCrossing} opacity={0.6}>
                <animate attributeName="r" values="6;10;6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={3}
                fill={VT_CHART_COLORS.zeroCrossing} />
            </g>
          )}

          {advancedMode === 1 && targetHeightIntersections && (
            <g opacity={Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.2 || Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.2 ? 0.95 : 0.25}>
              <line
                x1={vtInnerPad.left} y1={vtToY(vT1)}
                x2={vtToX(targetHeightIntersections.t1)} y2={vtToY(vT1)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t1)} cy={vtToY(vT1)} r={3.5} fill={CHART_COLORS.highlight} />

              <line
                x1={vtInnerPad.left} y1={vtToY(vT2)}
                x2={vtToX(targetHeightIntersections.t2)} y2={vtToY(vT2)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t2)} cy={vtToY(vT2)} r={3.5} fill={CHART_COLORS.highlight} />
            </g>
          )}

          {!isAtPeak && effectiveTime > 0 && (
            <g>
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={4.5} fill={VT_CHART_COLORS.velocityCurve} />
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={7} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={0.5} opacity={0.5} />
            </g>
          )}

          {showDoubleTrack && !isLanded && (
            <circle cx={vtToX(effectiveTime)} cy={vtToY(vacuumV)} r={3.5} fill={PHYSICS_COLORS.position} opacity={0.8} />
          )}

          <rect x={vtInnerPad.left} y={vtInnerPad.top} width={vtInnerW} height={vtInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'vt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'vt')} />

          {effectiveTime > 0 && (
            <g>
              <line x1={vtToX(effectiveTime)} y1={vtInnerPad.top}
                x2={vtToX(effectiveTime)} y2={vtInnerPad.top + vtInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={vtToX(effectiveTime)} cy={vtInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}

          {advancedMode === 1 && areaValues && (
            <g>
              <rect x={vtInnerPad.left + vtInnerW - 105} y={vtInnerPad.top + 6} width={100} height={42} fill={PHYSICS_COLORS.objectFillNeutral} opacity={0.85} rx={3} stroke={CHART_COLORS.gridLine} strokeWidth={0.8} />
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 16}
                fontSize={8} fill={VT_CHART_COLORS.areaShade} textAnchor="end" fontWeight="bold">
                上升位移 S⁺ = {areaValues.positive.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 26}
                fontSize={8} fill={VT_CHART_COLORS.zeroCrossing} textAnchor="end" fontWeight="bold">
                下落位移 S⁻ = {areaValues.negative.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 36}
                fontSize={8} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">
                当前高度 y = {areaValues.net.toFixed(2)} m
              </text>
            </g>
          )}
        </g>

        {/* ========== 右侧：y-t 图 ========== */}
        <g transform={`translate(${dataX}, ${ytChartTop})`}>
          <rect width={dataWidth} height={ytChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={16} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            位移-时间图像 (y-t 图)
          </text>

          <line x1={ytInnerPad.left} y1={ytInnerPad.top} x2={ytInnerPad.left} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={ytInnerPad.left} y1={ytInnerPad.top + ytInnerH} x2={ytInnerPad.left + ytInnerW} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

          {xticks.map(t => (
            <g key={`yt-xt-${t}`}>
              <line x1={ytToX(t)} y1={ytInnerPad.top + ytInnerH - 4} x2={ytToX(t)} y2={ytInnerPad.top + ytInnerH + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytToX(t)} y={ytInnerPad.top + ytInnerH + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {ytYTicks.map(y => (
            <g key={`yt-ytick-${y}`}>
              <line x1={ytInnerPad.left - 4} y1={ytToY(y)} x2={ytInnerPad.left} y2={ytToY(y)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytInnerPad.left - 8} y={ytToY(y) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{y}</text>
            </g>
          ))}

          <text x={ytInnerPad.left + ytInnerW / 2} y={ytInnerPad.top + ytInnerH + 28}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={ytInnerPad.left - 30} y={ytInnerPad.top + ytInnerH / 2}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${ytInnerPad.left - 30}, ${ytInnerPad.top + ytInnerH / 2})`}>y/m</text>

          <line x1={ytInnerPad.left} y1={ytToY(maxHeight)} x2={ytInnerPad.left + ytInnerW} y2={ytToY(maxHeight)}
            stroke={CHART_COLORS.zeroline} strokeWidth={0.8}
            strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />

          {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
            <>
              <line x1={ytInnerPad.left} y1={ytToY(targetHeight)}
                x2={ytInnerPad.left + ytInnerW} y2={ytToY(targetHeight)}
                stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')} opacity={0.7} />
              <text x={ytInnerPad.left + ytInnerW - 3} y={ytToY(targetHeight) - 4}
                fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="end" opacity={0.8}>
                高度 y = {targetHeight}m
              </text>
              {targetHeightIntersections && (
                <>
                  <line x1={ytToX(targetHeightIntersections.t1)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t1)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t1)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={8} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₁={targetHeightIntersections.t1.toFixed(2)}s
                  </text>
                  <line x1={ytToX(targetHeightIntersections.t2)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t2)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t2)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={8} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₂={targetHeightIntersections.t2.toFixed(2)}s
                  </text>
                </>
              )}
            </>
          )}

          {ytAreaD && (
            <path d={ytAreaD} fill={XT_CHART_COLORS.positionCurve} opacity={0.08} />
          )}

          {airResistance > 0 && ytData.vacFull && (
            <path d={ytData.vacFull} fill="none" stroke={CHART_COLORS.asymptote} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {ytData.airFull && (
            <path d={ytData.airFull} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={1} opacity={0.15} />
          )}

          {showDoubleTrack && ytData.vacActive && (
            <path d={ytData.vacActive} fill="none" stroke={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.7} />
          )}

          {ytData.airActive && (
            <path d={ytData.airActive} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
          )}

          {isAtPeak && (
            <g>
              <circle cx={ytToX(maxHeightTime)} cy={ytToY(maxHeight)} r={5}
                fill={CHART_COLORS.highlight} opacity={0.7}>
                <animate attributeName="r" values="5;8;5" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;1;0.7" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {!isAtPeak && effectiveTime > 0 && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedY)} r={4.5} fill={XT_CHART_COLORS.positionCurve} />
          )}

          {showDoubleTrack && !isLanded && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedVacuumY)} r={3.5} fill={PHYSICS_COLORS.position} opacity={0.8} />
          )}

          <rect x={ytInnerPad.left} y={ytInnerPad.top} width={ytInnerW} height={ytInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'yt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'yt')} />

          {effectiveTime > 0 && (
            <g>
              <line x1={ytToX(effectiveTime)} y1={ytInnerPad.top}
                x2={ytToX(effectiveTime)} y2={ytInnerPad.top + ytInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={ytToX(effectiveTime)} cy={ytInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
