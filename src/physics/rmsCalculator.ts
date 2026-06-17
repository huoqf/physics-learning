/**
 * rmsCalculator.ts — 交变电流有效值与热量纯函数计算模块
 *
 * 采用解析式分段精确计算，弃用逐帧数值积分，确保数据绝对精准。
 * 无副作用，不依赖 React/DOM/window。
 *
 * @category M4
 */

/** 波形类型枚举 */
export type WaveformType = 'sine' | 'square' | 'pulse' | 'half_sine'

/** 波形参数输入 */
export interface WaveformParams {
  /** 波形类型 */
  type: WaveformType
  /** 交流峰值 (A) */
  Im: number
  /** 负载电阻 (Ω) */
  R: number
  /** 物理周期 (s) */
  period: number
  /** 当前学生调节的直流电流 (A) */
  dcCurrent: number
  /** 脉冲波占空比，仅 pulse 模式使用 (0.05~0.95) */
  duty?: number
}

/** 热效应计算结果 */
export interface ThermalResult {
  /** 交流累计产生热量 (J) */
  Q_ac: number
  /** 直流累计产生热量 (J) */
  Q_dc: number
  /** AC 容器温度 (°C) */
  T_ac: number
  /** DC 容器温度 (°C) */
  T_dc: number
  /** 理论有效值 (A) */
  I_eff: number
}

/**
 * 将占空比 clamp 到合法区间 [0.05, 0.95]。
 * @param duty 原始占空比
 * @returns 安全占空比值
 */
function clampDuty(duty?: number): number {
  if (typeof duty !== 'number' || Number.isNaN(duty)) {
    return 0.25
  }
  return Math.min(0.95, Math.max(0.05, duty))
}

/**
 * 获取交变电流的理论有效值。
 *
 * 各波形公式：
 * - sine:     I_eff = Im / √2
 * - half_sine: I_eff = Im / 2
 * - square:   I_eff = Im（正负对称方波，i²恒为 Im²）
 * - pulse:    I_eff = Im · √D
 *
 * @param params 波形参数
 * @returns 理论有效值 (A)
 */
export function getEffectiveCurrent(params: WaveformParams): number {
  const { type, Im, duty } = params

  switch (type) {
    case 'sine':
      return Im / Math.SQRT2
    case 'half_sine':
      return Im / 2
    case 'square':
      return Im
    case 'pulse': {
      const D = clampDuty(duty)
      return Im * Math.sqrt(D)
    }
    default:
      return 0
  }
}

/**
 * 计算任意时刻的完整热效应物理状态（解析式分段精确计算）。
 *
 * 物理模型：
 *   交流回路热量 Q_ac = ∫₀ᵗ i²(τ)R dτ（解析求解）
 *   直流回路热量 Q_dc = I_dc²·R·t（严格线性）
 *   温度反馈 T = T₀ + Q / C（虚拟等效热容 C=100 J/°C）
 *
 * @param time 当前时刻 (s)
 * @param params 波形参数
 * @returns 包含 Q_ac, Q_dc, T_ac, T_dc, I_eff 的完整状态对象
 */
export function getTheoreticalThermalState(
  time: number,
  params: WaveformParams
): ThermalResult {
  const { type, Im, R, period, dcCurrent } = params

  // 完整周期数与余下时间
  const n = Math.floor(time / period)
  const tRem = time % period

  // 直流箱热量累积（严格线性：Q_dc = Idc²·R·t）
  const Q_dc = dcCurrent * dcCurrent * R * time

  // 交流箱热量：先计算每完整周期的发热量，再计算余下不完整周期
  let Q_acPerPeriod = 0
  let Q_acRem = 0

  switch (type) {
    case 'sine': {
      // ∫₀ᵀ Im²sin²(ωt)R dt = Im²·R·T/2
      Q_acPerPeriod = 0.5 * Im * Im * R * period
      // ∫₀ᵗRem Im²sin²(ωτ)R dτ = Im²·R·(tRem/2 - T·sin(4π·tRem/T)/(8π))
      Q_acRem =
        Im *
        Im *
        R *
        (tRem / 2 -
          (period * Math.sin((4 * Math.PI * tRem) / period)) /
            (8 * Math.PI))
      break
    }

    case 'half_sine': {
      // 前半周期有正弦电流，后半周期截止（i=0）
      Q_acPerPeriod = 0.25 * Im * Im * R * period
      if (tRem <= period / 2) {
        // 前半周：同正弦公式
        Q_acRem =
          Im *
          Im *
          R *
          (tRem / 2 -
            (period * Math.sin((4 * Math.PI * tRem) / period)) /
              (8 * Math.PI))
      } else {
        // 后半周截止，热量保持水平不上升
        Q_acRem = Q_acPerPeriod
      }
      break
    }

    case 'square': {
      // 正负对称方波：i²恒为 Im²，Q = Im²·R·T
      Q_acPerPeriod = Im * Im * R * period
      Q_acRem = Im * Im * R * tRem
      break
    }

    case 'pulse': {
      // 单极性矩形脉冲波：仅在 DT 时间内有电流
      const D = clampDuty(params.duty)
      const activeTime = D * period
      Q_acPerPeriod = Im * Im * R * activeTime
      Q_acRem = Im * Im * R * Math.min(tRem, activeTime)
      break
    }
  }

  // 总热量 = 完整周期数 × 每周期热量 + 余下时间热量
  const Q_ac = n * Q_acPerPeriod + Q_acRem

  // 量热器物理模型
  const C = 100 // 虚拟等效热容 (J/°C)
  const initialTemperature = 20 // 初始温度 (°C)

  return {
    Q_ac,
    Q_dc,
    T_ac: initialTemperature + Q_ac / C,
    T_dc: initialTemperature + Q_dc / C,
    I_eff: getEffectiveCurrent(params),
  }
}

/**
 * 判断当前时刻是否接近整数周期终点。
 *
 * 由于交变电流发热具有波动性，中途对比无物理意义。
 * 仅在 t = nT 的周期终点触发判定。
 *
 * @param time 当前时刻 (s)
 * @param period 周期 (s)
 * @returns 是否在 2% 容差窗口内
 */
export function isNearPeriodEnd(time: number, period: number): boolean {
  const tRem = time % period
  const epsilon = 0.02 * period // 2% 周期容差窗口
  return tRem < epsilon || period - tRem < epsilon
}

/**
 * 判断直流电流是否与交流有效值等效成功。
 *
 * 成功条件：
 * 1. I_dc 在 I_eff 的 2% 误差范围内
 * 2. 当前时刻在整数周期终点附近
 *
 * @param dcCurrent 当前直流电流 (A)
 * @param I_eff 理论有效值 (A)
 * @param time 当前时刻 (s)
 * @param period 周期 (s)
 * @returns 是否等效成功
 */
export function checkEquivalence(
  dcCurrent: number,
  I_eff: number,
  time: number,
  period: number
): boolean {
  const currentError = Math.abs(dcCurrent - I_eff)
  const tolerance = Math.max(0.02 * I_eff, 0.02)
  return currentError <= tolerance && isNearPeriodEnd(time, period)
}
