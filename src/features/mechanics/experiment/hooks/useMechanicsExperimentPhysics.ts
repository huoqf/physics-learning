import { useMemo } from 'react'

export interface UseMechanicsExperimentPhysicsParams {
  /** 实验模式: 0 - 打点计时器与纸带 | 1 - 光电门测速 | 2 - 胡克定律 */
  mode: number
  /** 初速度 v0 (m/s) */
  v0?: number
  /** 加速度 a (m/s²) */
  a?: number
  /** 打点频率 freq (Hz, 默认 50Hz) */
  freq?: number
  /** 遮光条宽度 d (m, 默认 0.01m) */
  d?: number
  /** 弹簧劲度系数 k (N/m, 默认 100N/m) */
  k?: number
  /** 钩码质量 m (kg, 默认 0.2kg) */
  m?: number
  /** 动画当前累计时间 time (s) */
  time: number
}

export interface MechanicsExperimentPhysicsResult {
  /** 当前主移动物体的物理位置 x (m) */
  x: number
  /** 当前主移动物体的物理速度 v (m/s) */
  v: number
  /** 模式0: 纸带打点相对像素位置数组 (px) */
  tapeDots: number[]
  /** 模式0: 逐差法计算得到的加速度 a (m/s²) */
  aCalculated: number
  /** 模式1: 光电门 1 遮光时间 Δt1 (ms) */
  dt1Ms: number
  /** 模式1: 光电门 2 遮光时间 Δt2 (ms) */
  dt2Ms: number
  /** 模式1: 光电门 1 是否处于遮光感应状态 */
  isBlocked1: boolean
  /** 模式1: 光电门 2 是否处于遮光感应状态 */
  isBlocked2: boolean
  /** 模式2: 弹簧伸长量 Δx (m) */
  deltaX: number
  /** 模式2: 弹簧受到的弹力/拉力 F (N) */
  F: number
}

/**
 * 高考力学实验基础 - 纯物理计算 Hook
 * 计算打点纸带点集、逐差法加速度、光电门遮光时间与胡克定律弹簧形变
 */
export function useMechanicsExperimentPhysics({
  mode: _mode,
  v0 = 1.0,
  a = 1.5,
  freq = 50,
  d = 0.01,
  k = 100,
  m = 0.2,
  time,
}: UseMechanicsExperimentPhysicsParams): MechanicsExperimentPhysicsResult {
  return useMemo(() => {
    const T = 1 / Math.max(1, freq) // 打点周期 T (s)
    const g = 9.8

    // 1. 运动学基础位置 x 与速度 v (限制有效实验轨道长度 xMax = 1.2m)
    const xMax = 1.2
    const tEnd = a > 0
      ? (-v0 + Math.sqrt(Math.max(0, v0 * v0 + 2 * a * xMax))) / a
      : (v0 > 0 ? xMax / v0 : 3.0)

    const effectiveTime = Math.min(time, tEnd)
    const isReachedEnd = time >= tEnd
    const x = Math.min(xMax, v0 * effectiveTime + 0.5 * a * effectiveTime * effectiveTime)
    const v = isReachedEnd ? 0 : v0 + a * effectiveTime

    // 2. 模式 0：打点纸带点迹计算 (高考标准: 每 5 个打点取 1 个计数点，计数点周期 T_count = 5 * T)
    const Tcount = 5 * T
    const pxPerMeter = 500
    const tapeDots: number[] = []
    for (let kStep = 0; kStep <= 6; kStep++) {
      const tStep = kStep * Tcount
      if (tStep <= time) {
        // 打点时刻小车位移 x_k，在当前时刻 time 处，该点距离打点计时器出口的相对像素为 (x - x_k) * pxPerMeter
        const xK = v0 * tStep + 0.5 * a * tStep * tStep
        const dotDistPx = (x - xK) * pxPerMeter
        tapeDots.push(dotDistPx)
      }
    }

    // 逐差法计算加速度: a_calc = [(s456) - (s123)] / (9 * T_count^2)
    let aCalculated = a
    if (tapeDots.length >= 7) {
      const s123 = (tapeDots[0] - tapeDots[3]) / pxPerMeter
      const s456 = (tapeDots[3] - tapeDots[6]) / pxPerMeter
      aCalculated = (s456 - s123) / (9 * Tcount * Tcount)
    }

    // 3. 模式 1：光电门测速与遮光感应
    // 光电门 1 放置在 x1 = 0.3m 处，光电门 2 放置在 x2 = 0.8m 处
    // 车顶遮光条中心在小车内部相对偏移 +0.05m
    const flagOffset = 0.05
    const flagX = x + flagOffset
    const photogate1X = 0.3
    const photogate2X = 0.8

    // 到达遮光位置的速度与遮光时间
    const v1AtGate = Math.sqrt(Math.max(0, v0 * v0 + 2 * a * Math.max(0, photogate1X - flagOffset)))
    const v2AtGate = Math.sqrt(Math.max(0, v0 * v0 + 2 * a * Math.max(0, photogate2X - flagOffset)))

    // 触发与锁存：小车到达/通过光电门前显示 0，到达/通过后锁存显示遮光时间 Δt
    const dt1Ms = flagX >= photogate1X - d / 2 ? (d / Math.max(0.01, v1AtGate)) * 1000 : 0
    const dt2Ms = flagX >= photogate2X - d / 2 ? (d / Math.max(0.01, v2AtGate)) * 1000 : 0

    // 判断遮光条中心是否正处于光电门感应区
    const isBlocked1 = flagX >= photogate1X - d / 2 && flagX <= photogate1X + d / 2
    const isBlocked2 = flagX >= photogate2X - d / 2 && flagX <= photogate2X + d / 2

    // 4. 模式 2：胡克定律弹簧形变与弹力
    const F = m * g
    const deltaX = F / Math.max(1, k)

    return {
      x,
      v,
      tapeDots,
      aCalculated: parseFloat(aCalculated.toFixed(3)),
      dt1Ms: parseFloat(dt1Ms.toFixed(2)),
      dt2Ms: parseFloat(dt2Ms.toFixed(2)),
      isBlocked1,
      isBlocked2,
      deltaX,
      F: parseFloat(F.toFixed(2)),
    }
  }, [v0, a, freq, d, k, m, time])
}
