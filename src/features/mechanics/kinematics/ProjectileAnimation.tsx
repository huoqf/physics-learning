import { useCanvasSize, useViewport, physicsToCanvasWithOrigin } from '@/utils'
import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { precomputeProjectileWithDrag } from '@/physics'
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
import { VelocityTimeChart } from '@/components/Chart'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Ball } from '@/components/Physics/Ball'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { calculateVectorPixelLength } from '@/utils/vectorLength'

const PROJ_DESIGN = { width: 100, height: 100 } as const

/** 物理常数：最大抛出高度 (m) */
const PHYSICS_HEIGHT = 10.0

/** 平抛动画布局常量 */
const PROJECTILE_LAYOUT = {
  /** 物理原点 X 偏移 (px) */
  originX: 50,
  /** 物理原点 Y 位置占画布高度的比例 */
  originYRatio: 0.15,
  /** 地面 Y 位置占画布高度的比例 */
  groundYRatio: 0.85,
  /** 右侧留白 (px) */
  rightPadding: 45,
  /** 速度矢量缩放因子 (px per m/s) */
  velocityVectorScale: 3.5,
  /** 投影球半径 (px) */
  projectionBallRadius: 9,
  /** 钢珠半径 (px) */
  steelBallRadius: 12,
} as const

export default function ProjectileAnimation() {
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
    designWidth: PROJ_DESIGN.width,
    designHeight: PROJ_DESIGN.height,
  })

  const {
    v0x = 10,
    g = 9.8,
    advancedMode = 0,
    airResistance = 0,
    showVacuumCompare = 1,
  } = params

  // ── 1. 预计算平抛轨迹（阻力与真空） ───────────────────────
  const trajectory = useMemo(
    () => precomputeProjectileWithDrag(v0x, g, airResistance, PHYSICS_HEIGHT),
    [v0x, g, airResistance]
  )

  const { groundTime, groundTimeVac } = trajectory
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
    [trajectory]
  )

  // ── 3. 铺满式物理舞台参数 ─────────────────────────────────
  const originX = vp.visibleX + PROJECTILE_LAYOUT.originX
  const originY = vp.visibleY + vp.visibleH * PROJECTILE_LAYOUT.originYRatio
  const groundY = vp.visibleY + vp.visibleH * PROJECTILE_LAYOUT.groundYRatio
  const stageHeight = groundY - originY

  // 获取轨迹的水平最大位移，用以动态解算 scaleX
  const lastPoint = trajectory.points[trajectory.points.length - 1]
  const lastPointVac = trajectory.vacuumPoints[trajectory.vacuumPoints.length - 1]
  const maxX = Math.max(lastPoint.x, lastPointVac.x, 1)

  // 双轴自适应等比例缩放（取最小值以保证水平与竖直方向绝对不出界）
  const scaleX = (vp.visibleW - PROJECTILE_LAYOUT.originX - PROJECTILE_LAYOUT.rightPadding) / maxX
  const scaleY = stageHeight / PHYSICS_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  const projScene: SceneConfig = {
    vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: Math.max(v0x, 10) },
  }
  const projSceneScale = createSceneScale(projScene)

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
  const refMag = Math.max(v0x, 10)
  const v = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(v, 'velocity', projSceneScale.maxVectorLength, refMag)
  const vxPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vx) / v) : 0
  const vyPxLen = v > 0 ? totalPxLen * (Math.abs(currentState.vy) / v) : 0

  const vacuumState = useMemo(
    () => interpolatePoints(effectiveTime, trajectory.vacuumPoints),
    [effectiveTime, trajectory.vacuumPoints, interpolatePoints]
  )

  // Canvas 坐标转换（通过统一坐标工具，物理 Y 轴向上为正）
  const ballCanvas = physicsToCanvasWithOrigin(currentState.x, currentState.y, originX, originY, scale)
  const vacBallCanvas = physicsToCanvasWithOrigin(vacuumState.x, vacuumState.y, originX, originY, scale)

  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  // ── 4. 右上角悬浮 v-t 图像尺寸设计 ───────────────────────
  const vtWidth = Math.max(220, vp.visibleW * 0.35)
  const vtHeight = Math.max(150, vp.visibleH * 0.34)
  const vtX = vp.visibleX + vp.visibleW - vtWidth - 20
  const vtY = 20

  const vtXMax = maxTime * 1.15
  const vtVyMin = -g * maxTime * 1.15
  const vtVxMax = v0x * 1.15
  const vtVMin = Math.min(vtVyMin, 0)
  const vtVMax = Math.max(vtVxMax, 0)

  // ── 5. 动态轨迹曲线路径生成 ─────────────────────────────
  const activeT = Math.min(effectiveTime, groundTime)
  const activeTVac = Math.min(effectiveTime, groundTimeVac)

  // 物理演练区实际抛物线路径
  const physicalPathD = useMemo(() => {
    const pts: string[] = []
    for (const pt of trajectory.points) {
      if (pt.t > activeT + 1e-5) break
      const { cx, cy } = physicsToCanvasWithOrigin(pt.x, pt.y, originX, originY, scale)
      pts.push(`${cx},${cy}`)
    }
    return pts.length > 1 ? `M ${pts.join(' L ')}` : ''
  }, [trajectory.points, activeT, scale, originX, originY])

  const physicalVacPathD = useMemo(() => {
    if (!showDoubleTrack) return ''
    const pts: string[] = []
    for (const pt of trajectory.vacuumPoints) {
      if (pt.t > activeTVac + 1e-5) break
      const { cx, cy } = physicsToCanvasWithOrigin(pt.x, pt.y, originX, originY, scale)
      pts.push(`${cx},${cy}`)
    }
    return pts.length > 1 ? `M ${pts.join(' L ')}` : ''
  }, [trajectory.vacuumPoints, activeTVac, scale, originX, originY, showDoubleTrack])

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

  // ── 6. 时间游标拖拽手势解算 ─────────────────────────────
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
      const yPos = originY + (i * stageHeight) / gridRows
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
      const xPos = originX + (i * (vp.visibleW - PROJECTILE_LAYOUT.originX - PROJECTILE_LAYOUT.rightPadding)) / gridCols
      lines.push(
        <line
          key={`v-grid-${i}`}
          x1={xPos}
          y1={originY}
          x2={xPos}
          y2={groundY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return lines
  }, [showGrid, originY, groundY, stageHeight, vp.visibleW, originX, vp.visibleX])

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
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[0]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[0]} />
            <stop offset="33%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[1]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[1]} />
            <stop offset="66%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[2]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steelGhost.gradient[3]} stopOpacity={SCENE_COLORS.sphere.steelGhost.opacity[3]} />
          </radialGradient>
          <VectorDefs colors={[PHYSICS_COLORS.velocityX, PHYSICS_COLORS.velocityY, PHYSICS_COLORS.velocity]} />
        </defs>

        {/* ========== 全宽物理演练背景 ========== */}
        {gridLines}

        {/* 坐标轴 */}
        <line x1={originX} y1={originY} x2={originX} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={originX} y1={groundY} x2={canvasSize.width - 15} y2={groundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        <text x={originX - 10} y={originY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 10m</text>
        <text x={originX - 10} y={groundY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 0</text>
        <text x={canvasSize.width - 25} y={groundY + 16} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>

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
              r={PROJECTILE_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={0.8}
              strokeDasharray="2,2"
            />
            {/* 竖直落体投影球 (X = originX) */}
            <circle
              cx={originX}
              cy={ballCanvas.cy}
              r={PROJECTILE_LAYOUT.projectionBallRadius}
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
          <Ball
            cx={vacBallCanvas.cx}
            cy={vacBallCanvas.cy}
            r={PROJECTILE_LAYOUT.steelBallRadius}
            type="steelGhost"
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.8}
          />
        )}

        {/* 实际钢珠小球 (水平飞跃) */}
        <Ball
          cx={Math.min(vp.visibleX + vp.visibleW - PROJECTILE_LAYOUT.steelBallRadius, ballCanvas.cx)}
          cy={Math.min(groundY, ballCanvas.cy)}
          r={PROJECTILE_LAYOUT.steelBallRadius}
          type="steel"
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {/* 速度矢量分解箭头 (经典配色) */}
        {showVectors && !isLanded && (
          <g>
            {/* 水平分速度 vx (Blue-500) */}
            <VectorArrow
              origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
              vector={{ x: currentState.vx, y: 0 }}
              type="velocityX"
              sceneScale={projSceneScale}
              strokeWidth={STROKE.vectorSub}
              pixelLength={vxPxLen}
            />
            <text x={ballCanvas.cx + projSceneScale.maxVectorLength * 0.3 + 10} y={ballCanvas.cy + 3} fontSize={font(9)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">vₓ</text>

            {/* 竖直分速度 vy (Blue-400) */}
            {Math.abs(currentState.vy) > 0.05 && (
              <VectorArrow
                origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
                vector={{ x: 0, y: currentState.vy }}
                type="velocityY"
                sceneScale={projSceneScale}
                strokeWidth={STROKE.vectorSub}
                pixelLength={vyPxLen}
              />
            )}
            <text x={ballCanvas.cx - 3} y={ballCanvas.cy - projSceneScale.maxVectorLength * 0.3 + 12} fontSize={font(9)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

            {/* 合速度 v (Blue-600) */}
            <VectorArrow
              origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
              vector={{ x: currentState.vx, y: currentState.vy }}
              type="velocity"
              sceneScale={projSceneScale}
              strokeWidth={STROKE.vectorMain}
              pixelLength={totalPxLen}
            />
            <text x={ballCanvas.cx + projSceneScale.maxVectorLength * 0.3 + 8} y={ballCanvas.cy - projSceneScale.maxVectorLength * 0.3 + 8} fontSize={font(9)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 落地状态 */}
        {isLanded && (
          <text x={ballCanvas.cx} y={groundY - 18} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
        )}

        {/* ========== 右上角：画中画悬浮 v-t 图像（VelocityTimeChart） ========== */}
        <g transform={`translate(${vtX}, ${vtY})`}>
          <rect
            width={vtWidth}
            height={vtHeight}
            fill={SCENE_COLORS.labels.glassPanelBg}
            rx={8}
            stroke={CHART_COLORS.axisLine}
            strokeWidth={0.8}
            filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12))"
          />

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
                vRange={[vtVMin, vtVMax]}
                title="速度分量-时间 (v-t 图)"
                showCursor={!isLanded}
                showGrid={false}
              />
            </div>
          </foreignObject>

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