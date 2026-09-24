import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calculateSaturatedVaporPressure,
  calculateRelativeHumidity,
} from '@/physics/thermodynamics/saturatedVapor'

export function buildSaturatedVaporQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const tempCelsius = params.tempCelsius ?? 25
  const vaporPressure = params.vaporPressure ?? 1580

  const humidity = calculateRelativeHumidity(vaporPressure, tempCelsius)
  const ps = calculateSaturatedVaporPressure(tempCelsius)

  const quantities: PhysicsQuantity[] = [
    { label: '系统温度', symbol: 'T', value: tempCelsius, unit: '℃' },
    { label: '实际水蒸气分压', symbol: 'p', value: +(vaporPressure / 1000).toFixed(2), unit: 'kPa' },
    { label: '当前饱和汽压', symbol: 'p_s', value: +(ps / 1000).toFixed(2), unit: 'kPa' },
    { label: '相对湿度', symbol: 'RH', value: humidity.rh, unit: '%' },
    { label: '露点温度', symbol: 'T_d', value: humidity.dewPoint, unit: '℃' },
  ]

  const formulas: Formula[] = [
    {
      name: '相对湿度定义式',
      latex: 'RH = \\frac{p}{p_s(T)} \\times 100\\%',
      level: 'core',
    },
    {
      name: '饱和汽动态平衡条件',
      latex: 'v_{\\text{蒸发}} = v_{\\text{凝结}} \\iff p = p_s',
      level: 'core',
    },
    {
      name: '饱和汽压与体积无关性',
      latex: 'p_s = f(T) \\quad (\\text{与 } V \\text{ 无关})',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '饱和汽压的核心性质：一定温度下饱和汽的压强是一定的，称为饱和汽压 ps。饱和汽压仅随温度升高而增大，与汽的体积及是否含有其他气体完全无关！',
      importance: 'gaokao',
    },
    {
      text: '等温推拉活塞陷阱：温度不变时，压缩饱和汽体积，蒸汽分子密度瞬时增大导致凝结速率大于蒸发速率，部分蒸汽液化，压强迅速恢复等于原 ps，绝不遵循玻意耳定律！',
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
