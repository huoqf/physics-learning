/**
 * 电磁波 — 纯物理计算与谱段参考数据。
 *
 * 教材依据：人教版必修第三册 第13章「电磁感应与电磁波初步」、
 * 选择性必修第二册 第4章「电磁振荡与电磁波」。
 *
 * 高中物理只需掌握 **c = λf** 这一条定量关系（电磁波在真空中以光速 c 传播），
 * 以及电磁波谱的**排列顺序**与各谱段的典型应用，不涉及其内部机理的定量计算。
 *
 * @module physics/emWave
 */

import { SPEED_OF_LIGHT } from './constants'

/** 电磁波谱中的单一谱段 */
export interface EMSpectrumBand {
  /** 稳定标识 */
  key: string
  /** 谱段名称（物理分类名） */
  label: string
  /** 波长下界 (m)，含；短波极限（γ 射线）lambdaMin 为 0 表示无下界 */
  lambdaMin: number
  /** 波长上界 (m)，不含；长波极限（无线电波）lambdaMax 为 Infinity 表示无上界 */
  lambdaMax: number
  /** 代表性波长 (m)，用于图表定位与读数 */
  representativeLambda: number
  /** 该谱段的典型应用（facts，供中屏标注与右屏要点共用） */
  typicalApplications: string[]
}

/**
 * 电磁波谱（按波长由长到短 / 频率由低到高排序）。
 *
 * 顺序是高考固定考点：无线电波 → 红外线 → 可见光 → 紫外线 → X 射线 → γ 射线。
 * 微波作为无线电波的高频段单列，便于教学对照。
 */
export const EM_SPECTRUM_BANDS: readonly EMSpectrumBand[] = [
  {
    key: 'radio',
    label: '无线电波',
    lambdaMin: 0.1,
    lambdaMax: Infinity,
    representativeLambda: 100,
    typicalApplications: ['广播', '电视', '移动通信'],
  },
  {
    key: 'microwave',
    label: '微波',
    lambdaMin: 1e-3,
    lambdaMax: 0.1,
    representativeLambda: 1e-2,
    typicalApplications: ['雷达', '微波炉', '卫星通信'],
  },
  {
    key: 'infrared',
    label: '红外线',
    lambdaMin: 760e-9,
    lambdaMax: 1e-3,
    representativeLambda: 1e-5,
    typicalApplications: ['红外热成像', '电视遥控', '红外测温'],
  },
  {
    key: 'visible',
    label: '可见光',
    lambdaMin: 380e-9,
    lambdaMax: 760e-9,
    representativeLambda: 550e-9,
    typicalApplications: ['视觉', '照明', '光通信'],
  },
  {
    key: 'ultraviolet',
    label: '紫外线',
    lambdaMin: 10e-9,
    lambdaMax: 380e-9,
    representativeLambda: 200e-9,
    typicalApplications: ['杀菌消毒', '荧光效应', '防伪验钞'],
  },
  {
    key: 'xray',
    label: 'X 射线',
    lambdaMin: 0.01e-9,
    lambdaMax: 10e-9,
    representativeLambda: 1e-9,
    typicalApplications: ['医学透视', '晶体结构分析', '安检成像'],
  },
  {
    key: 'gamma',
    label: 'γ 射线',
    lambdaMin: 0,
    lambdaMax: 0.01e-9,
    representativeLambda: 1e-12,
    typicalApplications: ['癌症放疗', '金属探伤', '核衰变辐射'],
  },
] as const

/**
 * 由波长求频率，f = c / λ。
 *
 * @param lambda 波长 (m)，需 > 0
 * @returns 频率 (Hz)
 * @throws 当 λ ≤ 0 时（无物理意义）
 */
export function frequencyFromWavelength(lambda: number): number {
  if (!(lambda > 0)) {
    throw new Error(`frequencyFromWavelength: 波长必须为正数，收到 ${lambda}`)
  }
  return SPEED_OF_LIGHT / lambda
}

/**
 * 由频率求波长，λ = c / f。
 *
 * @param f 频率 (Hz)，需 > 0
 * @returns 波长 (m)
 * @throws 当 f ≤ 0 时（无物理意义）
 */
export function wavelengthFromFrequency(f: number): number {
  if (!(f > 0)) {
    throw new Error(`wavelengthFromFrequency: 频率必须为正数，收到 ${f}`)
  }
  return SPEED_OF_LIGHT / f
}

/**
 * 按索引取谱段（越界夹紧到边界，避免 UI 崩溃）。
 *
 * @param index 谱段索引，对应 EM_SPECTRUM_BANDS 的下标
 */
export function getSpectrumBand(index: number): EMSpectrumBand {
  const i = Math.min(EM_SPECTRUM_BANDS.length - 1, Math.max(0, Math.round(index)))
  return EM_SPECTRUM_BANDS[i]
}

/**
 * 把波长格式化为便于阅读的字符串（自动选择 pm / nm / μm / mm / m / km）。
 *
 * 采用 0.9995 临界升档机制，彻底消除 999.6 经 toPrecision(3) 产生的 "1.00e+3" 失范记法。
 *
 * @param lambda 波长 (m)
 */
export function formatWavelength(lambda: number): string {
  if (!(lambda > 0) || !Number.isFinite(lambda)) return '—'
  if (lambda < 0.9995e-9) return `${(lambda * 1e12).toPrecision(3)} pm`
  if (lambda < 0.9995e-6) return `${(lambda * 1e9).toPrecision(3)} nm`
  if (lambda < 0.9995e-3) return `${(lambda * 1e6).toPrecision(3)} μm`
  // 0.1 m 以上一律用 m：高中题目中 λ = 0.3 m 写成「300 mm」不符合书写习惯
  if (lambda < 0.09995) return `${(lambda * 1e3).toPrecision(3)} mm`
  if (lambda < 999.5) return `${lambda.toPrecision(3)} m`
  return `${(lambda / 1000).toPrecision(3)} km`
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
}

function toSuperscript(num: number): string {
  return String(num)
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join('')
}

/**
 * 把频率格式化为便于阅读的字符串（自动选择 Hz / kHz / MHz / GHz 或高中标准科学记数法）。
 *
 * 采用 999.5 升档阈值与 Unicode 上标科学记数法，杜绝 "1.00e+3" 或 "3.00e+8 GHz" 等失范表示；
 * 严禁向高中生呈现课标外单位 THz，≥ 999.5 GHz 统一采用标准科学记数法（如 5.45 × 10¹⁴ Hz）。
 *
 * @param f 频率 (Hz)
 */
export function formatFrequency(f: number): string {
  if (!(f > 0) || !Number.isFinite(f)) return '—'
  if (f < 999.5) return `${f.toPrecision(3)} Hz`
  if (f < 999.5e3) return `${(f / 1e3).toPrecision(3)} kHz`
  if (f < 999.5e6) return `${(f / 1e6).toPrecision(3)} MHz`
  if (f < 999.5e9) return `${(f / 1e9).toPrecision(3)} GHz`
  // ≥ 999.5 GHz（红外、可见光、紫外、X 射线、γ 射线）：高中统一使用标准科学记数法（如 5.45 × 10¹⁴ Hz）
  const [mantissaStr, expStr] = f.toExponential(2).split('e')
  const expNum = parseInt(expStr, 10)
  return `${mantissaStr} × 10${toSuperscript(expNum)} Hz`
}

/** 无线电调制与检波模式波形采样单点 */
export interface RadioModulationSample {
  /** 归一化时间 t (0 ~ 1.0) */
  t: number
  /** 低频音频调制信号（声音基带） [-1, 1] */
  audio: number
  /** 高频等幅载波信号 [-1, 1] */
  carrier: number
  /** 调幅信号 (AM)（振幅随音频变化） [-1.65, 1.65] */
  am: number
  /** 调幅波正向包络（与半波检波后电容滤波的脉动包络一致） [0.35, 1.65] */
  amEnvelope: number
  /** 调频信号 (FM)（频率疏密随音频变化，振幅恒定） [-1, 1] */
  fm: number
  /** 检波输出（二极管单向导电半波整流） [0, 1.65] */
  detected: number
  /** 滤波还原信号（隔直后还原音频基带） [-1, 1] */
  filtered: number
}

/**
 * 生成无线电通信调制（AM/FM）与检波（二极管整流与滤波）的对比波形序列。
 *
 * 教材依据：人教版选择性必修第二册第 4 章第 3 节「无线电波的发射和接收」
 *   图 4.3-3（调制过程：调幅波与调频波）与 图 4.3-5（检波过程）。
 *
 * 专门服务新高考高频考点——四类波形辨析：
 *   1. 音频信号：低频信号，不能直接向外有效辐射；
 *   2. 载波信号：高频等幅信号，用于搭载音频向外发射；
 *   3. 调幅波(AM)：高频载波的振幅随音频信号变化，波包包络与音频完全同形；
 *   4. 检波输出：利用二极管单向导电性切除调幅波的下半周，再经 RC 滤波恢复音频。
 *
 * @param count 采样点数，默认 300
 * @param time 当前时间偏置（用于行进动态呈现）
 */
export function sampleRadioModulationWaves(count = 300, time = 0): RadioModulationSample[] {
  const samples: RadioModulationSample[] = []
  // 音频周期数：在归一化窗口内展示 2 个完整周期
  const fa = 2
  // 高频载波周期数：展示 24 个密集完整周期，使波包轮廓与高频振荡明显区分
  const fc = 24
  // 调幅系数 m (0 < m < 1，典型值 0.65，避免过调制削波)
  const m = 0.65
  // 调频频偏系数 beta
  const beta = 2.4

  for (let i = 0; i <= count; i++) {
    const t = i / count
    // 空间波动行进相位
    const phaseOffset = time * 0.4
    const ta = 2 * Math.PI * fa * (t - phaseOffset)
    const tc = 2 * Math.PI * fc * (t - phaseOffset)

    const audio = Math.cos(ta)
    const carrier = Math.cos(tc)
    // 调幅信号：A(t) = 1 + m * audio
    const env = 1 + m * audio
    const am = env * carrier
    // 调频信号：频率瞬时变化
    const fm = Math.cos(tc + beta * Math.sin(ta))
    // 二极管检波：理想半波整流，切除负半周
    const detected = Math.max(0, am)
    // 滤波还原音频：去除直流偏置与载波残差，还原出纯净音频
    const filtered = audio

    samples.push({
      t,
      audio,
      carrier,
      am,
      amEnvelope: env,
      fm,
      detected,
      filtered,
    })
  }

  return samples
}

