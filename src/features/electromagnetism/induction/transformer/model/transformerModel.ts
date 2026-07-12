import { PHYSICS_COLORS } from '@/theme/physics'
import type { calculateTransformerWithLoad } from '@/physics'

export const MAX_DISPLAY_TURNS = 20
export const HIGHLIGHT_ALPHA = '15'

export interface TransformerParams {
  mode: number
  n1: number
  n2: number
  U1: number
  R: number
}

export interface CoilPaths3D {
  backD: string
  frontD: string
}

export interface TransformerLayout {
  W: number
  H: number
  rightPanelW: number
  coreH: number
  coreColumnW: number
  coilW: number
  cx: number
  cy: number
  span: number
  v1X: number
  v2X: number
  coreLeft: number
  coreRight: number
  coreTop: number
  coreBottom: number
  innerLeft: number
  innerRight: number
  innerTop: number
  innerBottom: number
  primaryLeft: number
  primaryRight: number
  secondaryLeft: number
  secondaryRight: number
  meterR: number
  meterTopY: number
  meterBotY: number
  sourceX: number
  rheostatW: number
  rheostatX: number
  scale: number
}

export interface TransformerDerived {
  displayI1: number
  displayI2: number
  v1Max: number
  v2Max: number
  a1Max: number
  a2Max: number
  primaryFlowDur: number
  secondaryFlowDur: number
  fluxFlowDur: number
  glowRadius1: number
  glowRadius2: number
  primaryGlowOpacity: number
  secondaryGlowOpacity: number
  waveAmp: number
  waveWl: number
  wavePath: string
  pBarW: number
  powerBalanced: boolean
}

export interface ChainStep {
  key: string
  label: string
  value: number
  unit: string
  color: string
}

type TransformerResult = ReturnType<typeof calculateTransformerWithLoad>

export function normalizeTransformerParams(params: Record<string, number>): TransformerParams {
  return {
    mode: params.mode ?? 0,
    n1: params.n1 ?? 100,
    n2: params.n2 ?? 200,
    U1: params.U1 ?? 220,
    R: params.R ?? 50,
  }
}

export function niceMeterMax(value: number): number {
  if (value <= 0) return 10
  const order = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / order
  if (n <= 1) return order
  if (n <= 2) return 2 * order
  if (n <= 5) return 5 * order
  return 10 * order
}

export function generateCoilPaths3D(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean,
  topInset: number,
  bulge: number,
): CoilPaths3D {
  const turns = Math.min(Math.max(1, n), MAX_DISPLAY_TURNS)
  const availableH = bottom - top - topInset * 2
  const gap = availableH / turns
  let backD = ''
  let frontD = ''

  for (let i = 0; i < turns; i++) {
    const yStart = top + topInset + i * gap
    const yMid = yStart + gap / 2
    const yEnd = yStart + gap

    if (isPrimary) {
      backD += `${i === 0 ? 'M' : ' L'} ${left} ${yStart}`
      backD += ` Q ${left - bulge} ${(yStart + yMid) / 2} ${right} ${yMid}`
      frontD += `${i === 0 ? 'M' : ' L'} ${right} ${yMid}`
      frontD += ` Q ${right + bulge} ${(yMid + yEnd) / 2} ${left} ${yEnd}`
    } else {
      backD += `${i === 0 ? 'M' : ' L'} ${right} ${yStart}`
      backD += ` Q ${right + bulge} ${(yStart + yMid) / 2} ${left} ${yMid}`
      frontD += `${i === 0 ? 'M' : ' L'} ${left} ${yMid}`
      frontD += ` Q ${left - bulge} ${(yMid + yEnd) / 2} ${right} ${yEnd}`
    }
  }

  return { backD, frontD }
}

export function buildTransformerLayout({
  width,
  height,
  mode,
}: {
  width: number
  height: number
  mode: number
}): TransformerLayout {
  // 设计坐标系：所有坐标和尺寸使用 design-unit
  const rightPanelW = mode === 1 ? Math.round(width * 0.25) : 0
  // 可用区域（扣除 overlayRight 后的实际设计宽度）
  const availW = width - rightPanelW
  // 高度方向给足空间（底部标注条已删除），宽度方向以 availW 为限
  const scale = Math.min(availW / 350, height / 400)
  const coreH = 155 * scale
  const coreColumnW = 18 * scale
  const coilW = 24 * scale
  const cx = availW / 2
  const cy = height / 2
  const span = 110 * scale
  const v1X = cx - span / 2
  const v2X = cx + span / 2
  const coreLeft = v1X - coreColumnW / 2
  const coreRight = v2X + coreColumnW / 2
  const coreTop = cy - coreH / 2
  const coreBottom = cy + coreH / 2
  const innerLeft = v1X + coreColumnW / 2
  const innerRight = v2X - coreColumnW / 2
  const innerTop = coreTop + coreColumnW
  const innerBottom = coreBottom - coreColumnW
  const primaryLeft = v1X - coilW / 2
  const primaryRight = v1X + coilW / 2
  const secondaryLeft = v2X - coilW / 2
  const secondaryRight = v2X + coilW / 2
  const meterR = 26 * scale
  const meterTopY = coreTop - meterR - 16 * scale
  const meterBotY = coreBottom + meterR + 18 * scale
  const sourceX = primaryLeft - 34 * scale
  const rheostatW = 86 * scale
  const rheostatGap = coilW + 12 * scale
  const rheostatX = secondaryRight + rheostatGap + rheostatW / 2

  return {
    W: width,
    H: height,
    rightPanelW,
    coreH,
    coreColumnW,
    coilW,
    cx,
    cy,
    span,
    v1X,
    v2X,
    coreLeft,
    coreRight,
    coreTop,
    coreBottom,
    innerLeft,
    innerRight,
    innerTop,
    innerBottom,
    primaryLeft,
    primaryRight,
    secondaryLeft,
    secondaryRight,
    meterR,
    meterTopY,
    meterBotY,
    sourceX,
    rheostatW,
    rheostatX,
    scale,
  }
}

export function buildTransformerDerived({
  params,
  result,
  layout,
}: {
  params: Pick<TransformerParams, 'U1'>
  result: TransformerResult
  layout: Pick<TransformerLayout, 'sourceX' | 'cy' | 'scale'>
}): TransformerDerived {
  const { U1 } = params
  const { U2, I1, I2, P_input, P_output, isShortCircuit } = result
  const displayI1 = Number.isFinite(I1) ? I1 : 999
  const displayI2 = Number.isFinite(I2) ? I2 : 999
  // 设计坐标系：scale 参数保留用于计算动画时长和发光参数
  const s = layout.scale
  const waveAmp = Math.max(2.5, Math.min(6, (U1 / 500) * 8)) * s
  const waveWl = 22 * s

  return {
    displayI1,
    displayI2,
    v1Max: niceMeterMax(U1),
    v2Max: niceMeterMax(U2),
    a1Max: niceMeterMax(displayI1),
    a2Max: niceMeterMax(displayI2),
    primaryFlowDur: isShortCircuit ? 0.35 : Math.max(0.35, Math.min(3, 1.8 / (I1 + 0.3))),
    secondaryFlowDur: isShortCircuit ? 0.35 : Math.max(0.35, Math.min(3, 1.8 / (I2 + 0.3))),
    fluxFlowDur: Math.max(0.4, Math.min(2.5, 300 / (U1 + 15))),
    glowRadius1: Math.max(1.5, Math.min(6, 1 + displayI1 * 0.25)),
    glowRadius2: Math.max(1.5, Math.min(6, 1 + displayI2 * 0.25)),
    primaryGlowOpacity: Math.max(0.12, Math.min(0.85, 0.12 + displayI1 * 0.15)),
    secondaryGlowOpacity: Math.max(0.12, Math.min(0.85, 0.12 + displayI2 * 0.15)),
    waveAmp,
    waveWl,
    wavePath: `M ${layout.sourceX - waveWl} ${layout.cy} q ${waveWl / 4} ${-waveAmp} ${waveWl / 2} 0 t ${waveWl / 2} 0 t ${waveWl / 2} 0 t ${waveWl / 2} 0 t ${waveWl / 2} 0`,
    pBarW: isShortCircuit ? 100 : Math.min(100, (P_input / 1000) * 100),
    powerBalanced: !isShortCircuit && Math.abs(P_input - P_output) < 0.01,
  }
}

export function buildTransformerChainSteps(
  params: Pick<TransformerParams, 'U1'>,
  result: Pick<TransformerResult, 'U2' | 'P_input' | 'P_output'>,
  displayI1: number,
  displayI2: number,
): ChainStep[] {
  return [
    { key: 'U1', label: 'U₁', value: params.U1, unit: 'V', color: PHYSICS_COLORS.emf },
    { key: 'U2', label: 'U₂', value: result.U2, unit: 'V', color: PHYSICS_COLORS.magnetSouth },
    { key: 'I2', label: 'I₂', value: displayI2, unit: 'A', color: PHYSICS_COLORS.magnetSouth },
    { key: 'Pout', label: 'P_out', value: Number.isFinite(result.P_output) ? result.P_output : 9999, unit: 'W', color: PHYSICS_COLORS.power },
    { key: 'Pin', label: 'P_in', value: Number.isFinite(result.P_input) ? result.P_input : 9999, unit: 'W', color: PHYSICS_COLORS.power },
    { key: 'I1', label: 'I₁', value: displayI1, unit: 'A', color: PHYSICS_COLORS.electricCurrent },
  ]
}
