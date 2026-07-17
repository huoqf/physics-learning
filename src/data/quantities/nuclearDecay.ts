import type { PhysicsPanelData } from './types'
import { normalizeParams, type ParamDefs } from './types'

interface NuclearDecayParams {
  mode: number
  nuclide: number
  nucleonDistance: number
  fieldType: number
  bField: number
  eField: number
  initVelocity: number
  showObstacles: number
}

const DEFAULTS: ParamDefs<NuclearDecayParams> = {
  mode: { default: 0 },
  nuclide: { default: 3 },
  nucleonDistance: { default: 1.2 },
  fieldType: { default: 0 },
  bField: { default: 1.5 },
  eField: { default: 5.0 },
  initVelocity: { default: 4.0 },
  showObstacles: { default: 0 },
}

// 同位素定义
const NUCLIDES = [
  { symbol: 'H-1', name: '氕', Z: 1, N: 0, A: 1, stable: true, decay: '无', tHalf: '稳定' },
  { symbol: 'H-2', name: '氘', Z: 1, N: 1, A: 2, stable: true, decay: '无', tHalf: '稳定' },
  { symbol: 'H-3', name: '氚', Z: 1, N: 2, A: 3, stable: false, decay: 'β 衰变', tHalf: '12.3 年' },
  { symbol: 'He-4', name: '氦-4 (α粒子)', Z: 2, N: 2, A: 4, stable: true, decay: '无', tHalf: '稳定' },
  { symbol: 'C-12', name: '碳-12', Z: 6, N: 6, A: 12, stable: true, decay: '无', tHalf: '稳定' },
  { symbol: 'C-14', name: '碳-14', Z: 6, N: 8, A: 14, stable: false, decay: 'β 衰变', tHalf: '5730 年' },
  { symbol: 'U-238', name: '铀-238', Z: 92, N: 146, A: 238, stable: false, decay: 'α 衰变', tHalf: '44.7 亿年' },
]

export function buildNuclearDecayQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-nuclear-decay') return null

  const p = normalizeParams(params, DEFAULTS)

  if (p.mode === 0) {
    // 模式一：原子核组成与强核力
    const nuc = NUCLIDES[p.nuclide] ?? NUCLIDES[3]
    const r = p.nucleonDistance

    // 判断强核力状态
    let forceState = ''
    let forceHighlight: 'positive' | 'negative' | 'zero' | 'extreme' | undefined
    if (r < 0.8) {
      forceState = '极强斥力'
      forceHighlight = 'negative'
    } else if (r >= 0.8 && r <= 2.0) {
      forceState = '强吸引力'
      forceHighlight = 'positive'
    } else if (r > 2.0 && r <= 2.5) {
      forceState = '吸引力微弱'
      forceHighlight = 'zero'
    } else {
      forceState = '极弱/零（超出射程）'
      forceHighlight = 'extreme'
    }

    const quantities = [
      { label: '核种名称', value: `${nuc.name} (${nuc.symbol})`, unit: '' },
      { label: '电荷数 (质子数 Z)', value: nuc.Z, unit: '' },
      { label: '中子数 (N)', value: nuc.N, unit: '' },
      { label: '质量数 (核子数 A)', value: nuc.A, unit: '' },
      { label: '稳定性', value: nuc.stable ? '稳定核' : '放射性核', unit: '', highlight: nuc.stable ? 'positive' as const : 'negative' as const },
      { label: '核子平均间距 r', value: r.toFixed(2), unit: 'fm' },
      { label: '相邻核子强核力', value: forceState, unit: '', highlight: forceHighlight },
    ]

    const formulas = [
      { name: '质量数守恒', latex: 'A = Z + N', level: 'core' as const },
      { name: '爱因斯坦质能方程', latex: 'E = m c^2', level: 'important' as const, condition: '用于计算结合能与质量亏损' },
    ]

    const gaokaoPoints = [
      { text: '原子核由质子和中子组成，二者统称为核子。', importance: 'basic' as const },
      { text: '核子数（质量数）= 质子数 + 中子数。核电荷数 = 质子数。', importance: 'gaokao' as const },
      { text: '同位素：具有相同质子数而中子数不同的原子核互为同位素。', importance: 'gaokao' as const },
      { text: '强核力是强相互作用的表现，是短程力，作用范围约在 10⁻¹⁵ m 数量级内。', importance: 'core' as const },
      { text: '强核力在相邻核子间起作用：r < 0.8 fm 表现为斥力；0.8~2 fm 表现为引力；> 2.5 fm 极速归零。', importance: 'gaokao' as const },
    ]

    return {
      quantities,
      formulas,
      gaokaoPoints,
      mnemonic: '质子中子称核子，质量数是二者和；强力短程超紧密，出了射程成路人。',
    }
  } else {
    // 模式二：天然放射线在电磁场中偏转
    const isB = p.fieldType === 0
    const isE = p.fieldType === 1
    const val = isB ? p.bField : (isE ? p.eField : 0)
    const unit = isB ? 'T' : (isE ? 'kV/m' : '')
    const label = isB ? '磁感应强度 B' : (isE ? '电场强度 E' : '无外加场')

    const quantities = [
      { label, value: isE || isB ? val.toFixed(1) : '—', unit },
      { label: '出射初速度 v₀', value: (p.initVelocity * 0.1).toFixed(2), unit: 'c' },
      { label: 'α 射线偏转半径', value: isB && val !== 0 ? (8.0 / Math.abs(val) / (p.initVelocity / 4)).toFixed(1) : '—', unit: 'cm (视觉缩放)' },
      { label: 'β 射线偏转半径', value: isB && val !== 0 ? (1.6 / Math.abs(val) / (p.initVelocity / 4)).toFixed(1) : '—', unit: 'cm (视觉缩放)' },
      { label: 'γ 射线偏转半径', value: '不偏转', unit: '' },
    ]

    const formulas = [
      { name: '洛伦兹力公式', latex: 'F = q v B', level: 'core' as const, condition: '磁场偏转' },
      { name: '磁场圆周半径', latex: 'R = \\frac{m v}{q B}', level: 'core' as const },
      { name: '电场强度力公式', latex: 'F = q E', level: 'core' as const, condition: '电场偏转' },
      { name: '电场侧移距离', latex: 'y = \\frac{q E L^2}{2 m v^2}', level: 'important' as const, condition: '类平抛运动' },
    ]

    const gaokaoPoints = [
      { text: 'α 射线：本质为氦核 (⁴₂He)，带双正电，速度约 0.1c，电离本领极强，穿透最弱（一张纸即可挡住）。', importance: 'gaokao' as const },
      { text: 'β 射线：本质为高速电子流 (⁰₋₁e)，带单负电，速度达 0.99c，穿透本领较强，电离较弱（几毫米铝板阻挡）。', importance: 'gaokao' as const },
      { text: 'γ 射线：本质为高能光子（电磁波），不带电，速度等于c，穿透本领极强（需厚铅板阻挡），电离最弱。', importance: 'gaokao' as const },
      { text: '电磁偏转方向：用左手定则（磁场）或受力方向（电场）判断，α 与 β 偏转方向相反，γ 不偏转。', importance: 'core' as const },
      { text: '高考要点：比荷决定磁场半径。β 的比荷约为 α 的 3700 倍，故实际 β 偏转半径极小，偏转极快。', importance: 'hard' as const },
    ]

    return {
      quantities,
      formulas,
      gaokaoPoints,
      mnemonic: '阿尔法氦核正电重，贝塔电子负电轻；伽马光子不带电，左手定则定偏行。',
    }
  }
}
