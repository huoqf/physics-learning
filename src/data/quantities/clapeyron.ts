/**
 * 理想气体状态方程（Clapeyron 方程扩展）物理量看板数据构建。
 */
import { solveClapeyron, computePVTratio, computeTotalKineticEnergy } from '../../physics/clapeyron'
import { THERMO_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

const N_DEFAULT = 1

export function buildClapeyronQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-clapeyron') return null

  const V = params.V ?? 5e-3
  const T = params.T ?? 300
  const P = solveClapeyron({ key: 'V', value: V }, { key: 'T', value: T }, 'P', N_DEFAULT)
  const PVoverT = computePVTratio(P, V, T)
  const totalKE = computeTotalKineticEnergy(T, N_DEFAULT)

  return {
    quantities: [
      { label: '压强 P', value: P > 1000 ? (P / 1000).toFixed(1) : P.toFixed(0), unit: P > 1000 ? 'kPa' : 'Pa', color: THERMO_COLORS.pressure },
      { label: '体积 V', value: (V * 1000).toFixed(1), unit: 'L', color: THERMO_COLORS.volume },
      { label: '温度 T', value: T.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: 'PV/T', value: PVoverT.toFixed(2), unit: 'J/K' },
      { label: '全分子总动能', value: totalKE > 1000 ? (totalKE / 1000).toFixed(1) : totalKE.toFixed(0), unit: totalKE > 1000 ? 'kJ' : 'J' },
    ],
    formulas: [
      {
        name: '克拉珀龙方程',
        latex: '\\dfrac{P_1 V_1}{T_1} = \\dfrac{P_2 V_2}{T_2}',
        level: 'core',
        condition: '一定质量的理想气体',
        note: 'PV/T = nR = const（等质量理想气体）',
      },
      {
        name: '全分子总动能',
        latex: 'E_k = \\dfrac{3}{2} nRT',
        level: 'important',
        condition: '理想气体，T 为热力学温度',
      },
      {
        name: '温度转换',
        latex: 'T(\\text{K}) = t(°C) + 273.15',
        level: 'derived',
        note: '热力学温度与摄氏温度的换算',
      },
    ],
    gaokaoPoints: [
      { text: '大题压轴 ★★★★★：变质量气体问题（充气、抽气、分装）转化为等质量气体方程处理的建模思维。', importance: 'gaokao' },
      { text: 'PV/T 比值恒定是判断状态变化是否符合理想气体方程的关键。', importance: 'core' },
    ],
    warnings: [
      { text: '公式中的 T 必须是热力学温度（K），任何时候禁止代入摄氏度 ℃ 进行乘除运算！', level: 'danger' },
      { text: 'PV/T = nR 中的 n 是气体的物质的量，变质量问题需先转化为等质量问题。', level: 'warning' },
    ],
  }
}
