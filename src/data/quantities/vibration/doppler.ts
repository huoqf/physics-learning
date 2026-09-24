import type { PhysicsPanelData } from '../types'
import { normalizeParams, type ParamDefs } from '../types'
import {
  calculateDopplerWavelength,
  calculateDopplerFrequency,
} from '@/physics/vibration/doppler'

const DEFAULTS: ParamDefs<{
  waveSpeed: number
  sourceSpeed: number
  frequency: number
  observerSpeed: number
  mode: number
}> = {
  waveSpeed: { default: 340 },
  sourceSpeed: { default: 100 },
  frequency: { default: 10 },
  observerSpeed: { default: 0 },
  mode: { default: 0 },
}

export function buildDopplerQuantities(
  _animId: string,
  params: Record<string, number>,
): PhysicsPanelData | null {
  const p = normalizeParams(params, DEFAULTS)
  const vs = p.mode === 1 ? 0 : p.sourceSpeed
  const vo = p.observerSpeed

  const lambda0 = p.waveSpeed / Math.max(0.1, p.frequency)
  const lambdaFront = calculateDopplerWavelength(p.waveSpeed, vs, p.frequency, 'front')
  const lambdaBack = calculateDopplerWavelength(p.waveSpeed, vs, p.frequency, 'back')

  const fFront = calculateDopplerFrequency(p.frequency, p.waveSpeed, vs, vo)
  const fBack = calculateDopplerFrequency(p.frequency, p.waveSpeed, -vs, -vo)
  const deltaF = fFront - p.frequency

  return {
    quantities: [
      { label: '介质波速', symbol: 'v', value: +p.waveSpeed.toFixed(0), unit: 'm/s' },
      { label: '波源固有频率', symbol: 'f_0', value: +p.frequency.toFixed(1), unit: 'Hz' },
      { label: '静止固有波长', symbol: 'λ_0', value: +lambda0.toFixed(2), unit: 'm' },
      { label: '波源移动速度', symbol: 'v_s', value: +vs.toFixed(0), unit: 'm/s' },
      { label: '前方视在波长', symbol: "λ'", value: +lambdaFront.toFixed(2), unit: 'm' },
      { label: '前方接收频率', symbol: "f'", value: +fFront.toFixed(1), unit: 'Hz' },
      { label: '后方视在波长', symbol: "λ''", value: +lambdaBack.toFixed(2), unit: 'm' },
      { label: '后方接收频率', symbol: "f''", value: +fBack.toFixed(1), unit: 'Hz' },
      { label: '频移量', symbol: 'Δf', value: +(deltaF > 0 ? `+${deltaF.toFixed(1)}` : deltaF.toFixed(1)), unit: 'Hz' },
    ],
    formulas: [
      {
        name: '多普勒频率综合公式',
        latex: "f' = f_0 \\frac{v \\pm v_o}{v \\mp v_s}",
        condition: '分子靠近取+远离取-，分母靠近取-远离取+',
        level: 'core',
      },
      {
        name: '波源运动前方压缩波长',
        latex: "\\lambda' = \\frac{v - v_s}{f_0} = \\lambda_0 - v_s T",
        condition: '波源朝观察者运动时',
        level: 'core',
      },
      {
        name: '波源运动后方拉伸波长',
        latex: "\\lambda'' = \\frac{v + v_s}{f_0} = \\lambda_0 + v_s T",
        condition: '波源背离观察者运动时',
        level: 'derived',
      },
    ],
    gaokaoPoints: [
      {
        text: '【近高远低口诀】：波源与观察者相对靠近时，接收频率偏高，音调变尖锐；相对远离时，接收频率偏低，音调变低沉。',
        importance: 'gaokao',
      },
      {
        text: '【本质判断】：多普勒效应中，介质本身的波速 v 仅由介质性质决定，保持不变；波源固有振荡频率 f₀ 也不变。改变的是单位时间内穿过观察者的波峰数量（视在频率 f\'）以及空间波前间距（视在波长 λ\'）。',
        importance: 'gaokao',
      },
      {
        text: '【天文红移与宇宙膨胀】：遥远恒星和星系发出的光波谱线向红端移动（红移），表明星系正在高速离我们远去，是多普勒效应在光波领域的直接应用。',
        importance: 'core',
      },
    ],
  }
}
