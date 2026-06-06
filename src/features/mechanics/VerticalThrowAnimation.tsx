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

  const { v0 = 15, g = 9.8, advancedMode = 0, sliceDensity = 0, airResistance = 0, targetHeight = 0, showVacuumCompare = 1 } = params

  // ── 预计算完整轨迹（一次性）──────────────────────────────
  const trajectory = useMemo(
    () => precomputeVerticalThrowTrajectory(v0, g, airResistance),
    [v0, g, airResistance]
  )

  const { peakTime: maxHeightTime, landTime: totalTime, maxHeight, landTimeVac, maxHeightVac } = trajectory

  // ── 从预计算轨迹插值 ─────────────────────────────────────
  const interpolatePoints = useCallback(
    (t: number, pts: typeof trajectory.points): { v: number; y: number } => {
      if (t <= 0) return { v: pts[0]?.v ?? v0, y: 0 }
      const lastPt = pts[pts.length - 1]
      if (t >= lastPt.t) return { v: 0, y: 0 }
      const dt = pts[1]?.t - pts[0]?.t || 0.02
      const idx = Math.floor(t / dt)
      const p1 = pts[Math.min(idx, pts.length - 1)]
      const p2 = pts[Math.min(idx + 1, pts.length - 1)]
      if (!p1 || !p2 || p1.t === p2.t) return { v: p1?.v ?? 0, y: p1?.y ?? 0 }
      const frac = (t - p1.t) / (p2.t - p1.t)
      return {
        v: p1.v + (p2.v - p1.v) * frac,
        y: p1.y + (p2.y - p1.y) * frac,
      }
    },
    [v0]
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

  // ── 动态 scale (取两轨最大高度的最大值，避免跳动) ───────────
  const displayMaxHeight = Math.max(maxHeight, maxHeightVac, 1)
  const scale = stageHeight / displayMaxHeight

  // ── 物理计算 ──────────────────────────────────────────────
  const isLanded = time >= totalTime && totalTime > 0
  const effectiveTime = isLanded ? totalTime : Math.max(time, 0)

  // 从预计算轨迹获取当前状态（阻力轨道）
  const { effectiveV, effectiveY } = useMemo(() => {
    const { v, y } = interpolatePoints(effectiveTime, trajectory.points)
    return { effectiveV: v, effectiveY: Math.max(y, 0) }
  }, [effectiveTime, trajectory.points, interpolatePoints])

  // 获取真空轨道状态
  const { vacuumV, vacuumY } = useMemo(() => {
    const { v, y } = interpolatePoints(effectiveTime, trajectory.vacuumPoints)
    return { vacuumV: v, vacuumY: Math.max(y, 0) }
  }, [effectiveTime, trajectory.vacuumPoints, interpolatePoints])

  const clampedY = Math.max(effectiveY, 0)
  const currentBallY = originY + (displayMaxHeight - clampedY) * scale

  const clampedVacuumY = Math.max(vacuumY, 0)
  const currentVacuumBallY = originY + (displayMaxHeight - clampedVacuumY) * scale

  // 是否开启双轨对比模式
  const showDoubleTrack = advancedMode === 1 && airResistance > 0 && showVacuumCompare === 1
  const leftBallX = showDoubleTrack ? ballX - 40 : ballX
  const rightBallX = showDoubleTrack ? ballX + 40 : ballX

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

  const activeTime = Math.min(effectiveTime, xMax)

  // ── v-t 曲线与 y-t 曲线 SVG 路径生成 (包含阻力/真空的完整与当前时段路径) ──
  const vtData = useMemo(() => {
    const activeT = Math.min(effectiveTime, totalTime)
    const activeTVac = Math.min(effectiveTime, landTimeVac)

    const getPointsStr = (pts: typeof trajectory.points, maxT: number) => {
      const result: string[] = []
      for (const pt of pts) {
        if (pt.t > maxT + 1e-5) break
        result.push(`${vtToX(pt.t)},${vtToY(pt.v)}`)
      }
      if (maxT > 0 && maxT < pts[pts.length - 1].t) {
        const { v } = interpolatePoints(maxT, pts)
        result.push(`${vtToX(maxT)},${vtToY(v)}`)
      }
      return result.join(' L ')
    }

    return {
      airFull: `M ${trajectory.points.map(p => `${vtToX(p.t)},${vtToY(p.v)}`).join(' L ')}`,
      airActive: getPointsStr(trajectory.points, activeT) ? `M ${getPointsStr(trajectory.points, activeT)}` : '',
      vacFull: `M ${trajectory.vacuumPoints.map(p => `${vtToX(p.t)},${vtToY(p.v)}`).join(' L ')}`,
      vacActive: getPointsStr(trajectory.vacuumPoints, activeTVac) ? `M ${getPointsStr(trajectory.vacuumPoints, activeTVac)}` : '',
    }
  }, [trajectory, totalTime, landTimeVac, effectiveTime, vtToX, vtToY, interpolatePoints])

  const ytData = useMemo(() => {
    const activeT = Math.min(effectiveTime, totalTime)
    const activeTVac = Math.min(effectiveTime, landTimeVac)

    const getPointsStr = (pts: typeof trajectory.points, maxT: number) => {
      const result: string[] = []
      for (const pt of pts) {
        if (pt.t > maxT + 1e-5) break
        result.push(`${ytToX(pt.t)},${ytToY(pt.y)}`)
      }
      if (maxT > 0 && maxT < pts[pts.length - 1].t) {
        const { y } = interpolatePoints(maxT, pts)
        result.push(`${ytToX(maxT)},${ytToY(y)}`)
      }
      return result.join(' L ')
    }

    return {
      airFull: `M ${trajectory.points.map(p => `${ytToX(p.t)},${ytToY(p.y)}`).join(' L ')}`,
      airActive: getPointsStr(trajectory.points, activeT) ? `M ${getPointsStr(trajectory.points, activeT)}` : '',
      vacFull: `M ${trajectory.vacuumPoints.map(p => `${ytToX(p.t)},${ytToY(p.y)}`).join(' L ')}`,
      vacActive: getPointsStr(trajectory.vacuumPoints, activeTVac) ? `M ${getPointsStr(trajectory.vacuumPoints, activeTVac)}` : '',
    }
  }, [trajectory, totalTime, landTimeVac, effectiveTime, ytToX, ytToY, interpolatePoints])

  // v-t 正区域面积填充（v>0 部分）—— 普通模式
  const vtPositiveAreaD = useMemo(() => {
    const peakT = Math.min(maxHeightTime, effectiveTime)
    if (peakT <= 0) return ''
    const pts: string[] = []
    for (const pt of trajectory.points) {
      if (pt.t > peakT + 1e-5) break
      pts.push(`${vtToX(pt.t)},${vtToY(Math.max(pt.v, 0))}`)
    }
    pts.push(`${vtToX(peakT)},${vtToY(0)}`)
    pts.push(`${vtToX(0)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [trajectory.points, maxHeightTime, effectiveTime, vtToX, vtToY])

  // v-t 负区域面积填充（v<0 部分）—— 普通模式
  const vtNegativeAreaD = useMemo(() => {
    if (effectiveTime <= maxHeightTime) return ''
    const pts: string[] = []
    pts.push(`${vtToX(maxHeightTime)},${vtToY(0)}`)
    const activeT = Math.min(effectiveTime, totalTime)
    for (const pt of trajectory.points) {
      if (pt.t < maxHeightTime) continue
      if (pt.t > activeT + 1e-5) break
      pts.push(`${vtToX(pt.t)},${vtToY(Math.min(pt.v, 0))}`)
    }
    pts.push(`${vtToX(activeT)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [trajectory.points, maxHeightTime, effectiveTime, totalTime, vtToX, vtToY])

  // ── 高级模式：微元切片矩形 ────────────────────────────────
  const sliceRects = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const rects: { x: number; y: number; w: number; h: number; positive: boolean }[] = []
    const dt = sliceDensity
    for (let t = 0; t < activeTime; t += dt) {
      const sliceEnd = Math.min(t + dt, activeTime)
      const { v } = interpolatePoints(t, trajectory.points)
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
  }, [advancedMode, sliceDensity, activeTime, trajectory.points, interpolatePoints, vtToX, vtToY])

  // ── 高级模式：频闪点（微元切片对应的小球位置）─────────────
  const ghostBalls = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const balls: { cy: number }[] = []
    const dt = sliceDensity
    for (let t = 0; t <= activeTime + 0.001; t += dt) {
      const actualT = Math.min(t, activeTime)
      const { y } = interpolatePoints(actualT, trajectory.points)
      const clampedGhostY = Math.max(y, 0)
      const ghostBallY = originY + (displayMaxHeight - clampedGhostY) * scale
      balls.push({ cy: ghostBallY })
    }
    return balls
  }, [advancedMode, sliceDensity, activeTime, trajectory.points, interpolatePoints, originY, displayMaxHeight, scale])

  // ── 高级模式：面积数值 ────────────────────────────────────
  const areaValues = useMemo(() => {
    if (advancedMode !== 1) return null
    let positiveArea = 0
    let negativeArea = 0
    for (let i = 0; i < trajectory.points.length; i++) {
      const pt = trajectory.points[i]
      if (pt.t > effectiveTime) break
      const nextPt = trajectory.points[i + 1] || pt
      const dt = nextPt.t - pt.t
      if (dt <= 0) continue
      const area = pt.v * dt
      if (area > 0) positiveArea += area
      else negativeArea += Math.abs(area)
    }
    return {
      positive: positiveArea,
      negative: negativeArea,
      net: positiveArea - negativeArea,
    }
  }, [advancedMode, effectiveTime, trajectory.points])

  // ── 高级模式：目标高度双解 ────────────────────────────────
  const targetHeightIntersections = useMemo(() => {
    if (advancedMode !== 1 || targetHeight <= 0 || targetHeight >= maxHeight) return null
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
  }, [advancedMode, targetHeight, maxHeight, trajectory.points, maxHeightTime])

  // ── y-t 面积填充 ──
  const ytAreaD = useMemo(() => {
    if (!ytData.airActive) return ''
    return `${ytData.airActive} L ${ytToX(activeTime)},${ytToY(0)} L ${ytToX(0)},${ytToY(0)} Z`
  }, [ytData.airActive, activeTime, ytToX, ytToY])

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
  // ── 双解高度对应的两轨瞬时速度计算 ──
  const { vT1, vT2 } = useMemo(() => {
    if (!targetHeightIntersections) return { vT1: 0, vT2: 0 }
    const vt1 = interpolatePoints(targetHeightIntersections.t1, trajectory.points).v
    const vt2 = interpolatePoints(targetHeightIntersections.t2, trajectory.points).v
    return { vT1: vt1, vT2: vt2 }
  }, [targetHeightIntersections, trajectory.points, interpolatePoints])

  // ── 局部精密物理滑轨渲染 ──
  const renderTrack = useCallback((x: number, label: string, isVacuum: boolean = false) => {
    const trackW = 14
    return (
      <g key={`track-${x}`} opacity={isVacuum ? 0.45 : 1}>
        {/* 导轨槽体（拉丝金属材质） */}
        <rect
          x={x - trackW / 2} y={originY - 15}
          width={trackW} height={stageHeight + 30}
          fill="url(#track-metal-grad)"
          stroke={isVacuum ? "#38BDF8" : "#475569"}
          strokeWidth={1}
          rx={3}
        />
        {/* 侧边高亮反光边框 */}
        <line x1={x - trackW / 2 + 1} y1={originY - 10} x2={x - trackW / 2 + 1} y2={groundY + 10} stroke={isVacuum ? "#0284C7" : "#0F172A"} strokeWidth={0.8} opacity={0.3} />
        <line x1={x + trackW / 2 - 1} y1={originY - 10} x2={x + trackW / 2 - 1} y2={groundY + 10} stroke={isVacuum ? "#0284C7" : "#0F172A"} strokeWidth={0.8} opacity={0.3} />
        
        {/* 精密实验室标尺刻度线 */}
        {Array.from({ length: 11 }).map((_, i) => {
          const yPos = originY + (i * stageHeight) / 10
          return (
            <line
              key={`tick-${i}`}
              x1={x - 4} y1={yPos} x2={x + 4} y2={yPos}
              stroke={isVacuum ? "#60A5FA" : "#94A3B8"}
              strokeWidth={0.8}
            />
          )
        })}
        {/* 轨道科学文字标签 */}
        <text x={x} y={groundY + 28} fontSize={9} fill={isVacuum ? "#3B82F6" : PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          {label}
        </text>
      </g>
    )
  }, [originY, groundY, stageHeight])

  const renderLaunchBase = useCallback((x: number) => (
    <g key={`base-${x}`}>
      {/* 弹射架底座 */}
      <path
        d={`M ${x - 16} ${groundY + 8} L ${x + 16} ${groundY + 8} L ${x + 10} ${groundY - 1} L ${x - 10} ${groundY - 1} Z`}
        fill="url(#slider-metal-grad)"
        stroke="#0F172A"
        strokeWidth={1}
      />
      {/* 激光状态指示灯 */}
      <circle cx={x} cy={groundY + 3.5} r={1.5} fill="#60A5FA" filter="drop-shadow(0 0 1px #3B82F6)" />
    </g>
  ), [groundY])

  const renderTopStopper = useCallback((x: number) => (
    <g key={`stopper-${x}`}>
      {/* 顶部回收防撞阻尼架 */}
      <rect
        x={x - 12} y={originY - 22}
        width={24} height={9}
        fill="url(#slider-metal-grad)"
        stroke="#0F172A"
        strokeWidth={1}
        rx={2}
      />
      {/* 警示安全条纹 */}
      <path
        d={`M ${x - 9} ${originY - 20} L ${x - 5} ${originY - 15} M ${x - 2} ${originY - 20} L ${x + 2} ${originY - 15} M ${x + 5} ${originY - 20} L ${x + 9} ${originY - 15}`}
        stroke="#EAB308"
        strokeWidth={1.2}
      />
    </g>
  ), [originY])

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
          {/* 金属滑轨渐变 */}
          <linearGradient id="track-metal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="75%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* 不锈钢材质渐变 */}
          <linearGradient id="slider-metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="30%" stopColor="#CBD5E1" />
            <stop offset="70%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* 钢珠立体径向渐变 */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#D1D5DB" />
            <stop offset="80%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#1F2937" />
          </radialGradient>

          {/* 真空对照球立体渐变 */}
          <radialGradient id="vacuum-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.60" />
            <stop offset="90%" stopColor="#0284C7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0.05" />
          </radialGradient>

          {/* 霓虹发光滤镜 */}
          <filter id="glow-filter-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-filter-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* 积分面积极光渐变 */}
          <linearGradient id="aurora-blue-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="aurora-red-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FCA5A5" stopOpacity="0.05" />
          </linearGradient>

          <marker id="arrow-vt-velocity" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-vt-accel" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          
          {/* 高级模式：正区域交叉线图案 */}
          <pattern id="gridPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0L8 8M8 0L0 8" stroke="#3B82F6" strokeWidth="0.5" opacity="0.35" />
          </pattern>
          {/* 高级模式：负区域斜线图案 */}
          <pattern id="stripePattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0" stroke="#EF4444" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>

        {/* ========== 左侧：物理演练区 ========== */}
        {gridLines}

        {/* 渲染滑轨 (双轨/单轨分流) */}
        {showDoubleTrack ? (
          <>
            {renderTrack(leftBallX, `阻力轨道 (k = ${airResistance.toFixed(1)})`)}
            {renderTrack(rightBallX, '真空对照轨道', true)}
            {renderLaunchBase(leftBallX)}
            {renderLaunchBase(rightBallX)}
            {renderTopStopper(leftBallX)}
            {renderTopStopper(rightBallX)}
          </>
        ) : (
          <>
            {renderTrack(ballX, '垂直物理轨道')}
            {renderLaunchBase(ballX)}
            {renderTopStopper(ballX)}
          </>
        )}

        {/* 地面线 */}
        <line x1={30} y1={groundY} x2={stageWidth - 20} y2={groundY}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* 高度刻度标注 */}
        <text x={25} y={originY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">
          {displayMaxHeight.toFixed(1)}m
        </text>
        <text x={25} y={groundY + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.axis} textAnchor="end">0</text>
        <text x={leftBallX + (showDoubleTrack ? -20 : 18)} y={groundY + 14} fontSize={FONT.small} fill={PHYSICS_COLORS.axis}>y=0</text>

        {/* 最高点虚线标注 */}
        <line x1={30} y1={originY + (displayMaxHeight - maxHeight) * scale} x2={stageWidth - 20} y2={originY + (displayMaxHeight - maxHeight) * scale}
          stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')} opacity={0.5} />
        <text x={stageWidth - 18} y={originY + (displayMaxHeight - maxHeight) * scale - 4} fontSize={FONT.small}
          fill={PHYSICS_COLORS.potentialEnergy} textAnchor="end" opacity={0.7}>
          最高点 H = {maxHeight.toFixed(2)}m
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
              目标 y = {targetHeight}m
            </text>
          </>
        )}

        {/* 高级模式：频闪点（微元切片） */}
        {ghostBalls.map((ball, idx) => (
          <circle key={`ghost-${idx}`} cx={leftBallX} cy={ball.cy} r={5}
            fill="#3B82F6" opacity={0.25} />
        ))}

        {/* 真空虚影球 (仅在双轨模式下渲染) */}
        {showDoubleTrack && !isLanded && (
          <circle cx={rightBallX} cy={currentVacuumBallY} r={13}
            fill="url(#vacuum-sphere-grad)" stroke="#93C5FD" strokeWidth={1} />
        )}

        {/* 实体钢珠小球 */}
        <circle cx={leftBallX} cy={currentBallY} r={14}
          fill="url(#steel-sphere-grad)" stroke="#4B5563"
          strokeWidth={CANVAS_STYLE.stroke.objectLine} />

        {/* 微元法累积激光连线（时间轴移动时，实时连结速度切片与物理区高度变化量） */}
        {advancedMode === 1 && sliceDensity > 0 && effectiveTime > 0 && !isLanded && (
          <line
            x1={leftBallX} y1={currentBallY}
            x2={dataX + vtToX(effectiveTime)} y2={vtChartTop + vtToY(effectiveV)}
            stroke={effectiveV >= 0 ? "#60A5FA" : "#F87171"}
            strokeWidth={1.5}
            strokeDasharray="2,1"
            opacity={0.6}
            filter="drop-shadow(0 0 2px #3B82F6)"
          />
        )}

        {/* 速度矢量（绿色，方向随正负变化） */}
        {showVectors && effectiveV !== 0 && !isLanded && (
          <g>
            <line
              x1={leftBallX + 18} y1={currentBallY}
              x2={leftBallX + 18} y2={currentBallY - effectiveV * 4}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-velocity)" />
            <text
              x={leftBallX + 30} y={currentBallY - effectiveV * 2 + 3}
              fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v
            </text>
          </g>
        )}

        {/* 加速度/合力矢量（红色，恒向下，有阻力时：a = -g - kv|v|） */}
        {showVectors && !isLanded && (
          <g>
            <line
              x1={leftBallX - 18} y1={currentBallY}
              x2={leftBallX - 18} y2={currentBallY + 35}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-accel)" />
            <text
              x={leftBallX - 30} y={currentBallY + 20}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a
            </text>
          </g>
        )}

        {/* 最高点定格特效：加速度合力箭头脉冲 */}
        {isAtPeak && (
          <g>
            <line
              x1={leftBallX - 18} y1={currentBallY}
              x2={leftBallX - 18} y2={currentBallY + 35}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-vt-accel)">
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </line>
            <text x={leftBallX - 30} y={currentBallY + 20}
              fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a
              <animate attributeName="opacity" values="1;0.3;1" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
            </text>
          </g>
        )}

        {/* 最高点物理看板浮动框 (教学设计：直观解释 v=0 时 a 不为 0) */}
        {isAtPeak && (
          <g transform={`translate(${leftBallX + (showDoubleTrack ? -122 : 24)}, ${currentBallY - 45})`}>
            <rect width={116} height={42} fill="#1E293B" opacity={0.92} rx={4} stroke="#EF4444" strokeWidth={1} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
            <polygon points={showDoubleTrack ? "116 21, 122 21, 116 26" : "0 21, -6 21, 0 26"} fill="#1E293B" stroke="#EF4444" strokeWidth={0.5} />
            <text x={58} y={13} fontSize={9} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">瞬时状态 v = 0</text>
            <text x={58} y={25} fontSize={8} fill="#FCA5A5" textAnchor="middle">但 a = -g = -{g} m/s²</text>
            <text x={58} y={35} fontSize={8} fill="#FCA5A5" textAnchor="middle">合力 F_合 = mg 向下</text>
          </g>
        )}

        {/* 双解交点物理浮动框 */}
        {advancedMode === 1 && targetHeightIntersections && !isLanded && (
          <>
            {Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.15 && (
              <g transform={`translate(${leftBallX + 24}, ${currentBallY - 15})`}>
                <rect width={95} height={26} fill="#0F172A" opacity={0.88} rx={3} stroke={CHART_COLORS.highlight} strokeWidth={0.8} />
                <text x={47} y={11} fontSize={8} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">① 上升阶段经过</text>
                <text x={47} y={20} fontSize={8} fill="#93C5FD" textAnchor="middle">v = +{effectiveV.toFixed(1)} m/s</text>
              </g>
            )}
            {Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.15 && (
              <g transform={`translate(${leftBallX + 24}, ${currentBallY - 15})`}>
                <rect width={95} height={26} fill="#0F172A" opacity={0.88} rx={3} stroke={CHART_COLORS.highlight} strokeWidth={0.8} />
                <text x={47} y={11} fontSize={8} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">② 下落阶段经过</text>
                <text x={47} y={20} fontSize={8} fill="#FCA5A5" textAnchor="middle">v = {effectiveV.toFixed(1)} m/s</text>
              </g>
            )}
          </>
        )}

        {/* 落地标注 */}
        {isLanded && (
          <text x={leftBallX} y={groundY - 30} fontSize={FONT.small} fill={PHYSICS_COLORS.forceNet}
            textAnchor="middle" fontWeight="bold">落地</text>
        )}

        {/* ========== 右侧：v-t 图 ========== */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            速度-时间图像 (v-t 图)
          </text>

          {/* X 轴科学网格垂直线 */}
          {xticks.map(t => (
            t > 0 && t < xMax && (
              <line key={`vt-grid-v-${t}`}
                x1={vtToX(t)} y1={vtInnerPad.top}
                x2={vtToX(t)} y2={vtInnerPad.top + vtInnerH}
                stroke="#F1F5F9" strokeWidth={0.5}
              />
            )
          ))}
          {/* Y 轴科学网格水平线 */}
          {vtYTicks.map(v => (
            v !== 0 && v > -vtVMax && v < vtVMax && (
              <line key={`vt-grid-h-${v}`}
                x1={vtInnerPad.left} y1={vtToY(v)}
                x2={vtInnerPad.left + vtInnerW} y2={vtToY(v)}
                stroke="#F1F5F9" strokeWidth={0.5}
              />
            )
          ))}

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
                opacity={0.55}
              />
            ))
          ) : (
            <>
              {/* 普通模式：正区域面积填充（极光蓝渐变） */}
              {vtPositiveAreaD && (
                <path d={vtPositiveAreaD} fill="url(#aurora-blue-grad)" />
              )}
              {/* 普通模式：负区域面积填充（极光红渐变） */}
              {vtNegativeAreaD && (
                <path d={vtNegativeAreaD} fill="url(#aurora-red-grad)" />
              )}
            </>
          )}

          {/* 真空对照曲线（全段背景虚线，提示无阻力轨迹） */}
          {airResistance > 0 && vtData.vacFull && (
            <path d={vtData.vacFull} fill="none" stroke="#94A3B8" strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {/* 实际有阻力曲线 (全段虚影背景) */}
          {vtData.airFull && (
            <path d={vtData.airFull} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={1} opacity={0.15} />
          )}

          {/* 真空对照当前时段段 (当双轨对比开启时) */}
          {showDoubleTrack && vtData.vacActive && (
            <path d={vtData.vacActive} fill="none" stroke="#0284C7" strokeWidth={1.5} opacity={0.7} />
          )}

          {/* 实际有阻力当前段曲线（发光霓虹） */}
          {vtData.airActive && (
            <path d={vtData.airActive} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
          )}

          {/* 最高点穿轴交点闪烁 & 过零点切线 */}
          {isAtPeak && (
            <g>
              {/* 图像切线示意斜率 (a = -g) */}
              <line
                x1={vtToX(Math.max(maxHeightTime - 0.5, 0))} y1={vtToY(g * 0.5)}
                x2={vtToX(Math.min(maxHeightTime + 0.5, xMax))} y2={vtToY(-g * 0.5)}
                stroke="#EF4444" strokeWidth={1} strokeDasharray="2,2"
              />
              <text x={vtToX(maxHeightTime) + 8} y={vtToY(0) - 8} fontSize={8} fill="#EF4444">切线斜率 k = -g</text>

              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={6}
                fill={VT_CHART_COLORS.zeroCrossing} opacity={0.6}>
                <animate attributeName="r" values="6;10;6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={3}
                fill={VT_CHART_COLORS.zeroCrossing} />
            </g>
          )}

          {/* 双解高度速度对应水平虚线投影 */}
          {advancedMode === 1 && targetHeightIntersections && (
            <g opacity={Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.2 || Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.2 ? 0.95 : 0.25}>
              {/* t1 对应速度投影 */}
              <line
                x1={vtInnerPad.left} y1={vtToY(vT1)}
                x2={vtToX(targetHeightIntersections.t1)} y2={vtToY(vT1)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t1)} cy={vtToY(vT1)} r={3.5} fill={CHART_COLORS.highlight} />
              
              {/* t2 对应速度投影 */}
              <line
                x1={vtInnerPad.left} y1={vtToY(vT2)}
                x2={vtToX(targetHeightIntersections.t2)} y2={vtToY(vT2)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t2)} cy={vtToY(vT2)} r={3.5} fill={CHART_COLORS.highlight} />
            </g>
          )}

          {/* 当前状态点 (实际轨道) */}
          {!isAtPeak && effectiveTime > 0 && (
            <g>
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={4.5} fill={VT_CHART_COLORS.velocityCurve} />
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={7} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={0.5} opacity={0.5} />
            </g>
          )}

          {/* 当前状态点 (真空轨道，当双轨对比开启时) */}
          {showDoubleTrack && !isLanded && (
            <circle cx={vtToX(effectiveTime)} cy={vtToY(vacuumV)} r={3.5} fill="#0284C7" opacity={0.8} />
          )}

          {/* 点击区域（透明覆盖） */}
          <rect x={vtInnerPad.left} y={vtInnerPad.top} width={vtInnerW} height={vtInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'vt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'vt')} />

          {/* 时间精密游标发光针 */}
          {effectiveTime > 0 && (
            <g>
              <line x1={vtToX(effectiveTime)} y1={vtInnerPad.top}
                x2={vtToX(effectiveTime)} y2={vtInnerPad.top + vtInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={vtToX(effectiveTime)} cy={vtInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}

          {/* 高级模式：面积数值显示 */}
          {advancedMode === 1 && areaValues && (
            <g>
              <rect x={vtInnerPad.left + vtInnerW - 105} y={vtInnerPad.top + 6} width={100} height={42} fill="#F8FAFC" opacity={0.85} rx={3} stroke="#E2E8F0" strokeWidth={0.8} />
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 16}
                fontSize={8} fill={VT_CHART_COLORS.areaShade} textAnchor="end" fontWeight="bold">
                上升位移 S⁺ = {areaValues.positive.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 26}
                fontSize={8} fill={VT_CHART_COLORS.zeroCrossing} textAnchor="end" fontWeight="bold">
                下落位移 S⁻ = {areaValues.negative.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 36}
                fontSize={8} fill="#334155" textAnchor="end" fontWeight="bold">
                当前高度 y = {areaValues.net.toFixed(2)} m
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

          {/* X 轴科学网格垂直线 */}
          {xticks.map(t => (
            t > 0 && t < xMax && (
              <line key={`yt-grid-v-${t}`}
                x1={ytToX(t)} y1={ytInnerPad.top}
                x2={ytToX(t)} y2={ytInnerPad.top + ytInnerH}
                stroke="#F1F5F9" strokeWidth={0.5}
              />
            )
          ))}
          {/* Y 轴科学网格水平线 */}
          {ytYTicks.map(y => (
            y > 0 && y < ytYMax && (
              <line key={`yt-grid-h-${y}`}
                x1={ytInnerPad.left} y1={ytToY(y)}
                x2={ytInnerPad.left + ytInnerW} y2={ytToY(y)}
                stroke="#F1F5F9" strokeWidth={0.5}
              />
            )
          ))}

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

          {/* 最高点水平参考线 */}
          <line x1={ytInnerPad.left} y1={ytToY(maxHeight)} x2={ytInnerPad.left + ytInnerW} y2={ytToY(maxHeight)}
            stroke={CHART_COLORS.zeroline} strokeWidth={0.8}
            strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />

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
                高度 y = {targetHeight}m
              </text>
              {/* 交点竖虚线与标注 */}
              {targetHeightIntersections && (
                <>
                  {/* t₁ 竖虚线 */}
                  <line x1={ytToX(targetHeightIntersections.t1)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t1)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t1)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={8} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₁={targetHeightIntersections.t1.toFixed(2)}s
                  </text>
                  {/* t₂ 竖虚线 */}
                  <line x1={ytToX(targetHeightIntersections.t2)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t2)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t2)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={8} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₂={targetHeightIntersections.t2.toFixed(2)}s
                  </text>
                </>
              )}
            </>
          )}

          {/* 面积填充 */}
          {ytAreaD && (
            <path d={ytAreaD} fill={XT_CHART_COLORS.positionCurve} opacity={0.08} />
          )}

          {/* 真空对照曲线（全段，虚线） */}
          {airResistance > 0 && ytData.vacFull && (
            <path d={ytData.vacFull} fill="none" stroke="#94A3B8" strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {/* 实际有阻力位置曲线 (全段背景) */}
          {ytData.airFull && (
            <path d={ytData.airFull} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={1} opacity={0.15} />
          )}

          {/* 真空对照当前时段段 (当双轨对比开启时) */}
          {showDoubleTrack && ytData.vacActive && (
            <path d={ytData.vacActive} fill="none" stroke="#0284C7" strokeWidth={1.5} opacity={0.7} />
          )}

          {/* 实际有阻力当前时段曲线 (发光霓虹) */}
          {ytData.airActive && (
            <path d={ytData.airActive} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
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

          {/* 当前状态点 (实际轨道) */}
          {!isAtPeak && effectiveTime > 0 && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedY)} r={4.5} fill={XT_CHART_COLORS.positionCurve} />
          )}

          {/* 当前状态点 (真空轨道，当双轨对比开启时) */}
          {showDoubleTrack && !isLanded && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedVacuumY)} r={3.5} fill="#0284C7" opacity={0.8} />
          )}

          {/* 点击区域 */}
          <rect x={ytInnerPad.left} y={ytInnerPad.top} width={ytInnerW} height={ytInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => handleChartClick(e, 'yt')}
            onMouseDown={(e) => handleChartMouseDown(e, 'yt')} />

          {/* 时间游标精密游标针 */}
          {effectiveTime > 0 && (
            <g>
              <line x1={ytToX(effectiveTime)} y1={ytInnerPad.top}
                x2={ytToX(effectiveTime)} y2={ytInnerPad.top + ytInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={ytToX(effectiveTime)} cy={ytInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
