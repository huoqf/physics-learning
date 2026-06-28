import { useCanvasSize, useViewport } from '@/utils'
import { useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  CANVAS_STYLE,
} from '@/theme/physics'
import { useVerticalThrowPhysics } from './useVerticalThrowPhysics'
import { useVerticalThrowChartLayout } from './useVerticalThrowChartLayout'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Ball } from '@/components/Physics/Ball'
import { VerticalThrowCharts } from './VerticalThrowCharts'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

const VT_DESIGN = { width: 100, height: 100 } as const

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

export default function VerticalThrowAnimation() {
  const { params, time, isPlaying, showVectors, setIsPlaying, setTime } = useAnimationStore(
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
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: VT_DESIGN.width,
    designHeight: VT_DESIGN.height,
  })

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
    vacuumY,
    isLanded,
    isAtPeak,
    interpolatePoints,
    targetHeightIntersections,
  } = physics

  // ── 双轨模式判定 ──
  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  const clampedY = Math.max(effectiveY, 0)
  const clampedVacuumY = Math.max(vacuumY, 0)

  // ── 图表布局（Hook 提取） ──
  const layout = useVerticalThrowChartLayout(
    vp.visibleW,
    vp.visibleH,
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
    originY,
    groundY,
    stageHeight,
    ballX,
    displayMaxHeight,
    scale,
    vtChartTop,
    vtToX,
    vtToY,
    ghostBalls,
  } = layout

  const leftBallX = ballX
  const rightBallX = showDoubleTrack ? ballX + 40 : ballX

  const vtScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: stageHeight },
    originX: 0,
    originY: 0,
    // acceleration 使用固定参考值（对应侧栏 g 最大值），否则 g/ref=g 会让加速度箭头长度恒定
    refMagnitudes: { velocity: v0, acceleration: 15, gravity: 15 },
  }
  const vtSceneScale = createSceneScale(vtScene)

  const currentBallY = originY + (displayMaxHeight - clampedY) * scale - 14
  const currentVacuumBallY = originY + (displayMaxHeight - clampedVacuumY) * scale - 13

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

  // ── 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
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

        </defs>

        {/* ========== 左侧：物理演练区 ========== */}
        <PhysicsGround
          x={30} y={groundY} width={stageWidth - 50}
          appearance={{ color: PHYSICS_COLORS.labelText }}
        />

        <text x={25} y={originY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">
          {displayMaxHeight.toFixed(1)}m
        </text>
        <text x={25} y={groundY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">0</text>
        <text x={leftBallX + (showDoubleTrack ? -20 : 18)} y={groundY + 14} fontSize={FONT.small} fill={PHYSICS_COLORS.axis}>y=0</text>

        <line x1={30} y1={originY + (displayMaxHeight - maxHeight) * scale} x2={stageWidth - 20} y2={originY + (displayMaxHeight - maxHeight) * scale}
          stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />
        <text x={stageWidth - 18} y={originY + (displayMaxHeight - maxHeight) * scale - 4} fontSize={FONT.small}
          fill={CHART_COLORS.highlight} textAnchor="end" fontWeight="bold">
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
              type="gravity"
              sceneScale={vtSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={leftBallX - 30} y={currentBallY + vtSceneScale.maxVectorLength * 0.5}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              g
            </text>
          </g>
        )}

        {isAtPeak && (
          <g>
            <g>
              <VectorArrow
                origin={{ x: leftBallX - 18, y: -currentBallY }}
                vector={{ x: 0, y: -g }}
                type="gravity"
                sceneScale={vtSceneScale}
                strokeWidth={STROKE.vectorMain}
              />
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </g>
            <text x={leftBallX - 30} y={currentBallY + vtSceneScale.maxVectorLength * 0.5}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              g
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </text>
          </g>
        )}

        {isAtPeak && (() => {
          const peakPanelW = vp.visibleW * 0.2
          const peakPanelH = vp.visibleH * 0.08
          const peakGap = vp.visibleH * 0.025
          const panelAbove = currentBallY - peakGap - peakPanelH > vp.visibleY
          const panelY = panelAbove
            ? currentBallY - peakGap - peakPanelH
            : currentBallY + vp.visibleH * 0.03
          const panelX = showDoubleTrack
            ? leftBallX - peakPanelW - vp.visibleW * 0.02
            : leftBallX + vp.visibleW * 0.04
          const lineH = peakPanelH / 3.2
          return (
            <g transform={`translate(${panelX}, ${panelY})`}>
              <rect
                width={peakPanelW}
                height={peakPanelH}
                fill={SCENE_COLORS.labels.glassPanelBg}
                rx={6}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={0.8}
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.1))"
              />
              {showDoubleTrack ? (
                <polygon
                  points={`${peakPanelW} ${peakPanelH / 2}, ${peakPanelW + 6} ${peakPanelH / 2}, ${peakPanelW} ${peakPanelH / 2 + 5}`}
                  fill={SCENE_COLORS.labels.glassPanelBg}
                  stroke={CHART_COLORS.axisLine}
                  strokeWidth={0.8}
                />
              ) : (
                <polygon
                  points={panelAbove
                    ? `0 ${peakPanelH / 2}, -6 ${peakPanelH / 2}, 0 ${peakPanelH / 2 + 5}`
                    : `0 0, -6 0, 0 -5`}
                  fill={SCENE_COLORS.labels.glassPanelBg}
                  stroke={CHART_COLORS.axisLine}
                  strokeWidth={0.8}
                />
              )}
              <text x={peakPanelW / 2} y={lineH} fontSize={font(9)} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                瞬时状态 <tspan fill={PHYSICS_COLORS.velocity}>v = 0</tspan>
              </text>
              <text x={peakPanelW / 2} y={lineH * 2} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="middle">
                但 <tspan fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a = -g</tspan> = -{g} m/s²
              </text>
              <text x={peakPanelW / 2} y={lineH * 3} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="middle">
                合力 <tspan fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F_合</tspan> = <tspan fill={PHYSICS_COLORS.gravity} fontWeight="bold">mg</tspan> 向下
              </text>
            </g>
          )
        })()}

        {advancedMode === 1 && targetHeightIntersections && !isLanded && (() => {
          const tgW = vp.visibleW * 0.13
          const tgH = vp.visibleH * 0.045
          const tgGap = vp.visibleH * 0.015
          const tgAbove = currentBallY - tgGap - tgH > vp.visibleY
          const tgY = tgAbove ? currentBallY - tgGap - tgH : currentBallY + vp.visibleH * 0.025
          const tgX = leftBallX + vp.visibleW * 0.03
          return (
            <>
              {Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.15 && (
                <g transform={`translate(${tgX}, ${tgY})`}>
                  <rect width={tgW} height={tgH} fill={SCENE_COLORS.labels.glassPanelBg} rx={6} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
                  <polygon
                    points={tgAbove
                      ? `0 ${tgH / 2}, -5 ${tgH / 2}, 0 ${tgH / 2 + 4}`
                      : `0 0, -5 0, 0 -4`}
                    fill={SCENE_COLORS.labels.glassPanelBg} stroke={CHART_COLORS.axisLine} strokeWidth={0.8}
                  />
                  <text x={tgW / 2} y={tgH * 0.4} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">① 上升阶段经过</text>
                  <text x={tgW / 2} y={tgH * 0.8} fontSize={font(8)} fill={PHYSICS_COLORS.deltaHighlight} textAnchor="middle">v = +{effectiveV.toFixed(1)} m/s</text>
                </g>
              )}
              {Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.15 && (
                <g transform={`translate(${tgX}, ${tgY})`}>
                  <rect width={tgW} height={tgH} fill={SCENE_COLORS.labels.glassPanelBg} rx={6} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
                  <polygon
                    points={tgAbove
                      ? `0 ${tgH / 2}, -5 ${tgH / 2}, 0 ${tgH / 2 + 4}`
                      : `0 0, -5 0, 0 -4`}
                    fill={SCENE_COLORS.labels.glassPanelBg} stroke={CHART_COLORS.axisLine} strokeWidth={0.8}
                  />
                  <text x={tgW / 2} y={tgH * 0.4} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">② 下落阶段经过</text>
                  <text x={tgW / 2} y={tgH * 0.8} fontSize={font(8)} fill={SCENE_COLORS.labels.panelTextMuted} textAnchor="middle">v = {effectiveV.toFixed(1)} m/s</text>
                </g>
              )}
            </>
          )
        })()}

        {isLanded && (
          <text x={leftBallX} y={groundY - 30} fontSize={FONT.small} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">落地</text>
        )}

        <VerticalThrowCharts
          layout={layout}
          physics={physics}
          advancedMode={advancedMode}
          sliceDensity={sliceDensity}
          airResistance={airResistance}
          showDoubleTrack={showDoubleTrack}
          targetHeight={targetHeight}
          g={g}
          onTimeChange={(nextTime) => {
            setTime(nextTime)
            setIsPlaying(false)
          }}
        />
      </svg>
    </div>
  )
}
