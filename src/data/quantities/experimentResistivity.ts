import type { PhysicsPanelData, ParamDefs } from './types'
import { normalizeParams } from './types'
import { solveResistivityExperiment } from '@/physics/experimentResistivity'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

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

  // 与中屏动画 hook、中屏 R-L 图共用同一求解器，保证斜率 / ρ / 电流三者自洽
  const r = solveResistivityExperiment({
    L: p.L,
    d_mm: p.d_mm,
    wiring: p.wiring,
    R_slider: p.R_slider,
  })

  const rhoRelError = r.rho_real > 0 ? ((r.rho_from_slope - r.rho_real) / r.rho_real) * 100 : 0

  // 1. 物理量展示
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '有效接入长度',
      symbol: 'L',
      value: r.L.toFixed(3),
      unit: 'm',
      color: PHYSICS_COLORS.displacement,
      highlight: 'positive',
    },
    {
      label: '金属丝直径 (螺旋测微)',
      symbol: 'd',
      value: r.d_mm.toFixed(3),
      unit: 'mm',
      color: PHYSICS_COLORS.wavelengthGreen,
    },
    {
      label: '变阻器接入阻值',
      symbol: 'R',
      value: r.R_slider.toFixed(1),
      unit: 'Ω',
      color: PHYSICS_COLORS.appliedForce,
    },
    {
      label: '电流表读数',
      symbol: 'I',
      value: r.currentA.toFixed(3),
      unit: 'A',
      color: PHYSICS_COLORS.electricCurrent,
      highlight: 'extreme',
    },
    {
      label: '电压表读数',
      symbol: 'U',
      value: r.voltageV.toFixed(3),
      unit: 'V',
      color: PHYSICS_COLORS.electricPotential,
    },
    {
      label: '真实电阻理论值',
      symbol: 'Rx(真)',
      value: r.Rx_real.toFixed(3),
      unit: 'Ω',
      color: PHYSICS_COLORS.potentialEnergy,
    },
    {
      label: '伏安法等效测量阻值',
      symbol: 'Rx(测)',
      value: r.Rx_meas.toFixed(3),
      unit: 'Ω',
      color: PHYSICS_COLORS.acceleration,
      highlight: r.wiring === 0 ? 'zero' : 'extreme',
    },
    {
      label: 'R-L 图线拟合斜率',
      symbol: 'k',
      value: r.k_meas.toFixed(3),
      unit: 'Ω/m',
      color: PHYSICS_COLORS.emf,
    },
    {
      label: '算得电阻率',
      symbol: 'ρ',
      value: (r.rho_from_slope * 1e6).toFixed(3),
      unit: '×10⁻⁶ Ω·m',
      color: PHYSICS_COLORS.velocity,
    },
    {
      label: '电阻率相对偏差',
      symbol: 'δρ',
      value: `${rhoRelError >= 0 ? '+' : ''}${rhoRelError.toFixed(3)}`,
      unit: '%',
      color: Math.abs(rhoRelError) < 0.5 ? colors.success[600] : colors.danger[500],
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
      condition: 'R-L 图像拟合斜率法；因截距误差（如内接法的 R_A）不进入斜率，可有效消除',
      level: 'important',
    },
    {
      name: '限流回路的电流',
      latex: 'I = \\frac{E}{R_{\\text{测}} + R + r}',
      condition: `本页 E = ${r.E.toFixed(1)} V、r = ${r.rSource.toFixed(1)} Ω；调大变阻器 R 会同时压低 I 与 U`,
      level: 'important',
    },
  ]

  // 3. 高考考点
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: `伏安法内/外接选择：金属丝电阻很小（本页 Rx ≈ ${r.Rx_real.toFixed(2)} Ω，远小于 √(R_A·R_V) ≈ 39 Ω），属典型小电阻，必须选电流表外接法。外接法因电压表分流，测得的 R 与反推的 ρ 都偏小（本页 δρ ≈ ${rhoRelError.toFixed(3)}%），但偏差极小。`,
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
    {
      text: '为什么优先用"图像斜率法"而不是"单点法"：单点法 ρ = πd²R/(4L) 会把电表内阻的系统误差全部吃进去；而 R-L 图线的斜率只由电阻随长度的增长速率决定，纵轴截距（如内接法多出来的 R_A）被自动消掉，故高考实验题几乎都要求作图求斜率。',
      importance: 'gaokao',
    },
  ]

  return { quantities, formulas, gaokaoPoints }
}
