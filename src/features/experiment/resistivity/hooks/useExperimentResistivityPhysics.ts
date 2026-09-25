import { useMemo } from 'react'
import {
  calcTheoreticalResistance,
  calcMeasuredResistance,
  calcResistivityFromSlope,
} from '@/physics/experimentResistivity'

export interface UseExperimentResistivityOptions {
  /** 金属丝接入有效长度 (m)，范围 0.1 ~ 0.8 */
  L: number
  /** 金属丝直径 (mm)，如 0.600 mm */
  d_mm: number
  /** 接线方式: 0 为外接法(电流表外接), 1 为内接法(电流表内接) */
  wiring: number
  /** 滑动变阻器分压/限流参数 (Ω)，范围 5 ~ 50 */
  R_slider: number
  /** 是否显示真实值与测量值理论对比 */
  showTheoretical: boolean
}

// 常见合金电阻率基准 (Ω·m)
export const RESISTIVITY_NICHROME = 1.0e-6 // 镍铬合金

export function useExperimentResistivityPhysics({
  L,
  d_mm,
  wiring,
  R_slider,
  showTheoretical,
}: UseExperimentResistivityOptions) {
  return useMemo(() => {
    const clampedL = Math.min(Math.max(L, 0.1), 0.8)
    const clampedD_mm = Math.min(Math.max(d_mm, 0.2), 1.2)
    const d_m = clampedD_mm * 1e-3
    const wiringMode = (wiring === 1 ? 1 : 0) as 0 | 1

    // 电源与电表参数
    const E_source = 4.0 // 电源电动势 4V
    const r_source = 0.5 // 电源内阻 0.5Ω
    const RV = 3000 // 电压表内阻 3000Ω
    const RA = 0.5 // 电流表内阻 0.5Ω

    // 真实金属丝电阻 (Ω)
    const Rx_real = calcTheoreticalResistance(RESISTIVITY_NICHROME, clampedL, d_m)

    // 等效测量电阻 (考虑外接/内接电表内阻影响)
    const Rx_meas = calcMeasuredResistance(Rx_real, wiringMode, RV, RA)

    // 电路工作状态（滑动变阻器限流接法）
    // 回路总等效阻抗
    const R_total = Rx_meas + R_slider + r_source
    const currentA = E_source / R_total
    const voltageV = currentA * Rx_meas

    // 由测量电阻计算出的单点表观电阻率
    const rho_meas = (Rx_meas * Math.PI * d_m * d_m) / (4 * clampedL)

    // 理论 R-L 真实斜率
    const k_real = (4 * RESISTIVITY_NICHROME) / (Math.PI * d_m * d_m)

    // 测量 R-L 表观斜率
    // 外接法：Rx_meas ≈ Rx * (1 - Rx / RV)，因此斜率略低于真实值；
    // 内接法：Rx_meas = Rx + RA，截距为 RA，斜率基本等于真实值，但单点算得的 ρ 偏大。
    const k_meas =
      wiringMode === 0
        ? k_real * (RV / (Rx_real + RV))
        : k_real

    const rho_from_slope = calcResistivityFromSlope(k_meas, d_m)

    return {
      L: clampedL,
      d_mm: clampedD_mm,
      d_m,
      wiring: wiringMode,
      R_slider,
      Rx_real,
      Rx_meas,
      currentA,
      voltageV,
      rho_real: RESISTIVITY_NICHROME,
      rho_meas,
      k_real,
      k_meas,
      rho_from_slope,
      showTheoretical,
      RV,
      RA,
    }
  }, [L, d_mm, wiring, R_slider, showTheoretical])
}
