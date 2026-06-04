import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import { calculateFreeFall } from '@/physics'

/** 时间切片颜色序列 */
const TIME_SLICE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.compareB,
  CHART_COLORS.compareC,
  CHART_COLORS.criticalPt,
] as const

const TIME_SLICE_RATIOS = [1, 3, 5, 7] as const

/** 频闪间隔 */
const FLASH_INTERVAL = 0.1

/** 固定参考时长（秒），用于决定"填满舞台"的落地时间 */
const TARGET_FALL_TIME = 2.0

/** 空气阻力计算（欧拉法） */
function calcFreeFallWithDrag(
  v0: number,
  g: number,
  dragK: number,
  mass: number,
  t: number,
  dt = 0.001
): { v: number; y: number } {
  if (dragK === 0) return calculateFreeFall(v0, g, t)
  let v = v0
  let y = 0
  let ct = 0
  while (ct < t) {
    const step = Math.min(dt, t - ct)
    const a = g - (dragK * v * Math.abs(v)) / mass
    v += a * step
    y += v * step
    ct += step
  }
  return { v, y }
}

/** 计算落地时间（有阻力时用数值逼近） */
function calcGroundTime(
  v0: number,
  g: number,
  dragK: number,
  mass: number,
  maxFallHeight: number
): number {
  if (dragK === 0) {
    const disc = v0 * v0 + 2 * g * maxFallHeight
    return g > 0 ? (-v0 + Math.sqrt(disc)) / g : Infinity
  }
  // 数值求解
  let v = v0
  let y = 0
  const dt = 0.001
  let t = 0
  while (t < 30) {
    const a = g - (dragK * v * Math.abs(v)) / mass
    v += a * dt
    y += v * dt
    t += dt
    if (y >= maxFallHeight) return t
  }
  return Infinity
}

export default function FreeFallAnimation() {
  const { params, time, showVectors, showGrid, showTimeSlices, showDualObjects, setIsPlaying } = useAnimationStore()
  const { discoveryStep } = useAppStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })

  const { v0 = 0, g = 9.8, dragK = 0 } = params
  const m2 = params.m2 ?? 0.003 // 羽毛质量（kg）
  const m1 = 0.5 // 铁球质量（kg）

  // ── 双物体标志（仅由 showDualObjects 控制，与 dragK 无关）───
  const isDual = showDualObjects

  // ── 布局分区 ────────────────────────────────────────────────
  const stageRatio = isDual ? 0.55 : 0.45
  const stageWidth = canvasSize.width * stageRatio
  const gapWidth = canvasSize.width * 0.02
  const dataX = stageWidth + gapWidth
  const dataWidth = canvasSize.width - dataX

  // ── 动画舞台（左侧）───────────────────────────────────────────
  const originY = canvasSize.height * 0.08
  const groundY = canvasSize.height * 0.88
  const stageHeight = groundY - originY

  // ── 动态 scale ──────────────────────────────────────────────
  const maxFallHeight = useMemo(
    () => 0.5 * g * TARGET_FALL_TIME * TARGET_FALL_TIME,
    [g]
  )
  const scale = useMemo(
    () => (maxFallHeight > 0 ? stageHeight / maxFallHeight : 25),
    [maxFallHeight, stageHeight]
  )

  // ── 物体X位置 ──────────────────────────────────────────────
  const ballX = isDual ? stageWidth * 0.35 : stageWidth * 0.5
  const featherX = stageWidth * 0.65

  // ── 铁球物理 ────────────────────────────────────────────────
  const groundTime1 = calcGroundTime(v0, g, 0, m1, maxFallHeight)
  const effectiveTime1 = Math.min(time, groundTime1)
  const { v: displayV1, y: displayY1 } = calculateFreeFall(v0, g, effectiveTime1)
  const isLanded1 = time >= groundTime1 && groundTime1 !== Infinity
  const effectiveV1 = isLanded1 ? 0 : displayV1
  const effectiveY1 = Math.min(displayY1, maxFallHeight)
  const currentY1 = originY + effectiveY1 * scale

  // ── 羽毛物理（有阻力）────────────────────────────────────────
  const groundTime2 = isDual ? calcGroundTime(v0, g, dragK, m2, maxFallHeight) : Infinity
  const effectiveTime2 = Math.min(time, groundTime2)
  const dragResult2 = isDual ? calcFreeFallWithDrag(v0, g, dragK, m2, effectiveTime2) : { v: 0, y: 0 }
  const isLanded2 = isDual && time >= groundTime2 && groundTime2 !== Infinity
  const effectiveV2 = isLanded2 ? 0 : dragResult2.v
  const effectiveY2 = isDual ? Math.min(dragResult2.y, maxFallHeight) : 0
  const currentY2 = originY + effectiveY2 * scale

  // ── 整体落地判断（铁球落地即停止）────────────────────────────
  const isLanded = isLanded1
  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // ── v-t 图动态轴范围 ──────────────────────────────────────
  const { vtVMax, vtTickStep, xMax } = useMemo(() => {
    const effectiveXMax = Math.max(Math.min(groundTime1 * 1.2, 8), 2)
    const clampedXMax = Math.round(effectiveXMax * 10) / 10
    const maxV = Math.max(v0 + g * clampedXMax, 10) * 1.2
    let vMax: number
    let tickStep: number
    if (maxV <= 10) { vMax = 10; tickStep = 2 }
    else if (maxV <= 20) { vMax = 20; tickStep = 5 }
    else if (maxV <= 50) { vMax = Math.ceil(maxV / 10) * 10; tickStep = 10 }
    else { vMax = Math.ceil(maxV / 20) * 20; tickStep = 20 }
    return { vtVMax: vMax, vtTickStep: tickStep, xMax: clampedXMax }
  }, [v0, g, groundTime1])

  // ── v-t 图布局 ────────────────────────────────────────────
  const vtChartTop = canvasSize.height * 0.03
  const vtChartHeight = canvasSize.height * 0.62
  const vtInnerPad = { left: 50, right: 40, top: 35, bottom: 40 }
  const vtInnerW = dataWidth - vtInnerPad.left - vtInnerPad.right
  const vtInnerH = vtChartHeight - vtInnerPad.top - vtInnerPad.bottom

  const vtToX = (t: number) => vtInnerPad.left + (t / xMax) * vtInnerW
  const vtToY = (v: number) => {
    const clampedV = Math.max(0, Math.min(v, vtVMax))
    return vtInnerPad.top + vtInnerH - (clampedV / vtVMax) * vtInnerH
  }

  const yticks = useMemo(() => {
    const ticks = []
    for (let v = 0; v <= vtVMax; v += vtTickStep) ticks.push(v)
    return ticks
  }, [vtVMax, vtTickStep])

  const xticks = useMemo(() => {
    const ticks = []
    const step = xMax <= 4 ? 1 : (xMax <= 8 ? 2 : 3)
    for (let t = 0; t <= xMax + 0.01; t += step) ticks.push(parseFloat(t.toFixed(1)))
    return ticks
  }, [xMax])

  // ── v-t 曲线（铁球）───────────────────────────────────────
  const activeTime = Math.min(time, xMax)
  const vtPoints1 = useMemo(() => {
    const pts: string[] = []
    for (let t = 0; t <= activeTime + 0.01; t += 0.05) {
      const { v } = calculateFreeFall(v0, g, t)
      pts.push(`${vtToX(t)},${vtToY(v)}`)
    }
    return pts
  }, [v0, g, activeTime])
  const vtPathD1 = vtPoints1.length >= 2 ? `M ${vtPoints1.join(' L ')}` : ''

  const vtAreaPathD1 = useMemo(() => {
    if (!vtPathD1) return ''
    return `${vtPathD1} L ${vtToX(activeTime)},${vtToY(0)} L ${vtToX(0)},${vtToY(0)} Z`
  }, [vtPathD1, activeTime])

  // ── v-t 曲线（羽毛，有阻力时）────────────────────────────
  const vtPoints2 = useMemo(() => {
    if (!isDual) return []
    const pts: string[] = []
    // 落地后速度截断为 0
    const effectiveMaxT = isLanded2 ? Math.min(groundTime2, activeTime) : activeTime
    for (let t = 0; t <= effectiveMaxT + 0.01; t += 0.05) {
      const { v } = calcFreeFallWithDrag(v0, g, dragK, m2, t)
      pts.push(`${vtToX(t)},${vtToY(v)}`)
    }
    // 落地后添加水平零速线段
    if (isLanded2 && activeTime > groundTime2) {
      pts.push(`${vtToX(groundTime2)},${vtToY(0)},${vtToX(activeTime)},${vtToY(0)}`)
    }
    return pts
  }, [isDual, v0, g, dragK, m2, activeTime, groundTime2, isLanded2])
  const vtPathD2 = vtPoints2.length >= 2 ? `M ${vtPoints2.join(' L ')}` : ''

  // ── 频闪点 ──────────────────────────────────────────────────
  const flashPoints1 = useMemo(() => {
    const points: Array<{ t: number; v: number; y: number }> = []
    const maxT = isLanded ? groundTime1 : Math.min(time, groundTime1)
    const count = Math.min(Math.floor(maxT / FLASH_INTERVAL), 20)
    for (let i = 0; i <= count; i++) {
      const t = i * FLASH_INTERVAL
      const { v, y } = calculateFreeFall(v0, g, t)
      points.push({ t, v, y })
    }
    return points
  }, [v0, g, time, groundTime1, isLanded])

  const flashPoints2 = useMemo(() => {
    if (!isDual) return []
    const points: Array<{ t: number; v: number; y: number }> = []
    const maxT = isLanded2 ? groundTime2 : Math.min(time, groundTime2)
    const count = Math.min(Math.floor(maxT / FLASH_INTERVAL), 20)
    for (let i = 0; i <= count; i++) {
      const t = i * FLASH_INTERVAL
      const { v, y } = calcFreeFallWithDrag(v0, g, dragK, m2, t)
      points.push({ t, v, y })
    }
    return points
  }, [isDual, v0, g, dragK, m2, time, groundTime2, isLanded2])

  // ── 时间切片 ────────────────────────────────────────────────
  const timeSliceBlocks = useMemo(() => {
    if (!showTimeSlices || isDual) return []
    const blocks: Array<{ y: number; height: number; ratio: number; color: string; displacement: number }> = []
    const sliceTime = groundTime1 < Infinity ? groundTime1 / 4 : TARGET_FALL_TIME / 4
    for (let i = 0; i < 4; i++) {
      const t1 = i * sliceTime
      const t2 = (i + 1) * sliceTime
      const { y: y1 } = calculateFreeFall(v0, g, t1)
      const { y: y2 } = calculateFreeFall(v0, g, t2)
      const dy = y2 - y1
      blocks.push({
        y: originY + y1 * scale,
        height: dy * scale,
        ratio: TIME_SLICE_RATIOS[i],
        color: TIME_SLICE_COLORS[i],
        displacement: dy,
      })
    }
    return blocks
  }, [v0, g, groundTime1, showTimeSlices, isDual, originY, scale])

  // ── 网格线 ──────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    if (!showGrid || showTimeSlices) return []
    const lines = []
    for (let i = 1; i <= 10; i++) {
      const yPos = originY + (i * stageHeight) / 10
      lines.push(
        <line key={`grid-h-${i}`} x1={40} y1={yPos} x2={stageWidth - 40} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid}
          strokeDasharray={DASH.reference.join(' ')} />
      )
    }
    return lines
  }, [showGrid, showTimeSlices, originY, stageHeight, stageWidth])

  // ── 频闪圆 ──────────────────────────────────────────────────
  const flashCircles1 = useMemo(() => {
    if (!showGrid || showTimeSlices) return []
    return flashPoints1.map((pt, i) => {
      const cy = originY + Math.min(pt.y, maxFallHeight) * scale
      const opacity = flashPoints1.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (flashPoints1.length - 1))
      return <circle key={`flash1-${i}`} cx={ballX} cy={Math.min(cy, groundY - 12)} r={4}
        fill={PHYSICS_COLORS.referencePoint} opacity={opacity} />
    })
  }, [showGrid, showTimeSlices, flashPoints1, originY, maxFallHeight, scale, ballX, groundY])

  const flashCircles2 = useMemo(() => {
    if (!showGrid || showTimeSlices || !isDual) return []
    return flashPoints2.map((pt, i) => {
      const cy = originY + Math.min(pt.y, maxFallHeight) * scale
      const opacity = flashPoints2.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (flashPoints2.length - 1))
      return <circle key={`flash2-${i}`} cx={featherX} cy={Math.min(cy, groundY - 12)} r={3}
        fill={CHART_COLORS.compareB} opacity={opacity * 0.7} />
    })
  }, [showGrid, showTimeSlices, isDual, flashPoints2, originY, maxFallHeight, scale, featherX, groundY])

  // ── 推导区 ──────────────────────────────────────────────────
  const derivationY = vtChartTop + vtChartHeight + 8

  // ── 渲染 ────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* ========== 左侧动画舞台 ========== */}
        {gridLines}
        {timeSliceBlocks.map((block, i) => (
          <g key={`slice-${i}`}>
            <rect x={ballX - 24} y={block.y} width={48} height={block.height}
              fill={block.color} opacity={0.12} stroke={block.color}
              strokeWidth={STROKE.reference} strokeOpacity={0.5} rx={2} />
            <text x={ballX + 32} y={block.y + block.height / 2 + 4}
              fontSize={FONT.small} fill={block.color} fontWeight="bold" textAnchor="middle">{block.ratio}</text>
            <text x={ballX + 32} y={block.y + block.height / 2 + 16}
              fontSize={9} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{block.displacement.toFixed(2)}m</text>
          </g>
        ))}

        {/* 牛顿管玻璃管轮廓 */}
        {isDual && (
          <g>
            <rect x={stageWidth * 0.1} y={originY - 25} width={stageWidth * 0.8} height={groundY - originY + 40}
              fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.axis} strokeDasharray={DASH.reference.join(' ')}
              rx={8} opacity={0.4} />
            <text x={stageWidth * 0.5} y={originY - 30} fontSize={FONT.axis}
              fill={dragK === 0 ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.labelText} textAnchor="middle" opacity={0.6}>
              牛顿管 {dragK === 0 ? '（真空）' : `（k=${dragK}）`}
            </text>
            <text x={ballX} y={originY - 30} fontSize={9}
              fill={PHYSICS_COLORS.velocity} textAnchor="middle">铁球</text>
            <text x={featherX} y={originY - 30} fontSize={9}
              fill={CHART_COLORS.compareB} textAnchor="middle">羽毛</text>
          </g>
        )}

        {/* 频闪点 */}
        {flashCircles1}
        {flashCircles2}

        {/* 地面线 */}
        <line x1={40} y1={groundY} x2={stageWidth - 40} y2={groundY}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* y=0 释放线 */}
        <line x1={ballX} y1={originY - 20} x2={ballX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} />
        {isDual && (
          <line x1={featherX} y1={originY - 20} x2={featherX} y2={groundY + 20}
            stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} opacity={0.5} />
        )}

        {/* 标注 */}
        <text x={25} y={originY - 5} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">y=0</text>
        <text x={25} y={groundY + 15} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">y=h</text>

        {/* 铁球 */}
        <circle cx={ballX} cy={Math.min(currentY1, groundY - 12)} r={14}
          fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={STROKE.objectLine} />

        {/* 羽毛（菱形表示） */}
        {isDual && (
          <polygon
            points={`${featherX},${Math.min(currentY2, groundY - 12) - 10} ${featherX + 8},${Math.min(currentY2, groundY - 12)} ${featherX},${Math.min(currentY2, groundY - 12) + 10} ${featherX - 8},${Math.min(currentY2, groundY - 12)}`}
            fill="#F59E0B20" stroke={CHART_COLORS.compareB} strokeWidth={STROKE.objectLine} />
        )}

        {/* 速度矢量 - 铁球 */}
        {showVectors && !isLanded1 && effectiveV1 > 0.5 && (
          <g>
            <line x1={ballX + 18} y1={Math.min(currentY1, groundY - 12)}
              x2={ballX + 18} y2={Math.min(currentY1 + effectiveV1 * 6, groundY - 5)}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-freefall-v)" />
            <text x={ballX + 30} y={Math.min(currentY1 + effectiveV1 * 3, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 速度矢量 - 羽毛 */}
        {isDual && showVectors && effectiveV2 > 0.5 && (
          <g>
            <line x1={featherX + 14} y1={Math.min(currentY2, groundY - 12)}
              x2={featherX + 14} y2={Math.min(currentY2 + effectiveV2 * 6, groundY - 5)}
              stroke={CHART_COLORS.compareB} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-freefall-feather)" />
            <text x={featherX + 26} y={Math.min(currentY2 + effectiveV2 * 3, groundY - 10)}
              fontSize={FONT.small} fill={CHART_COLORS.compareB} fontWeight="bold">v'</text>
          </g>
        )}

        {/* 重力加速度矢量 - 铁球 */}
        {showVectors && !isLanded1 && (
          <g>
            <line x1={ballX - 28} y1={Math.min(currentY1, groundY - 12)}
              x2={ballX - 28} y2={Math.min(currentY1 + 45, groundY - 5)}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-freefall-g)" />
            <text x={ballX - 40} y={Math.min(currentY1 + 22, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">g</text>
          </g>
        )}

        {/* 重力加速度矢量 - 羽毛 */}
        {isDual && showVectors && !isLanded2 && (
          <g>
            <line x1={featherX - 28} y1={Math.min(currentY2, groundY - 12)}
              x2={featherX - 28} y2={Math.min(currentY2 + 45, groundY - 5)}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-freefall-g)" />
            <text x={featherX - 40} y={Math.min(currentY2 + 22, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">g</text>
          </g>
        )}

        {/* 落地标注 */}
        {isLanded1 && (
          <text x={ballX} y={groundY - 40} fontSize={FONT.small} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">铁球落地</text>
        )}
        {isDual && isLanded2 && (
          <text x={featherX} y={groundY - 40} fontSize={FONT.small} fill={CHART_COLORS.compareB} textAnchor="middle" fontWeight="bold">羽毛落地</text>
        )}

        {/* ========== 右侧数据/图表区 ========== */}

        {/* 频闪数据表格 */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={canvasSize.height * 0.32} fill="white" stroke={CHART_COLORS.gridLine} rx={4} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            频闪数据记录表
          </text>

          {/* 表头 */}
          <rect y={24} width={dataWidth} height={18} fill={CHART_COLORS.gridLine} opacity={0.15} />
          <line x1={0} y1={42} x2={dataWidth} y2={42} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <text x={dataWidth * 0.15} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">t(s)</text>
          <text x={dataWidth * 0.5} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            {isDual ? 'v球(m/s)' : 'v(m/s)'}
          </text>
          <text x={dataWidth * 0.85} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">y(m)</text>

          {/* 数据行 */}
          {flashPoints1.map((pt, i) => {
            const isCurrent = i === flashPoints1.length - 1
            const availableH = canvasSize.height * 0.32 - 55
            const maxRows = Math.min(flashPoints1.length, Math.floor(availableH / 16))
            const displayPoints = flashPoints1.slice(-maxRows)
            if (!displayPoints.includes(pt)) return null
            const idx = displayPoints.indexOf(pt)
            const rowY = 50 + idx * 16
            return (
              <g key={`row-${i}`}>
                {isCurrent && <rect x={0} y={rowY - 12} width={dataWidth} height={18} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />}
                <text x={dataWidth * 0.15} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.t.toFixed(1)}</text>
                <text x={dataWidth * 0.5} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.v.toFixed(2)}</text>
                <text x={dataWidth * 0.85} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.y.toFixed(3)}</text>
                <line x1={0} y1={rowY + 4} x2={dataWidth} y2={rowY + 4} stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.chartRef} />
              </g>
            )
          })}
        </g>

        {/* v-t 图 */}
        <g transform={`translate(${dataX}, ${vtChartTop + canvasSize.height * 0.32 + 12})`}>
          <rect width={dataWidth} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={20} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            速度－时间图像 (v-t 图)
          </text>

          {/* 图例（双物体时） */}
          {isDual && (
            <g>
              <line x1={dataWidth - 110} y1={14} x2={dataWidth - 95} y2={14}
                stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
              <text x={dataWidth - 90} y={17} fontSize={9} fill={CHART_COLORS.labelText}>铁球</text>
              <line x1={dataWidth - 58} y1={14} x2={dataWidth - 43} y2={14}
                stroke={CHART_COLORS.compareB} strokeWidth={STROKE.chartMain} />
              <text x={dataWidth - 38} y={17} fontSize={9} fill={CHART_COLORS.labelText}>羽毛</text>
            </g>
          )}

          {/* 坐标轴 */}
          <line x1={vtInnerPad.left} y1={vtInnerPad.top} x2={vtInnerPad.left} y2={vtInnerPad.top + vtInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={vtInnerPad.left} y1={vtToY(0)} x2={vtInnerPad.left + vtInnerW} y2={vtToY(0)}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

          {/* X 刻度 */}
          {xticks.map(t => (
            <g key={`xt-${t}`}>
              <line x1={vtToX(t)} y1={vtToY(0) - 4} x2={vtToX(t)} y2={vtToY(0) + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtToX(t)} y={vtToY(0) + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {/* Y 刻度 */}
          {yticks.map(v => (
            <g key={`yt-${v}`}>
              <line x1={vtInnerPad.left - 4} y1={vtToY(v)} x2={vtInnerPad.left} y2={vtToY(v)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtInnerPad.left - 8} y={vtToY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
            </g>
          ))}

          {/* 轴标签 */}
          <text x={vtInnerPad.left + vtInnerW / 2} y={vtInnerPad.top + vtInnerH + 28}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={vtInnerPad.left - 28} y={vtInnerPad.top + vtInnerH / 2}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${vtInnerPad.left - 28}, ${vtInnerPad.top + vtInnerH / 2})`}>v/(m·s⁻¹)</text>

          {/* 面积填充（discoveryStep >= 3，仅铁球） */}
          {(discoveryStep ?? 0) >= 3 && vtAreaPathD1 && (
            <path d={vtAreaPathD1} fill={VT_CHART_COLORS.areaShade} opacity={0.2} />
          )}

          {/* v-t 曲线 - 铁球 */}
          {vtPathD1 && (
            <path d={vtPathD1} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
          )}

          {/* v-t 曲线 - 羽毛 */}
          {vtPathD2 && (
            <path d={vtPathD2} fill="none" stroke={CHART_COLORS.compareB} strokeWidth={STROKE.chartMain} />
          )}
        </g>

        {/* 推导区 */}
        <g transform={`translate(${dataX}, ${derivationY})`}>
          {discoveryStep === 1 && (
            <g>
              <rect width={dataWidth} height={45} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={16} y={18} fontSize={11} fill={CHART_COLORS.labelText} fontWeight="bold">规律发现</text>
              <text x={16} y={38} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">
                Δv/Δt = {g.toFixed(1)} m/s² = g
              </text>
            </g>
          )}
          {discoveryStep === 2 && (
            <g>
              <rect width={dataWidth} height={45} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={16} y={18} fontSize={11} fill={CHART_COLORS.labelText} fontWeight="bold">速度公式</text>
              <text x={16} y={38} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">
                v = v₀ + gt = {effectiveV1.toFixed(2)} m/s
              </text>
            </g>
          )}
          {discoveryStep === 3 && (
            <g>
              <rect width={dataWidth} height={45} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={16} y={18} fontSize={11} fill={CHART_COLORS.labelText} fontWeight="bold">位移公式</text>
              <text x={16} y={38} fontSize={FONT.label} fill={PHYSICS_COLORS.displacement} fontFamily="monospace">
                y = ½gt² = {effectiveY1.toFixed(3)} m
              </text>
            </g>
          )}
          {discoveryStep === 4 && (
            <g>
              <rect width={dataWidth} height={45} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={16} y={18} fontSize={11} fill={CHART_COLORS.labelText} fontWeight="bold">Δy = gT² 验证</text>
              <text x={16} y={38} fontSize={FONT.label} fill={VT_CHART_COLORS.velocityCurve} fontWeight="bold" fontFamily="monospace">
                Δy ≈ {(g * FLASH_INTERVAL * FLASH_INTERVAL).toFixed(3)} m ✓
              </text>
            </g>
          )}
        </g>

        {/* Arrow markers */}
        <defs>
          <marker id="arrow-freefall-v" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-freefall-g" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrow-freefall-feather" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={CHART_COLORS.compareB} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
