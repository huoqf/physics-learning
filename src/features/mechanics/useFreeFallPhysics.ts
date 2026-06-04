import { useMemo } from 'react'
import { calculateFreeFall } from '@/physics'

const FLASH_INTERVAL = 0.1
const MAX_FLASH_POINTS = 20

export interface FlashPoint {
  time: number
  velocity: number
  displacement: number
}

export interface VtChartPoint {
  x: number
  y: number
}

export interface DisplacementDiff {
  n: number
  deltaX: number
  theoretical: number
}

export interface TimeSlice {
  n: number
  ratio: number
  height: number
  startY: number
  endY: number
  color: string
}

export interface FreeFallPhysicsData {
  // 输入参数
  v0: number
  g: number
  // 落地判断
  groundTime: number
  // 有效值
  effectiveTime: number
  effectiveV: number
  effectiveY: number
  isLanded: boolean
  // 频闪数据
  flashPoints: FlashPoint[]
  // v-t 图数据
  vtChartData: VtChartPoint[]
  // 位移差数据
  displacementDiffs: DisplacementDiff[]
  // 时间切片数据
  timeSlices: TimeSlice[]
}

export function useFreeFallPhysics(
  v0: number,
  g: number,
  time: number,
  maxFallHeight: number = Infinity
): FreeFallPhysicsData {
  // 计算落地时间：解方程 v0*t + 0.5*g*t^2 = maxFallHeight
  // 即 0.5*g*t^2 + v0*t - maxFallHeight = 0
  const groundTime = maxFallHeight === Infinity 
    ? Infinity 
    : (-v0 + Math.sqrt(v0 * v0 + 2 * g * maxFallHeight)) / g
  
  const actualGroundTime = groundTime > 0 ? groundTime : Infinity

  const effectiveTime = Math.min(time, actualGroundTime)
  const isLanded = time >= actualGroundTime && actualGroundTime !== Infinity

  const { v: displayV, y: displayY } = calculateFreeFall(v0, g, effectiveTime)
  const effectiveY = Math.min(displayY, maxFallHeight)
  const effectiveV = isLanded ? 0 : displayV

  // 频闪点计算
  const flashPoints = useMemo(() => {
    const points: FlashPoint[] = []
    const maxT = isLanded ? actualGroundTime : effectiveTime
    const count = Math.min(Math.floor(maxT / FLASH_INTERVAL), MAX_FLASH_POINTS)
    for (let i = 0; i <= count; i++) {
      const t = i * FLASH_INTERVAL
      const { v, y } = calculateFreeFall(v0, g, t)
      points.push({ time: t, velocity: v, displacement: y })
    }
    return points
  }, [effectiveTime, actualGroundTime, isLanded, v0, g])

  // v-t 图数据（完整反映物理规律）
  const vtChartData = useMemo(() => {
    const points: VtChartPoint[] = []
    const dt = 0.1
    const totalT = 8 // 固定绘制时长，保证图表稳定
    for (let t = 0; t <= totalT + dt; t += dt) {
      const { v } = calculateFreeFall(v0, g, t)
      points.push({ x: parseFloat(t.toFixed(1)), y: v })
    }
    return points
  }, [v0, g])

  // 位移差数据
  const displacementDiffs = useMemo(() => {
    const diffs: DisplacementDiff[] = []
    for (let i = 0; i < flashPoints.length - 1; i++) {
      const deltaX = flashPoints[i + 1].displacement - flashPoints[i].displacement
      const theoretical = g * FLASH_INTERVAL * FLASH_INTERVAL
      diffs.push({ n: i + 1, deltaX, theoretical })
    }
    return diffs
  }, [flashPoints, g])

  // 时间切片数据（1:3:5:7 比例）
  const timeSlices = useMemo(() => {
    const slices: TimeSlice[] = []
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444']
    const ratios = [1, 3, 5, 7]
    const sliceTime = actualGroundTime < Infinity ? actualGroundTime / 4 : 0.1

    for (let i = 0; i < 4; i++) {
      const t1 = i * sliceTime
      const t2 = (i + 1) * sliceTime
      const { y: y1 } = calculateFreeFall(v0, g, t1)
      const { y: y2 } = calculateFreeFall(v0, g, t2)
      const height = y2 - y1
      slices.push({
        n: i + 1,
        ratio: ratios[i],
        height,
        startY: y1,
        endY: y2,
        color: colors[i]
      })
    }
    return slices
  }, [v0, g, actualGroundTime])

  return {
    v0,
    g,
    groundTime: actualGroundTime,
    effectiveTime,
    effectiveV,
    effectiveY,
    isLanded,
    flashPoints,
    vtChartData,
    displacementDiffs,
    timeSlices,
  }
}
