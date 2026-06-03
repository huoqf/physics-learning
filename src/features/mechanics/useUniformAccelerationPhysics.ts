import { useMemo } from 'react'
import { calculateAcceleratedMotion } from '@/physics'

const FLASH_INTERVAL = 0.5
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

export interface UniformAccelerationPhysicsData {
  // 输入参数
  v0: number
  a: number
  // 刹车死区
  stopTime: number
  isBrakeMode: boolean
  // 有效值
  effectiveTime: number
  effectiveV: number
  effectiveS: number
  isStopped: boolean
  // 频闪数据
  flashPoints: FlashPoint[]
  // v-t 图数据
  vtChartData: VtChartPoint[]
  // 错误代入数据（刹车死区演示用）
  wrongVtData: VtChartPoint[] | null
  wrongDisplacement: number | null
}

export function useUniformAccelerationPhysics(
  v0: number,
  a: number,
  time: number,
  maxDisplacement: number = Infinity
): UniformAccelerationPhysicsData {
  // 刹车死区判断：速度过零后停止
  const isBrakeMode = a !== 0 && v0 * a < 0
  const stopTime = isBrakeMode ? -v0 / a : Infinity
  const effectiveTime = Math.min(time, stopTime)
  const isStopped = time >= stopTime && stopTime !== Infinity

  const { v: displayV, s: displayS } = calculateAcceleratedMotion(v0, a, effectiveTime)
  const effectiveS = Math.max(0, Math.min(maxDisplacement, displayS))
  const effectiveV = isStopped ? 0 : displayV

  // 频闪点计算
  const flashPoints = useMemo(() => {
    const points: FlashPoint[] = []
    const maxT = isStopped ? stopTime : effectiveTime
    const count = Math.min(Math.floor(maxT / FLASH_INTERVAL), MAX_FLASH_POINTS)
    for (let i = 0; i <= count; i++) {
      const t = i * FLASH_INTERVAL
      const { v, s } = calculateAcceleratedMotion(v0, a, t)
      points.push({ time: t, velocity: v, displacement: s })
    }
    return points
  }, [effectiveTime, stopTime, isStopped, v0, a])

  // v-t 图数据（修正：移除刹车截断，完整反映匀变速物理规律）
  const vtChartData = useMemo(() => {
    const points: VtChartPoint[] = []
    const dt = 0.1
    // 固定绘制时长，保证图表稳定
    const totalT = 8 
    for (let t = 0; t <= totalT + dt; t += dt) {
      const { v } = calculateAcceleratedMotion(v0, a, t)
      points.push({ x: parseFloat(t.toFixed(1)), y: v })
    }
    return points
  }, [v0, a])

  // 错误代入数据（刹车死区演示：盲目用公式得到的错误结果）
  const wrongVtData = useMemo(() => {
    if (!isBrakeMode) return null
    const points: VtChartPoint[] = []
    const dt = 0.1
    const endT = Math.min(time + 2, stopTime + 4)
    for (let t = 0; t <= endT; t += dt) {
      const { v } = calculateAcceleratedMotion(v0, a, t)
      points.push({ x: parseFloat(t.toFixed(1)), y: v })
    }
    return points
  }, [isBrakeMode, time, stopTime, v0, a])

  // 盲目代入得到的错误位移
  const wrongDisplacement = isBrakeMode
    ? calculateAcceleratedMotion(v0, a, time).s
    : null

  return {
    v0,
    a,
    stopTime,
    isBrakeMode,
    effectiveTime,
    effectiveV,
    effectiveS,
    isStopped,
    flashPoints,
    vtChartData,
    wrongVtData,
    wrongDisplacement,
  }
}
