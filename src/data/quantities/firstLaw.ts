/**
 * 热力学第一定律物理量看板数据构建。
 */
import { calculateInternalEnergy } from '../../physics/thermodynamics'
import { deltaUtoDeltaT } from '../../physics/firstLaw'
import { FIRST_LAW_COLORS } from '@/theme/physics/firstLawColors'
import { THERMO_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

const N_DEFAULT = 1
const CV_DEFAULT = 12.47 // 单原子定容摩尔热容

export function buildFirstLawQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-first-law') return null

  const W = params.W ?? 0
  const Q_raw = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0
  const effectiveQ = adiabatic ? 0 : Q_raw
  const T = params.T ?? 300

  const { deltaU } = calculateInternalEnergy(effectiveQ, W)
  const deltaT = deltaUtoDeltaT(deltaU, N_DEFAULT, CV_DEFAULT)

  return {
    quantities: [
      { label: '外界做功', symbol: 'W', value: W, unit: 'J', color: FIRST_LAW_COLORS.work,
        highlight: W > 0 ? 'positive' : W < 0 ? 'negative' : 'zero' },
      { label: '吸收热量', symbol: 'Q', value: effectiveQ, unit: 'J', color: FIRST_LAW_COLORS.heat,
        highlight: effectiveQ > 0 ? 'positive' : effectiveQ < 0 ? 'negative' : 'zero' },
      { label: '内能增量', symbol: 'ΔU', value: deltaU, unit: 'J', color: FIRST_LAW_COLORS.internalEnergy,
        highlight: deltaU > 0 ? 'positive' : deltaU < 0 ? 'negative' : 'zero' },
      { label: '温度变化', symbol: 'ΔT', value: deltaT.toFixed(1), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '初始温度', symbol: 'T', value: T.toFixed(0), unit: 'K' },
    ],
    formulas: [
      {
        name: '热力学第一定律',
        latex: '\\Delta U = W + Q',
        level: 'core',
        condition: '一切热力学过程',
      },
      {
        name: '理想气体内能',
        latex: '\\Delta U = nC_V \\Delta T',
        level: 'important',
        condition: '一定质量理想气体',
      },
      {
        name: '等压过程功',
        latex: 'W = -p \\Delta V',
        level: 'important',
        condition: '等压过程',
      },
      {
        name: '等容过程功',
        latex: 'W = 0',
        level: 'derived',
        condition: '等容过程',
      },
    ],
    gaokaoPoints: [
      { text: '正负号铁律：外界对气体做功 W>0，气体对外界做功 W<0；气体吸热 Q>0，气体放热 Q<0；内能增加 ΔU>0，内能减少 ΔU<0。', importance: 'gaokao' },
      { text: '结合理想气体状态方程，判定 ΔU、W、Q 的正负号与大小定量计算。', importance: 'gaokao' },
      { text: '绝热过程中 Q=0，外界对气体做功全部转化为内能增加。', importance: 'hard' },
      { text: '做功和传热是改变内能的两种等效方式。', importance: 'core' },
    ],
    warnings: [
      { text: 'W 和 Q 的正负号是高考核心考点，必须严格遵循符号规定！', level: 'danger' },
      { text: '绝热气缸不是"温度不变"，而是"无热量交换"。', level: 'warning' },
      { text: 'ΔU = W + Q 中 W 是外界对系统做功，不是系统对外做功。', level: 'info' },
    ],
  }
}
