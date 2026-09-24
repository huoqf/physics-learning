import { useMemo } from 'react'
import { EM_SPECTRUM_BANDS, formatWavelength } from '@/physics'
import type { EmOscillationColorKey } from '@/theme/physics'

/**
 * 横轴以 log₁₀λ 展开：从 10⁻¹² m（γ 射线短端）到 10⁵ m（无线电波长端）。
 *
 * 为什么必须用对数轴：整个电磁波谱跨越 17 个数量级，
 * 可见光的 380~760 nm 只占 0.3 个数量级 —— 线性轴会把可见光压成一条线，
 * 学生无法建立"可见光只是极窄一段"的正确直觉。
 */
const EXP_MIN = -12
const EXP_MAX = 5

/** 波长 → 横轴占比 0..1（长波在左，短波在右，符合教材谱段顺序） */
function fracFromLambda(lambda: number): number {
  const clamped = Math.min(10 ** EXP_MAX, Math.max(10 ** EXP_MIN, lambda))
  const exp = Math.log10(clamped)
  return 1 - (exp - EXP_MIN) / (EXP_MAX - EXP_MIN)
}

export interface SpectrumSegment {
  key: string
  label: string
  /** 谱段色 token（由场景层解析为具体颜色） */
  colorToken: EmOscillationColorKey
  /** 起始占比 0..1（左端 = 波长较长一侧） */
  start: number
  /** 宽度占比 0..1 */
  width: number
  /** 谱段几何中心占比：用于放置谱段名标注 */
  labelAnchor: number
  /** 代表波长所在占比 */
  representative: number
  /** 代表波长读数 */
  lambdaLabel: string
}

export interface SpectrumRulerTick {
  exp: number
  frac: number
  /** 仅每 3 个数量级给一处文字标注，避免刻度文字互相压盖 */
  label: string | null
}

export interface EMSpectrumLayoutResult {
  segments: SpectrumSegment[]
  ticks: SpectrumRulerTick[]
  /** 选中的谱段下标（越界已夹紧） */
  selectedIndex: number
}

const COLOR_TOKENS: readonly EmOscillationColorKey[] = [
  'bandRadio',
  'bandMicrowave',
  'bandInfrared',
  'bandVisible',
  'bandUltraviolet',
  'bandXRay',
  'bandGamma',
]

/**
 * 电磁波谱横轴布局（纯几何，无物理公式）。
 *
 * 谱段顺序、代表波长、可见光范围全部取自 physics 层的 EM_SPECTRUM_BANDS，
 * 禁止在渲染层重复书写任何波长边界常量（避免双真源）。
 */
export function useEMSpectrumLayout(bandIndex: number): EMSpectrumLayoutResult {
  return useMemo(() => {
    const segments: SpectrumSegment[] = EM_SPECTRUM_BANDS.map((band, i) => {
      const start = fracFromLambda(band.lambdaMax)
      const end = fracFromLambda(band.lambdaMin)
      return {
        key: band.key,
        label: band.label,
        colorToken: COLOR_TOKENS[i] ?? 'bandRadio',
        start,
        width: end - start,
        labelAnchor: (start + end) / 2,
        representative: fracFromLambda(band.representativeLambda),
        lambdaLabel: formatWavelength(band.representativeLambda),
      }
    })

    const ticks: SpectrumRulerTick[] = []
    for (let exp = EXP_MIN; exp <= EXP_MAX; exp++) {
      const frac = 1 - (exp - EXP_MIN) / (EXP_MAX - EXP_MIN)
      // 两端（最长波 / 最短波）与每 3 个数量级各给一处文字标注，避免刻度文字互相压盖
      const showLabel = exp % 3 === 0 || exp === EXP_MIN || exp === EXP_MAX
      ticks.push({
        exp,
        frac,
        label: showLabel ? `10${toSuperscript(exp)}` : null,
      })
    }

    const safeIndex = Math.min(
      EM_SPECTRUM_BANDS.length - 1,
      Math.max(0, Math.round(bandIndex)),
    )

    return {
      segments,
      ticks,
      selectedIndex: safeIndex,
    }
  }, [bandIndex])
}

/** 把整数指数渲染成上标字符串，如 -12 → "⁻¹²" */
function toSuperscript(exp: number): string {
  const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const sign = exp < 0 ? '⁻' : ''
  return sign + String(Math.abs(exp)).split('').map((d) => digits[Number(d)]).join('')
}
