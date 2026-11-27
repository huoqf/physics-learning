import type { PhysicsPanelData } from '../types'
import { computeACImpedanceSnapshot } from '@/physics/electromagnetism/acImpedance'

export function buildACImpedanceQuantities(
  _animId: string,
  params: Record<string, number>,
  time = 0,
): PhysicsPanelData | null {
  const snap = computeACImpedanceSnapshot(params, time)
  const {
    mode,
    isDC,
    compareTarget,
    filterType,
    voltage,
    frequency,
    effectiveInductance,
    capacitance,
    resistance,
    XL,
    XC,
    branches,
    totalCurrent,
    transient,
    filterState,
  } = snap

  let quantities: PhysicsPanelData['quantities'] = []

  if (mode === 0) {
    const bR = branches[0]
    const bL = branches[1]
    const bC = branches[2]
    quantities = [
      { label: '电源电压', symbol: 'U', value: +voltage.toFixed(1), unit: 'V' },
      { label: '当前扫频', symbol: 'f', value: +frequency.toFixed(1), unit: 'Hz' },
      { label: '感抗', symbol: 'X_L', value: +XL.toFixed(1), unit: 'Ω' },
      { label: '容抗', symbol: 'X_C', value: Number.isFinite(XC) ? +XC.toFixed(1) : '∞', unit: 'Ω' },
      { label: '电阻支路电流', symbol: 'I_R', value: +(bR?.current ?? 0).toFixed(2), unit: 'A' },
      { label: '电感支路电流', symbol: 'I_L', value: +(bL?.current ?? 0).toFixed(2), unit: 'A' },
      { label: '电容支路电流', symbol: 'I_C', value: +(bC?.current ?? 0).toFixed(2), unit: 'A' },
      { label: '干路总电流', symbol: 'I_总', value: +totalCurrent.toFixed(2), unit: 'A' },
    ]
  } else if (mode === 1) {
    const b1 = branches[0]
    const b2 = branches[1]
    if (isDC && transient) {
      quantities = [
        { label: '直流电压', symbol: 'U', value: +voltage.toFixed(1), unit: 'V' },
        ...(compareTarget === 0
          ? [
              { label: '电容大小', symbol: 'C', value: +capacitance.toFixed(1), unit: 'μF' },
              {
                label: '极板充电比',
                symbol: 'q/Q_m',
                value: +(transient.capacitorChargeNorm * 100).toFixed(1),
                unit: '%',
              },
            ]
          : [
              { label: '有效自感', symbol: 'L', value: +effectiveInductance.toFixed(2), unit: 'H' },
              { label: '感抗', symbol: 'X_L', value: 0, unit: 'Ω' },
            ]),
        { label: '支路1瞬时电流', symbol: 'i_1', value: +transient.i1.toFixed(2), unit: 'A' },
        { label: '支路2瞬时电流', symbol: 'i_2', value: +transient.i2.toFixed(2), unit: 'A' },
        { label: '干路瞬时电流', symbol: 'i_总', value: +transient.iTotal.toFixed(2), unit: 'A' },
      ]
    } else {
      quantities = [
        { label: '电源电压', symbol: 'U', value: +voltage.toFixed(1), unit: 'V' },
        { label: '交流频率', symbol: 'f', value: +frequency.toFixed(1), unit: 'Hz' },
        ...(compareTarget === 0
          ? [
              { label: '电容大小', symbol: 'C', value: +capacitance.toFixed(1), unit: 'μF' },
              { label: '容抗', symbol: 'X_C', value: Number.isFinite(XC) ? +XC.toFixed(1) : '∞', unit: 'Ω' },
            ]
          : [
              { label: '有效自感', symbol: 'L', value: +effectiveInductance.toFixed(2), unit: 'H' },
              { label: '感抗', symbol: 'X_L', value: +XL.toFixed(1), unit: 'Ω' },
            ]),
        { label: '支路1有效电流', symbol: 'I_1', value: +(b1?.current ?? 0).toFixed(2), unit: 'A' },
        { label: '支路2有效电流', symbol: 'I_2', value: +(b2?.current ?? 0).toFixed(2), unit: 'A' },
        { label: '干路总电流', symbol: 'I_总', value: +totalCurrent.toFixed(2), unit: 'A' },
      ]
    }
  } else {
    quantities = [
      { label: '负载电阻', symbol: 'R', value: +resistance.toFixed(1), unit: 'Ω' },
      filterType === 2
        ? {
            label: '旁路电容',
            symbol: 'C',
            value: +filterState.effectiveCapacitanceMicroF.toFixed(1),
            unit: 'μF',
          }
        : {
            label: '线圈自感',
            symbol: 'L',
            value: +filterState.effectiveInductanceH.toFixed(2),
            unit: 'H',
          },
      { label: '直流通过率', symbol: 'η_0', value: +(filterState.dcGain * 100).toFixed(1), unit: '%' },
      { label: '低频通过率', symbol: 'η_低', value: +(filterState.lfGain * 100).toFixed(1), unit: '%' },
      { label: '高频通过率', symbol: 'η_高', value: +(filterState.hfGain * 100).toFixed(1), unit: '%' },
      { label: '高频电抗', symbol: 'X_高', value: +filterState.reactanceHF.toFixed(1), unit: 'Ω' },
    ]
  }

  return {
    quantities,
    formulas: [
      {
        name: '感抗公式（拓展）',
        latex: 'X_L = 2\\pi f L',
        level: 'supplementary',
        condition: '正弦交流电拓展定量式（频率 f 越大、自感 L 越大，对交流电的阻碍越大）',
      },
      {
        name: '容抗公式（拓展）',
        latex: 'X_C = \\frac{1}{2\\pi f C}',
        level: 'supplementary',
        condition: '正弦交流电拓展定量式（直流无法持续通过电容器；频率 f 越大、电容 C 越大，阻碍越小）',
      },
      {
        name: '交流支路欧姆定律',
        latex: 'I = \\frac{U}{Z} = \\frac{U}{\\sqrt{R^2 + X^2}}',
        level: 'supplementary',
        condition: '正弦交变电流单支路有效值或最大值关系（X 为该支路电抗，并联合路需按相量合成）',
      },
      {
        name: '平行板电容决定式',
        latex: 'C = \\frac{\\varepsilon_r S}{4\\pi k d}',
        level: 'core',
        condition: '真空或均匀介质平行板电容器；改变板距 d 或插入介质会改变 C，进而改变容抗',
      },
    ],
    gaokaoPoints: [
      {
        text: '【通直阻交、通低阻高】：电流变化产生自感电动势阻碍电流变化，故电感通直流阻交流、通低频阻高频；插入铁芯会增大自感 L，感抗显著变大。',
        importance: 'gaokao',
      },
      {
        text: '【通交隔直、通高阻低】：自由电荷不能穿过两极板间的绝缘介质，直流断路；接入交流电时靠外电路反复充放电形成交变电流，电容 C 越大或板距越小、容抗越小。',
        importance: 'gaokao',
      },
      {
        text: '【扼流圈与旁路电容】：低频扼流圈（铁芯、匝数多、L 大）通直流阻交流；高频扼流圈（匝数少、L 小）通直流和低频、阻高频；高频旁路电容并联在负载两端，将高频成分直接旁路。',
        importance: 'gaokao',
      },
    ],
  }
}
