import { useCanvasSize } from '@/utils'
import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { precomputeVerticalThrowTrajectory } from '@/physics/kinematics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  CANVAS_STYLE,
} from '@/theme/physics'

/** 最高点定格检测阈值 (m/s) */
const PEAK_THRESHOLD = 0.3

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

export default function VerticalThrowAnimation() {
  const { params, time, isPlaying, showVectors, showGrid, setIsPlaying, setTime } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })

  const { v0 = 15, g = 9.8, advancedMode = 0, sliceDensity = 0, airResistance = 0, targetHeight = 0 } = params

  // ── 预计算完整轨迹（一次性）──────────────────────────────
  const trajectory = useMemo(
    () => precomputeVerticalThrowTrajectory(v0, g, airResistance),
    [v0, g, airResistance]
  )

  const { peakTime: maxHeightTime, landTime: totalTime, maxHeight } = trajectory

  // ── 从预计算轨迹插值 ─────────────────────────────────────
  const interpolateTrajectory = useCallback(
    (t: number): { v: number; y: number } => {
      if (t <= 0) return { v: v0, y: 0 }
      if (t >= totalTime) return { v: 0, y: 0 }
      const dt = trajectory.points[1]?.t ?? 0.02
      const idx = Math.floor(t / dt)
      const p1 = trajectory.points[Math.min(idx, trajectory.points.length - 1)]
      const p2 = trajectory.points[Math.min(idx + 1, trajectory.points.length - 1)]
      if (p1.t === p2.t) return { v: p1.v, y: p1.y }
      const frac = (t - p1.t) / (p2.t - p1.t)
      return {
        v: p1.v + (p2.v - p1.v) * frac,
        y: p1.y + (p2.y - p1.y) * frac,
      }
    },
    [v0, totalTime, trajectory]
  )

  // ── 布局分区 ──────────────────────────────────────────────
  const stageRatio = 0.42
  const gapWidth = canvasSize.width * 0.02
  const stageWidth = canvasSize.width * stageRatio
  const dataX = stageWidth + gapWidth
  const dataWidth = canvasSize.width - dataX

  // ── 物理舞台（左侧）──────────────────────────────────────
  const originY = canvasSize.height * 0.08
  const groundY = canvasSize.height * 0.88
  const stageHeight = groundY - originY
  const ballX = stageWidth * 0.5

  // ── 动态 scale ───────────────────────────────────────────
  const displayMaxHeight = Math.max(maxHeight, 1)
  const scale = stageHeight / displayMaxHeight

  // ── 物理计算 ──────────────────────────────────────────────
  const isLanded = time >= totalTime && totalTime > 0
  const effectiveTime = isLanded ? totalTime : Math.max(time, 0)

  // 从预计算轨迹获取当前状态
  const { effectiveV, effectiveY } = useMemo(() => {
    if (airResistance > 0) {
      const { v, y } = interpolateTrajectory(effectiveTime)
      return { effectiveV: v, effectiveY: Math.max(y, 0) }
    }
    const v = v0 - g * effectiveTime
    const y = v0 * effectiveTime - 0.5 * g * effectiveTime * effectiveTime
    return { effectiveV: v, effectiveY: Math.max(y, 0) }
  }, [v0, g, airResistance, effectiveTime, interpolateTrajectory])

  const clampedY = Math.max(effectiveY, 0)
  const currentBallY = originY + (displayMaxHeight - clampedY) * scale

  // ── 最高点定格检测 ────────────────────────────────────────
  const isAtPeak = !isLanded && Math.abs(effectiveV) < PEAK_THRESHOLD && effectiveTime > 0.05

  // ── 落地自动暂停 ─────────────────────────────────────────
  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // ── 最高点自动暂停（仅首次经过时触发）────────────────────
  const hasPausedAtPeakRef = useRef(false)
  useEffect(() => {
    if (isAtPeak && isPlaying && !hasPausedAtPeakRef.current) {
      setIsPlaying(false)
      hasPausedAtPeakRef.current = true
    }
    if (!isAtPeak) {
      hasPausedAtPeakRef.current = false
    }
  }, [isAtPeak, isPlaying, setIsPlaying])

  // ── v-t 图布局 ────────────────────────────────────────────
  const vtChartTop = canvasSize.height * 0.02
  const vtChartHeight = canvasSize.height * 0.52
  const vtInnerPad = { left: 45, right: 30, top: 30, bottom: 35 }
  const vtInnerW = dataWidth - vtInnerPad.left - vtInnerPad.right
  const vtInnerH = vtChartHeight - vtInnerPad.top - vtInnerPad.bottom

  // v-t 图轴范围
  const { vtVMax, vtTickStep, xMax } = useMemo(() => {
    const vMax = Math.max(v0 * 1.15, 5)
    const clampedXMax = Math.max(Math.min(totalTime * 1.15, 10), 2)
    let tickStep: number
    if (vMax <= 5) tickStep = 1
    else if (vMax <= 10) tickStep = 2
    else if (vMax <= 20) tickStep = 5
    else tickStep = 10
    return { vtVMax: vMax, vtTickStep: tickStep, xMax: clampedXMax }
  }, [v0, totalTime, vtInnerH])

  const vtToX = (t: number) => vtInnerPad.left + (t / xMax) * vtInnerW
  const vtToY = (v: number) => {
    const clampedV = Math.max(-vtVMax, Math.min(v, vtVMax))
    return vtInnerPad.top + ((vtVMax - clampedV) / (2 * vtVMax)) * vtInnerH
  }

  // ── y-t 图布局 ────────────────────────────────────────────
  const ytChartTop = vtChartTop + vtChartHeight + canvasSize.height * 0.04
  const ytChartHeight = canvasSize.height - ytChartTop - canvasSize.height * 0.04
  const ytInnerPad = { left: 45, right: 30, top: 25, bottom: 35 }
  const ytInnerW = dataWidth - ytInnerPad.left - ytInnerPad.right
  const ytInnerH = ytChartHeight - ytInnerPad.top - ytInnerPad.bottom

  const { ytYMax, ytTickStep } = useMemo(() => {
    const yMax = Math.max(maxHeight * 1.15, 5)
    let tickStep: number
    if (yMax <= 5) tickStep = 1
    else if (yMax <= 10) tickStep = 2
    else if (yMax <= 20) tickStep = 5
    else tickStep = 10
    return { ytYMax: yMax, ytTickStep: tickStep }
  }, [maxHeight])

  const ytToX = (t: number) => ytInnerPad.left + (t / xMax) * ytInnerW
  const ytToY = (y: number) => {
    const clampedY = Math.max(0, Math.min(y, ytYMax))
    return ytInnerPad.top + ytInnerH - (clampedY / ytYMax) * ytInnerH
  }

  // ── 刻度 ──────────────────────────────────────────────────
  const vtYTicks = useMemo(() => {
    const ticks: number[] = []
    for (let v = -vtVMax; v <= vtVMax + 0.01; v += vtTickStep) {
      ticks.push(parseFloat(v.toFixed(1)))
    }
    return ticks
  }, [vtVMax, vtTickStep])

  const xticks = useMemo(() => {
    const ticks: number[] = []
    const step = xMax <= 3 ? 0.5 : xMax <= 6 ? 1 : 2
    for (let t = 0; t <= xMax + 0.01; t += step) {
      ticks.push(parseFloat(t.toFixed(1)))
    }
    return ticks
  }, [xMax])

  const ytYTicks = useMemo(() => {
    const ticks: number[] = []
    for (let y = 0; y <= ytYMax + 0.01; y += ytTickStep) {
      ticks.push(parseFloat(y.toFixed(1)))
    }
    return ticks
  }, [ytYMax, ytTickStep])

  // ── v-t 曲线 ──────────────────────────────────────────────
  const activeTime = Math.min(effectiveTime, xMax)
  const vtPoints = useMemo(() => {
    const pts: string[] = []
    const maxT = Math.min(activeTime + 0.01, xMax)
    for (let t = 0; t <= maxT; t += 0.05) {
      const v = airResistance > 0
        ? interpolateTrajectory(t).v
        : v0 - g * t
      pts.push(`${vtToX(t)},${vtToY(v)}`)
    }
    return pts
  }, [v0, g, airResistance, activeTime, xMax, interpolateTrajectory])
  const vtPathD = vtPoints.length >= 2 ? `M ${vtPoints.join(' L ')}` : ''

  // v-t 正区域面积填充（v>0 部分）—— 普通模式
  const vtPositiveAreaD = useMemo(() => {
    if (!vtPathD) return ''
    const peakT = Math.min(maxHeightTime, activeTime)
    if (peakT <= 0) return ''
    const pts: string[] = []
    for (let t = 0; t <= peakT + 0.01; t += 0.05) {
      const v = airResistance > 0
        ? interpolateTrajectory(t).v
        : v0 - g * t
      pts.push(`${vtToX(t)},${vtToY(Math.max(v, 0))}`)
    }
    pts.push(`${vtToX(peakT)},${vtToY(0)}`)
    pts.push(`${vtToX(0)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [v0, g, airResistance, activeTime, maxHeightTime, interpolateTrajectory])

  // v-t 负区域面积填充（v<0 部分）—— 普通模式
  const vtNegativeAreaD = useMemo(() => {
    if (activeTime <= maxHeightTime) return ''
    const pts: string[] = []
    pts.push(`${vtToX(maxHeightTime)},${vtToY(0)}`)
    const maxT = Math.min(activeTime, xMax)
    for (let t = maxHeightTime; t <= maxT + 0.01; t += 0.05) {
      const v = airResistance > 0
        ? interpolateTrajectory(t).v
        : v0 - g * t
      pts.push(`${vtToX(t)},${vtToY(Math.min(v, 0))}`)
    }
    pts.push(`${vtToX(maxT)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [v0, g, airResistance, activeTime, maxHeightTime, interpolateTrajectory])

  // ── 高级模式：微元切片矩形 ────────────────────────────────
  const sliceRects = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const rects: { x: number; y: number; w: number; h: number; positive: boolean }[] = []
    const dt = sliceDensity
    for (let t = 0; t < activeTime; t += dt) {
      const sliceEnd = Math.min(t + dt, activeTime)
      const v = airResistance > 0
        ? interpolateTrajectory(t).v
        : v0 - g * t
      const x1 = vtToX(t)
      const x2 = vtToX(sliceEnd)
      const y0 = vtToY(0)
      const yV = vtToY(v)
      rects.push({
        x: x1,
        y: v >= 0 ? yV : y0,
        w: x2 - x1,
        h: Math.abs(y0 - yV),
        positive: v >= 0,
      })
    }
    return rects
  }, [advancedMode, sliceDensity, activeTime, v0, g, airResistance, interpolateTrajectory])

  // ── 高级模式：频闪点（微元切片对应的小球位置）─────────────
  const ghostBalls = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const balls: { cy: number }[] = []
    const dt = sliceDensity
    for (let t = 0; t <= activeTime + 0.001; t += dt) {
      const actualT = Math.min(t, activeTime)
      const y = airResistance > 0
        ? interpolateTrajectory(actualT).y
        : v0 * actualT - 0.5 * g * actualT * actualT
      const clampedGhostY = Math.max(y, 0)
      const ghostBallY = originY + (displayMaxHeight - clampedGhostY) * scale
      balls.push({ cy: ghostBallY })
    }
    return balls
  }, [advancedMode, sliceDensity, activeTime, v0, g, airResistance, originY, displayMaxHeight, scale, interpolateTrajectory])

  // ── 高级模式：面积数值 ────────────────────────────────────
  const areaValues = useMemo(() => {
    if (advancedMode !== 1) return null
    const tPeak = Math.min(effectiveTime, maxHeightTime)
    let positiveArea: number
    let negativeArea: number
    if (airResistance > 0) {
      // 从预计算轨迹数值积分
      positiveArea = 0
      negativeArea = 0
      for (const pt of trajectory.points) {
        if (pt.t > effectiveTime) break
        const nextIdx = trajectory.points.findIndex(p => p.t > pt.t)
        const nextPt = nextIdx >= 0 ? trajectory.points[nextIdx] : pt
        const dt = nextPt.t - pt.t
        if (dt <= 0) continue
        const area = pt.v * dt
        if (area > 0) positiveArea += area
        else negativeArea += Math.abs(area)
      }
    } else {
      // 解析解
      positiveArea = v0 * tPeak - 0.5 * g * tPeak * tPeak
      negativeArea = effectiveTime > maxHeightTime
        ? 0.5 * g * (effectiveTime - maxHeightTime) * (effectiveTime - maxHeightTime)
        : 0
    }
    return {
      positive: positiveArea,
      negative: negativeArea,
      net: positiveArea - negativeArea,
    }
  }, [advancedMode, effectiveTime, maxHeightTime, v0, g, airResistance, trajectory])

  // ── 高级模式：目标高度双解 ────────────────────────────────
  const targetHeightIntersections = useMemo(() => {
    if (advancedMode !== 1 || targetHeight <= 0 || targetHeight >= maxHeight) return null
    if (airResistance > 0) {
      // 从预计算轨迹数值法寻找交点
      let t1 = 0
      let t2 = 0
      let foundFirst = false
      for (const pt of trajectory.points) {
        if (pt.y >= targetHeight && !foundFirst) {
          t1 = pt.t
          foundFirst = true
        }
        if (pt.y < targetHeight && foundFirst && pt.t > maxHeightTime) {
          t2 = pt.t
          break
        }
      }
      return foundFirst && t2 > 0 ? { t1, t2 } : null
    }
    // 解析解：v0*t - 0.5*g*t² = targetHeight
    const discriminant = v0 * v0 - 2 * g * targetHeight
    if (discriminant < 0) return null
    const sqrtD = Math.sqrt(discriminant)
    const t1 = (v0 - sqrtD) / g
    const t2 = (v0 + sqrtD) / g
    if (t1 < 0 || t2 < 0) return null
    return { t1, t2 }
  }, [advancedMode, targetHeight, maxHeight, v0, g, airResistance, trajectory, maxHeightTime])

  // ── y-t 曲线 ──────────────────────────────────────────────
  const ytPoints = useMemo(() => {
    const pts: string[] = []
    const maxT = Math.min(activeTime + 0.01, xMax)
    for (let t = 0; t <= maxT; t += 0.05) {
      const y = airResistance > 0
        ? interpolateTrajectory(t).y
        : v0 * t - 0.5 * g * t * t
      pts.push(`${ytToX(t)},${ytToY(Math.max(y, 0))}`)
    }
    return pts
  }, [v0, g, airResistance, activeTime, xMax, interpolateTrajectory])
  const ytPathD = ytPoints.length >= 2 ? `M ${ytPoints.join(' L ')}` : ''

  // y-t 面积填充
  const ytAreaD = useMemo(() => {
    if (!ytPathD) return ''
    return `${ytPathD} L ${ytToX(activeTime)},${ytToY(0)} L ${ytToX(0)},${ytToY(0)} Z`
  }, [ytPathD, activeTime])

  // ── 网格线 ────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    for (let i = 1; i <= 10; i++) {
      const yPos = originY + (i * stageHeight) / 10
      lines.push(
        <line key={`grid-h-${i}`} x1={30} y1={yPos} x2={stageWidth - 20} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid}
          strokeDasharray={DASH.reference.join(' ')} />
      )
    }
    return lines
  }, [showGrid, originY, stageHeight, stageWidth])

  // ── 时间轴拖拽 ────────────────────────────────────────────
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
    // 使用 v-t 图的坐标系来计算时间
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

  // 兼容旧版点击
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

  // ── 渲染 ──────────────────────────────────────────────────
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
          <marker id="arrow-vt-velocity" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-vt-accel" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          {/* 高级模式：正区域交叉线图案 */}
          <pattern id="gridPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0L8 8M8 0L0 8" stroke={VT_CHART_COLORS.areaShade} strokeWidth="0.5" opacity="0.5" />
          </pattern>
          {/* 高级模式：负区域斜线图案 */}
          <pattern id="stripePattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0" stroke={VT_CHART_COLORS.zeroCrossing} strokeWidth="1" opacity="0.5" />
          </pattern>
        </defs>

        {/* ========== 左侧：物理演练区 ========== */}
        {gridLines}

        {/* 地面线 */}
        <line x1={30} y1={groundY} x2={stageWidth - 20} y2={groundY}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* y 轴虚线 */}
        <line x1={ballX} y1={originY - 20} x2={ballX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} />

        {/* 高度刻度标注 */}
        <text x={25} y={originY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">
          {displayMaxHeight.toFixed(1)}m
        </text>
        <text x={25} y={groundY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">0</text>
        <text x={ballX + 15} y={groundY + 15} fontSize={FONT.small} fill={PHYSICS_COLORS.axis}>y=0</text>

        {/* 最高点虚线标注 */}
        <line x1={30} y1={originY} x2={stageWidth - 20} y2={originY}
          stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')} opacity={0.5} />
        <text x={stageWidth - 18} y={originY - 4} fontSize={FONT.small}
          fill={PHYSICS_COLORS.potentialEnergy} textAnchor="end" opacity={0.7}>
          最高点
        </text>

        {/* 高级模式：目标高度虚线 */}
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
              y = {targetHeight}m
            </text>
          </>
        )}

        {/* 高级模式：频闪点（微元切片） */}
        {ghostBalls.map((ball, idx) => (
          <circle key={`ghost-${idx}`} cx={ballX} cy={ball.cy} r={6}
            fill={PHYSICS_COLORS.objectFill} opacity={0.2} />
        ))}

        {/* 小球 */}
        <circle cx={ballX} cy={currentBallY} r={14}
          fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine} />

        {/* 速度矢量（绿色，方向随正负变化） */}
        {showVectors && effectiveV !== 0 && !isLanded && (
          <g>
            <line
              x1={ballX + 18} y1={currentBallY}
              x2={ballX + 18} y2={currentBallY - effectiveV * 4}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-velocity)" />
            <text
              x={ballX + 30} y={currentBallY - effectiveV * 2}
              fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v
            </text>
          </g>
        )}

        {/* 加速度矢量（红色，恒定向下） */}
        {showVectors && !isLanded && (
          <g>
            <line
              x1={ballX - 18} y1={currentBallY}
              x2={ballX - 18} y2={currentBallY + 40}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-accel)" />
            <text
              x={ballX - 30} y={currentBallY + 22}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              g
            </text>
          </g>
        )}

        {/* 最高点定格特效：加速度箭头脉冲 */}
        {isAtPeak && (
          <g>
            <line
              x1={ballX - 18} y1={currentBallY}
              x2={ballX - 18} y2={currentBallY + 40}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-accel)">
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </line>
            <text x={ballX - 30} y={currentBallY + 22}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              g
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </text>
          </g>
        )}

        {/* 落地标注 */}
        {isLanded && (
          <text x={ballX} y={groundY - 30} fontSize={FONT.small} fill={PHYSICS_COLORS.forceNet}
            textAnchor="middle" fontWeight="bold">落地</text>
        )}

        {/* ========== 右侧：v-t 图 ========== */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            速度-时间图像 (v-t 图)
          </text>

          {/* 坐标轴 */}
          <line x1={vtInnerPad.left} y1={vtInnerPad.top} x2={vtInnerPad.left} y2={vtInnerPad.top + vtInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          {/* v=0 零线（加粗高亮） */}
          <line x1={vtInnerPad.left} y1={vtToY(0)} x2={vtInnerPad.left + vtInnerW} y2={vtToY(0)}
            stroke={CHART_COLORS.zeroline} strokeWidth={STROKE.axisBold} />

          {/* X 刻度 */}
          {xticks.map(t => (
            <g key={`vt-xt-${t}`}>
              <line x1={vtToX(t)} y1={vtToY(0) - 4} x2={vtToX(t)} y2={vtToY(0) + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtToX(t)} y={vtToY(0) + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {/* Y 刻度 */}
          {vtYTicks.map(v => (
            <g key={`vt-yt-${v}`}>
              <line x1={vtInnerPad.left - 4} y1={vtToY(v)} x2={vtInnerPad.left} y2={vtToY(v)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtInnerPad.left - 8} y={vtToY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
            </g>
          ))}

          {/* 轴标签 */}
          <text x={vtInnerPad.left + vtInnerW / 2} y={vtInnerPad.top + vtInnerH + 28}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={vtInnerPad.left - 30} y={vtInnerPad.top + vtInnerH / 2}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${vtInnerPad.left - 30}, ${vtInnerPad.top + vtInnerH / 2})`}>v/(m·s⁻¹)</text>

          {/* 面积填充：根据模式选择切片或平滑 */}
          {advancedMode === 1 && sliceDensity > 0 ? (
            /* 高级模式：微元切片矩形 */
            sliceRects.map((rect, idx) => (
              <rect key={`slice-${idx}`}
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                fill={rect.positive ? 'url(#gridPattern)' : 'url(#stripePattern)'}
                opacity={0.5}
              />
            ))
          ) : (
            <>
              {/* 普通模式：正区域面积填充（浅蓝） */}
              {vtPositiveAreaD && (
                <path d={vtPositiveAreaD} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />
              )}
              {/* 普通模式：负区域面积填充（浅红） */}
              {vtNegativeAreaD && (
                <path d={vtNegativeAreaD} fill={VT_CHART_COLORS.zeroCrossing} opacity={0.12} />
              )}
            </>
          )}

          {/* v-t 曲线 */}
          {vtPathD && (
            <path d={vtPathD} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
          )}

          {/* 最高点穿轴交点闪烁 */}
          {isAtPeak && (
            <g>
              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={6}
                fill={VT_CHART_COLORS.zeroCrossing} opacity={0.6}>
                <animate attributeName="r" values="6;10;6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={3}
                fill={VT_CHART_COLORS.zeroCrossing} />
            </g>
          )}

          {/* 当前状态点 */}
          {!isAtPeak && effectiveTime > 0 && (
            <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={4}
              fill={VT_CHART_COLORS.velocityCurve} />
          )}

          {/* 点击区域（透明覆盖） */}
          <rect x={vtInnerPad.left} y={vtInnerPad.top} width={vtInnerW} height={vtInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'vt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'vt')} />

          {/* 时间悬标线 */}
          {effectiveTime > 0 && (
            <line x1={vtToX(effectiveTime)} y1={vtInnerPad.top}
              x2={vtToX(effectiveTime)} y2={vtInnerPad.top + vtInnerH}
              stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={STROKE.reference}
              strokeDasharray={DASH.tangent.join(' ')} opacity={0.7} />
          )}

          {/* 高级模式：面积数值显示 */}
          {advancedMode === 1 && areaValues && (
            <g>
              <text x={vtInnerPad.left + vtInnerW - 5} y={vtInnerPad.top + 14}
                fontSize={FONT.small} fill={VT_CHART_COLORS.areaShade} textAnchor="end" fontWeight="bold">
                S⁺ = {areaValues.positive.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 5} y={vtInnerPad.top + 26}
                fontSize={FONT.small} fill={VT_CHART_COLORS.zeroCrossing} textAnchor="end" fontWeight="bold">
                S⁻ = {areaValues.negative.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 5} y={vtInnerPad.top + 38}
                fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">
                y = S⁺ - S⁻ = {areaValues.net.toFixed(2)} m
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

          {/* 坐标轴 */}
          <line x1={ytInnerPad.left} y1={ytInnerPad.top} x2={ytInnerPad.left} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={ytInnerPad.left} y1={ytInnerPad.top + ytInnerH} x2={ytInnerPad.left + ytInnerW} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

          {/* X 刻度 */}
          {xticks.map(t => (
            <g key={`yt-xt-${t}`}>
              <line x1={ytToX(t)} y1={ytInnerPad.top + ytInnerH - 4} x2={ytToX(t)} y2={ytInnerPad.top + ytInnerH + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytToX(t)} y={ytInnerPad.top + ytInnerH + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {/* Y 刻度 */}
          {ytYTicks.map(y => (
            <g key={`yt-ytick-${y}`}>
              <line x1={ytInnerPad.left - 4} y1={ytToY(y)} x2={ytInnerPad.left} y2={ytToY(y)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytInnerPad.left - 8} y={ytToY(y) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{y}</text>
            </g>
          ))}

          {/* 轴标签 */}
          <text x={ytInnerPad.left + ytInnerW / 2} y={ytInnerPad.top + ytInnerH + 28}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={ytInnerPad.left - 30} y={ytInnerPad.top + ytInnerH / 2}
            fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${ytInnerPad.left - 30}, ${ytInnerPad.top + ytInnerH / 2})`}>y/m</text>

          {/* 最高点虚线标注 */}
          <line x1={ytInnerPad.left} y1={ytToY(maxHeight)} x2={ytInnerPad.left + ytInnerW} y2={ytToY(maxHeight)}
            stroke={CHART_COLORS.zeroline} strokeWidth={STROKE.reference}
            strokeDasharray={DASH.reference.join(' ')} opacity={0.5} />

          {/* 高级模式：目标高度虚线与交点标注 */}
          {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
            <>
              {/* 目标高度水平虚线 */}
              <line x1={ytInnerPad.left} y1={ytToY(targetHeight)}
                x2={ytInnerPad.left + ytInnerW} y2={ytToY(targetHeight)}
                stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')} opacity={0.7} />
              <text x={ytInnerPad.left + ytInnerW - 3} y={ytToY(targetHeight) - 4}
                fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="end" opacity={0.8}>
                y = {targetHeight}m
              </text>
              {/* 交点竖虚线与标注 */}
              {targetHeightIntersections && (
                <>
                  {/* t₁ 竖虚线 */}
                  <line x1={ytToX(targetHeightIntersections.t1)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t1)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.6} />
                  <text x={ytToX(targetHeightIntersections.t1)} y={ytInnerPad.top + ytInnerH + 28}
                    fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₁={targetHeightIntersections.t1.toFixed(2)}s
                  </text>
                  {/* t₂ 竖虚线 */}
                  <line x1={ytToX(targetHeightIntersections.t2)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t2)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.6} />
                  <text x={ytToX(targetHeightIntersections.t2)} y={ytInnerPad.top + ytInnerH + 28}
                    fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₂={targetHeightIntersections.t2.toFixed(2)}s
                  </text>
                </>
              )}
            </>
          )}

          {/* 面积填充 */}
          {ytAreaD && (
            <path d={ytAreaD} fill={XT_CHART_COLORS.positionCurve} opacity={0.1} />
          )}

          {/* y-t 曲线 */}
          {ytPathD && (
            <path d={ytPathD} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={STROKE.chartMain} />
          )}

          {/* 最高点标注 */}
          {isAtPeak && (
            <g>
              <circle cx={ytToX(maxHeightTime)} cy={ytToY(maxHeight)} r={5}
                fill={CHART_COLORS.highlight} opacity={0.7}>
                <animate attributeName="r" values="5;8;5" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;1;0.7" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* 当前状态点 */}
          {!isAtPeak && effectiveTime > 0 && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedY)} r={4}
              fill={XT_CHART_COLORS.positionCurve} />
          )}

          {/* 点击区域 */}
          <rect x={ytInnerPad.left} y={ytInnerPad.top} width={ytInnerW} height={ytInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'yt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'yt')} />

          {/* 时间悬标线 */}
          {effectiveTime > 0 && (
            <line x1={ytToX(effectiveTime)} y1={ytInnerPad.top}
              x2={ytToX(effectiveTime)} y2={ytInnerPad.top + ytInnerH}
              stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={STROKE.reference}
              strokeDasharray={DASH.tangent.join(' ')} opacity={0.7} />
          )}
        </g>
      </svg>
    </div>
  )
}
