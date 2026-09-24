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
    { label: '系统温度', symbol: 'T', value: tempCelsius, unit: '℃' },
    { label: '气缸容积', symbol: 'V', value: pistonVolume, unit: '倍' },
    { label: '水蒸气实际分压', symbol: 'p', value: +(state.p / 1000).toFixed(2), unit: 'kPa' },
    { label: '当前饱和汽压', symbol: 'p_s', value: +(state.ps / 1000).toFixed(2), unit: 'kPa' },
    { label: '相对湿度', symbol: 'RH', value: humidity.rh, unit: '%' },
    { label: '露点温度', symbol: 'T_d', value: humidity.dewPoint, unit: '℃' },
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
    },
    {
      name: '饱和区间：压强锁定',
      latex: 'p = p_s(T) \\quad (\\text{与 } V \\text{ 无关})',
      level: 'core',
    },
    {
      name: '相对湿度定义式',
      latex: 'RH = \\frac{p}{p_s(T)} \\times 100\\%',
      level: 'core',
    },
    {
      name: '饱和汽动态平衡条件',
      latex: 'v_{\\text{蒸发}} = v_{\\text{凝结}} \\iff p = p_s',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '饱和汽压的核心性质：一定温度下饱和汽的压强是一定的，称为饱和汽压 ps。饱和汽压仅随温度升高而增大，与汽的体积及是否含有其他气体完全无关！',
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

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
