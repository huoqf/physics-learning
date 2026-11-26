import type { PhysicsPanelData } from './types'
import type { ParamDefs } from './types'
import { normalizeParams } from './types'
import {
  calculateCutoffFrequency,
  DEFAULT_WORK_FUNCTION,
  frequencyToPhotonEnergy,
  calculateMaxKineticEnergy,
  calculateStoppingVoltage,
  intensityToSaturationCurrent,
  isPhotoelectricEffect,
} from '@/physics/photoelectric'
import { MODERN_COLORS } from '@/theme/physics'

interface PhotoelectricParams {
  frequency: number
  intensity: number
  voltage: number
  mode: number
  showPhotonModel: number
  workFunction: number
}

const PHOTOELECTRIC_DEFAULTS: ParamDefs<PhotoelectricParams> = {
  frequency: { default: 6.0 },
  intensity: { default: 50 },
  voltage: { default: 0 },
  mode: { default: 0 },
  showPhotonModel: { default: 0 },
  workFunction: { default: DEFAULT_WORK_FUNCTION },
}

export function buildPhotoelectricQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-photoelectric') return null

  const p = normalizeParams(params, PHOTOELECTRIC_DEFAULTS)
  const W0 = p.workFunction

  const hv = frequencyToPhotonEnergy(p.frequency)
  const isPE = isPhotoelectricEffect(p.frequency, W0)
  const Ekm = calculateMaxKineticEnergy(hv, W0)
  const Uc = calculateStoppingVoltage(Ekm)
  const Imax = intensityToSaturationCurrent(p.intensity)

  // 物理量（≤3 个核心因变量）
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '光电子最大初动能',
      symbol: 'E_km',
      value: isPE ? Ekm.toFixed(2) : '—',
      unit: 'eV',
      color: MODERN_COLORS.photoelectron,
      highlight: isPE ? 'positive' : undefined,
    },
    {
      label: '遏止电压',
      symbol: 'U_c',
      value: isPE ? Uc.toFixed(2) : '—',
      unit: 'V',
      color: MODERN_COLORS.stoppingVoltage,
      highlight: isPE ? 'extreme' : undefined,
    },
    {
      label: '饱和光电流',
      symbol: 'I_m',
      value: isPE ? Imax.toFixed(1) : '0',
      unit: 'μA',
      color: MODERN_COLORS.saturationCurrent,
    },
  ]

  // 公式
  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '爱因斯坦光电效应方程',
      latex: 'E_{\\text{km}} = h\\nu - W_0',
      level: 'core',
      condition: '仅当入射光频率 ν ≥ 截止频率 ν₀ 时成立',
    },
    {
      name: '遏止电压关系式',
      latex: 'eU_c = E_{\\text{km}}',
      level: 'core',
      condition: '存在光电子逸出（ν ≥ ν₀），光电子最大初动能 E_km 仅与入射光频率及金属逸出功有关，与光强无关',
    },
    {
      name: '截止频率',
      latex: '\\nu_0 = \\frac{W_0}{h}',
      level: 'important',
      condition: '由光电效应方程在 E_km = 0 时得到，仅由金属自身逸出功 W₀ 决定',
    },
  ]

  // 要点
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '光电效应图像判读：I-U 图中反向遏止点对应遏止电压 Uc；入射光频率一定（且 ν ≥ ν₀）时，饱和光电流随光照强度增大而增大',
      importance: 'gaokao',
    },
    {
      text: 'E_km - ν 图：斜率为普朗克常量 h，横轴截距为截止频率 ν₀（纵轴截距绝对值为逸出功 W₀）',
      importance: 'gaokao',
    },
    {
      text: '波粒二象性：光的波动性（干涉、衍射）与粒子性（光电效应）的对立统一',
      importance: 'hard',
    },
  ]

  // 易错提醒
  const warnings: PhysicsPanelData['warnings'] = []
  if (!isPE) {
    warnings.push({
      text: `当前频率 ν = ${p.frequency.toFixed(1)}×10¹⁴ Hz < 截止频率 ν₀ ≈ ${calculateCutoffFrequency(W0).toFixed(1)}×10¹⁴ Hz，无法产生光电子！`,
      level: 'warning',
    })
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
    mnemonic: '频率定生死，光强定多少；反向电压挡得住，遏止电压是标高。',
  }
}
