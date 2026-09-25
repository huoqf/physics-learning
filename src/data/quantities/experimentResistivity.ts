import type { PhysicsPanelData, ParamDefs } from './types'
import { normalizeParams } from './types'
import {
  calcTheoreticalResistance,
  calcMeasuredResistance,
  calcResistivityFromSlope,
} from '@/physics/experimentResistivity'
import { PHYSICS_COLORS } from '@/theme/physics'

interface ResistivityParams {
  L: number
  d_mm: number
  wiring: number
  R_slider: number
  showTheoretical: number
}

const RESISTIVITY_DEFAULTS: ParamDefs<ResistivityParams> = {
  L: { default: 0.5 },
  d_mm: { default: 0.6 },
  wiring: { default: 0 },
  R_slider: { default: 20 },
  showTheoretical: { default: 1 },
}

export function buildExperimentResistivityQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-experiment-resistivity') return null

  const p = normalizeParams(params, RESISTIVITY_DEFAULTS)
  const d_m = p.d_mm * 1e-3
  const rho_real = 1.0e-6 // 镍铬合金 1.0e-6 Ω·m

  const Rx_real = calcTheoreticalResistance(rho_real, p.L, d_m)
  const Rx_meas = calcMeasuredResistance(Rx_real, p.wiring as 0 | 1)
  const k_ideal = (4 * rho_real) / (Math.PI * d_m * d_m)
  const rho_from_slope = calcResistivityFromSlope(k_ideal, d_m)

  // 1. 物理量展示
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '有效接入长度',
      symbol: 'L',
      value: p.L.toFixed(3),
      unit: 'm',
      color: PHYSICS_COLORS.displacement,
      highlight: 'positive',
    },
    {
      label: '金属丝直径 (螺旋测微)',
      symbol: 'd',
      value: p.d_mm.toFixed(3),
      unit: 'mm',
      color: PHYSICS_COLORS.wavelengthGreen,
    },
    {
      label: '真实电阻理论值',
      symbol: 'Rx(真)',
      value: Rx_real.toFixed(3),
      unit: 'Ω',
      color: PHYSICS_COLORS.potentialEnergy,
    },
    {
      label: '伏安法等效测量阻值',
      symbol: 'Rx(测)',
      value: Rx_meas.toFixed(3),
      unit: 'Ω',
      color: PHYSICS_COLORS.acceleration,
      highlight: p.wiring === 0 ? 'zero' : 'extreme',
    },
    {
      label: '算得电阻率',
      symbol: 'ρ',
      value: (rho_from_slope * 1e6).toFixed(3),
      unit: '×10⁻⁶ Ω·m',
      color: PHYSICS_COLORS.velocity,
    },
  ]

  // 2. 核心公式
  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '电阻定律',
      latex: 'R = \\rho \\frac{L}{S} = \\rho \\frac{4L}{\\pi d^2}',
      condition: '适用于粗细均匀的金属导体',
      level: 'core',
    },
    {
      name: '电阻率计算公式',
      latex: '\\rho = \\frac{\\pi d^2 R}{4L} = \\frac{\\pi d^2 U}{4 I L}',
      condition: '由伏安法测得 U、I，由刻度尺测 L，螺旋测微器测 d',
      level: 'core',
    },
    {
      name: '图像斜率求电阻率',
      latex: 'k = \\frac{\\Delta R}{\\Delta L} = \\frac{4\\rho}{\\pi d^2} \\implies \\rho = \\frac{k \\pi d^2}{4}',
      condition: 'R-L 图像拟合斜率法，可有效消除电表内阻带来的截距系统误差',
      level: 'important',
    },
  ]

  // 3. 高考考点
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '伏安法内/外接选择：因金属丝电阻一般只有几欧姆（小电阻，Rx << √(RA·RV)），必须选用电流表外接法；外接法由于电压表分流导致测量值偏小（Rx(测) < Rx(真)），故计算出的 ρ 偏小。',
      importance: 'gaokao',
    },
    {
      text: '螺旋测微器读数规则：固定刻度读出整毫米数和半毫米刻度，可动刻度读出 50 分度估读值（精确到 0.001 mm，即三位小数）。',
      importance: 'gaokao',
    },
    {
      text: '滑动变阻器选择与接法：一般采用限流式接法以保护电路，同时为使电表读数有较大变化范围，滑动变阻器阻值通常选取与待测电阻相近或略大的规格。',
      importance: 'core',
    },
    {
      text: '有效长度 L 的测量注意：L 必须为接入电路两个接线夹之间的金属丝有效长度，而不是整根金属丝的总长度。',
      importance: 'gaokao',
    },
  ]

  return { quantities, formulas, gaokaoPoints }
}
