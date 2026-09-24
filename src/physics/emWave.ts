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
 * 把频率格式化为便于阅读的字符串（自动选择 Hz / kHz / MHz / GHz / THz 或标准科学记数法）。
 *
 * 采用 999.5 升档阈值与 Unicode 上标科学记数法，杜绝 "1.00e+3" 或 "3.00e+8 GHz" 等失范表示。
 *
 * @param f 频率 (Hz)
 */
export function formatFrequency(f: number): string {
  if (!(f > 0) || !Number.isFinite(f)) return '—'
  if (f < 999.5) return `${f.toPrecision(3)} Hz`
  if (f < 999.5e3) return `${(f / 1e3).toPrecision(3)} kHz`
  if (f < 999.5e6) return `${(f / 1e6).toPrecision(3)} MHz`
  if (f < 999.5e9) return `${(f / 1e9).toPrecision(3)} GHz`
  // 10¹² ~ 10¹⁵ Hz：红外/可见光频段，高中常用 THz
  if (f < 999.5e12) return `${(f / 1e12).toPrecision(3)} THz`
  // ≥ 10¹⁵ Hz（紫外、X 射线、γ 射线）：高中统一使用标准科学记数法（如 3.00 × 10¹⁸ Hz）
  const [mantissaStr, expStr] = f.toExponential(2).split('e')
  const expNum = parseInt(expStr, 10)
  return `${mantissaStr} × 10${toSuperscript(expNum)} Hz`
}
