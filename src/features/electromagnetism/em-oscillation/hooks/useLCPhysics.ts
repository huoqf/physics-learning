import { useMemo } from 'react'
import {
  calculateLCConstants,
  lcChargeAt,
  lcCurrentAt,
  lcElectricEnergy,
  lcMagneticEnergy,
  lcDampingAmplitude,
  sampleLCWaveform,
} from '@/physics'

/** 曲线采样点数（一个周期的采样密度，足够平滑） */
const CURVE_SAMPLES = 240

interface UseLCPhysicsOptions {
  /** 电感 L (H) */
  L: number
  /** 电容 C (F) */
  C: number
  /** 初始电荷量 Q₀ (C) */
  Q0: number
  /** 当前时刻 (s) */
  time: number
  /** 是否叠加阻尼包络（定性） */
  showDamping: boolean
}

/** 曲线上的一个点（x = 时间 s，y = 归一化值） */
export interface LCCurvePoint {
  x: number
  y: number
}

export interface LCPhysicsResult {
  /** 固有量 */
  omega: number
  T: number
  f: number
  eTotal: number
  iMax: number

  /** 瞬时状态 */
  q: number
  i: number
  eElectric: number
  eMagnetic: number

  /** 当前物理时刻 (s) */
  time: number
  /** 归一化瞬时值（用于场景中判定电荷符号与数量） */
  chargeRatio: number

  /** 归一化波形（y ∈ [-1, 1]），覆盖 2 个周期，供图表直接消费 */
  chargeCurve: LCCurvePoint[]
  currentCurve: LCCurvePoint[]
  /** 阻尼振幅包络（y = e^(−t/τ)，y ∈ (0, 1]；仅 showDamping 时非空） */
  dampingCurve: LCCurvePoint[]
  /** 曲线的时间跨度（s）= 2T */
  curveSpan: number
}

/**
 * LC 回路状态（解析解，无内部仿真状态）。
 *
 * 因为 q(t)、i(t) 均为闭式解，本 Hook 是纯派生计算（useMemo），
 * 不需要 useAnimationFrame 逐帧步进 —— 时间轴完全由 store 的 `time` 驱动。
 *
 * 阻尼不在本层实现：只把 `showDamping` 作为 `damped` 标志交给 physics 层，
 * 由 `lcDampingAmplitude`（全链路唯一入口）统一决定振幅如何衰减。
 * 因此"画布上的极板电荷"、"波形曲线"、"能量柱"与"右屏读数"必然同源。
 *
 * 参数在调用侧已保证为正数（paramMeta 的 min 已约束）；此处仍做一次兜底，
 * 避免持久化的旧参数或非法输入导致渲染崩溃。
 */
export function useLCPhysics({
  L,
  C,
  Q0,
  time,
  showDamping,
}: UseLCPhysicsOptions): LCPhysicsResult {
  return useMemo(() => {
    const safeL = L > 0 ? L : 1
    const safeC = C > 0 ? C : 1
    const safeQ0 = Q0 > 0 ? Q0 : 1

    const lc = { L: safeL, C: safeC, Q0: safeQ0, damped: showDamping }
    const { omega, T, f, eTotal, iMax } = calculateLCConstants(lc)

    const q = lcChargeAt(lc, time)
    const i = lcCurrentAt(lc, time)
    const eElectric = lcElectricEnergy(q, safeC)
    const eMagnetic = lcMagneticEnergy(i, safeL)

    // 归一化波形覆盖 2 个周期：q/Q₀ = cos(ωt)·A(t)，i/(ωQ₀) = −sin(ωt)·A(t)。
    // 直接复用 physics 的采样器（其内部已应用阻尼），避免在渲染层重写解析解。
    const curveSpan = 2 * T
    const chargeCurve: LCCurvePoint[] = []
    const currentCurve: LCCurvePoint[] = []
    const dampingCurve: LCCurvePoint[] = []

    for (const sample of sampleLCWaveform(lc, CURVE_SAMPLES, 2)) {
      chargeCurve.push({ x: sample.t, y: sample.q / safeQ0 })
      currentCurve.push({ x: sample.t, y: iMax > 0 ? sample.i / iMax : 0 })
      // 包络与曲线同源：曲线的每个波峰恰好落在包络上
      if (showDamping) dampingCurve.push({ x: sample.t, y: lcDampingAmplitude(sample.t, T) })
    }

    return {
      omega,
      T,
      f,
      eTotal,
      iMax,
      q,
      i,
      time,
      eElectric,
      eMagnetic,
      chargeRatio: q / safeQ0,
      chargeCurve,
      currentCurve,
      dampingCurve,
      curveSpan,
    }
  }, [L, C, Q0, time, showDamping])
}
