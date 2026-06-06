import { useMemo } from 'react'
import { calculateAcceleratedMotion } from '@/physics'

const DEFAULT_FLASH_INTERVAL = 0.5
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
  v0: number
  a: number
  v: number
  s: number
  flashPoints: FlashPoint[]
  vtChartData: VtChartPoint[]
}

/**
 * 匀变速直线运动物理计算 Hook
 *
 * 纯物理计算，不截断。v = v₀ + at 对所有 t 成立，
 * 物体减速过零后反向运动是匀变速的正常行为。
 * "刹车死区"仅作为高考审题陷阱提示，不影响物理计算。
 */
export function useUniformAccelerationPhysics(
  v0: number,
  a: number,
  time: number,
  flashInterval: number = DEFAULT_FLASH_INTERVAL
): UniformAccelerationPhysicsData {
  const { v, s } = calculateAcceleratedMotion(v0, a, time)

  // 频闪点计算：按 flashInterval 采样到当前时间
  const flashPoints = useMemo(() => {
    const points: FlashPoint[] = []
    if (flashInterval <= 0) return points
    const count = Math.min(Math.floor(time / flashInterval), MAX_FLASH_POINTS)
    for (let i = 0; i <= count; i++) {
      const t = i * flashInterval
      const result = calculateAcceleratedMotion(v0, a, t)
      points.push({ time: t, velocity: result.v, displacement: result.s })
    }
    return points
  }, [time, flashInterval, v0, a])

  // v-t 图数据：固定绘制 0~8s，保证图表稳定
  const vtChartData = useMemo(() => {
    const points: VtChartPoint[] = []
    const dt = 0.1
    const totalT = 8
    for (let t = 0; t <= totalT + dt; t += dt) {
      const { v } = calculateAcceleratedMotion(v0, a, t)
      points.push({ x: parseFloat(t.toFixed(1)), y: v })
    }
    return points
  }, [v0, a])

  return {
    v0,
    a,
    v,
    s,
    flashPoints,
    vtChartData,
  }
}
