import { useCanvasSize } from '@/utils'
import { useState, useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { KatexFormula, Spring } from '@/components/UI'
import {
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
} from '@/physics/potentialEnergy'

/**
 * 重力势能与弹性势能交互实验室（左右分栏布局版）
 *
 * 布局结构：
 * ┌────────────────────┬──────────────────────┐
 * │  左侧动画舞台 50%   │  右侧数据/图表区 48%  │
 * │                    │  上部 32%: W重 ΔEp    │
 * │                    │  下部 62%: E-t 图像   │
 * └────────────────────┴──────────────────────┘
 * 底部文字标注 (5项)
 *
 * 双场景模式：
 * 1. 模式 0：重力势能（零势能面拖拽探究自由落体与反弹）
 * 2. 模式 1：弹性势能（弹簧左右拉伸压缩做简谐运动）
 */
export default function PotentialEnergyAnimation() {
    const {params, time, isPlaying, setIsPlaying, showVectors, updateParam, setTime} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    showVectors: s.showVectors,
    updateParam: s.updateParam,
    setTime: s.setTime,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const mode = params.mode ?? 0
  const m = params.m ?? 2                // kg
  const g = params.g ?? 9.8              // m/s² (模式0)
  const y0 = params.y0 ?? 8              // 初始高度 (m, 模式0)
  const y_ref = params.y_ref ?? 3        // 零势能高度 (m, 模式0)
  const k = params.k ?? 100              // 弹簧劲度 (N/m, 模式1)
  const x0 = params.x0 ?? 2.0            // 初始形变 (m, 模式1)
  const tMax = 15                         // 最大模拟时间 15s

  // ── 拖拽状态 Ref ──
  const dragRef = useRef<{
    isDragging: boolean
    type: 'y0' | 'y_ref' | 'x0' | null
    startY: number
    startX: number
    startVal: number
  }>({
    isDragging: false,
    type: null,
    startY: 0,
    startX: 0,
    startVal: 0,
  })

  const [hoveredTarget, setHoveredTarget] = useState<'y0' | 'y_ref' | 'x0' | null>(null)

  // ── 左右分栏布局参数 ──
  const padding = canvasSize.width * 0.03
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)

  // 左侧动画舞台占 50%，右侧图表区占 48%，中间 2% 间隔
  const dividerX = canvasSize.width * 0.50
  const chartLeft = dividerX + canvasSize.width * 0.02
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 右侧图表区上下分区：上部 32% 为 W重 ΔEp 对比柱，下部 62% 为 E-t 图像
  const chartAreaTop = padding
  const chartAreaBottom = canvasSize.height * 0.90

  // 上部对比柱区域 (32%)
  const barAreaTop = chartAreaTop
  const barAreaBottom = chartAreaTop + (chartAreaBottom - chartAreaTop) * 0.32

  // 下部 E-t 图像区域 (62%)
  const etAreaTop = barAreaBottom + (chartAreaBottom - chartAreaTop) * 0.06
  const etAreaBottom = chartAreaBottom
  const etAreaMidY = (etAreaTop + etAreaBottom) / 2

  // 左侧动画区布局
  const animLeft = padding
  const animRight = dividerX - padding * 0.5
  const animWidth = animRight - animLeft
  const animCenterX = (animLeft + animRight) / 2

  // 底部标注区
  const bottomY = canvasSize.height * 0.92

  // 模式0：垂直坐标转换（物位范围 0~10m）
  const groundY = canvasSize.height * 0.82
  const objW = Math.min(animWidth * 0.18, canvasSize.width * 0.075)
  const ballR = objW * 0.45
  const animTopMargin = canvasSize.height * 0.08
  const animHeightLimit = groundY - animTopMargin
  const scaleY = animHeightLimit / 10 // 像素/米
  const toPixelY = (yVal: number) => groundY - yVal * scaleY

  // 模式1：水平坐标转换（位移范围 -3m 到 +3m）
  const scaleX_m1 = (animWidth * 0.35) / 3
  const toPixelX = (xVal: number) => animCenterX + xVal * scaleX_m1

  // ── 预计算轨迹与当前状态 ──
  const trajectory = useMemo(() => {
    if (mode === 0) {
      return precomputeGravityTrajectory(m, g, y0, y_ref, 0.7, tMax)
    } else {
      return precomputeSpringTrajectory(m, k, x0, tMax)
    }
  }, [mode, m, g, y0, y_ref, k, x0])

  const state = useMemo(
    () => getPEStateAtTime(trajectory, time),
    [trajectory, time]
  )

  // ── 拖拽响应事件 ──
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (isPlaying) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (mode === 0) {
      const refYPix = toPixelY(y_ref)
      const isOverRefLine = Math.abs(mouseY - refYPix) <= 8 && mouseX >= animLeft && mouseX <= animRight

      const ballCX = animCenterX
      const ballCY = toPixelY(state.pos) - ballR
      const isOverBlock =
        mouseX >= ballCX - ballR - 10 &&
        mouseX <= ballCX + ballR + 10 &&
        mouseY >= ballCY - ballR - 10 &&
        mouseY <= ballCY + ballR + 10

      if (isOverRefLine) {
        dragRef.current = {
          isDragging: true,
          type: 'y_ref',
          startY: mouseY,
          startX: mouseX,
          startVal: y_ref,
        }
      } else if (isOverBlock) {
        dragRef.current = {
          isDragging: true,
          type: 'y0',
          startY: mouseY,
          startX: mouseX,
          startVal: y0,
        }
      }
    } else {
      const blockX = toPixelX(state.pos) + objW * 0.5
      const blockYPix = groundY - objW * 0.45
      const ballR = objW * 0.45
      const isOverBlock =
        mouseX >= blockX - ballR - 10 &&
        mouseX <= blockX + ballR + 10 &&
        mouseY >= blockYPix - ballR - 10 &&
        mouseY <= blockYPix + ballR + 10

      if (isOverBlock) {
        dragRef.current = {
          isDragging: true,
          type: 'x0',
          startY: mouseY,
          startX: mouseX,
          startVal: x0,
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (dragRef.current.isDragging && dragRef.current.type) {
      const { type, startY, startX, startVal } = dragRef.current
      if (type === 'y_ref') {
        const deltaY = mouseY - startY
        const nextVal = startVal - deltaY / scaleY
        const clamped = Math.max(0, Math.min(8.0, nextVal))
        updateParam('y_ref', clamped)
      } else if (type === 'y0') {
        const deltaY = mouseY - startY
        const nextVal = startVal - deltaY / scaleY
        const clamped = Math.max(2.0, Math.min(10.0, nextVal))
        updateParam('y0', clamped)
        setTime(0)
        setIsPlaying(false)
      } else if (type === 'x0') {
        const deltaX = mouseX - startX
        const nextVal = startVal + deltaX / scaleX_m1
        const clamped = Math.max(-2.8, Math.min(2.8, nextVal))
        updateParam('x0', clamped)
        setTime(0)
        setIsPlaying(false)
      }
      return
    }

    if (isPlaying) {
      setHoveredTarget(null)
      return
    }

    if (mode === 0) {
      const refYPix = toPixelY(y_ref)
      const isOverRefLine = Math.abs(mouseY - refYPix) <= 8 && mouseX >= animLeft && mouseX <= animRight

      const ballCX = animCenterX
      const ballCY = toPixelY(state.pos) - ballR
      const isOverBlock =
        mouseX >= ballCX - ballR - 10 &&
        mouseX <= ballCX + ballR + 10 &&
        mouseY >= ballCY - ballR - 10 &&
        mouseY <= ballCY + ballR + 10

      if (isOverRefLine) {
        setHoveredTarget('y_ref')
      } else if (isOverBlock) {
        setHoveredTarget('y0')
      } else {
        setHoveredTarget(null)
      }
    } else {
      const blockX = toPixelX(state.pos) + objW * 0.5
      const blockYPix = groundY - objW * 0.45
      const ballR = objW * 0.45
      const isOverBlock =
        mouseX >= blockX - ballR - 10 &&
        mouseX <= blockX + ballR + 10 &&
        mouseY >= blockYPix - ballR - 10 &&
        mouseY <= blockYPix + ballR + 10

      if (isOverBlock) {
        setHoveredTarget('x0')
      } else {
        setHoveredTarget(null)
      }
    }
  }

  const handleMouseUpOrLeave = () => {
    dragRef.current = {
      isDragging: false,
      type: null,
      startY: 0,
      startX: 0,
      startVal: 0,
    }
  }

  // ── 做功能量对比柱参数 ──
  const initialEp = mode === 0 ? m * g * (y0 - y_ref) : 0.5 * k * x0 * x0
  const deltaEp = state.Ep - initialEp

  const maxBarH = (barAreaBottom - barAreaTop) * 0.55
  const maxEnergyVal = Math.max(
    mode === 0 ? (m * g * 10) : (0.5 * k * 3 * 3),
    10
  )
  const barW_H = (Math.abs(state.W) / maxEnergyVal) * maxBarH
  const barDeltaEp_H = (Math.abs(-deltaEp) / maxEnergyVal) * maxBarH

  // 对比柱基准线 Y 坐标
  const barBaseY = barAreaTop + 18 + maxBarH + 5

  // ── 图表曲线参数 ──
  const toChartX = (t: number) => chartLeft + (t / tMax) * chartWidth

  // 模式1抛物线映射
  const toSpringChartX = (xVal: number) => chartLeft + ((xVal + 3.2) / 6.4) * chartWidth
  const toSpringChartY = (energyVal: number) => {
    const maxE = 0.5 * k * 3.2 * 3.2
    return etAreaBottom - (energyVal / (maxE * 1.15)) * (etAreaBottom - etAreaTop - 20)
  }

  const toGravityChartY = (energyVal: number) => {
    const maxE = m * g * 10
    return etAreaMidY - (energyVal / (maxE * 1.15)) * (etAreaMidY - etAreaTop)
  }

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= time + 0.01),
    [trajectory, time]
  )

  // ── 随动公式 ──
  const getLiveFormula = () => {
    if (mode === 0) {
      return `E_p = mgh = ${state.Ep.toFixed(1)}\\text{J}`;
    } else {
      return `E_{pe} = \\frac{1}{2}kx^2 = ${state.Ep.toFixed(1)}\\text{J}`;
    }
  }

  // ── 底部5项文字标注 ──
  const bottomLabels = mode === 0
    ? [
        { label: '高度', value: `${state.pos.toFixed(2)} m`, color: PHYSICS_COLORS.potentialEnergy },
        { label: '速度', value: `${Math.abs(state.v).toFixed(2)} m/s`, color: PHYSICS_COLORS.velocity },
        { label: 'Ep', value: `${state.Ep.toFixed(1)} J`, color: PHYSICS_COLORS.potentialEnergy },
        { label: 'Ek', value: `${state.Ek.toFixed(1)} J`, color: PHYSICS_COLORS.kineticEnergy },
        { label: 'W重', value: `${state.W.toFixed(1)} J`, color: PHYSICS_COLORS.work },
      ]
    : [
        { label: '形变', value: `${state.pos.toFixed(2)} m`, color: PHYSICS_COLORS.potentialElastic },
        { label: '速度', value: `${Math.abs(state.v).toFixed(2)} m/s`, color: PHYSICS_COLORS.velocity },
        { label: 'Ep弹', value: `${state.Ep.toFixed(1)} J`, color: PHYSICS_COLORS.potentialElastic },
        { label: 'Ek', value: `${state.Ek.toFixed(1)} J`, color: PHYSICS_COLORS.kineticEnergy },
        { label: 'W弹', value: `${state.W.toFixed(1)} J`, color: PHYSICS_COLORS.work },
      ]

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: 600, height: 450 },
    originX: 0,
    originY: 0,
    worldWidth: 600,
    worldHeight: 450,
  }), []);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 拖拽交互提示气泡 */}
      {!isPlaying && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-neutral-50 text-neutral-400 font-semibold rounded border pointer-events-none z-10 animate-pulse" style={{ fontSize: font(9) }}>
          {mode === 0
            ? '拖动物块改变释放高度，拖动虚线改变零势能面'
            : '拖动滑块可调节初始形变大小'}
        </div>
      )}

      {/* 随物块移动的实时物理公式 */}
      <div
        className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
        style={{
          left: mode === 0 ? `${animCenterX}px` : `${toPixelX(state.pos) + objW * 0.5}px`,
          bottom: mode === 0 ? `${canvasSize.height - toPixelY(state.pos) + 2 * ballR + 10}px` : `${canvasSize.height - groundY + ballR + 10}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <span style={{ fontSize: font(10) }}>
          <KatexFormula
            formula={getLiveFormula()}
            mode="inline"
            className={`font-semibold ${
              mode === 0 ? 'text-violet-700' : 'text-violet-900'
            }`}
          />
        </span>
      </div>

      {/* 主 SVG 画面 */}
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{
          cursor:
            hoveredTarget === 'y_ref' || hoveredTarget === 'y0'
              ? 'ns-resize'
              : hoveredTarget === 'x0'
              ? 'ew-resize'
              : 'default',
        }}
        className="bg-transparent"
      >
        <defs>
          {/* 不锈钢实体钢珠 3D 材质（与自由落体动画一致） */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>

        </defs>

        {/* ══════════════════════════════════════════════ */}
        {/* 左侧：动画交互舞台 (50%) */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          // ─── 重力势能场景 ───
          <g>
            {/* 地面底盘 */}
            <PhysicsGround
              x={animLeft} y={groundY} width={animRight - animLeft}
              appearance={{ showHatch: true }}
            />

            {/* 垂直导轨 */}
            <line
              x1={animCenterX}
              y1={toPixelY(10.0)}
              x2={animCenterX}
              y2={groundY}
              stroke={colors.neutral[200]}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* 零势能面参考虚线 (带拖拽高亮手柄) */}
            <g>
              <line
                x1={animLeft}
                y1={toPixelY(y_ref)}
                x2={animRight}
                y2={toPixelY(y_ref)}
                stroke={PHYSICS_COLORS.potentialEnergy}
                strokeWidth={hoveredTarget === 'y_ref' ? 2 : 1.2}
                strokeDasharray={DASH.reference.join(',')}
                opacity={0.85}
              />
              <text
                x={animRight - 4}
                y={toPixelY(y_ref) - 5}
                fontSize={font(8)}
                fill={PHYSICS_COLORS.potentialEnergy}
                textAnchor="end"
                fontWeight="bold"
              >
                Ep=0 (y={y_ref.toFixed(1)}m)
              </text>
              <circle
                cx={animRight}
                cy={toPixelY(y_ref)}
                r={hoveredTarget === 'y_ref' ? 6 : 4}
                fill={PHYSICS_COLORS.potentialEnergy}
                stroke={colors.neutral.white}
                strokeWidth={1}
                opacity={0.9}
              />
            </g>

            {/* 物体（钢珠）— 球心上移 ballR，使球下沿与物理位置对齐 */}
            <g>
              <circle
                cx={animCenterX}
                cy={toPixelY(state.pos) - ballR}
                r={ballR}
                fill="url(#steel-sphere-grad)"
                stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                strokeWidth={hoveredTarget === 'y0' && !isPlaying ? 2.2 : STROKE.objectLine}
              />
              <text x={animCenterX} y={toPixelY(state.pos) - ballR + 3} fontSize={smallFont} fill={colors.neutral[100]} fontWeight="bold" textAnchor="middle">
                {m.toFixed(1)}kg
              </text>

              {/* 速度矢量箭头 */}
              {showVectors && Math.abs(state.v) > 0.15 && (
                <VectorArrow
                  origin={{ x: animCenterX + ballR + 4, y: -(toPixelY(state.pos) - ballR) }}
                  vector={{ x: 0, y: state.v < 0 ? 1 : -1 }}
                  type="velocity"
                  sceneScale={sceneScale}
                  pixelLength={Math.min(Math.abs(state.v) * 3.5, 45) + 4}
                />
              )}
            </g>

            {/* 高度标尺刻度 */}
            {[0, 2, 4, 6, 8, 10].map(h => (
              <g key={`ruler-${h}`}>
                <line x1={animLeft} y1={toPixelY(h)} x2={animLeft + 8} y2={toPixelY(h)} stroke={colors.neutral[400]} strokeWidth={0.5} />
                <text x={animLeft + 10} y={toPixelY(h) + 3} fontSize={font(7)} fill={colors.neutral[400]}>{h}m</text>
              </g>
            ))}
          </g>
        ) : (
          // ─── 弹性势能场景 ───
          <g>
            {/* 水平光滑路面 */}
            <PhysicsGround
              x={animLeft} y={groundY} width={animRight - animLeft}
            />

            {/* 左侧固定墙壁 */}
            <rect
              x={animLeft}
              y={groundY - 60}
              width={15}
              height={60}
              fill={colors.neutral[300]}
              stroke={colors.neutral[400]}
              strokeWidth={1}
            />
            {Array.from({ length: 6 }).map((_, idx) => (
              <line
                key={`wall-strip-${idx}`}
                x1={animLeft}
                y1={groundY - 10 - idx * 10}
                x2={animLeft + 15}
                y2={groundY - 20 - idx * 10}
                stroke={colors.neutral[400]}
                strokeWidth={1}
              />
            ))}

            {/* 自然长度平衡位置绿色虚线 */}
            <line
              x1={toPixelX(0) + objW * 0.5}
              y1={groundY - 55}
              x2={toPixelX(0) + objW * 0.5}
              y2={groundY + 12}
              stroke={CHART_COLORS.reference}
              strokeWidth={1}
              strokeDasharray="3,2"
              opacity={0.8}
            />
            <text
              x={toPixelX(0) + objW * 0.5}
              y={groundY + 10}
              fontSize={font(7)}
              fill={CHART_COLORS.reference}
              textAnchor="middle"
              fontWeight="semibold"
            >
              平衡位置(x=0)
            </text>

            {/* 螺旋弹簧绘制 */}
            <Spring
              x1={animLeft + 15}
              y1={groundY - objW * 0.45}
              x2={toPixelX(state.pos) + objW * 0.5 - objW * 0.45}
              y2={groundY - objW * 0.45}
              coils={16}
              radius={12}
              color={PHYSICS_COLORS.potentialElastic}
            />

            {/* 振动钢珠 */}
            <g>
              <circle
                cx={toPixelX(state.pos) + objW * 0.5}
                cy={groundY - objW * 0.45}
                r={objW * 0.45}
                fill="url(#steel-sphere-grad)"
                stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                strokeWidth={hoveredTarget === 'x0' && !isPlaying ? 2.2 : STROKE.objectLine}
              />
              <text x={toPixelX(state.pos) + objW * 0.5} y={groundY - objW * 0.45 + 3} fontSize={smallFont} fill={colors.neutral[100]} fontWeight="bold" textAnchor="middle">
                {m.toFixed(1)}kg
              </text>

              {/* 弹簧恢复力矢量 F_弹 */}
              {showVectors && Math.abs(state.pos) > 0.05 && (
                <VectorArrow
                  origin={{ x: toPixelX(state.pos) + objW * 0.5, y: -(groundY - objW * 0.45 - objW * 0.45 - 6) }}
                  vector={{ x: state.pos > 0 ? -1 : 1, y: 0 }}
                  type="elasticForce"
                  sceneScale={sceneScale}
                  pixelLength={Math.min(Math.abs(state.pos) * 15 + 10, 45)}
                />
              )}

              {/* 速度矢量 v */}
              {showVectors && Math.abs(state.v) > 0.1 && (
                <VectorArrow
                  origin={{ x: toPixelX(state.pos) + objW * 0.5, y: -(groundY - objW * 0.45 - objW * 0.45 - 6) }}
                  vector={{ x: state.v > 0 ? 1 : -1, y: 0 }}
                  type="velocity"
                  sceneScale={sceneScale}
                  pixelLength={Math.min(Math.abs(state.v) * 5 + 10, 45)}
                />
              )}
            </g>
          </g>
        )}

        {/* 左右分区分隔线 */}
        <line x1={dividerX} y1={padding} x2={dividerX} y2={canvasSize.height * 0.90} stroke={colors.neutral[200]} strokeWidth={1} />

        {/* ══════════════════════════════════════════════ */}
        {/* 右侧上部：W重 ΔEp 对比柱 (32%) */}
        {/* ══════════════════════════════════════════════ */}

        <g>
          <text x={chartLeft} y={barAreaTop + 10} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
            {mode === 0 ? 'W重 = -ΔEp 等价验证' : 'W弹 = -ΔEp 等价验证'}
          </text>

          {/* 对比柱基准线 */}
          <line x1={chartLeft + 10} y1={barBaseY} x2={chartLeft + chartWidth * 0.6} y2={barBaseY} stroke={colors.neutral[400]} strokeWidth={0.8} />

          {/* 柱 1：力做的功 W */}
          <rect
            x={chartLeft + chartWidth * 0.12}
            y={barBaseY - barW_H}
            width={chartWidth * 0.16}
            height={Math.max(barW_H, 0.5)}
            fill={PHYSICS_COLORS.work}
            opacity={0.85}
            rx={1}
          />
          <text x={chartLeft + chartWidth * 0.20} y={barBaseY - barW_H - 4} fontSize={font(8)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
            {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
          </text>
          <text x={chartLeft + chartWidth * 0.20} y={barBaseY + 12} fontSize={font(8)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
            {mode === 0 ? 'W重' : 'W弹'}
          </text>

          {/* 等号 '=' */}
          <text x={chartLeft + chartWidth * 0.35} y={barBaseY - maxBarH * 0.4} fontSize={font(14)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
            =
          </text>

          {/* 柱 2：势能减少量 -ΔEp */}
          <rect
            x={chartLeft + chartWidth * 0.42}
            y={barBaseY - barDeltaEp_H}
            width={chartWidth * 0.16}
            height={Math.max(barDeltaEp_H, 0.5)}
            fill={PHYSICS_COLORS.potentialEnergy}
            opacity={0.85}
            rx={1}
          />
          <text x={chartLeft + chartWidth * 0.50} y={barBaseY - barDeltaEp_H - 4} fontSize={font(8)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="bold">
            {-deltaEp >= 0 ? '+' : ''}{(-deltaEp).toFixed(1)}J
          </text>
          <text x={chartLeft + chartWidth * 0.50} y={barBaseY + 12} fontSize={font(8)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="semibold">
            -ΔEp
          </text>
        </g>

        {/* ══════════════════════════════════════════════ */}
        {/* 右侧下部：E-t 图像 (62%) */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          // ─── 重力势能 E-t 曲线图 ───
          <g>
            <text x={chartLeft} y={etAreaTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              E-t (重力势能、动能及机械能变化 图像)
            </text>

            {/* y 轴零势能中线 */}
            <line x1={chartLeft} y1={etAreaMidY} x2={chartRight} y2={etAreaMidY} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
            <line x1={chartLeft} y1={etAreaTop} x2={chartLeft} y2={etAreaBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={etAreaBottom} x2={chartRight} y2={etAreaBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* 刻度 */}
            {[-1, 0, 1].map((frac, i) => {
              const energyVal = m * g * 10 * frac
              const y = toGravityChartY(energyVal)
              return (
                <g key={`ep-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
                    {energyVal.toFixed(0)}J
                  </text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const tVal = tMax * frac
              const xPos = toChartX(tVal)
              return (
                <g key={`ep-x-${i}`}>
                  <line x1={xPos} y1={etAreaBottom} x2={xPos} y2={etAreaBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={etAreaBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
                </g>
              )
            })}

            {/* 图例 */}
            <g transform={`translate(${chartRight - 160}, ${etAreaTop - 12})`}>
              <line x1={0} y1={3} x2={8} y2={3} stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={1.5} />
              <text x={12} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>Ep</text>

              <line x1={35} y1={3} x2={43} y2={3} stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={1.5} />
              <text x={47} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>Ek</text>

              <line x1={70} y1={3} x2={78} y2={3} stroke={colors.neutral[500]} strokeWidth={1.5} strokeDasharray="3,1" />
              <text x={82} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>E总</text>
            </g>

            {/* 曲线绘制 */}
            {visiblePoints.length >= 2 && (
              <g>
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toGravityChartY(p.Ep)}`).join(' ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.potentialEnergy}
                  strokeWidth={STROKE.chartMain}
                />
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toGravityChartY(p.Ek)}`).join(' ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.kineticEnergy}
                  strokeWidth={STROKE.chartMain}
                />
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toGravityChartY(p.Ep + p.Ek)}`).join(' ')}
                  fill="none"
                  stroke={colors.neutral[500]}
                  strokeWidth={1.2}
                  strokeDasharray="4,2"
                />
              </g>
            )}

            {/* 动点同步亮点 */}
            <circle cx={toChartX(state.t)} cy={toGravityChartY(state.Ep)} r={3} fill={PHYSICS_COLORS.potentialEnergy} stroke={colors.neutral.white} strokeWidth={1} />
            <circle cx={toChartX(state.t)} cy={toGravityChartY(state.Ek)} r={3} fill={PHYSICS_COLORS.kineticEnergy} stroke={colors.neutral.white} strokeWidth={1} />
          </g>
        ) : (
          // ─── 弹性势能 Ep-x 抛物线图 ───
          <g>
            <text x={chartLeft} y={etAreaTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.potentialElastic} fontWeight="bold">
              E_p-x (弹性势能抛物线对称图像)
            </text>

            <line x1={chartLeft} y1={etAreaBottom} x2={chartRight} y2={etAreaBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={toSpringChartX(0)} y1={etAreaTop} x2={toSpringChartX(0)} y2={etAreaBottom} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />

            {/* 抛物线横坐标刻度 */}
            {[-3, -2, -1, 0, 1, 2, 3].map((xVal, i) => {
              const xPos = toSpringChartX(xVal)
              return (
                <g key={`sp-x-${i}`}>
                  <line x1={xPos} y1={etAreaBottom} x2={xPos} y2={etAreaBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={etAreaBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">
                    {xVal > 0 ? '+' : ''}{xVal}m
                  </text>
                </g>
              )
            })}

            {/* 抛物线纵轴能量刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const maxE = 0.5 * k * 3.2 * 3.2
              const eVal = maxE * frac
              const y = toSpringChartY(eVal)
              return (
                <g key={`sp-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
                    {eVal.toFixed(0)}J
                  </text>
                </g>
              )
            })}

            {/* 完整的背景抛物线 */}
            <path
              d={Array.from({ length: 81 }).map((_, idx) => {
                const xVal = -3.2 + (idx * 6.4) / 80
                const epVal = 0.5 * k * xVal * xVal
                const cmd = idx === 0 ? 'M' : 'L'
                return `${cmd} ${toSpringChartX(xVal)} ${toSpringChartY(epVal)}`
              }).join(' ')}
              fill="none"
              stroke={PHYSICS_COLORS.potentialElastic}
              strokeWidth={1.5}
              opacity={0.35}
            />

            {/* 当前高亮滚球亮点 */}
            <circle
              cx={toSpringChartX(state.pos)}
              cy={toSpringChartY(state.Ep)}
              r={4.5}
              fill={PHYSICS_COLORS.potentialElastic}
              stroke={colors.neutral.white}
              strokeWidth={1.2}
              className="transition-all duration-75 ease-out"
            />

            {/* 对称标示辅助虚线 */}
            {Math.abs(state.pos) > 0.05 && (
              <g stroke={colors.neutral[300]} strokeWidth={0.6} strokeDasharray="2,2">
                <line x1={toSpringChartX(state.pos)} y1={toSpringChartY(state.Ep)} x2={chartLeft} y2={toSpringChartY(state.Ep)} />
                <line x1={toSpringChartX(state.pos)} y1={toSpringChartY(state.Ep)} x2={toSpringChartX(state.pos)} y2={etAreaBottom} />
                <line x1={toSpringChartX(-state.pos)} y1={toSpringChartY(state.Ep)} x2={toSpringChartX(-state.pos)} y2={etAreaBottom} />
                <circle cx={toSpringChartX(-state.pos)} cy={toSpringChartY(state.Ep)} r={2.5} fill="none" stroke={PHYSICS_COLORS.potentialElastic} opacity={0.6} />
              </g>
            )}
          </g>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* 底部5项文字标注 */}
        {/* ══════════════════════════════════════════════ */}

        <line x1={padding} y1={bottomY - 6} x2={canvasSize.width - padding} y2={bottomY - 6} stroke={colors.neutral[100]} strokeWidth={0.5} />

        {bottomLabels.map((item, idx) => {
          const spacing = canvasSize.width / bottomLabels.length
          const cx = spacing * idx + spacing * 0.5
          return (
            <g key={`bottom-${idx}`}>
              <text x={cx} y={bottomY + 4} fontSize={font(8)} fill={colors.neutral[500]} textAnchor="middle" fontWeight="semibold">
                {item.label}
              </text>
              <text x={cx} y={bottomY + 16} fontSize={font(9)} fill={item.color} textAnchor="middle" fontWeight="bold">
                {item.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
