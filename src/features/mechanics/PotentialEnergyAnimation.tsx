import { useCanvasSize } from '@/utils'
import { useState, useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { KatexFormula, Spring } from '@/components/UI'
import {
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
} from '@/physics/potentialEnergy'

/**
 * 重力势能与弹性势能交互实验室（全新美化规范版）
 * 
 * 双场景模式：
 * 1. 模式 0：重力势能（零势能面拖拽探究自由落体与反弹）
 * 2. 模式 1：弹性势能（弹簧左右拉伸压缩做简谐运动）
 */
export default function PotentialEnergyAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors, updateParam, setTime } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
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

  // ── 布局及坐标系映射 ──
  const padding = canvasSize.width * 0.06
  const wallX = canvasSize.width - padding * 0.8
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)

  // 上半部 52% 为图表，下半部 48% 为动画
  const chartTop = canvasSize.height * 0.06
  const chartBottom = canvasSize.height * 0.52
  const chartMidY = (chartTop + chartBottom) / 2
  const chartLeft = padding * 1.5
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 动画区地面沉底至 85% 位置
  const groundY = canvasSize.height * 0.85
  const objW = canvasSize.width * 0.075
  const objH = objW

  // 模式0：垂直坐标转换（物位范围 0~10m）
  const animHeightLimit = groundY - (canvasSize.height * 0.55 + 24) // 约 102 像素
  const scaleY = animHeightLimit / 10 // 像素/米
  const toPixelY = (yVal: number) => groundY - yVal * scaleY

  // 模式1：水平坐标转换（位移范围 -3m 到 +3m，平衡位置在动画区中点）
  const animLeftBoundary = padding * 1.5
  const animRightBoundary = wallX - 110 // 给右侧对比卡片让出空间
  const animCenterX = (animLeftBoundary + animRightBoundary) / 2
  const scaleX = (animCenterX - animLeftBoundary) / 3 // 保证最大 +-3m 刚好在视窗边缘
  const toPixelX = (xVal: number) => animCenterX + xVal * scaleX

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
    if (isPlaying) return // 播放中禁止拖拽

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (mode === 0) {
      // 检查是否点击了零势能面参考线（高度误差在 10px 范围，水平在动画有效区内）
      const refYPix = toPixelY(y_ref)
      const isOverRefLine = Math.abs(mouseY - refYPix) <= 8 && mouseX >= padding && mouseX <= animRightBoundary

      // 检查是否点击了重力物块 (物块横坐标固定在 animCenterX 偏左，如 160)
      const blockX = animCenterX - 60
      const blockYPix = toPixelY(state.pos)
      const isOverBlock =
        mouseX >= blockX - 10 &&
        mouseX <= blockX + objW + 10 &&
        mouseY >= blockYPix - objH - 10 &&
        mouseY <= blockYPix + 10

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
      // 弹性势能模式：检查是否点击了滑块
      const blockX = toPixelX(state.pos)
      const blockYPix = groundY - objH
      const isOverBlock =
        mouseX >= blockX - 10 &&
        mouseX <= blockX + objW + 10 &&
        mouseY >= blockYPix - 10 &&
        mouseY <= groundY + 10

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

    // 处理拖拽中逻辑
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
        const nextVal = startVal + deltaX / scaleX
        const clamped = Math.max(-2.8, Math.min(2.8, nextVal))
        updateParam('x0', clamped)
        setTime(0)
        setIsPlaying(false)
      }
      return
    }

    // 处理 Hover 样式高亮提示
    if (isPlaying) {
      setHoveredTarget(null)
      return
    }

    if (mode === 0) {
      const refYPix = toPixelY(y_ref)
      const isOverRefLine = Math.abs(mouseY - refYPix) <= 8 && mouseX >= padding && mouseX <= animRightBoundary

      const blockX = animCenterX - 60
      const blockYPix = toPixelY(state.pos)
      const isOverBlock =
        mouseX >= blockX - 10 &&
        mouseX <= blockX + objW + 10 &&
        mouseY >= blockYPix - objH - 10 &&
        mouseY <= blockYPix + 10

      if (isOverRefLine) {
        setHoveredTarget('y_ref')
      } else if (isOverBlock) {
        setHoveredTarget('y0')
      } else {
        setHoveredTarget(null)
      }
    } else {
      const blockX = toPixelX(state.pos)
      const blockYPix = groundY - objH
      const isOverBlock =
        mouseX >= blockX - 10 &&
        mouseX <= blockX + objW + 10 &&
        mouseY >= blockYPix - 10 &&
        mouseY <= groundY + 10

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

  const maxBarH = 55
  const maxEnergyVal = Math.max(
    mode === 0 ? (m * g * 10) : (0.5 * k * 3 * 3),
    10
  )
  const barW_H = (Math.abs(state.W) / maxEnergyVal) * maxBarH
  // 注意，我们要对比的是“势能减少量 (-ΔEp)”和“功 W”的等价性。
  const barDeltaEp_H = (Math.abs(-deltaEp) / maxEnergyVal) * maxBarH

  // ── 图表曲线参数 ──
  const toChartX = (t: number) => chartLeft + (t / tMax) * chartWidth
  
  // 模式1抛物线映射
  const toSpringChartX = (xVal: number) => chartLeft + ((xVal + 3.2) / 6.4) * chartWidth
  const toSpringChartY = (energyVal: number) => {
    const maxE = 0.5 * k * 3.2 * 3.2
    return chartBottom - (energyVal / (maxE * 1.15)) * (chartBottom - chartTop - 20)
  }

  const toGravityChartY = (energyVal: number) => {
    const maxE = m * g * 10
    // 支持正负势能，中轴零位在图表中心 (chartMidY)
    return chartMidY - (energyVal / (maxE * 1.15)) * (chartMidY - chartTop)
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

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 拖拽交互提示气泡 */}
      {!isPlaying && (
        <div className="absolute top-3 right-4 px-2 py-0.5 bg-neutral-50 text-[9px] text-neutral-400 font-semibold rounded border pointer-events-none z-10 animate-pulse">
          {mode === 0
            ? '💡 拖动左侧物块改变释放高度，拖动虚线改变零势能面'
            : '💡 拖动平衡点旁的滑块可调节初始形变大小'}
        </div>
      )}

      {/* 随物块移动的实时物理公式 */}
      <div
        className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
        style={{
          left: mode === 0 ? `${animCenterX - 60 + objW * 0.5}px` : `${toPixelX(state.pos) + objW * 0.5}px`,
          bottom: mode === 0 ? `${canvasSize.height - toPixelY(state.pos) + objH + 12}px` : `${canvasSize.height - groundY + objH + 12}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <KatexFormula
          formula={getLiveFormula()}
          mode="inline"
          className={`text-[10px] font-semibold ${
            mode === 0 ? 'text-violet-700' : 'text-violet-900'
          }`}
        />
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
          {/* 渐变配色 */}
          <linearGradient id="block-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.woodSphereGrad[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.woodSphereGrad[1]} />
          </linearGradient>

          <linearGradient id="pot-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PHYSICS_COLORS.potentialEnergy} stopOpacity="0.2" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.potentialEnergy} stopOpacity="0" />
          </linearGradient>

          {/* 物理矢量箭头 */}
          <marker id="arrow-vector" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-springForce" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.elasticForce} />
          </marker>
        </defs>

        {/* ══════════════════════════════════════════════ */}
        {/* 上半部分：图表区 */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          // ─── 视图A：重力势能-时间曲线图（高考经典题型） ───
          <g>
            <text x={chartLeft} y={chartTop - 4} fontSize={smallFont} fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              E-t (重力势能、动能及机械能变化 图像)
            </text>
            
            {/* y 轴零势能中线 */}
            <line x1={chartLeft} y1={chartMidY} x2={chartRight} y2={chartMidY} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
            <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* 刻度 */}
            {[-1, 0, 1].map((frac, i) => {
              const energyVal = m * g * 10 * frac
              const y = toGravityChartY(energyVal)
              return (
                <g key={`ep-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">
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
                  <line x1={xPos} y1={chartBottom} x2={xPos} y2={chartBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={chartBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
                </g>
              )
            })}

            {/* 图例 */}
            <g transform={`translate(${chartRight - 180}, ${chartTop - 12})`}>
              <line x1={0} y1={3} x2={8} y2={3} stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={1.5} />
              <text x={12} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>Ep (重力势能)</text>

              <line x1={65} y1={3} x2={73} y2={3} stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={1.5} />
              <text x={77} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>Ek (动能)</text>

              <line x1={115} y1={3} x2={123} y2={3} stroke={colors.neutral[500]} strokeWidth={1.5} strokeDasharray="3,1" />
              <text x={127} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>E总 (机械能)</text>
            </g>

            {/* 曲线绘制 */}
            {visiblePoints.length >= 2 && (
              <g>
                {/* 1. 重力势能 Ep */}
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toGravityChartY(p.Ep)}`).join(' ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.potentialEnergy}
                  strokeWidth={STROKE.chartMain}
                />
                {/* 2. 动能 Ek */}
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toGravityChartY(p.Ek)}`).join(' ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.kineticEnergy}
                  strokeWidth={STROKE.chartMain}
                />
                {/* 3. 总机械能 E_total */}
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
            <circle cx={toChartX(state.t)} cy={toGravityChartY(state.Ep)} r={3} fill={PHYSICS_COLORS.potentialEnergy} stroke={colors.neutral[0]} strokeWidth={1} />
            <circle cx={toChartX(state.t)} cy={toGravityChartY(state.Ek)} r={3} fill={PHYSICS_COLORS.kineticEnergy} stroke={colors.neutral[0]} strokeWidth={1} />
          </g>
        ) : (
          // ─── 视图B：弹性势能 Ep - x 二次抛物线图 ───
          <g>
            <text x={chartLeft} y={chartTop - 4} fontSize={smallFont} fill={PHYSICS_COLORS.potentialElastic} fontWeight="bold">
              E_p-x (弹性势能抛物线对称图像)
            </text>

            <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={toSpringChartX(0)} y1={chartTop} x2={toSpringChartX(0)} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />

            {/* 抛物线横坐标刻度 */}
            {[-3, -2, -1, 0, 1, 2, 3].map((xVal, i) => {
              const xPos = toSpringChartX(xVal)
              return (
                <g key={`sp-x-${i}`}>
                  <line x1={xPos} y1={chartBottom} x2={xPos} y2={chartBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={chartBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">
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
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">
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

            {/* 当前高亮滚球亮点在抛物线上的运动 */}
            <circle
              cx={toSpringChartX(state.pos)}
              cy={toSpringChartY(state.Ep)}
              r={4.5}
              fill={PHYSICS_COLORS.potentialElastic}
              stroke={colors.neutral[0]}
              strokeWidth={1.2}
              className="transition-all duration-75 ease-out"
            />
            
            {/* 对称标示辅助虚线 */}
            {Math.abs(state.pos) > 0.05 && (
              <g stroke={colors.neutral[300]} strokeWidth={0.6} strokeDasharray="2,2">
                {/* 对应到 Y 轴的水平线 */}
                <line x1={toSpringChartX(state.pos)} y1={toSpringChartY(state.Ep)} x2={chartLeft} y2={toSpringChartY(state.Ep)} />
                {/* 对应到 X 轴的垂直线 */}
                <line x1={toSpringChartX(state.pos)} y1={toSpringChartY(state.Ep)} x2={toSpringChartX(state.pos)} y2={chartBottom} />
                {/* 对称侧的垂直线 */}
                <line x1={toSpringChartX(-state.pos)} y1={toSpringChartY(state.Ep)} x2={toSpringChartX(-state.pos)} y2={chartBottom} />
                <circle cx={toSpringChartX(-state.pos)} cy={toSpringChartY(state.Ep)} r={2.5} fill="none" stroke={PHYSICS_COLORS.potentialElastic} opacity={0.6} />
              </g>
            )}
          </g>
        )}

        {/* 分隔线 */}
        <line x1={padding * 0.5} y1={canvasSize.height * 0.55} x2={canvasSize.width - padding * 0.5} y2={canvasSize.height * 0.55} stroke={colors.neutral[200]} strokeWidth={1} />

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：动画交互演示区 */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          // ─── 重力势能场景 ───
          <g>
            {/* 地面底盘 */}
            <line x1={padding} y1={groundY} x2={animRightBoundary} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
            <line x1={padding} y1={groundY + 3} x2={animRightBoundary} y2={groundY + 3} stroke={colors.neutral[200]} strokeWidth={0.5} />

            {/* 垂直导轨（辅助对准，显得更像实验室科学装置） */}
            <line
              x1={animCenterX - 60 + objW * 0.5}
              y1={toPixelY(10.0)}
              x2={animCenterX - 60 + objW * 0.5}
              y2={groundY}
              stroke={colors.neutral[200]}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* 零势能面参考虚线 (带拖拽高亮手柄) */}
            <g>
              <line
                x1={padding}
                y1={toPixelY(y_ref)}
                x2={animRightBoundary}
                y2={toPixelY(y_ref)}
                stroke={PHYSICS_COLORS.potentialEnergy}
                strokeWidth={hoveredTarget === 'y_ref' ? 2 : 1.2}
                strokeDasharray={DASH.reference.join(',')}
                opacity={0.85}
              />
              {/* 零势能面文字标签 */}
              <text
                x={animRightBoundary - 8}
                y={toPixelY(y_ref) - 5}
                fontSize={8.5}
                fill={PHYSICS_COLORS.potentialEnergy}
                textAnchor="end"
                fontWeight="bold"
              >
                E_p = 0 参考零势能面 (y={y_ref.toFixed(1)}m)
              </text>
              {/* 零势能面右侧可拖拽小圆形提手 */}
              <circle
                cx={animRightBoundary}
                cy={toPixelY(y_ref)}
                r={hoveredTarget === 'y_ref' ? 6 : 4}
                fill={PHYSICS_COLORS.potentialEnergy}
                stroke={colors.neutral[0]}
                strokeWidth={1}
                opacity={0.9}
              />
            </g>

            {/* 物体（方物块，带自由落体和反弹位置） */}
            <g transform={`translate(${animCenterX - 60}, ${toPixelY(state.pos) - objH})`}>
              <rect
                width={objW}
                height={objH - 1}
                rx={2}
                fill="url(#block-grad)"
                stroke={SCENE_COLORS.materials.woodSphereGrad[1]}
                strokeWidth={hoveredTarget === 'y0' && !isPlaying ? 2.2 : 1.5}
              />
              <text x={objW * 0.5} y={objH * 0.55} fontSize={smallFont} fill={colors.neutral[800]} fontWeight="bold" textAnchor="middle">
                {m.toFixed(1)}kg
              </text>

              {/* 速度矢量箭头 */}
              {showVectors && Math.abs(state.v) > 0.15 && (
                <line
                  x1={objW * 0.5}
                  y1={state.v < 0 ? objH + 4 : -4}
                  x2={objW * 0.5}
                  y2={state.v < 0 ? objH + 4 + Math.min(Math.abs(state.v) * 3.5, 45) : -4 - Math.min(state.v * 3.5, 45)}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={STROKE.vectorMain}
                  markerEnd="url(#arrow-vector)"
                />
              )}
            </g>
          </g>
        ) : (
          // ─── 弹性势能场景 ───
          <g>
            {/* 水平光滑路面 */}
            <line x1={animLeftBoundary - 10} y1={groundY} x2={animRightBoundary} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
            
            {/* 左侧固定墙壁 */}
            <rect
              x={animLeftBoundary - 15}
              y={groundY - 60}
              width={15}
              height={60}
              fill={colors.neutral[300]}
              stroke={colors.neutral[400]}
              strokeWidth={1}
            />
            {/* 墙壁阴影斜条纹 */}
            {Array.from({ length: 6 }).map((_, idx) => (
              <line
                key={`wall-strip-${idx}`}
                x1={animLeftBoundary - 15}
                y1={groundY - 10 - idx * 10}
                x2={animLeftBoundary}
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
              stroke={colors.success[500]}
              strokeWidth={1}
              strokeDasharray="3,2"
              opacity={0.8}
            />
            <text
              x={toPixelX(0) + objW * 0.5}
              y={groundY + 10}
              fontSize={7.5}
              fill={colors.success[700]}
              textAnchor="middle"
              fontWeight="semibold"
            >
              平衡位置(x=0, Ep=0)
            </text>

            {/* 螺旋弹簧绘制 (拉伸或压缩状态) */}
            <Spring
              x1={animLeftBoundary}
              y1={groundY - objH * 0.5}
              x2={toPixelX(state.pos)}
              y2={groundY - objH * 0.5}
              coils={16}
              radius={12}
              color={PHYSICS_COLORS.potentialElastic}
            />

            {/* 振动滑块 (木物块) */}
            <g transform={`translate(${toPixelX(state.pos)}, ${groundY - objH})`}>
              <rect
                width={objW}
                height={objH - 1}
                rx={2}
                fill="url(#block-grad)"
                stroke={SCENE_COLORS.materials.woodSphereGrad[1]}
                strokeWidth={hoveredTarget === 'x0' && !isPlaying ? 2.2 : 1.5}
              />
              <circle cx={objW * 0.22} cy={objH - 0.5} r={2.5} fill={colors.neutral[800]} />
              <circle cx={objW * 0.78} cy={objH - 0.5} r={2.5} fill={colors.neutral[800]} />
              
              <text x={objW * 0.5} y={objH * 0.55} fontSize={smallFont} fill={colors.neutral[800]} fontWeight="bold" textAnchor="middle">
                {m.toFixed(1)}kg
              </text>

              {/* 弹簧恢复力矢量 F_弹 */}
              {showVectors && Math.abs(state.pos) > 0.05 && (
                <line
                  x1={objW * 0.5}
                  y1={objH * 0.5}
                  x2={objW * 0.5 + (state.pos > 0 ? -1 : 1) * Math.min(Math.abs(state.pos) * 15 + 10, 45)}
                  y2={objH * 0.5}
                  stroke={PHYSICS_COLORS.elasticForce}
                  strokeWidth={STROKE.vectorMain}
                  markerEnd="url(#arrow-springForce)"
                />
              )}

              {/* 速度矢量 v */}
              {showVectors && Math.abs(state.v) > 0.1 && (
                <line
                  x1={objW * 0.5}
                  y1={objH + 3.5}
                  x2={objW * 0.5 + (state.v > 0 ? 1 : -1) * Math.min(Math.abs(state.v) * 5 + 10, 45)}
                  y2={objH + 3.5}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={STROKE.vectorMain}
                  markerEnd="url(#arrow-vector)"
                />
              )}
            </g>
          </g>
        )}

        {/* ── 定理等价验证面板卡片 (固定在右侧墙壁旁) ── */}
        <g transform={`translate(${wallX - 90}, ${canvasSize.height * 0.58})`}>
          {/* 毛玻璃卡片背景 */}
          <rect width={90} height={85} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={colors.neutral[200]} strokeWidth={0.8} />

          <g transform="translate(0, 65)">
            <line x1={8} y1={0} x2={82} y2={0} stroke={colors.neutral[400]} strokeWidth={0.8} />

            {/* 柱 1：力做的功 W (做功绿) */}
            <rect
              x={14}
              y={-barW_H}
              width={16}
              height={Math.max(barW_H, 0.5)}
              fill={PHYSICS_COLORS.work}
              opacity={0.85}
              rx={0.5}
            />
            <text x={22} y={-barW_H - 4} fontSize={8.2} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
              {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
            </text>
            <text x={22} y={12} fontSize={8.2} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
              {mode === 0 ? 'W重' : 'W弹'}
            </text>

            {/* 柱 2：势能减少量 -ΔEp (势能紫) */}
            <rect
              x={60}
              y={-barDeltaEp_H}
              width={16}
              height={Math.max(barDeltaEp_H, 0.5)}
              fill={PHYSICS_COLORS.potentialEnergy}
              opacity={0.85}
              rx={0.5}
            />
            <text x={68} y={-barDeltaEp_H - 4} fontSize={8.2} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="bold">
              {-deltaEp >= 0 ? '+' : ''}{-deltaEp.toFixed(1)}J
            </text>
            <text x={68} y={12} fontSize={8.2} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="semibold">
              -ΔEp
            </text>

            {/* 等号 '=' */}
            <text x={45} y={-18} fontSize={12} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
              =
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}
