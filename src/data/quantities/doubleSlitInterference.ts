import type { PhysicsPanelData, WarningItem, ParamDefs } from './types'
import { normalizeParams } from './types'
import { wavelengthToHex } from '@/physics/optics'
import { PHYSICS_COLORS } from '@/theme/physics'

interface DoubleSlitParams {
  wavelength: number
  slitDistance: number
  screenDistance: number
}

const DOUBLE_SLIT_DEFAULTS: ParamDefs<DoubleSlitParams> = {
  wavelength: { default: 650 },
  slitDistance: { default: 0.2 },
  screenDistance: { default: 1.0 },
}

export function buildDoubleSlitInterferenceQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-double-slit-interference') return null

  const p = normalizeParams(params, DOUBLE_SLIT_DEFAULTS)

  // 计算条纹物理间距: Δx = (L / d) * λ
  // L(m) / d(mm) * λ(nm) * 10^-3 = Δx(mm)
  const fringeSpacing = (p.screenDistance / p.slitDistance) * p.wavelength * 1e-3
  const wavelengthColor = wavelengthToHex(p.wavelength)

  // 1. 物理量列表（规范声明：包含 label, symbol, value, unit, color, highlight）
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '光的波长',
      symbol: 'λ',
      value: p.wavelength,
      unit: 'nm',
      color: wavelengthColor,
      highlight: 'positive',
    },
    {
      label: '双缝间距',
      symbol: 'd',
      value: p.slitDistance,
      unit: 'mm',
      color: PHYSICS_COLORS.referencePoint,
    },
    {
      label: '缝屏距离',
      symbol: 'L',
      value: p.screenDistance,
      unit: 'm',
      color: PHYSICS_COLORS.amplitude,
    },
    {
      label: '干涉条纹间距',
      symbol: 'Δx',
      value: fringeSpacing.toFixed(2),
      unit: 'mm',
      color: PHYSICS_COLORS.wavelengthRed,
      highlight: 'extreme',
    },
  ]

  // 2. 完整公式体系 (KaTeX 表达式 + 适用条件 + 重要性 + 易错提醒)
  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '双缝干涉条纹间距公式',
      latex: '\\Delta x = \\frac{L}{d} \\lambda',
      condition: '两缝发出的光满足相干条件（频率相同、相位差恒定、振动方向一致）',
      level: 'core',
      note: 'Δx 表示相邻两条亮条纹（或暗条纹）中心线之间的距离',
    },
    {
      name: '相干光程差公式',
      latex: '\\delta = r_2 - r_1 = d \\sin \\theta \\approx d \\frac{y}{L}',
      condition: '近轴近似 (y ≪ L, θ 极小)',
      level: 'important',
    },
    {
      name: '明暗条纹干涉条件',
      latex: '\\delta = \\begin{cases} k\\lambda, & \\text{亮纹 } (k=0, \\pm 1, \\pm 2 \\dots) \\\\ (2k+1)\\frac{\\lambda}{2}, & \\text{暗纹 } (k=0, \\pm 1 \\dots) \\end{cases}',
      level: 'derived',
      note: 'k=0 对应中央亮条纹（无色散，各波长重合为白光）',
    },
  ]

  // 3. 高考要点区 (5级重要性标签: gaokao/hard/core/basic/extend)
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '高考五星实验：用双缝干涉仪测定光的波长 λ = (d / L) Δx',
      importance: 'gaokao',
    },
    {
      text: '条纹宽度调控：增大缝屏距离 L、减小双缝间距 d 或换用长波长光（如红光）均可使条纹变宽',
      importance: 'gaokao',
    },
    {
      text: '白光双缝干涉：中央为白色亮纹，两侧为彩色彩带（内紫外红），因为红光波长最长、条纹间距最大',
      importance: 'hard',
    },
    {
      text: '双缝干涉仪结构作用：滤光片（获得单色光）、单缝（获得线光源）、双缝（获得相干光）',
      importance: 'core',
    },
  ]

  // 4. 易错警示区
  const warnings: WarningItem[] = []
  if (fringeSpacing > 5.0) {
    warnings.push({
      text: '当前条纹间距较大 (Δx > 5mm)，实际实验中条纹稀疏，视野内能观察到的条纹数量较少。',
      level: 'info',
    })
  } else if (fringeSpacing < 1.2) {
    warnings.push({
      text: '当前条纹间距较密 (Δx < 1.2mm)，实际测量中难以用分划板精确区分，需适当增大 L 或减小 d。',
      level: 'warning',
    })
  }

  // 5. 助记口诀
  const mnemonic = '双缝相干出彩带，间距与λ、L成正比；红光最宽紫光细，测出间距知波长。'

  return { quantities, formulas, gaokaoPoints, warnings, mnemonic }
}
