import { useMemo } from 'react'
import {
  solveResistivityExperiment,
  RESISTIVITY_NICHROME,
  type ResistivityExperimentResult,
} from '@/physics/experimentResistivity'

export interface UseExperimentResistivityOptions {
  /** 金属丝接入有效长度 (m)，范围 0.1 ~ 0.8 */
  L: number
  /** 金属丝直径 (mm)，如 0.600 mm */
  d_mm: number
  /** 接线方式: 0 为外接法(电流表外接), 1 为内接法(电流表内接) */
  wiring: number
  /** 滑动变阻器接入阻值 (Ω)，范围 5 ~ 50 */
  R_slider: number
  /** 是否显示真实值与测量值理论对比 */
  showTheoretical: boolean
}

export { RESISTIVITY_NICHROME }

/**
 * 「测量金属丝的电阻率」实验状态。
 *
 * 本 Hook 只负责把左屏参数送进 `@/physics/experimentResistivity` 的单一可信源求解器，
 * 不再自行复刻任何公式——右屏看板（data/quantities/experimentResistivity.ts）与
 * 中屏 R-L 图（ExperimentResistivityCenterExtra）消费的是同一个 `solveResistivityExperiment`，
 * 从而保证「拟合斜率 k」「反推 ρ」「回路电流 I」三者天然自洽。
 */
export function useExperimentResistivityPhysics({
  L,
  d_mm,
  wiring,
  R_slider,
  showTheoretical,
}: UseExperimentResistivityOptions): ResistivityExperimentResult & { showTheoretical: boolean } {
  return useMemo(
    () => ({
      ...solveResistivityExperiment({ L, d_mm, wiring, R_slider }),
      showTheoretical,
    }),
    [L, d_mm, wiring, R_slider, showTheoretical],
  )
}
