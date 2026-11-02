/**
 * src/theme/physics/tints.ts
 * 场景底色的「连续插值」着色器 —— 颜色计算的唯一落点。
 *
 * 为什么放在 theme 而不是 physics：
 * 这类函数按物理量（温度、内能增量）算出**颜色**，本质是渲染关注点。
 * 2026-11 之前它们住在 `src/physics/firstLaw.ts` / `secondLaw.ts`，导致：
 *   ① 物理层内出现 `'#3B82F6'` / `'#EF4444'` 字面量（违反「颜色必须走 TOKENS」）；
 *   ② 两个同名 `temperatureToColor` 各自实现（firstLaw 两段线性、secondLaw 三段），
 *      同一物理量在两页渲染出不同渐变，且注释声称"与 THERMO_COLORS 对齐"而值并不对齐。
 * 现在统一到本文件、一律从 `THERMO_COLORS` / `THERMAL_COLORS` 取色，physics 层零颜色。
 */
import { hexToRgb } from '@/utils/color'
import { THERMO_COLORS, withAlpha } from './colors'
import { THERMO_CHAMBER_COLORS } from './scene/thermal'

/** token → RGB 分量；token 写错属于编译期可发现的错误，直接抛，不静默兜底 */
function rgbOf(tokenName: string, hex: string): [number, number, number] {
  const c = hexToRgb(hex)
  if (!c) throw new Error(`颜色 token 非法：${tokenName} = ${hex}`)
  return [c.r, c.g, c.b]
}

const LOW = rgbOf('THERMO_COLORS.temperatureLow', THERMO_COLORS.temperatureLow)
const MID = rgbOf('THERMO_COLORS.temperatureMid', THERMO_COLORS.temperatureMid)
const HIGH = rgbOf('THERMO_COLORS.temperatureHigh', THERMO_COLORS.temperatureHigh)

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * 温度 → 粒子颜色（低温冷蓝 → 中温紫 → 高温亮红，三段线性插值）。
 *
 * 单一实现：FirstLaw 与 SecondLaw 两个场景共用，保证同一温度在全站同一颜色。
 *
 * @param T 当前温度 (K)
 * @param tLow 低温参考值 (K)，默认 300
 * @param tHigh 高温参考值 (K)，默认 1200
 * @returns CSS `rgb(r,g,b)` 字符串
 */
export function temperatureColor(T: number, tLow = 300, tHigh = 1200): string {
  const span = tHigh - tLow
  // tHigh === tLow 时无插值区间，退化为低温色（不产生 NaN）
  const t = span === 0 ? 0 : clamp01((T - tLow) / span)

  const from = t < 0.5 ? LOW : MID
  const to = t < 0.5 ? MID : HIGH
  const s = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5
  const r = Math.round(from[0] + s * (to[0] - from[0]))
  const g = Math.round(from[1] + s * (to[1] - from[1]))
  const b = Math.round(from[2] + s * (to[2] - from[2]))
  return `rgb(${r},${g},${b})`
}

/**
 * 内能增量 → 气缸背景色（带透明度）。
 * ΔU > 0 吸热偏暖橙，ΔU < 0 放热偏冷青，ΔU ≈ 0 回到理想气体基色。
 *
 * @param deltaU 内能变化量 (J)
 * @param maxAbsDU 归一化基准 (J)，默认 500
 * @returns CSS `rgba(...)` 字符串
 */
export function deltaUToBgColor(deltaU: number, maxAbsDU = 500): string {
  const normU = Math.max(-1, Math.min(1, maxAbsDU === 0 ? 0 : deltaU / maxAbsDU))
  if (normU > 0) return withAlpha(THERMO_COLORS.heatAbsorb, 0.04 + normU * 0.16)
  if (normU < 0) return withAlpha(THERMO_COLORS.heatRelease, 0.04 + Math.abs(normU) * 0.16)
  return withAlpha(THERMO_CHAMBER_COLORS.gasVolumeBase, 0.4)
}
