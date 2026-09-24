import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calcTurnOnCurrent,
  calcTurnOffCurrent,
  checkFlashCondition,
  calcSelfInductanceEMF,
  calcEddyDampingOscillation,
} from '@/physics/electromagnetism/selfInduction'

export function buildSelfInductionQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const mode = params.mode ?? 0
  const E = params.E ?? 12
  const L = params.L ?? 2.0
  const RL = params.RL ?? 2.0
  const RA = params.RA ?? 6.0
  const B = params.B ?? 1.5
  const isSlotted = params.isSlotted === 1
  const switchClosed = (params.switchState ?? 1) === 1

  const quantities: PhysicsQuantity[] = []
  const formulas: Formula[] = []
  const gaokaoPoints: GaokaoPoint[] = []

  if (mode === 0) {
    // 通电自感
    const iCoil = switchClosed ? calcTurnOnCurrent(time, E, RL, L) : 0
    const iLamp = switchClosed ? E / RA : 0
    const emfL = switchClosed ? calcSelfInductanceEMF(time, E, RL, L) : 0

    quantities.push(
      { label: '线圈支路电流', symbol: 'I_L', value: +iCoil.toFixed(2), unit: 'A' },
      { label: '纯阻灯泡电流', symbol: 'I_A', value: +iLamp.toFixed(2), unit: 'A' },
      { label: '自感反电动势', symbol: '|E_L|', value: +emfL.toFixed(2), unit: 'V' },
      { label: '自感系数', symbol: 'L', value: L, unit: 'H' },
    )

    formulas.push(
      { name: '法拉第自感电动势', latex: 'E_L = -L \\frac{\\Delta I}{\\Delta t}', level: 'core' },
      { name: 'RL 电路暂态方程', latex: 'I(t) = \\frac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', level: 'important' },
    )

    gaokaoPoints.push(
      {
        text: '通电自感延时现象：开关闭合瞬间，自感反电动势阻碍电流增大，与线圈串联的灯泡缓慢发光；纯阻支路灯泡瞬时点亮。',
        importance: 'gaokao',
      },
      {
        text: '稳态后表现：当电流达到稳态（dI/dt = 0），自感电动势归零，线圈仅相当于定值纯电阻。',
        importance: 'core',
      },
    )
  } else if (mode === 1) {
    // 断电自感
    const iCoil = calcTurnOffCurrent(time, E, RL, RA, L)
    const { willFlash, ratio } = checkFlashCondition(RL, RA)

    quantities.push(
      { label: '局部回路放电电流', symbol: 'I', value: +iCoil.toFixed(2), unit: 'A' },
      { label: '稳态线圈初电流', symbol: 'I_0', value: +(E / RL).toFixed(2), unit: 'A' },
      { label: '灯泡正常发光电流', symbol: 'I_{A0}', value: +(E / RA).toFixed(2), unit: 'A' },
      { label: '电流超额倍率', symbol: 'I_0 / I_A', value: +ratio.toFixed(2), unit: '倍' },
    )

    formulas.push(
      { name: '断电自感放电方程', latex: 'I(t) = \\frac{E}{R_L} e^{-\\frac{R_L+R_A}{L} t}', level: 'core' },
      { name: '闪亮判据', latex: 'I_0 > I_{A0} \\iff R_L < R_A', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: willFlash
          ? `高考核心考点：当前 RL(${RL}Ω) < RA(${RA}Ω)，断开瞬间流过灯泡的初电流为 ${+(E / RL).toFixed(1)}A，超过原发光电流，灯泡必【闪亮一下后熄灭】！`
          : `高考核心考点：当前 RL(${RL}Ω) ≥ RA(${RA}Ω)，断开瞬间电流未超原值，灯泡【逐渐变暗熄灭，绝不闪亮】。`,
        importance: 'gaokao',
      },
      {
        text: '感应电流流向突变：断开电键瞬间，线圈作为“瞬时电源”，在局部回路中供电，流过小灯泡的电流方向与闭合时严格相反。',
        importance: 'core',
      },
    )
  } else {
    // 电磁阻尼与涡流
    const res = calcEddyDampingOscillation(time, 0.45, B, isSlotted)
    quantities.push(
      { label: '当前摆角', symbol: '\\theta', value: +res.theta.toFixed(3), unit: 'rad' },
      { label: '机械能保留比例', symbol: 'E/E_0', value: +(res.energyRatio * 100).toFixed(1), unit: '%' },
      { label: '磁感应强度', symbol: 'B', value: B, unit: 'T' },
    )

    formulas.push(
      { name: '阻尼安培力', latex: 'F_A = \\frac{B^2 L^2 v}{R_{\\text{eddy}}}', level: 'core' },
      { name: '能量守恒与焦耳热', latex: 'Q = \\Delta E_{\\text{mech}} = E_0 - E(t)', level: 'core' },
    )

    gaokaoPoints.push(
      {
        text: '电磁阻尼本质：导体在磁场中运动产生感应涡流，磁场对感应电流施加反向安培力，安培力做负功将机械能转化为内能。',
        importance: 'gaokao',
      },
      {
        text: '梳齿开缝原理：金属片开细缝可切断大涡流回路，极大增加等效电阻并减弱阻尼。灵敏电流计运输时两接线柱短接即利用电磁阻尼保护轴尖。',
        importance: 'core',
      },
    )
  }

  return { quantities, formulas, gaokaoPoints }
}
