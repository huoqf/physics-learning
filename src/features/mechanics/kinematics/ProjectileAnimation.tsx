import { VectorArrow, VectorDefs, Ball, ParticleTrajectory } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
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
} from '@/theme/physics'

import { VelocityTimeChart } from '@/components/Chart'

import { calculateVectorPixelLength } from '@/utils/vectorLength'

const PROJ_DESIGN = { width: 100, height: 100 } as const

/** 物理常数：最大抛出高度 (m) */
const PHYSICS_HEIGHT = 10.0

/** 平抛动画布局常量 */
const PROJECTILE_LAYOUT = {
  /** 物理原点 X 偏移 (design-unit) */
  originX: 50,
  /** 物理原点 Y 位置占画布高度的比例 */
  originYRatio: 0.15,
  /** 地面 Y 位置占画布高度的比例 */
  groundYRatio: 0.85,
  /** 右侧留白 (design-unit) */
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
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: PROJ_DESIGN })
  const { font } = canvasSize

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

  // ── 3. 设计坐标系下的舞台参数 ─────────────────────────────
  const designOriginX = PROJECTILE_LAYOUT.originX
  const designOriginY = PROJ_DESIGN.height * PROJECTILE_LAYOUT.originYRatio
  const designGroundY = PROJ_DESIGN.height * PROJECTILE_LAYOUT.groundYRatio
  const stageHeight = designGroundY - designOriginY

  // 获取轨迹的水平最大位移，用以动态解算 scaleX
  const lastPoint = trajectory.points[trajectory.points.length - 1]
  const lastPointVac = trajectory.vacuumPoints[trajectory.vacuumPoints.length - 1]
  const maxX = Math.max(lastPoint.x, lastPointVac.x, 1)

  // 双轴自适应等比例缩放
  const scaleX = (PROJ_DESIGN.width - PROJECTILE_LAYOUT.originX - PROJECTILE_LAYOUT.rightPadding) / maxX
  const scaleY = stageHeight / PHYSICS_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  const projSceneScale = useSceneScale({
    vp,
    preset: PROJ_DESIGN,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: { velocity: Math.max(v0x, 10) },
    maxVectorLength: Math.min(PROJ_DESIGN.width, PROJ_DESIGN.height) * 0.3,
  })

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

  // 设计坐标转换（物理 Y 轴向上为正）
  const ballDesign = useMemo(() => ({
    cx: designOriginX + currentState.x * scale,
    cy: designOriginY - currentState.y * scale,
  }), [currentState.x, currentState.y, designOriginX, designOriginY, scale])

  const vacBallDesign = useMemo(() => ({
    cx: designOriginX + vacuumState.x * scale,
    cy: designOriginY - vacuumState.y * scale,
  }), [vacuumState.x, vacuumState.y, designOriginX, designOriginY, scale])

  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1

  // ── 4. v-t 图像尺寸与位置（设计坐标） ───────────────────
  const vtWidth = Math.max(220, PROJ_DESIGN.width * 0.35)
  const vtHeight = Math.max(150, PROJ_DESIGN.height * 0.34)
  const vtX = PROJ_DESIGN.width - vtWidth - 5
  const vtY = 5

  const vtXMax = maxTime * 1.15
  const vtVyMin = -g * maxTime * 1.15
  const vtVxMax = v0x * 1.15
  const vtVMin = Math.min(vtVyMin, 0)
  const vtVMax = Math.max(vtVxMax, 0)

  // ── 5. 动态轨迹曲线路径生成 ─────────────────────────────
  const activeT = Math.min(effectiveTime, groundTime)

  // ParticleTrajectory 所需的点集（设计坐标）
  const historyPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (const pt of trajectory.points) {
      if (pt.t > activeT + 1e-5) break
      pts.push({
        x: designOriginX + pt.x * scale,
        y: designOriginY - pt.y * scale,
      })
    }
    return pts
  }, [trajectory.points, activeT, scale, designOriginX, designOriginY])

  // 预测轨迹
  const predictedPoints = useMemo(() => {
    const src = showDoubleTrack ? trajectory.vacuumPoints : trajectory.points
    return src.map((pt) => ({
      x: designOriginX + pt.x * scale,
      y: designOriginY - pt.y * scale,
    }))
  }, [trajectory, showDoubleTrack, scale, designOriginX, designOriginY])

  const tailPoints = useMemo(() => {
    const tailLen = Math.min(8, historyPoints.length)
    return historyPoints.slice(-tailLen)
  }, [historyPoints])

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

  // ── 6. 时间游标拖拽手势解算（HTML 层图表） ─────────────────
  const isDraggingRef = useRef(false)
  const chartDivRef = useRef<HTMLDivElement>(null)

  const handleDragTime = useCallback(
    (clientX: number) => {
      const div = chartDivRef.current
      if (!div) return
      const rect = div.getBoundingClientRect()
      const clickX = clientX - rect.left
      const tClick = (clickX / rect.width) * vtXMax
      if (tClick >= 0 && tClick <= maxTime) {
        setTime(tClick)
        setIsPlaying(false)
      }
    },
    [vtXMax, maxTime, setTime, setIsPlaying]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      handleDragTime(e.clientX)
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleDragTime])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      isDraggingRef.current = true
      handleDragTime(e.clientX)
    },
    [handleDragTime]
  )

  // ── 7. 全网格参考线 ──────────────────────────────────────
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 12
    const gridRows = 8
    const stageWidth = PROJ_DESIGN.width - PROJECTILE_LAYOUT.originX - PROJECTILE_LAYOUT.rightPadding
    // 水平网格
    for (let i = 1; i < gridRows; i++) {
      const yPos = designOriginY + (i * stageHeight) / gridRows
      lines.push(
        <line
          key={`h-grid-${i}`}
          x1={designOriginX}
          y1={yPos}
          x2={PROJ_DESIGN.width - 5}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    // 垂直网格
    for (let i = 1; i < gridCols; i++) {
      const xPos = designOriginX + (i * stageWidth) / gridCols
      lines.push(
        <line
          key={`v-grid-${i}`}
          x1={xPos}
          y1={designOriginY}
          x2={xPos}
          y2={designGroundY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return lines
  }, [showGrid, designOriginY, designGroundY, stageHeight, designOriginX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        className="bg-white rounded-lg shadow-inner"
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
        <line x1={designOriginX} y1={designOriginY} x2={designOriginX} y2={designGroundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={designOriginX} y1={designGroundY} x2={PROJ_DESIGN.width - 5} y2={designGroundY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        <text x={designOriginX - 10} y={designOriginY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 10m</text>
        <text x={designOriginX - 10} y={designGroundY + 4} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="end">y = 0</text>
        <text x={PROJ_DESIGN.width - 15} y={designGroundY + 16} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>

        {/* 粒子轨迹 */}
        {historyPoints.length > 0 && (
          <ParticleTrajectory
            historyPoints={historyPoints}
            predictedPoints={predictedPoints}
            tailPoints={tailPoints}
            isFocus
            chargeSign="none"
          />
        )}

        {/* 分方向匀速/落体投影球及虚线 */}
        {!isLanded && (
          <>
            <circle
              cx={ballDesign.cx}
              cy={designGroundY}
              r={PROJECTILE_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={0.8}
              strokeDasharray="2,2"
            />
            <circle
              cx={designOriginX}
              cy={ballDesign.cy}
              r={PROJECTILE_LAYOUT.projectionBallRadius}
              fill="url(#vacuum-sphere-grad)"
              stroke={PHYSICS_COLORS.velocityY}
              strokeWidth={0.8}
              strokeDasharray="2,2"
            />
            <line x1={ballDesign.cx} y1={ballDesign.cy} x2={ballDesign.cx} y2={designGroundY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
            <line x1={ballDesign.cx} y1={ballDesign.cy} x2={designOriginX} y2={ballDesign.cy} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
          </>
        )}

        {/* 真空对照钢球 (进阶模式) */}
        {showDoubleTrack && !isLanded && (
          <Ball
            cx={vacBallDesign.cx}
            cy={vacBallDesign.cy}
            r={PROJECTILE_LAYOUT.steelBallRadius}
            type="steelGhost"
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.8}
          />
        )}

        {/* 速度矢量分解箭头 */}
        {showVectors && !isLanded && (
          <g>
            <VectorArrow
              originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
              vector={{ x: currentState.vx, y: 0 }}
              type="velocityX"
              arrowType="physical-schematic"
              sceneScale={projSceneScale}
              strokeWidth={STROKE.vectorSub}
              pixelLength={vxPxLen}
            />
            <text x={ballDesign.cx + projSceneScale.maxVectorLength * 0.3 + 10} y={ballDesign.cy + 3} fontSize={font(9)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">vₓ</text>

            {Math.abs(currentState.vy) > 0.05 && (
              <VectorArrow
                originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
                vector={{ x: 0, y: currentState.vy }}
                type="velocityY"
                arrowType="physical-schematic"
                sceneScale={projSceneScale}
                strokeWidth={STROKE.vectorSub}
                pixelLength={vyPxLen}
              />
            )}
            <text x={ballDesign.cx - 3} y={ballDesign.cy - projSceneScale.maxVectorLength * 0.3 + 12} fontSize={font(9)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

            <VectorArrow
              originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
              vector={{ x: currentState.vx, y: currentState.vy }}
              type="velocity"
              arrowType="physical-schematic"
              sceneScale={projSceneScale}
              strokeWidth={STROKE.vectorMain}
              pixelLength={totalPxLen}
            />
            <text x={ballDesign.cx + projSceneScale.maxVectorLength * 0.3 + 8} y={ballDesign.cy - projSceneScale.maxVectorLength * 0.3 + 8} fontSize={font(9)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 落地状态 */}
        {isLanded && (
          <text x={ballDesign.cx} y={designGroundY - 18} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
        )}

      </AnimationSvgCanvas>

      {/* ========== 右上角：HTML 层画中画悬浮 v-t 图像 ========== */}
      <div
        ref={chartDivRef}
        className="absolute cursor-ew-resize"
        style={{
          left: vtX * vp.scale + vp.tx,
          top: vtY * vp.scale + vp.ty,
          width: vtWidth * vp.scale,
          height: vtHeight * vp.scale,
        }}
        onMouseDown={handleChartMouseDown}
      >
        <div className="w-full h-full rounded-lg overflow-hidden"
          style={{
            background: SCENE_COLORS.labels.glassPanelBg,
            boxShadow: `0 4px 12px ${SCENE_COLORS.effects.shadowLight}`,
            border: `0.8px solid ${CHART_COLORS.axisLine}`,
            padding: 4,
          }}
        >
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
      </div>
    </div>
  )
}
