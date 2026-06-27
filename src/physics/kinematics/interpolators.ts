import { calculateAcceleratedMotion } from './base'
import type { FreeFallTrajectoryPoint, VariableMotionTrajectoryPoint } from './trajectory'

/**
 * 自由落体轨迹插值状态
 * @property y 位置 (m)
 * @property v 速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property fDrag 空气阻力 (N)
 * @property swayAngle 摆动角度 (rad)
 * @property swayDx 摆动水平偏移 (px)
 * @property isLanded 是否已落地
 */
export interface FreeFallState {
  y: number
  v: number
  a: number
  fDrag: number
  swayAngle: number
  swayDx: number
  isLanded: boolean
}

/**
 * 根据时间从预计算离散轨迹点中插值出自由落体状态
 *
 * 时间复杂度 O(1)：通过 samplingInterval 直接计算数组索引，再做线性插值。
 *
 * @param points 预计算轨迹点数组（由 precomputeFreeFallWithDrag 生成）
 * @param time 查询时刻 (s)
 * @param groundTime 落地时刻 (s)
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 * @returns 插值后的自由落体状态
 */
export function getPhysicsAtTime(
  points: FreeFallTrajectoryPoint[],
  time: number,
  groundTime: number,
  samplingInterval: number = 0.01
): FreeFallState {
  if (points.length === 0) {
    return { y: 0, v: 0, a: 0, fDrag: 0, swayAngle: 0, swayDx: 0, isLanded: false }
  }

  // 落地边界截断
  if (time >= groundTime) {
    const last = points[points.length - 1]
    return {
      y: last.y,
      v: 0, // 落地后速度归零
      a: 0,
      fDrag: 0,
      swayAngle: 0,
      swayDx: 0,
      isLanded: true
    }
  }

  if (time <= 0) {
    const first = points[0]
    return {
      y: first.y,
      v: first.v,
      a: first.a,
      fDrag: first.fDrag,
      swayAngle: first.swayAngle,
      swayDx: first.swayDx,
      isLanded: false
    }
  }

  // 索引定位 + 线性插值
  const idx = Math.floor(time / samplingInterval)

  if (idx >= points.length - 1) {
    const last = points[points.length - 1]
    return {
      y: last.y,
      v: last.v,
      a: last.a,
      fDrag: last.fDrag,
      swayAngle: last.swayAngle,
      swayDx: last.swayDx,
      isLanded: false
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const tDiff = p1.t - p0.t
  const ratio = tDiff > 0 ? (time - p0.t) / tDiff : 0

  return {
    y: p0.y + (p1.y - p0.y) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    fDrag: p0.fDrag + (p1.fDrag - p0.fDrag) * ratio,
    swayAngle: p0.swayAngle + (p1.swayAngle - p0.swayAngle) * ratio,
    swayDx: p0.swayDx + (p1.swayDx - p0.swayDx) * ratio,
    isLanded: false
  }
}

/**
 * 变速运动轨迹插值状态
 * @property x 位置 (m)
 * @property v 速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property s 累计路程 (m)
 */
export interface VariableMotionState {
  x: number
  v: number
  a: number
  s: number
}

/**
 * 根据时间从预计算离散轨迹点中插值出变速运动状态
 *
 * 时间复杂度 O(1)：通过 samplingInterval 直接计算数组索引，再做线性插值。
 *
 * @param points 预计算轨迹点数组（由 precomputeVariableMotion 生成）
 * @param time 查询时刻 (s)
 * @param tMax 最大预计算时间 (s)
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 * @returns 插值后的变速运动状态
 */
export function getVariablePhysicsAtTime(
  points: VariableMotionTrajectoryPoint[],
  time: number,
  tMax: number,
  samplingInterval: number = 0.01
): VariableMotionState {
  if (points.length === 0) {
    return { x: 0, v: 0, a: 0, s: 0 }
  }

  // 边界截断
  if (time >= tMax) {
    const last = points[points.length - 1]
    return {
      x: last.x,
      v: last.v,
      a: last.a,
      s: last.s
    }
  }

  if (time <= 0) {
    const first = points[0]
    return {
      x: first.x,
      v: first.v,
      a: first.a,
      s: first.s
    }
  }

  // 索引定位 + 线性插值
  const idx = Math.floor(time / samplingInterval)

  if (idx >= points.length - 1) {
    const last = points[points.length - 1]
    return {
      x: last.x,
      v: last.v,
      a: last.a,
      s: last.s
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const tDiff = p1.t - p0.t
  const ratio = tDiff > 0 ? (time - p0.t) / tDiff : 0

  return {
    x: p0.x + (p1.x - p0.x) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    s: p0.s + (p1.s - p0.s) * ratio
  }
}

/**
 * 匀变速运动频闪点
 * @property time 时刻 (s)
 * @property velocity 速度 (m/s)
 * @property displacement 位移 (m)
 */
export interface FlashPoint {
  time: number
  velocity: number
  displacement: number
}

/**
 * v-t 图数据点
 * @property x 时间 (s)
 * @property y 速度 (m/s)
 */
export interface VtChartPoint {
  x: number
  y: number
}

/**
 * 匀变速直线运动物理计算结果
 * @property v0 初速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property v 当前速度 (m/s)
 * @property s 当前位移 (m)
 * @property flashPoints 频闪点数组
 * @property vtChartData v-t 图数据点数组
 */
export interface UniformAccelerationPhysicsData {
  v0: number
  a: number
  v: number
  s: number
  flashPoints: FlashPoint[]
  vtChartData: VtChartPoint[]
}

/** 频闪点默认间隔 (s) */
const DEFAULT_FLASH_INTERVAL = 0.5
/** 频闪点最大数量 */
const MAX_FLASH_POINTS = 20

/**
 * 计算匀变速直线运动的完整物理数据（频闪点 + v-t 图）
 *
 * 纯计算函数，不依赖 React。可被 Hook 包装以实现 useMemo 缓存。
 *
 * @param v0 初速度 (m/s)
 * @param a 加速度 (m/s²)
 * @param time 当前时刻 (s)
 * @param flashInterval 频闪间隔 (s)，默认 0.5
 * @returns 匀变速运动物理数据
 */
export function computeUniformAccelerationData(
  v0: number,
  a: number,
  time: number,
  flashInterval: number = DEFAULT_FLASH_INTERVAL
): UniformAccelerationPhysicsData {
  const { v, s } = calculateAcceleratedMotion(v0, a, time)

  // 频闪点计算：按 flashInterval 采样到当前时间
  const flashPoints: FlashPoint[] = []
  if (flashInterval > 0) {
    const count = Math.min(Math.floor(time / flashInterval), MAX_FLASH_POINTS)
    for (let i = 0; i <= count; i++) {
      const t = i * flashInterval
      const result = calculateAcceleratedMotion(v0, a, t)
      flashPoints.push({ time: t, velocity: result.v, displacement: result.s })
    }
  }

  // v-t 图数据：固定绘制 0~8s，保证图表稳定
  const vtChartData: VtChartPoint[] = []
  const dt = 0.1
  const totalT = 8
  for (let t = 0; t <= totalT + dt; t += dt) {
    const { v: vel } = calculateAcceleratedMotion(v0, a, t)
    vtChartData.push({ x: parseFloat(t.toFixed(1)), y: vel })
  }

  return {
    v0,
    a,
    v,
    s,
    flashPoints,
    vtChartData,
  }
}
