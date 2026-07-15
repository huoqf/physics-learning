import { VectorArrow, VectorDefs, Ball, ParticleTrajectory } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { physicsToDesignWithOrigin } from '@/utils'
import { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { precomputeObliqueThrowWithDrag } from '@/physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  STROKE,
  FONT,
  CANVAS_STYLE,
  withAlpha,
  DASH,
} from '@/theme/physics'

import { VelocityTimeChart } from '@/components/Chart'

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
  // 100×100 归一化坐标系：保留原 raw-SVG 坐标语义，仅统一 Viewport Hook 入口
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: OBLIQUE_DESIGN })
  const { font } = canvasSize

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
  const canvasScale = Math.min(scaleX, scaleY)
  const scale = canvasScale / vp.scale

  const designOriginX = (originX - vp.tx) / vp.scale
  const designGroundY = (groundY - vp.ty) / vp.scale
  const designTopY = (groundY - stageHeight - vp.ty) / vp.scale
  const designStageHeight = stageHeight / vp.scale

  const obliqueSceneScale = useSceneScale({
    vp,
    preset: OBLIQUE_DESIGN,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
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

  const ballCanvas = physicsToDesignWithOrigin(currentState.x, currentState.y, originX, groundY, canvasScale, vp)
  const vacBallCanvas = physicsToDesignWithOrigin(vacuumState.x, vacuumState.y, originX, groundY, canvasScale, vp)

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
  } = useObliqueThrowLayout(
    trajectory, vp,
    { originX: OBLIQUE_THROW_LAYOUT.originX, rightPadding: OBLIQUE_THROW_LAYOUT.rightPadding },
    v0, g, effectiveTime, groundTime, groundTimeVac,
    stageHeight, originX, groundY, showGrid,
  )

  // ── 5. ParticleTrajectory 所需的点集 ──
  const activeT = Math.min(effectiveTime, groundTime)

  const historyPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (const pt of trajectory.points) {
      if (pt.t > activeT + 1e-5) break
      const { cx, cy } = physicsToDesignWithOrigin(pt.x, pt.y, originX, groundY, canvasScale, vp)
      pts.push({ x: cx, y: cy })
    }
    return pts
  }, [trajectory.points, activeT, canvasScale, originX, groundY, vp])

  // 预测轨迹：有阻力时显示真空理想路径，否则显示完整理论抛物线
  const predictedPoints = useMemo(() => {
    const src = showDoubleTrack ? trajectory.vacuumPoints : trajectory.points
    return src.map((pt) => {
      const { cx, cy } = physicsToDesignWithOrigin(pt.x, pt.y, originX, groundY, canvasScale, vp)
      return { x: cx, y: cy }
    })
  }, [trajectory, showDoubleTrack, canvasScale, originX, groundY, vp])

  const designGridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 12
    const gridRows = 8
    const gridStageWidth = (vp.visibleW - OBLIQUE_THROW_LAYOUT.originX - OBLIQUE_THROW_LAYOUT.rightPadding) / vp.scale
    const rightEdge = (vp.visibleX + vp.visibleW - 20 - vp.tx) / vp.scale
    for (let i = 1; i < gridRows; i++) {
      const yPos = designGroundY - (i * designStageHeight) / gridRows
      lines.push(
        <line key={`h-grid-${i}`} x1={designOriginX} y1={yPos} x2={rightEdge} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')} />
      )
    }
    for (let i = 1; i < gridCols; i++) {
      const xPos = designOriginX + (i * gridStageWidth) / gridCols
      lines.push(
        <line key={`v-grid-${i}`} x1={xPos} y1={designTopY} x2={xPos} y2={designGroundY}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')} />
      )
    }
    return lines
  }, [showGrid, designGroundY, designStageHeight, designOriginX, designTopY, vp])

  const tailPoints = useMemo(() => {
    const tailLen = Math.min(8, historyPoints.length)
    return historyPoints.slice(-tailLen)
  }, [historyPoints])

  const angleRad = (angle * Math.PI) / 180
  const s = vp.scale

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

        <g transform={vp.transform}>
        {designGridLines}

        {/* 坐标轴 */}
        <line x1={designOriginX} y1={designTopY} x2={designOriginX} y2={designGroundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={designOriginX} y1={designGroundY} x2={(vp.visibleX + vp.visibleW - 15 - vp.tx) / s} y2={designGroundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <text x={designOriginX - 10 / s} y={designGroundY - maxY * scale + 4 / s} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = {maxY.toFixed(1)}m</text>
        <text x={designOriginX - 10 / s} y={designGroundY + 4 / s} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 0</text>
        <text x={(vp.visibleX + vp.visibleW - 25 - vp.tx) / s} y={designGroundY + 16 / s} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>

        {/* 抛出角度指示盘 */}
        {!isLanded && (
          <path
            d={`M ${designOriginX} ${designGroundY} L ${designOriginX + OBLIQUE_THROW_LAYOUT.angleArcRadius / s} ${designGroundY} A ${OBLIQUE_THROW_LAYOUT.angleArcRadius / s} ${OBLIQUE_THROW_LAYOUT.angleArcRadius / s} 0 0 0 ${designOriginX + (OBLIQUE_THROW_LAYOUT.angleArcRadius / s) * Math.cos(angleRad)} ${designGroundY - (OBLIQUE_THROW_LAYOUT.angleArcRadius / s) * Math.sin(angleRad)} Z`}
            fill={SCENE_COLORS.effects.sectorFill}
            stroke={PHYSICS_COLORS.velocityX}
            strokeWidth={0.6 / s}
            strokeDasharray="2,2"
          />
        )}

        {/* 旋转弹射炮筒 */}
        <g transform={`translate(${designOriginX}, ${designGroundY}) rotate(${-angle})`}>
          <rect x={0} y={-(OBLIQUE_THROW_LAYOUT.barrelWidth / s) / 2} width={OBLIQUE_THROW_LAYOUT.barrelLength / s}
            height={OBLIQUE_THROW_LAYOUT.barrelWidth / s} fill="url(#slider-metal)" stroke={PHYSICS_COLORS.labelText} strokeWidth={1 / s} rx={2 / s} />
          <circle cx={4 / s} cy={0} r={2 / s} fill={PHYSICS_COLORS.velocityY} />
        </g>

        {/* 粒子轨迹（统一组件：预测虚线 + 历史实线 + 拖尾 + 本体） */}
        {historyPoints.length > 0 && (
          <ParticleTrajectory
            historyPoints={historyPoints}
            predictedPoints={predictedPoints}
            tailPoints={tailPoints}
            isFocus
            chargeSign="none"
          />
        )}

        {/* 分方向投影球及虚线 */}
        {!isLanded && (
          <>
            <circle cx={ballCanvas.cx} cy={designGroundY} r={OBLIQUE_THROW_LAYOUT.projectionBallRadius / s}
              fill="url(#vacuum-sphere-grad)" stroke={PHYSICS_COLORS.velocityX} strokeWidth={0.8 / s} strokeDasharray="2,2" />
            <circle cx={designOriginX} cy={ballCanvas.cy} r={OBLIQUE_THROW_LAYOUT.projectionBallRadius / s}
              fill="url(#vacuum-sphere-grad)" stroke={PHYSICS_COLORS.velocityY} strokeWidth={0.8 / s} strokeDasharray="2,2" />
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={ballCanvas.cx} y2={designGroundY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8 / s} strokeDasharray="3,3" />
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={designOriginX} y2={ballCanvas.cy} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8 / s} strokeDasharray="3,3" />
          </>
        )}

        {/* 真空对照钢球 */}
        {showDoubleTrack && !isLanded && (
          <Ball cx={vacBallCanvas.cx} cy={vacBallCanvas.cy} r={OBLIQUE_THROW_LAYOUT.steelBallRadius / s}
            type="steelGhost" stroke={PHYSICS_COLORS.displacement} strokeWidth={0.8 / s} />
        )}

        {/* 实际钢珠 */}
        <circle
          cx={Math.min((vp.visibleX + vp.visibleW - OBLIQUE_THROW_LAYOUT.steelBallRadius - vp.tx) / s, ballCanvas.cx)}
          cy={Math.min(designGroundY, ballCanvas.cy)}
          r={OBLIQUE_THROW_LAYOUT.steelBallRadius / s}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine / s}
        />

        {/* 速度分量矢量箭头 */}
        {showVectors && !isLanded && (
          <g>
            <VectorArrow originDesign={{ x: ballCanvas.cx, y: ballCanvas.cy }} vector={{ x: currentState.vx, y: 0 }}
              type="velocityX" arrowType="physical-schematic" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorSub} pixelLength={vxPxLen} />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 10 / s} y={ballCanvas.cy + 3 / s}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">vₓ</text>

            {Math.abs(currentState.vy) > 0.05 && (
              <VectorArrow originDesign={{ x: ballCanvas.cx, y: ballCanvas.cy }} vector={{ x: 0, y: currentState.vy }}
                type="velocityY" arrowType="physical-schematic" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorSub} pixelLength={vyPxLen} />
            )}
            <text x={ballCanvas.cx - 3 / s} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 + (currentState.vy >= 0 ? -6 / s : 12 / s)}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

            <VectorArrow originDesign={{ x: ballCanvas.cx, y: ballCanvas.cy }} vector={{ x: currentState.vx, y: currentState.vy }}
              type="velocity" arrowType="physical-schematic" sceneScale={obliqueSceneScale} strokeWidth={STROKE.vectorMain} pixelLength={totalPxLen} />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 8 / s} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 - 4 / s}
              fontSize={font(9)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 最高点物理指示 */}
        {isAtPeak && (() => {
          const peakW = vp.designVisibleW * 0.16
          const peakH = vp.designVisibleH * 0.065
          const peakGap = vp.designVisibleH * 0.025
          const panelAbove = ballCanvas.cy - peakGap - peakH > (vp.visibleY - vp.ty) / s
          const py = panelAbove ? ballCanvas.cy - peakGap - peakH : ballCanvas.cy + vp.designVisibleH * 0.03
          const px = ballCanvas.cx - peakW / 2
          return (
            <g transform={`translate(${px}, ${py})`}>
              <rect width={peakW} height={peakH} fill={SCENE_COLORS.labels.glassPanelBg} rx={6 / s}
                stroke={CHART_COLORS.axisLine} strokeWidth={0.8 / s}
                filter={`drop-shadow(0 ${4 / s}px ${10 / s}px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.1)})`} />
              <polygon
                points={panelAbove
                  ? `${peakW / 2} ${peakH}, ${peakW / 2 - 5 / s} ${peakH + 5 / s}, ${peakW / 2 + 5 / s} ${peakH}`
                  : `${peakW / 2} 0, ${peakW / 2 - 5 / s} ${-5 / s}, ${peakW / 2 + 5 / s} 0`}
                fill={SCENE_COLORS.labels.glassPanelBg} stroke={CHART_COLORS.axisLine} strokeWidth={0.8 / s} />
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
          <text x={ballCanvas.cx} y={designGroundY - 18 / s} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
        )}
        </g>

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
