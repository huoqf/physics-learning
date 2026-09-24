import { useMemo } from 'react'
import { wavelengthFromFrequency, formatWavelength, formatFrequency } from '@/physics'

/**
 * 固定绘图窗口的真实长度 (m)。
 *
 * 中屏 x 轴标注为 0 → WAVE_WINDOW_METERS（真实长度），波长**按真实比例**映射为像素，
 * 因此"增大频率 → 波长变短 → 窗口内波数变多"这一条 c = λf 的定量关系
 * 在画面上一眼可见，无需在 SVG 内写任何文字解释。
 */
export const WAVE_WINDOW_METERS = 3.0

/** 频率可调范围 (MHz)：λ ∈ [0.3 m, 3 m] → 窗口内 1~10 个完整波长，全程清晰可读 */
export const EM_WAVE_FREQ_MIN_MHZ = 100
export const EM_WAVE_FREQ_MAX_MHZ = 1000
export const EM_WAVE_FREQ_DEFAULT_MHZ = 100

/**
 * 采样点数。
 *
 * 最密工况（1000 MHz，窗口内 10 个波长）需 ≥ 32 点/波长才能保证曲线光滑，
 * 故取 320 点。曲线为静态整段曲线，不随时间增长，采样数恒定。
 */
const SAMPLES = 320

/** 视觉周期 (s)：与物理频率解耦，只控制"波峰行进"的观感速度，不参与任何物理计算 */
const VISUAL_PERIOD = 4

/** 归一化波形上的一个点：x 为窗口内占比 0..1，y ∈ [-1, 1] */
export interface EMWaveSample {
  x: number
  y: number
}

export interface EMWavePhysicsResult {
  /** 频率 (Hz) */
  f: number
  /** 波长 (m) */
  lambda: number
  /** 波长读数（自动单位） */
  lambdaLabel: string
  /** 频率读数（自动单位） */
  freqLabel: string
  /** 窗口内可见的完整波长数 = 窗口长度 / λ */
  wavelengthCount: number
  /** 相位 (rad)：2π·t / VISUAL_PERIOD，仅用于驱动波峰行进 */
  phase: number
  /**
   * 归一化波形。真空中平面电磁波的 E 与 B **同相**，
   * 因此二者共用同一份采样数据，由场景层负责把 B 投影到斜向坐标轴上。
   */
  wave: EMWaveSample[]
}

/**
 * 电磁波波形（真空中平面波，纯几何映射）。
 *
 * 只实现高中要求的定量关系 c = λf：
 *   - λ 由 λ = c / f 求出（复用 physics 层的 wavelengthFromFrequency，禁止重写公式）
 *   - 波形按真实比例铺在固定长度的窗口上
 *
 * 不求解波动方程、不涉及介质中的折射率，振幅为示意常量（高中不作要求）。
 */
export function useEMWavePhysics({ fMHz, time }: { fMHz: number; time: number }): EMWavePhysicsResult {
  return useMemo(() => {
    const safeMHz =
      Number.isFinite(fMHz) && fMHz > 0 ? fMHz : EM_WAVE_FREQ_DEFAULT_MHZ
    const f = safeMHz * 1e6
    const lambda = wavelengthFromFrequency(f)

    const wavelengthCount = WAVE_WINDOW_METERS / lambda
    const phase = (2 * Math.PI * time) / VISUAL_PERIOD

    const wave: EMWaveSample[] = []
    for (let k = 0; k <= SAMPLES; k++) {
      const x = k / SAMPLES
      wave.push({ x, y: Math.sin(2 * Math.PI * (wavelengthCount * x) - phase) })
    }

    return {
      f,
      lambda,
      lambdaLabel: formatWavelength(lambda),
      freqLabel: formatFrequency(f),
      wavelengthCount,
      phase,
      wave,
    }
  }, [fMHz, time])
}
