import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { normalizeParams, type ParamDefs } from '../types'
import {
  calculateDopplerWavelength,
  calculateDopplerFrequency,
  calculateMachAngle,
  getEffectiveDopplerSpeeds,
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
  const { vs, vo } = getEffectiveDopplerSpeeds(p.mode, p.sourceSpeed, p.observerSpeed, p.waveSpeed)
  const isObserverMode = p.mode === 1
  const isSupersonicMode = p.mode === 2

  const lambda0 = p.waveSpeed / Math.max(0.1, p.frequency)
  const lambdaFront = calculateDopplerWavelength(p.waveSpeed, vs, p.frequency, 'front')
  const lambdaBack = calculateDopplerWavelength(p.waveSpeed, vs, p.frequency, 'back')

  const fFront = calculateDopplerFrequency(p.frequency, p.waveSpeed, vs, 0)
  const fBack = calculateDopplerFrequency(p.frequency, p.waveSpeed, -vs, 0)
  const fObs = calculateDopplerFrequency(p.frequency, p.waveSpeed, vs, vo)
  const deltaF = (isObserverMode ? fObs : fFront) - p.frequency

  const quantities: PhysicsQuantity[] = [
    { label: '介质波速', symbol: 'v', value: +p.waveSpeed.toFixed(0), unit: 'm/s' },
    { label: '波源固有频率', symbol: 'f_0', value: +p.frequency.toFixed(1), unit: 'Hz' },
    { label: '固有波长', symbol: 'λ_0', value: +lambda0.toFixed(2), unit: 'm' },
  ]

  if (isObserverMode) {
    quantities.push(
      { label: '观察者运动速度', symbol: 'v_o', value: +vo.toFixed(0), unit: 'm/s' },
      { label: '相对波速', symbol: 'v_rel', value: +(p.waveSpeed + vo).toFixed(0), unit: 'm/s' },
      { label: '空间实际波长', symbol: 'λ', value: +lambda0.toFixed(2), unit: 'm' },
      { label: '接收频率', symbol: "f'", value: +fObs.toFixed(1), unit: 'Hz' },
      { label: '频移量', symbol: 'Δf', value: +(deltaF > 0 ? `+${deltaF.toFixed(1)}` : deltaF.toFixed(1)), unit: 'Hz' },
    )
  } else if (isSupersonicMode) {
    const machNumber = vs / p.waveSpeed
    const machAngle = calculateMachAngle(p.waveSpeed, vs) ?? 0
    quantities.push(
      { label: '波源移动速度', symbol: 'v_s', value: +vs.toFixed(0), unit: 'm/s' },
      { label: '马赫数', symbol: 'Ma', value: +machNumber.toFixed(2), unit: '' },
      { label: '马赫角半顶角', symbol: 'θ', value: +machAngle.toFixed(1), unit: '°' },
      { label: '后方拉伸波长', symbol: "λ''", value: +lambdaBack.toFixed(2), unit: 'm' },
      { label: '后方接收频率', symbol: "f''", value: +fBack.toFixed(1), unit: 'Hz' },
    )
  } else {
    quantities.push(
      { label: '波源移动速度', symbol: 'v_s', value: +vs.toFixed(0), unit: 'm/s' },
      { label: '前方视在波长', symbol: "λ'", value: +lambdaFront.toFixed(2), unit: 'm' },
      { label: '前方接收频率', symbol: "f'", value: +fFront.toFixed(1), unit: 'Hz' },
      { label: '后方视在波长', symbol: "λ''", value: +lambdaBack.toFixed(2), unit: 'm' },
      { label: '后方接收频率', symbol: "f''", value: +fBack.toFixed(1), unit: 'Hz' },
      { label: '迎面频移量', symbol: 'Δf', value: +(deltaF > 0 ? `+${deltaF.toFixed(1)}` : deltaF.toFixed(1)), unit: 'Hz' },
    )
  }

  return {
    quantities,
    formulas: [
      {
        name: '多普勒频率综合公式',
        latex: "f' = f_0 \\frac{v \\pm v_o}{v \\mp v_s}",
        condition: '分子靠近取+远离取-，分母靠近取-远离取+',
        level: 'core',
      },
      {
        name: '观察者运动接收频率公式',
        latex: "f' = f_0 \\frac{v \\pm v_o}{v} = \\frac{v \\pm v_o}{\\lambda_0}",
        condition: '波源静止，空间波长保持 λ₀ 不变',
        level: 'core',
      },
      {
        name: '波源运动前方压缩波长',
        latex: "\\lambda' = \\frac{v - v_s}{f_0} = \\lambda_0 - v_s T",
        condition: '波源朝观察者运动时前方空间波长变短',
        level: 'core',
      },
      {
        name: '超音速马赫角公式',
        latex: "\\sin\\theta = \\frac{v}{v_s} = \\frac{1}{Ma}",
        condition: '波源超音速时激波包络面半顶角',
        level: 'derived',
      },
    ],
    gaokaoPoints: [
      {
        text: '【近高远低口诀】：波源与观察者相对靠近时，接收频率偏高，音调变尖锐；相对远离时，接收频率偏低，音调变低沉。',
        importance: 'gaokao',
      },
      {
        text: '【易错陷阱·音调是否越来越高？】：匀速靠近时，接收频率恒定偏高，音调【恒定尖锐】（并非越来越高！）；仅当波源加速靠近时音调才持续升高；掠过瞬间音调发生阶跃突降。',
        importance: 'gaokao',
      },
      {
        text: '【核心辨析·波源运动 vs 观察者运动】：波源运动压缩/拉伸了介质中的空间波长（λ\'=(v-vs)/f₀），波速不变；观察者运动介质中波长完全不变（λ=λ₀），是相对波速使单位时间接收波峰数改变。',
        importance: 'gaokao',
      },
      {
        text: '【波速本质】：介质本身的波速 v 仅由介质性质决定，与波源运动速度完全无关，波源跑得再快也不会使声波传得更快。',
        importance: 'core',
      },
      {
        text: '【现代科技应用】：彩超测血流、交警雷达测速（双程多普勒）、天文光谱红移（星系远离证明宇宙膨胀）。',
        importance: 'core',
      },
    ],
  }
}
