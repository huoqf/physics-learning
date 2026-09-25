import type { PhysicsPanelData, ParamDefs } from './types'
import { normalizeParams } from './types'
import {
  calculateOhmReading,
  calculateVoltageReading,
} from '@/physics/experimentMultimeter'
import { PHYSICS_COLORS } from '@/theme/physics'

interface MultimeterParams {
  rangeIndex: number
  zeroOffset: number
  componentType: number
  rxNominal: number
  probesConnected: number
}

const MULTIMETER_DEFAULTS: ParamDefs<MultimeterParams> = {
  rangeIndex: { default: 6 }, // 默认 欧姆挡 ×1
  zeroOffset: { default: 0 },
  componentType: { default: 0 },
  rxNominal: { default: 30 },
  probesConnected: { default: 1 },
}

export function buildExperimentMultimeterQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-multimeter') return null

  const p = normalizeParams(params, MULTIMETER_DEFAULTS)
  const isConnected = p.probesConnected === 1

  let rEffective = p.rxNominal
  if (p.componentType === 1) {
    rEffective = 25
  } else if (p.componentType === 2) {
    rEffective = 5000000
  } else if (p.componentType === 3) {
    rEffective = 2800
  }

  // 1. 挡位模式名称
  const RANGE_NAMES = [
    'OFF (关断)',
    'DCV 2.5V',
    'DCV 10V',
    'DCV 50V',
    'DCA 10mA',
    'DCA 100mA',
    'Ω ×1',
    'Ω ×10',
    'Ω ×100',
    'Ω ×1k',
  ]
  const currentRangeName = RANGE_NAMES[p.rangeIndex] ?? 'OFF'

  // 2. 计算物理量
  let readingText = 'OFF'
  let deflectionPercent = 0
  let rMidText = '—'
  let statusText = '正常'

  if (p.rangeIndex >= 6) {
    // 欧姆挡
    const multipliers = [1, 10, 100, 1000]
    const mult = multipliers[p.rangeIndex - 6] ?? 1
    const res = calculateOhmReading(mult, rEffective, p.zeroOffset, isConnected)
    readingText = res.readingDisplay
    deflectionPercent = +(res.deflectionRatio * 100).toFixed(1)
    rMidText = `${res.rMid} Ω`
    statusText =
      res.advice === 'switch_larger'
        ? '偏角过小（建议换大倍率挡）'
        : res.advice === 'switch_smaller'
        ? '偏角过大（建议换小倍率挡）'
        : res.advice === 'adjust_zero'
        ? '未精准调零（误差偏大）'
        : '适宜读数区（中值附近）'
  } else if (p.rangeIndex >= 1 && p.rangeIndex <= 3) {
    // 电压挡
    const maxVs = [2.5, 10, 50]
    const maxV = maxVs[p.rangeIndex - 1] ?? 10
    const testV = isConnected
      ? p.componentType === 3
        ? 6.0
        : Math.min(p.rxNominal * 0.005, maxV * 1.05)
      : 0
    const res = calculateVoltageReading(testV, maxV, isConnected)
    readingText = res.readingDisplay
    deflectionPercent = +(res.deflectionRatio * 100).toFixed(1)
    statusText = '直流电压测量态'
  } else if (p.rangeIndex >= 4 && p.rangeIndex <= 5) {
    // 电流挡
    const maxAs = [0.01, 0.1]
    const maxA = maxAs[p.rangeIndex - 4] ?? 0.01
    const testA = isConnected ? Math.min(p.rxNominal * 0.0001, maxA * 1.05) : 0
    const res = calculateVoltageReading(testA, maxA, isConnected)
    readingText = `${(res.deflectionRatio * maxA * 1000).toFixed(1)} mA`
    deflectionPercent = +(res.deflectionRatio * 100).toFixed(1)
    statusText = '直流电流测量态'
  }

  return {
    quantities: [
      {
        label: '当前选择挡位',
        value: currentRangeName,
        unit: '',
        color: PHYSICS_COLORS.velocity,
        highlight: 'positive',
      },
      {
        label: '仪表当前读数',
        value: readingText,
        unit: '',
        color: PHYSICS_COLORS.emf,
        highlight: 'extreme',
      },
      {
        label: '表头指针偏转率',
        value: `${deflectionPercent}%`,
        unit: ' (满偏为100%)',
        color: PHYSICS_COLORS.acceleration,
      },
      {
        label: '当前挡中值电阻 R_中',
        value: rMidText,
        unit: '',
      },
      {
        label: '测量工况与换挡建议',
        value: statusText,
        unit: '',
        highlight: statusText.includes('建议') ? 'negative' : 'positive',
      },
    ],
    formulas: [
      {
        name: '欧姆表回路欧姆定律',
        latex: 'I = \\frac{E}{R_{\\text{内}} + R_x} = \\frac{E}{R_{\\Omega} + R_x}',
        level: 'core',
        condition: '闭合回路电流与待测电阻呈非线性反比关系',
      },
      {
        name: '欧姆调零满偏电流',
        latex: 'I_g = \\frac{E}{R_{\\Omega}} \\implies R_{\\Omega} = \\frac{E}{I_g}',
        level: 'core',
        condition: '短接红黑表笔时电流达满偏，对应欧姆刻度 0',
      },
      {
        name: '中值电阻与半偏状态',
        latex: 'I = \\frac{1}{2} I_g \\iff R_x = R_{\\Omega} = R_{\\text{中}}',
        level: 'core',
        condition: '指针指正中央刻度时，待测阻值恰好等于内部总内阻',
      },
    ],
    gaokaoPoints: [
      {
        text: '【红进黑出铁律】电流始终从红表笔流入多用电表、从黑表笔流出。内部电源正极连接的是黑表笔，负极连接红表笔。测二极管时，黑表笔接二极管正极时指针偏角大（正向导通）。',
        importance: 'gaokao',
      },
      {
        text: '【换挡必调零】欧姆表每次换挡后，回路内阻发生数量级改变，必须重新短接红黑表笔进行欧姆调零，否则测量数据作废。',
        importance: 'gaokao',
      },
      {
        text: '【换挡口诀：大角小挡，小角大挡】若指针偏角太小（指在刻度盘左侧密集区），说明待测电阻过大，读数误差大，应换【更大倍率】挡；反之指针偏角过大接近0，应换【更小倍率】挡。',
        importance: 'gaokao',
      },
      {
        text: '【用毕归位】测量完毕后，选择开关必须旋至 OFF 挡或交流电压最高挡（如 ACV 500V/1000V），防止两表笔意外短接放电耗尽内部电池。',
        importance: 'core',
      },
      {
        text: '【黑箱探测铁律】探测未知黑箱时，第一步必须先用【直流电压挡】测量任意两端子间是否有电压！确认无电源后方可使用欧姆挡，严禁直接用欧姆挡测量含电源电路（防止烧毁表头）。',
        importance: 'gaokao',
      },
    ],
    warnings: [
      {
        text: '易错陷阱：测电阻前必须将待测电阻从原电路中断开，严禁带电测量；手握表笔时切勿同时触碰金属针尖，防止人体并联电阻引入测量误差。',
        level: 'danger',
      },
    ],
  }
}
