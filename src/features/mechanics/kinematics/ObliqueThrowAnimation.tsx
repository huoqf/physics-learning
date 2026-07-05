import { useCanvasSize, useViewport, physicsToCanvasWithOrigin } from '@/utils'
import { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { precomputeObliqueThrowWithDrag } from '@/physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  CANVAS_STYLE,
  withAlpha,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { VelocityTimeChart } from '@/components/Chart'
import { Ball } from '@/components/Physics/Ball'
import { createSceneScaleFromViewport } from '@/scene'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { useObliqueThrowLayout } from './useObliqueThrowLayout'

const OBLIQUE_DESIGN = { width: 100, height: 100 } as const

/** 斜抛动画布局常量 */
const OBLIQUE_THROW_LAYOUT = {
  originX: 50,
  groundYRatio: 0.85,
  topPadding: 40,
  rightPadding: 45,
  projectionBallRadius: 9,
  steelBallRadius: 12,
  barrelLength: 28,
  barrelWidth: 10,
  angleArcRadius: 35,
} as const

export default function ObliqueThrowAnimation() {
  const { params, time, isPlaying, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: OBLIQUE_DESIGN.width,
    designHeight: OBLIQUE_DESIGN.height,
  })

  const {
    v0 = 15,
    angle = 45,
    g = 9.8,
    advancedMode = 0,
    airResistance = 0,
    showVacuumCompare = 1,
  } = params

  // ── 1. 预计算斜抛运动轨迹 ──
  const trajectory = useMemo(
    () => precomputeObliqueThrowWithDrag(v0, angle, g, airResistance),
    [v0, angle, g, airResistance]
  )

  const { groundTime, groundTimeVac, maxHeight, maxHeightVac, range, rangeVac } = trajectory

  // ── 2. 线性插值器 ──
  const interpolatePoints = useCallback(
    (t: number, pts: typeof trajectory.points): typeof trajectory.points[0] => {
      if (t <= 0) return pts[0]
      const lastPt = pts[pts.length - 1]
      if (t >= lastPt.t) return lastPt
      const dt = pts[1]?.t - pts[0]?.t || 0.01
      const idx = Math.floor(t / dt)
      const p1 = pts[Math.min(idx, pts.length - 1)]
      const p2 = pts[Math.min(idx + 1, pts.length - 1)]
      if (!p1 || !p2 || p1.t === p2.t) return p1
      const frac = (t - p1.t) / (p2.t - p1.t)
      return {
        t,
        x: p1.x + (p2.x - p1.x) * frac,
        y: p1.y + (p2.y - p1.y) * frac,
        vx: p1.vx + (p2.vx - p1.vx) * frac,
        vy: p1.vy + (p2.vy - p1.vy) * frac,
        v: p1.v + (p2.v - p1.v) * frac,
        ax: p1.ax + (p2.ax - p1.ax) * frac,
        ay: p1.ay + (p2.ay - p1.ay) * frac,
      }
    },
    [trajectory]
  )

  // ── 3. 全宽物理舞台定位参数 ──
  const originX = vp.visibleX + OBLIQUE_THROW_LAYOUT.originX
  const groundY = vp.visibleY + vp.visibleH * OBLIQUE_THROW_LAYOUT.groundYRatio
  const stageHeight = groundY - (vp.visibleY + OBLIQUE_THROW_LAYOUT.topPadding)

  const maxX = Math.max(range, rangeVac, 1)
  const maxY = Math.max(maxHeight, maxHeightVac, 1)

  const scaleX = (vp.visibleW - OBLIQUE_THROW_LAYOUT.originX - OBLIQUE_THROW_LAYOUT.rightPadding) / maxX
  const scaleY = stageHeight / maxY
  const scale = Math.min(scaleX, scaleY)

  const obliqueSceneScale = createSceneScaleFromViewport(vp, 'visibleArea', {
    refMagnitudes: { velocity: Math.max(v0, 10) },
  })

  const isLanded = time >= groundTime && groundTime > 0
  const effectiveTime = isLanded ? groundTime : Math.max(time, 0)

  useEffect(() => {
    if (isLanded && time > 0) setIsPlaying(false)
  }, [isLanded, time, setIsPlaying])

  const currentState = useMemo(
    () => interpolatePoints(effectiveTime, trajectory.points),
    [effectiveTime, trajectory.points, interpolatePoints]
  )

  // ── 速度矢量统一缩放 ──
  const refMag = Math.max(v0, 10)
  const v = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(v, 'velocity', obliqueSceneScale.maxVectorLength, refMag)
  const vxPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vx) / v) : 0
  const vyPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vy) / v) : 0

  const vacuumState = useMemo(
    () => interpolatePoints(effectiveTime, trajectory.vacuumPoints),
    [effectiveTime, trajectory.vacuumPoints, interpolatePoints]
  )

  const ballCanvas = physicsToCanvasWithOrigin(currentState.x, currentState.y, originX, groundY, scale)
  const vacBallCanvas = physicsToCanvasWithOrigin(vacuumState.x, vacuumState.y, originX, groundY, scale)

  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  // ── 最高点检测与自动暂停 ──
  const isAtPeak = !isLanded && Math.abs(currentState.vy) < 0.25 && currentState.y > 0.5 * maxHeight && effectiveTime > 0.05
  const hasPausedAtPeakRef = useRef(false)
  const peakTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (isAtPeak && isPlaying && !hasPausedAtPeakRef.current) {
      setIsPlaying(false)
      hasPausedAtPeakRef.current = true
      peakTimerRef.current = setTimeout(() => setIsPlaying(true), 1000)
    }
    if (!isAtPeak) hasPausedAtPeakRef.current = false
  }, [isAtPeak, isPlaying, setIsPlaying])

  useEffect(() => {
    return () => { if (peakTimerRef.current) clearTimeout(peakTimerRef.current) }
  }, [])

  // ── 4. 使用提取的布局 hook ──
  const {
    vtWidth, vtHeight, vtX, vtY, vtXMax, vtVMax,
    vtPointsVx, vtDomainVx, vtPointsVy, vtDomainVy,
    handleSvgMouseMove, handleSvgMouseUp, handleChartMouseDown,
    gridLines,
  } = useObliqueThrowLayout(
    trajectory, vp,
    { originX: OBLIQUE_THROW_LAYOUT.originX, rightPadding: OBLIQUE_THROW_LAYOUT.rightPadding },
    v0, g, effectiveTime, groundTime, groundTimeVac,
    stageHeight, originX, groundY, showGrid,
  )

  // ── 5. 动态轨迹曲线路径 ──
  const activeT = Math.min(effectiveTime, groundTime)
  const activeTVac = Math.min(effectiveTime, groundTimeVac)

  const physicalPathD = useMemo(() => {
    const pts: string[] = []
    for (const pt of trajectory.points) {
      if (pt.t > activeT + 1e-5) break
      const { cx, cy } = physicsToCanvasWithOrigin(pt.x, pt.y, originX, groundY, scale)
      pts.push(`${cx},${cy}`)
    }
    return pts.length > 1 ? `M ${pts.join(' L ')}` : ''
  }, [trajectory.points, activeT, scale, originX, groundY])

  const physicalVacPathD = useMemo(() => {
    if (!showDoubleTrack) return ''
    const pts: string[] = []
    for (const pt of trajectory.vacuumPoints) {
      if (pt.t > activeTVac + 1e-5) break
      const { cx, cy } = physicsToCanvasWithOrigin(pt.x, pt.y, originX, groundY, scale)
      pts.push(`${cx},${cy}`)
    }
    return pts.length > 1 ? `M ${pts.join(' L ')}` : ''
  }, [trajectory.vacuumPoints, activeTVac, scale, originX, groundY, showDoubleTrack])

  const angleRad = (angle * Math.PI) / 180

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
        {/* ========== defs 渐变与材质 ========== */}
        <defs>
          <linearGradient id="slider-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="30%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </radialGradient>
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[0]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[1]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[1]} />
            <stop offset="90%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[2]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[3]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[3]} />
          </radialGradient>
          <VectorDefs colors={[PHYSICS_COLORS.velocityX, PHYSICS_COLORS.velocityY, PHYSICS_COLORS.velocity]} />
        </defs>

        {gridLines}

        {/* 坐标轴 */}
        <line x1={originX} y1={groundY - stageHeight} x2={originX} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={originX} y1={groundY} x2={vp.visibleX + vp.visibleW - 15} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <text x={originX - 10} y={groundY - maxY * scale + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = {maxY.toFixed(1)}m</text>
        <text x={originX - 10} y={groundY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 0</text>
        <text x={vp.visibleX + vp.visibleW - 25} y={groundY + 16} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>

        {/* 抛出角度指示盘 */}
        {!isLanded && (
          <path
            d={`M ${originX} ${groundY} L ${originX + OBLIQUE_THROW_LAYOUT.angleArcRadius} ${groundY} A ${OBLIQUE_THROW_LAYOUT.angleArcRadius} ${OBLIQUE_THROW_LAYOUT.angleArcRadius} 0 0 0 ${originX + OBLIQUE_THROW_LAYOUT.angleArcRadius * Math.cos(angleRad)} ${groundY - OBLIQUE_THROW_LAYOUT.angleArcRadius * Math.sin(angleRad)} Z`}
            fill={SCENE_COLORS.effects.sectorFill}
            stroke={PHYSICS_COLORS.velocityX}
            strokeWidth={0.6}
            strokeDasharray="2,2"
          />
        )}

        {/* 旋转弹射炮筒 */}
        <g transform={`translate(${originX}, ${groundY}) rotate(${-angle})`}>
          <rect x={0} y={-OBLIQUE_THROW_LAYOUT.barrelWidth / 2} width={OBLIQUE_THROW_LAYOUT.barrelLength}
            height={OBLIQUE_THROW_LAYOUT.barrelWidth} fill="url(#slider-metal)" stroke={PHYSICS_COLORS.labelText} strokeWidth={1} rx={2} />
          <circle cx={4} cy={0} r={2} fill={PHYSICS_COLORS.velocityY} />
        </g>

        {/* 运动历史轨迹线 */}
        {physicalVacPathD && (
          <path d={physicalVacPathD} fill="none" stroke={PHYSICS_COLORS.trackHistoryAlt} strokeWidth={STROKE.trackHistory} strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />
        )}
        {physicalPathD && (
          <path d={physicalPathD} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory} />
        )}

        {/* 分方向投影球及虚线 */}
        {!isLanded && (
          <>
            <circle cx={ballCanvas.cx} cy={groundY} r={OBLIQUE_THROW_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)" stroke={PHYSICS_COLORS.velocityX} strokeWidth={0.8} strokeDasharray="2,2" />
            <circle cx={originX} cy={ballCanvas.cy} r={OBLIQUE_THROW_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)" stroke={PHYSICS_COLORS.velocityY} strokeWidth={0.8} strokeDasharray="2,2" />
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={ballCanvas.cx} y2={groundY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={originX} y2={ballCanvas.cy} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
          </>
        )}

        {/* 真空对照钢球 */}
        {showDoubleTrack && !isLanded && (
          <Ball cx={vacBallCanvas.cx} cy={vacBallCanvas.cy} r={OBLIQUE_THROW_LAYOUT.steelBallRadius}
            type="steelGhost" stroke={PHYSICS_COLORS.displacement} strokeWidth={0.8} />
        )}

        {/* 实际钢珠 */}
        <circle
          cx={Math.min(vp.visibleX + vp.visibleW - OBLIQUE_THROW_LAYOUT.steelBallRadius, ballCanvas.cx)}
          cy={Math.min(groundY, ballCanvas.cy)}
          r={OBLIQUE_THROW_LAYOUT.steelBallRadius}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 速度分量矢量箭头 */}
        {showVectors && !isLanded && (
          <g>
            <VectorArrow origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }} vector={{ x: currentState.vx, y: 0 }}
              type="velocityX" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorSub} pixelLength={vxPxLen} />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 10} y={ballCanvas.cy + 3}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">vₓ</text>

            {Math.abs(currentState.vy) > 0.05 && (
              <VectorArrow origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }} vector={{ x: 0, y: currentState.vy }}
                type="velocityY" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorSub} pixelLength={vyPxLen} />
            )}
            <text x={ballCanvas.cx - 3} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 + (currentState.vy >= 0 ? -6 : 12)}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

            <VectorArrow origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }} vector={{ x: currentState.vx, y: currentState.vy }}
              type="velocity" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorMain} pixelLength={totalPxLen} />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 8} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 - 4}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 最高点物理指示 */}
        {isAtPeak && (() => {
          const peakW = vp.visibleW * 0.16
          const peakH = vp.visibleH * 0.065
          const peakGap = vp.visibleH * 0.025
          const panelAbove = ballCanvas.cy - peakGap - peakH > vp.visibleY
          const py = panelAbove ? ballCanvas.cy - peakGap - peakH : ballCanvas.cy + vp.visibleH * 0.03
          const px = ballCanvas.cx - peakW / 2
          return (
            <g transform={`translate(${px}, ${py})`}>
              <rect width={peakW} height={peakH} fill={SCENE_COLORS.labels.glassPanelBg} rx={6}
                stroke={CHART_COLORS.axisLine} strokeWidth={0.8}
                filter={`drop-shadow(0 4px 10px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.1)})`} />
              <polygon
                points={panelAbove
                  ? `${peakW / 2} ${peakH}, ${peakW / 2 - 5} ${peakH + 5}, ${peakW / 2 + 5} ${peakH}`
                  : `${peakW / 2} 0, ${peakW / 2 - 5} -5, ${peakW / 2 + 5} 0`}
                fill={SCENE_COLORS.labels.glassPanelBg} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
              <text x={peakW / 2} y={peakH * 0.38} fontSize={font(9)} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                最高点 H = {maxHeight.toFixed(2)}m
              </text>
              <text x={peakW / 2} y={peakH * 0.72} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="middle">
                <tspan fill={PHYSICS_COLORS.velocity}>v_y = 0</tspan>, 合速度 <tspan fill={PHYSICS_COLORS.velocity}>v = v_x</tspan>
              </text>
            </g>
          )
        })()}

        {isLanded && (
          <text x={ballCanvas.cx} y={groundY - 18} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
        )}

        {/* ========== 右上角画中画 v-t 图像 ========== */}
        <g transform={`translate(${vtX}, ${vtY})`}>
          <rect width={vtWidth} height={vtHeight} fill={SCENE_COLORS.labels.glassPanelBg} rx={8}
            stroke={CHART_COLORS.axisLine} strokeWidth={0.8}
            filter={`drop-shadow(0 4px 12px ${SCENE_COLORS.effects.shadowLight})`} />
          <foreignObject x={4} y={4} width={vtWidth - 8} height={vtHeight - 8} style={{ pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: '100%' }}>
              <VelocityTimeChart
                mode="animated"
                points={vtPointsVx}
                domainPoints={vtDomainVx}
                additionalSeries={[{ points: vtPointsVy, domainPoints: vtDomainVy, label: 'vᵧ', series: 'secondary' }]}
                currentTime={effectiveTime}
                tMax={vtXMax}
                vRange={[-vtVMax, vtVMax]}
                title="速度分量-时间 (v-t 图)"
                showCursor={!isLanded}
                showGrid={false}
              />
            </div>
          </foreignObject>
          <rect x={0} y={0} width={vtWidth} height={vtHeight} fill="transparent"
            className="cursor-ew-resize" onMouseDown={handleChartMouseDown} />
        </g>
      </svg>
    </div>
  )
}
