import type { PhysicsPanelData } from '../types'
import { normalizeParams, type ParamDefs } from '../types'
import {
  calculateInductiveReactance,
  calculateCapacitiveReactance,
  calculateBranchCurrentAndPower,
  calculateResonanceFrequency,
} from '@/physics/electromagnetism/acImpedance'

const DEFAULTS: ParamDefs<{
  voltage: number
  frequency: number
  inductance: number
  capacitance: number
  resistance: number
  isDC: number
  mode: number
}> = {
  voltage: { default: 100 },
  frequency: { default: 50 },
  inductance: { default: 0.5 },
  capacitance: { default: 100 },
  resistance: { default: 30 },
  isDC: { default: 0 },
  mode: { default: 0 },
}

export function buildACImpedanceQuantities(
  _animId: string,
  params: Record<string, number>,
): PhysicsPanelData | null {
  const p = normalizeParams(params, DEFAULTS)
  const isDC = p.isDC === 1
  const effectiveFreq = isDC ? 0 : Math.max(1, p.frequency)
  const capFarad = p.capacitance * 1e-6

  const XL = calculateInductiveReactance(effectiveFreq, p.inductance)
  const XC = calculateCapacitiveReactance(effectiveFreq, capFarad)
  const f0 = calculateResonanceFrequency(p.inductance, capFarad)

  // 支路2状态
  const targetReactance = p.mode === 1 ? XC : XL
  const branch2Calc = calculateBranchCurrentAndPower(
    p.voltage,
    p.resistance,
    targetReactance,
    isDC,
    p.mode === 1 ? 0 : 2,
  )

  return {
    quantities: [
      { label: '电源有效电压', symbol: 'U', value: +p.voltage.toFixed(1), unit: 'V' },
      { label: '交流电频率', symbol: 'f', value: isDC ? 0 : +p.frequency.toFixed(1), unit: 'Hz' },
      { label: '自感系数', symbol: 'L', value: +p.inductance.toFixed(2), unit: 'H' },
      { label: '电容大小', symbol: 'C', value: +p.capacitance.toFixed(1), unit: 'μF' },
      { label: '感抗', symbol: 'X_L', value: +XL.toFixed(1), unit: 'Ω' },
      {
        label: '容抗',
        symbol: 'X_C',
        value: Number.isFinite(XC) ? +XC.toFixed(1) : 999999,
        unit: Number.isFinite(XC) ? 'Ω' : '∞',
      },
      {
        label: '谐振频率',
        symbol: 'f_0',
        value: +f0.toFixed(1),
        unit: 'Hz',
      },
      {
        label: '支路2有效电流',
        symbol: 'I_2',
        value: +branch2Calc.current.toFixed(2),
        unit: 'A',
      },
      {
        label: '灯泡2消耗功率',
        symbol: 'P_2',
        value: +branch2Calc.power.toFixed(1),
        unit: 'W',
      },
    ],
    formulas: [
      {
        name: '感抗公式',
        latex: 'X_L = 2\\pi f L',
        level: 'core',
      },
      {
        name: '容抗公式',
        latex: 'X_C = \\frac{1}{2\\pi f C}',
        level: 'core',
      },
      {
        name: '交流电路欧姆定律',
        latex: 'I = \\frac{U}{Z} = \\frac{U}{\\sqrt{R^2 + X^2}}',
        level: 'core',
      },
      {
        name: 'LC谐振频率',
        latex: 'f_0 = \\frac{1}{2\\pi\\sqrt{LC}}',
        level: 'derived',
      },
    ],
    gaokaoPoints: [
      {
        text: '【通直阻交、通低阻高】：电感线圈对直流只有很小的电阻，对交流电由于自感电动势阻碍电流变化而产生感抗；频率 f 越大、自感 L 越大，感抗越大。',
        importance: 'gaokao',
      },
      {
        text: '【通交隔直、通高阻低】：电容器两极板由绝缘介质隔开，直流不能通过；接入交流电时，电容器交替充放电形成充放电交变电流；频率 f 越高、电容 C 越大，容抗越小。',
        importance: 'gaokao',
      },
      {
        text: '【低频扼流圈与高频扼流圈】：低频扼流圈（铁芯、匝数很多、L大）用于阻碍交流通过直流；高频扼流圈（铁氧体芯、匝数少、L小）用于阻碍高频交流通过低频和直流。',
        importance: 'gaokao',
      },
    ],
  }
}
