/**
 * 气体实验三定律物理量看板数据构建。
 */
import { computeBoylePressure, computeCharlesPressure } from '../../physics/gasLaws'
import { THERMO_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

const N_DEFAULT = 1

export function buildGasLawsQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-gas-laws') return null

  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  let P: number
  if (mode === 0) {
    P = computeBoylePressure(V, T, N_DEFAULT)
  } else if (mode === 1) {
    P = computeBoylePressure(V, T, N_DEFAULT)
  } else {
    P = computeCharlesPressure(T, V, N_DEFAULT)
  }

  const PV = P * V

  const lawName = mode === 0 ? '玻意耳定律' : mode === 1 ? '盖-吕萨克定律' : '查理定律'
  const lawFormula = mode === 0
    ? 'PV = C \\quad (T \\text{恒定})'
    : mode === 1
      ? '\\dfrac{V}{T} = C \\quad (P \\text{恒定})'
      : '\\dfrac{P}{T} = C \\quad (V \\text{恒定})'

  return {
    quantities: [
      { label: '压强 P', value: P > 1000 ? (P / 1000).toFixed(1) : P.toFixed(0), unit: P > 1000 ? 'kPa' : 'Pa', color: THERMO_COLORS.pressure },
      { label: '体积 V', value: (V * 1000).toFixed(1), unit: 'L', color: THERMO_COLORS.volume },
      { label: '温度 T', value: T.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '物质的量 n', value: N_DEFAULT.toFixed(1), unit: 'mol' },
      { label: 'PV 乘积', value: PV > 1000 ? (PV / 1000).toFixed(1) : PV.toFixed(0), unit: PV > 1000 ? 'kJ' : 'J' },
    ],
    formulas: [
      {
        name: '理想气体状态方程',
        latex: 'PV = nRT',
        level: 'core',
        condition: '一定质量的理想气体',
        note: 'R = 8.314 J/(mol·K) 为理想气体常量',
      },
      {
        name: lawName,
        latex: lawFormula,
        level: 'important',
        condition: mode === 0 ? '温度 T 恒定' : mode === 1 ? '压强 P 恒定' : '体积 V 恒定',
      },
      {
        name: '温度转换',
        latex: 'T(\\text{K}) = t(°C) + 273.15',
        level: 'derived',
        note: '热力学温度与摄氏温度的换算',
      },
    ],
    gaokaoPoints: [
      { text: '转换各种状态图线：PV 等温线为双曲线，VT 等压线为过原点直线，PT 等容线为过原点直线。', importance: 'gaokao' },
      { text: '图像外推线必须过绝对零度（-273.15°C），热力学温度 T 不能为负。', importance: 'hard' },
      { text: '一定质量的理想气体，三个状态参量 P、V、T 中任意两个确定，第三个随之确定。', importance: 'core' },
    ],
    warnings: [
      { text: 'T 必须使用热力学温度 K，不能直接用摄氏温度 ℃！', level: 'danger' },
      { text: '等温线是双曲线（反比关系），不是直线！', level: 'warning' },
      { text: '玻意耳定律 PV=C 中的 C 与温度有关，不同温度对应不同等温线。', level: 'info' },
    ],
  }
}
