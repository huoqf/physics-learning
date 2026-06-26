import { useCanvasSize, useViewport, physicsToCanvasWithOrigin } from '@/utils'
import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { precomputeObliqueThrowWithDrag } from '@/physics/kinematics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  CANVAS_STYLE,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { VelocityTimeChart } from '@/components/Chart'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { calculateVectorPixelLength } from '@/utils/vectorLength'

const OBLIQUE_DESIGN = { width: 100, height: 100 } as const

/** 斜抛动画布局常量 */
const OBLIQUE_THROW_LAYOUT = {
  /** 物理原点 X 偏移 (px) */
  originX: 50,
  /** 地面 Y 位置占画布高度的比例 */
  groundYRatio: 0.85,
  /** 顶部预留高度 (px) */
  topPadding: 40,
  /** 右侧留白 (px) */
  rightPadding: 45,
  /** 速度矢量缩放因子 (px per m/s) */
  velocityVectorScale: 3.5,
  /** 投影球半径 (px) */
  projectionBallRadius: 9,
  /** 钢珠半径 (px) */
  steelBallRadius: 12,
  /** 炮筒长度 (px) */
  barrelLength: 28,
  /** 炮筒宽度 (px) */
  barrelWidth: 10,
  /** 角度指示弧半径 (px) */
  angleArcRadius: 35,
} as const

export default function ObliqueThrowAnimation() {
    const {params, time, showVectors, showGrid, setIsPlaying, setTime} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
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

  // ── 1. 预计算斜抛运动轨迹（有阻力及真空） ─────────────────
  const trajectory = useMemo(
    () => precomputeObliqueThrowWithDrag(v0, angle, g, airResistance),
    [v0, angle, g, airResistance]
  )

  const { groundTime, groundTimeVac, maxHeight, maxHeightVac, range, rangeVac } = trajectory
  const maxTime = Math.max(groundTime, groundTimeVac)

  // ── 2. 线性插值器，提供 O(1) 状态检索 ──────────────────────
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
    []
  )

  // ── 3. 全宽物理舞台定位参数 ──────────────────────────────
  const originX = vp.visibleX + OBLIQUE_THROW_LAYOUT.originX
  const groundY = vp.visibleY + vp.visibleH * OBLIQUE_THROW_LAYOUT.groundYRatio
  const stageHeight = groundY - (vp.visibleY + OBLIQUE_THROW_LAYOUT.topPadding)

  const maxX = Math.max(range, rangeVac, 1)
  const maxY = Math.max(maxHeight, maxHeightVac, 1)

  // 双轴自适应等比例缩放（取两轴的最小值锁定 1:1 比例）
  const scaleX = (vp.visibleW - OBLIQUE_THROW_LAYOUT.originX - OBLIQUE_THROW_LAYOUT.rightPadding) / maxX
  const scaleY = stageHeight / maxY
  const scale = Math.min(scaleX, scaleY)

  const obliqueScene: SceneConfig = {
    vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: Math.max(v0, 10) },
  }
  const obliqueSceneScale = createSceneScale(obliqueScene)

  // 当前播放时刻限制
  const isLanded = time >= groundTime && groundTime > 0
  const effectiveTime = isLanded ? groundTime : Math.max(time, 0)

  // 落地自动暂停
  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // 插值获取当前状态
  const currentState = useMemo(
    () => interpolatePoints(effectiveTime, trajectory.points),
    [effectiveTime, trajectory.points, interpolatePoints]
  )

  // ── 速度矢量统一缩放，确保平行四边形法则成立 ─────────────
  const refMag = Math.max(v0, 10)
  const v = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(v, 'velocity', obliqueSceneScale.maxVectorLength, refMag)
  const vxPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vx) / v) : 0
  const vyPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vy) / v) : 0

  const vacuumState = useMemo(
    () => interpolatePoints(effectiveTime, trajectory.vacuumPoints),
    [effectiveTime, trajectory.vacuumPoints, interpolatePoints]
  )

  // Canvas 坐标转换（通过统一坐标工具，物理 Y 轴向上为正）
  const ballCanvas = physicsToCanvasWithOrigin(currentState.x, currentState.y, originX, groundY, scale)
  const vacBallCanvas = physicsToCanvasWithOrigin(vacuumState.x, vacuumState.y, originX, groundY, scale)

  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  // ── 4. 右上角悬浮 v-t 图像画中画定位 ─────────────────────
  const vtWidth = Math.max(220, vp.visibleW * 0.35)
  const vtHeight = Math.max(150, vp.visibleH * 0.34)
  const vtX = vp.visibleX + vp.visibleW - vtWidth - 20
  const vtY = 20

  const vtXMax = maxTime * 1.15
  const vtVMax = Math.max(v0, g * maxTime) * 1.15

  // ── 5. 动态轨迹曲线路径生成 ─────────────────────────────
  const activeT = Math.min(effectiveTime, groundTime)
  const activeTVac = Math.min(effectiveTime, groundTimeVac)

  // 物理区实际和真空抛物线
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

  // v-t 图 VelocityTimeChart 数据
  const vtPointsVx = useMemo(
    () => trajectory.points.filter(pt => pt.t <= activeT + 1e-5).map(pt => ({ t: pt.t, v: pt.vx })),
    [trajectory.points, activeT]
  )
  const vtDomainVx = useMemo(
    () => trajectory.points.map(pt => ({ t: pt.t, v: pt.vx })),
    [trajectory.points]
  )
  const vtPointsVy = useMemo(
    () => trajectory.points.filter(pt => pt.t <= activeT + 1e-5).map(pt => ({ t: pt.t, v: pt.vy })),
    [trajectory.points, activeT]
  )
  const vtDomainVy = useMemo(
    () => trajectory.points.map(pt => ({ t: pt.t, v: pt.vy })),
    [trajectory.points]
  )

  // ── 6. 时间游标拖拽手势 ──────────────────────────────────
  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, svgRect: DOMRect) => {
      const clickX = clientX - svgRect.left - vtX - 4
      const tClick = (clickX / (vtWidth - 8)) * vtXMax
      if (tClick >= 0 && tClick <= maxTime) {
        setTime(tClick)
        setIsPlaying(false)
      }
    },
    [vtX, vtWidth, vtXMax, maxTime, setTime, setIsPlaying]
  )

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  const handleSvgMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      isDraggingRef.current = true
      const svg = e.currentTarget.closest('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  // ── 7. 全网格参考线 ──────────────────────────────────────
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 12
    const gridRows = 8
    // 水平网格
    for (let i = 1; i < gridRows; i++) {
      const yPos = groundY - (i * stageHeight) / gridRows
      lines.push(
        <line
          key={`h-grid-${i}`}
          x1={originX}
          y1={yPos}
          x2={vp.visibleX + vp.visibleW - 20}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    // 垂直网格
    for (let i = 1; i < gridCols; i++) {
      const xPos = originX + (i * (vp.visibleW - OBLIQUE_THROW_LAYOUT.originX - OBLIQUE_THROW_LAYOUT.rightPadding)) / gridCols
      lines.push(
        <line
          key={`v-grid-${i}`}
          x1={xPos}
          y1={groundY - stageHeight}
          x2={xPos}
          y2={groundY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return lines
  }, [showGrid, groundY, stageHeight, vp.visibleW])

  // 弹射炮筒角度矢量计算
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
          {/* 金属弹射炮筒材质 */}
          <linearGradient id="slider-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="30%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>

          {/* 不锈钢实体钢珠 3D 材质 */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </radialGradient>

          {/* 真空对照球半透明虚影 */}
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[0]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[1]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[1]} />
            <stop offset="90%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[2]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[3]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[3]} />
          </radialGradient>

          <VectorDefs colors={[PHYSICS_COLORS.velocityX, PHYSICS_COLORS.velocityY, PHYSICS_COLORS.velocity]} />
        </defs>

        {/* ========== 全宽物理演练画布 ========== */}
        {gridLines}

        {/* 坐标轴 */}
        <line x1={originX} y1={groundY - stageHeight} x2={originX} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={originX} y1={groundY} x2={vp.visibleX + vp.visibleW - 15} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        <text x={originX - 10} y={groundY - maxY * scale + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = {maxY.toFixed(1)}m</text>
        <text x={originX - 10} y={groundY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 0</text>
        <text x={vp.visibleX + vp.visibleW - 25} y={groundY + 16} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>

        {/* 抛出角度指示盘 (动态扇形弧) */}
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
          <rect
            x={0}
            y={-OBLIQUE_THROW_LAYOUT.barrelWidth / 2}
            width={OBLIQUE_THROW_LAYOUT.barrelLength}
            height={OBLIQUE_THROW_LAYOUT.barrelWidth}
            fill="url(#slider-metal)"
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={1}
            rx={2}
          />
          <circle cx={4} cy={0} r={2} fill={PHYSICS_COLORS.velocityY} />
        </g>

        {/* 运动历史轨迹线 */}
        {physicalVacPathD && (
          <path d={physicalVacPathD} fill="none" stroke={PHYSICS_COLORS.trackHistoryAlt} strokeWidth={STROKE.trackHistory} strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />
        )}
        {physicalPathD && (
          <path d={physicalPathD} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory} />
        )}

        {/* 分方向匀速/落体投影球及虚线 */}
        {!isLanded && (
          <>
            {/* 水平匀速投影球 (Y = groundY) */}
            <circle
              cx={ballCanvas.cx}
              cy={groundY}
              r={OBLIQUE_THROW_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={0.8}
              strokeDasharray="2,2"
            />
            {/* 竖直落体/上抛投影球 (X = originX) */}
            <circle
              cx={originX}
              cy={ballCanvas.cy}
              r={OBLIQUE_THROW_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityY}
              strokeWidth={0.8}
              strokeDasharray="2,2"
            />
            {/* 主球与投影球之间的参考虚线 */}
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={ballCanvas.cx} y2={groundY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
            <line x1={ballCanvas.cx} y1={ballCanvas.cy} x2={originX} y2={ballCanvas.cy} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
          </>
        )}

        {/* 真空对照钢球 (进阶模式) */}
        {showDoubleTrack && !isLanded && (
          <circle cx={vacBallCanvas.cx} cy={vacBallCanvas.cy} r={OBLIQUE_THROW_LAYOUT.steelBallRadius} fill="url(#vacuum-sphere-grad)" stroke={PHYSICS_COLORS.displacement} strokeWidth={0.8} />
        )}

        {/* 实际钢珠小球 */}
        <circle
          cx={Math.min(vp.visibleX + vp.visibleW - OBLIQUE_THROW_LAYOUT.steelBallRadius, ballCanvas.cx)}
          cy={Math.min(groundY, ballCanvas.cy)}
          r={OBLIQUE_THROW_LAYOUT.steelBallRadius}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 速度分量矢量箭头 (经典配色) */}
        {showVectors && !isLanded && (
          <g>
            {/* 水平分速度 vx (Blue-500) */}
            <VectorArrow
              origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
              vector={{ x: currentState.vx, y: 0 }}
              type="velocityX"
              sceneScale={obliqueSceneScale}
              strokeWidth={STROKE.vectorSub}
              pixelLength={vxPxLen}
            />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 10} y={ballCanvas.cy + 3} fontSize={font(9)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">vₓ</text>

            {/* 竖直分速度 vy (Blue-400，向上为正) */}
            {Math.abs(currentState.vy) > 0.05 && (
              <VectorArrow
                origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
                vector={{ x: 0, y: currentState.vy }}
                type="velocityY"
                sceneScale={obliqueSceneScale}
                strokeWidth={STROKE.vectorSub}
                pixelLength={vyPxLen}
              />
            )}
            <text x={ballCanvas.cx - 3} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 + (currentState.vy >= 0 ? -6 : 12)} fontSize={font(9)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

            {/* 合速度 v (Blue-600) */}
            <VectorArrow
              origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
              vector={{ x: currentState.vx, y: currentState.vy }}
              type="velocity"
              sceneScale={obliqueSceneScale}
              strokeWidth={STROKE.vectorMain}
              pixelLength={totalPxLen}
            />
            <text x={ballCanvas.cx + obliqueSceneScale.maxVectorLength * 0.3 + 8} y={ballCanvas.cy - obliqueSceneScale.maxVectorLength * 0.3 - 4} fontSize={font(9)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 最高点物理指示 */}
        {!isLanded && Math.abs(currentState.vy) < 0.25 && currentState.y > 0.5 * maxHeight && (
          <g transform={`translate(${ballCanvas.cx - 60}, ${ballCanvas.cy - 45})`}>
            <rect width={120} height={38} fill={SCENE_COLORS.labels.panelBg} opacity={0.92} rx={4} stroke={CHART_COLORS.criticalPt} strokeWidth={1} />
            <polygon points="60 38, 55 43, 65 38" fill={SCENE_COLORS.labels.panelBg} stroke={CHART_COLORS.criticalPt} strokeWidth={0.5} />
            <text x={60} y={13} fontSize={font(8)} fill={SCENE_COLORS.labels.panelText} textAnchor="middle" fontWeight="bold">最高点 H = {maxHeight.toFixed(2)}m</text>
            <text x={60} y={25} fontSize={font(7)} fill={SCENE_COLORS.labels.panelTextMuted} textAnchor="middle">vᵧ = 0, 合速度 v = vₓ</text>
          </g>
        )}

        {/* 落地状态 */}
        {isLanded && (
          <text x={ballCanvas.cx} y={groundY - 18} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
        )}

        {/* ========== 右上角：画中画悬浮 v-t 图像（VelocityTimeChart） ========== */}
        <g transform={`translate(${vtX}, ${vtY})`}>
          {/* 毛玻璃卡片背景 */}
          <rect
            width={vtWidth}
            height={vtHeight}
            fill={SCENE_COLORS.labels.glassPanelBg}
            rx={8}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={0.8}
            filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12))"
          />

          {/* vx 主曲线 */}
          <foreignObject x={4} y={4} width={vtWidth - 8} height={vtHeight - 8} style={{ pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: '100%' }}>
              <VelocityTimeChart
                mode="animated"
                points={vtPointsVx}
                domainPoints={vtDomainVx}
                additionalSeries={[
                  {
                    points: vtPointsVy,
                    domainPoints: vtDomainVy,
                    label: 'vᵧ',
                    series: 'secondary',
                  },
                ]}
                currentTime={effectiveTime}
                tMax={vtXMax}
                vRange={[-vtVMax, vtVMax]}
                title="速度分量-时间 (v-t 图)"
                showCursor={!isLanded}
                showGrid={false}
              />
            </div>
          </foreignObject>

          {/* 拖动图表热区 */}
          <rect
            x={0} y={0}
            width={vtWidth} height={vtHeight}
            fill="transparent"
            className="cursor-ew-resize"
            onMouseDown={handleChartMouseDown}
          />
        </g>
      </svg>
    </div>
  )
}
