import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calculateVaporPressureWithVolume,
  calculateRelativeHumidity,
} from '@/physics/thermodynamics/saturatedVapor'

export function buildSaturatedVaporQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const tempCelsius = params.tempCelsius ?? 25
  const referencePressure = params.referencePressure ?? 1580
  const pistonVolume = params.pistonVolume ?? 1.0

  const state = calculateVaporPressureWithVolume(referencePressure, pistonVolume, tempCelsius)
  const humidity = calculateRelativeHumidity(state.p, tempCelsius)

  const quantities: PhysicsQuantity[] = [
    { label: '系统摄氏温度', symbol: 't', value: tempCelsius, unit: '℃' },
    { label: '气缸容积', symbol: 'V', value: pistonVolume, unit: '倍' },
    { label: '水蒸气实际分压', symbol: 'p', value: +(state.p / 1000).toFixed(2), unit: 'kPa' },
    { label: '当前饱和汽压', symbol: 'p_s', value: +(state.ps / 1000).toFixed(2), unit: 'kPa' },
    { label: '相对湿度', symbol: 'RH', value: humidity.rh, unit: '%' },
    { label: '露点温度', symbol: 't_d', value: humidity.dewPoint, unit: '℃' },
  ]

  if (state.isSaturated) {
    quantities.push({
      label: '气相剩余蒸汽占比',
      symbol: 'n_g/n',
      value: +(state.vaporFraction * 100).toFixed(1),
      unit: '%',
    })
  }

  const formulas: Formula[] = [
    {
      name: '未饱和区间：玻意耳定律',
      latex: 'pV = \\text{常量} \\quad (p < p_s,\\ T \\text{ 不变})',
      level: 'core',
      condition: '未达到饱和（p < p_s）且温度不变时，水蒸气近似遵循玻意耳定律',
    },
    {
      name: '饱和区间：压强锁定',
      latex: 'p = p_s(T) \\quad (\\text{与 } V \\text{ 无关})',
      level: 'core',
      condition: '气液动态平衡共存的饱和汽，温度不变时压强保持 p_s 不变',
    },
    {
      name: '相对湿度定义式',
      latex: 'RH = \\frac{p}{p_s(T)} \\times 100\\%',
      level: 'core',
      condition: 'p 为某温度下水蒸气的实际压强，p_s(T) 为同温度下水的饱和汽压',
    },
    {
      name: '饱和汽动态平衡条件',
      latex: 'v_{\\text{蒸发}} = v_{\\text{凝结}} \\iff p = p_s',
      level: 'important',
      condition: '密闭容器内液体与其蒸气达到动态平衡时',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '饱和汽压的核心性质：一定温度下，同种液体饱和汽的压强是一定的，称为饱和汽压 p_s。饱和汽压随温度升高而增大，与汽的体积及容器中是否含有其他气体无关。',
      importance: 'gaokao',
    },
    {
      text: '等温推拉活塞陷阱：未饱和时水蒸气近似理想气体，等温压缩遵循玻意耳定律（p ∝ 1/V）；一旦压缩到 p = ps，继续压缩只会使多余蒸汽液化，压强锁定在 ps 不再增大，绝不遵循玻意耳定律！',
      importance: 'gaokao',
    },
    {
      text: '相对湿度与人体感觉：人体感受到的潮湿或干燥取决于相对湿度 RH，而非绝对湿度（水蒸气压强 p）。降温使饱和汽压减小，相对湿度增大，降到露点时结露。',
      importance: 'core',
    },
  ]

  const warnings: PhysicsPanelData['warnings'] = [
    {
      text: '等温压缩一旦达到饱和汽压 p_s，继续减小体积仅使水蒸气液化，实际压强保持 p_s 不变，不再遵守玻意耳定律。',
      level: 'danger',
    },
    {
      text: '降低温度使饱和汽压 p_s 减小；当气温降至露点温度 t_d 时相对湿度达到 100%，水蒸气开始凝结成露。',
      level: 'warning',
    },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
  }
}
