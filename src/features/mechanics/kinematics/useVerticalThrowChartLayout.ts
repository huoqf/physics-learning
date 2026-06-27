import { useMemo, useCallback } from 'react'
import { VerticalThrowTrajectoryPoint } from '@/physics'

export interface ChartPadding {
  left: number
  right: number
  top: number
  bottom: number
}

export interface UseVerticalThrowChartLayoutResult {
  // ── 整体布局 ──
  stageWidth: number
  dataX: number
  dataWidth: number
  originY: number
  groundY: number
  stageHeight: number
  ballX: number
  displayMaxHeight: number
  scale: number

  // ── v-t 图 ──
  vtChartTop: number
  vtChartHeight: number
  vtInnerPad: ChartPadding
  vtInnerW: number
  vtInnerH: number
  vtVMax: number
  vtTickStep: number
  xMax: number
  vtToX: (t: number) => number
  vtToY: (v: number) => number

  // ── y-t 图 ──
  ytChartTop: number
  ytChartHeight: number
  ytInnerPad: ChartPadding
  ytInnerW: number
  ytInnerH: number
  ytYMax: number
  ytTickStep: number
  ytToX: (t: number) => number
  ytToY: (y: number) => number

  // ── 刻度 ──
  vtYTicks: number[]
  xticks: number[]
  ytYTicks: number[]
  activeTime: number

  // ── SVG 路径数据 ──
  vtData: {
    airFull: string
    airActive: string
    vacFull: string
    vacActive: string
  }
  ytData: {
    airFull: string
    airActive: string
    vacFull: string
    vacActive: string
  }
  vtPositiveAreaD: string
  vtNegativeAreaD: string
  ytAreaD: string

  // ── 高级模式：切片矩形 ──
  sliceRects: { x: number; y: number; w: number; h: number; positive: boolean }[]

  // ── 高级模式：频闪点 ──
  ghostBalls: { cy: number }[]
}

/**
 * 竖直上抛图表布局 Hook
 * 负责所有坐标变换、刻度生成、SVG 路径计算。
 * 坐标变换函数使用 useCallback 包裹，避免 useMemo 依赖失效。
 */
export function useVerticalThrowChartLayout(
  canvasWidth: number,
  canvasHeight: number,
  totalTime: number,
  maxHeight: number,
  maxHeightTime: number,
  landTimeVac: number,
  maxHeightVac: number,
  effectiveTime: number,
  v0: number,
  advancedMode: number,
  sliceDensity: number,
  trajectoryPoints: VerticalThrowTrajectoryPoint[],
  vacuumPoints: VerticalThrowTrajectoryPoint[],
  interpolatePoints: (t: number, pts: VerticalThrowTrajectoryPoint[]) => { v: number; y: number },
): UseVerticalThrowChartLayoutResult {
  // ── 布局分区 ──
  const stageRatio = 0.42
  const gapWidth = canvasWidth * 0.02
  const stageWidth = canvasWidth * stageRatio
  const dataX = stageWidth + gapWidth
  const dataWidth = canvasWidth - dataX

  // ── 物理舞台（左侧） ──
  const originY = canvasHeight * 0.08
  const groundY = canvasHeight * 0.88
  const stageHeight = groundY - originY
  const ballX = stageWidth * 0.5

  // ── 动态 scale ──
  const displayMaxHeight = Math.max(maxHeight, maxHeightVac, 1)
  const scale = stageHeight / displayMaxHeight

  // ── v-t 图布局 ──
  const vtChartTop = canvasHeight * 0.02
  const vtChartHeight = canvasHeight * 0.52
  const vtInnerPad = { left: 45, right: 30, top: 30, bottom: 35 }
  const vtInnerW = dataWidth - vtInnerPad.left - vtInnerPad.right
  const vtInnerH = vtChartHeight - vtInnerPad.top - vtInnerPad.bottom

  // v-t 图轴范围
  const { vtVMax, vtTickStep, xMax } = useMemo(() => {
    const vMax = Math.max(v0 * 1.15, 5)
    // 时间轴不能随当前 g 同比例收缩，否则 v-t 斜率视觉上会被归一化，
    // 学生调节 g 时看不出斜率变化。以侧栏最小 g=5m/s² 对应的
    // 最长真空飞行时间作为稳定参考，同时兼顾有阻力时的实际 totalTime。
    const slowestVacuumTime = v0 > 0 ? (2 * v0) / 5 : 2
    const referenceTime = Math.max(totalTime, slowestVacuumTime)
    const clampedXMax = Math.max(Math.min(referenceTime * 1.05, 10), 2)
    let tickStep: number
    if (vMax <= 5) tickStep = 1
    else if (vMax <= 10) tickStep = 2
    else if (vMax <= 20) tickStep = 5
    else tickStep = 10
    return { vtVMax: vMax, vtTickStep: tickStep, xMax: clampedXMax }
  }, [v0, totalTime])

  // ── 坐标变换函数（useCallback 包裹，稳定引用） ──
  const vtToX = useCallback(
    (t: number) => vtInnerPad.left + (t / xMax) * vtInnerW,
    [vtInnerPad.left, xMax, vtInnerW]
  )

  const vtToY = useCallback(
    (v: number) => {
      const clampedV = Math.max(-vtVMax, Math.min(v, vtVMax))
      return vtInnerPad.top + ((vtVMax - clampedV) / (2 * vtVMax)) * vtInnerH
    },
    [vtInnerPad.top, vtVMax, vtInnerH]
  )

  // ── y-t 图布局 ──
  const ytChartTop = vtChartTop + vtChartHeight + canvasHeight * 0.04
  const ytChartHeight = canvasHeight - ytChartTop - canvasHeight * 0.04
  const ytInnerPad = { left: 45, right: 30, top: 25, bottom: 35 }
  const ytInnerW = dataWidth - ytInnerPad.left - ytInnerPad.right
  const ytInnerH = ytChartHeight - ytInnerPad.top - ytInnerPad.bottom

  const { ytYMax, ytTickStep } = useMemo(() => {
    // y-t 图需要同时容纳实际轨道与真空对照轨道；若只按有阻力
    // 最大高度定标，真空抛物线会在图顶被 ytToY clamp 成水平折线。
    const yMax = Math.max(Math.max(maxHeight, maxHeightVac) * 1.15, 5)
    let tickStep: number
    if (yMax <= 5) tickStep = 1
    else if (yMax <= 10) tickStep = 2
    else if (yMax <= 20) tickStep = 5
    else tickStep = 10
    return { ytYMax: yMax, ytTickStep: tickStep }
  }, [maxHeight, maxHeightVac])

  const ytToX = useCallback(
    (t: number) => ytInnerPad.left + (t / xMax) * ytInnerW,
    [ytInnerPad.left, xMax, ytInnerW]
  )

  const ytToY = useCallback(
    (y: number) => {
      const clampedY = Math.max(0, Math.min(y, ytYMax))
      return ytInnerPad.top + ytInnerH - (clampedY / ytYMax) * ytInnerH
    },
    [ytInnerPad.top, ytInnerH, ytYMax]
  )

  // ── 刻度 ──
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

  // ── v-t 曲线 SVG 路径 ──
  const vtData = useMemo(() => {
    const activeT = Math.min(effectiveTime, totalTime)
    const activeTVac = Math.min(effectiveTime, landTimeVac)

    const getPointsStr = (pts: VerticalThrowTrajectoryPoint[], maxT: number) => {
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
      airFull: `M ${trajectoryPoints.map(p => `${vtToX(p.t)},${vtToY(p.v)}`).join(' L ')}`,
      airActive: getPointsStr(trajectoryPoints, activeT) ? `M ${getPointsStr(trajectoryPoints, activeT)}` : '',
      vacFull: `M ${vacuumPoints.map(p => `${vtToX(p.t)},${vtToY(p.v)}`).join(' L ')}`,
      vacActive: getPointsStr(vacuumPoints, activeTVac) ? `M ${getPointsStr(vacuumPoints, activeTVac)}` : '',
    }
  }, [trajectoryPoints, vacuumPoints, totalTime, landTimeVac, effectiveTime, vtToX, vtToY, interpolatePoints])

  // ── y-t 曲线 SVG 路径 ──
  const ytData = useMemo(() => {
    const activeT = Math.min(effectiveTime, totalTime)
    const activeTVac = Math.min(effectiveTime, landTimeVac)

    const getPointsStr = (pts: VerticalThrowTrajectoryPoint[], maxT: number) => {
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
      airFull: `M ${trajectoryPoints.map(p => `${ytToX(p.t)},${ytToY(p.y)}`).join(' L ')}`,
      airActive: getPointsStr(trajectoryPoints, activeT) ? `M ${getPointsStr(trajectoryPoints, activeT)}` : '',
      vacFull: `M ${vacuumPoints.map(p => `${ytToX(p.t)},${ytToY(p.y)}`).join(' L ')}`,
      vacActive: getPointsStr(vacuumPoints, activeTVac) ? `M ${getPointsStr(vacuumPoints, activeTVac)}` : '',
    }
  }, [trajectoryPoints, vacuumPoints, totalTime, landTimeVac, effectiveTime, ytToX, ytToY, interpolatePoints])

  // ── v-t 正区域面积填充 ──
  const vtPositiveAreaD = useMemo(() => {
    const peakT = Math.min(maxHeightTime, effectiveTime)
    if (peakT <= 0) return ''
    const pts: string[] = []
    for (const pt of trajectoryPoints) {
      if (pt.t > peakT + 1e-5) break
      pts.push(`${vtToX(pt.t)},${vtToY(Math.max(pt.v, 0))}`)
    }
    pts.push(`${vtToX(peakT)},${vtToY(0)}`)
    pts.push(`${vtToX(0)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [trajectoryPoints, maxHeightTime, effectiveTime, vtToX, vtToY])

  // ── v-t 负区域面积填充 ──
  const vtNegativeAreaD = useMemo(() => {
    if (effectiveTime <= maxHeightTime) return ''
    const pts: string[] = []
    pts.push(`${vtToX(maxHeightTime)},${vtToY(0)}`)
    const activeT = Math.min(effectiveTime, totalTime)
    for (const pt of trajectoryPoints) {
      if (pt.t < maxHeightTime) continue
      if (pt.t > activeT + 1e-5) break
      pts.push(`${vtToX(pt.t)},${vtToY(Math.min(pt.v, 0))}`)
    }
    pts.push(`${vtToX(activeT)},${vtToY(0)}`)
    return `M ${pts.join(' L ')} Z`
  }, [trajectoryPoints, maxHeightTime, effectiveTime, totalTime, vtToX, vtToY])

  // ── y-t 面积填充 ──
  const ytAreaD = useMemo(() => {
    if (!ytData.airActive) return ''
    return `${ytData.airActive} L ${ytToX(activeTime)},${ytToY(0)} L ${ytToX(0)},${ytToY(0)} Z`
  }, [ytData.airActive, activeTime, ytToX, ytToY])

  // ── 高级模式：微元切片矩形 ──
  const sliceRects = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const rects: { x: number; y: number; w: number; h: number; positive: boolean }[] = []
    const dt = sliceDensity
    for (let t = 0; t < activeTime; t += dt) {
      const sliceEnd = Math.min(t + dt, activeTime)
      const { v } = interpolatePoints(t, trajectoryPoints)
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
  }, [advancedMode, sliceDensity, activeTime, trajectoryPoints, interpolatePoints, vtToX, vtToY])

  // ── 高级模式：频闪点 ──
  const ghostBalls = useMemo(() => {
    if (advancedMode !== 1 || sliceDensity <= 0) return []
    const balls: { cy: number }[] = []
    const dt = sliceDensity
    for (let t = 0; t <= activeTime + 0.001; t += dt) {
      const actualT = Math.min(t, activeTime)
      const { y } = interpolatePoints(actualT, trajectoryPoints)
      const clampedGhostY = Math.max(y, 0)
      const ghostBallY = originY + (displayMaxHeight - clampedGhostY) * scale
      balls.push({ cy: ghostBallY })
    }
    return balls
  }, [advancedMode, sliceDensity, activeTime, trajectoryPoints, interpolatePoints, originY, displayMaxHeight, scale])

  return {
    stageWidth,
    dataX,
    dataWidth,
    originY,
    groundY,
    stageHeight,
    ballX,
    displayMaxHeight,
    scale,
    vtChartTop,
    vtChartHeight,
    vtInnerPad,
    vtInnerW,
    vtInnerH,
    vtVMax,
    vtTickStep,
    xMax,
    vtToX,
    vtToY,
    ytChartTop,
    ytChartHeight,
    ytInnerPad,
    ytInnerW,
    ytInnerH,
    ytYMax,
    ytTickStep,
    ytToX,
    ytToY,
    vtYTicks,
    xticks,
    ytYTicks,
    activeTime,
    vtData,
    ytData,
    vtPositiveAreaD,
    vtNegativeAreaD,
    ytAreaD,
    sliceRects,
    ghostBalls,
  }
}
