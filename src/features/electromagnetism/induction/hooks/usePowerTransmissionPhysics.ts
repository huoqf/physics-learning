/**
 * usePowerTransmissionPhysics.ts — 远距离输电视觉派生计算 hook
 *
 * 零 JSX，纯数据计算，可独立单测。
 * 从 PowerTransmission.tsx 拆分：参数读取、物理计算调用、视觉强度、布局坐标、图表数据。
 */
import { useMemo } from 'react'
import { calculatePowerTransmission } from '@/physics'

// ─── 类型 ────────────────────────────────────────────────────────────────────
export interface VoltagePoint {
  x: number
  y: number
  label: string
  value: number
}

export interface PowerTransmissionPhysics {
  /** 物理因变量 */
  physics: {
    P1: number
    I_line: number
    deltaU: number
    P_loss: number
    U3: number
    U4: number
    P_user: number
    eta: number
    isOverloaded: boolean
  }
  /** 视觉强度 */
  heatIntensity: number
  voltageRatio: number
  userBrightness: number
  ratedVoltage: number
  /** 脉冲球动画参数 */
  currentSpeed: number
  ballVisualRadius: number
  ballSpeed: number
  ballDensity: number
  spawnInterval: number
  /** 线路视觉 */
  lineColor: string
  blurStd: number
  shadowOpacity: number
  lineWidth: number
  /** 布局坐标 */
  chartTop: number
  chartBottom: number
  networkTop: number
  networkBottom: number
  nodeY: number
  plantX: number
  stepUpX: number
  lineStartX: number
  lineEndX: number
  stepDownX: number
  userX: number
  /** 电压剖面图 */
  voltagePoints: VoltagePoint[]
  idealPoints: VoltagePoint[]
  ratedY: number
  U1_display: number
  u3Y: number
  /** 灯泡 */
  bulbCount: number
  bulbSpacing: number
  bulbsStartX: number
}

/** 画布尺寸接口（只取需要的字段） */
export interface CanvasMetrics {
  width: number
  height: number
  px: (v: number) => number
  font: (v: number) => number
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePowerTransmissionPhysics(
  params: Record<string, number>,
  canvas: CanvasMetrics,
): PowerTransmissionPhysics {
  const { width: W, height: H, px } = canvas

  // ─── 自变量（从 params 读取，单位转换为 SI）────────────────────────────────
  const mode = params.mode ?? 0
  const scenario = params.scenario ?? 0
  const P1 = (params.P1 ?? 100) * 1000   // kW → W
  const U2 = (params.U2 ?? 10) * 1000    // kV → V
  const r = params.r ?? 10               // Ω
  const k = params.k ?? 0.02             // 降压变压器变比 k = n4/n3
  const N = params.N ?? 10               // 用户并联户数
  const showIdeal = (params.showIdeal ?? 0) === 1

  // ─── 因变量（纯函数计算）─────────────────────────────────────────────────────
  const physics = useMemo(
    () => calculatePowerTransmission(P1, U2, r, k, mode, N, scenario),
    [P1, U2, r, k, mode, N, scenario],
  )

  const { P1: P1_real, I_line, deltaU, P_loss, U3, U4, P_user, eta, isOverloaded } = physics

  // ─── 视觉强度计算 ────────────────────────────────────────────────────────────
  const lossRatio = P1_real === 0 ? 0 : P_loss / P1_real
  const heatIntensity = Math.min(1, lossRatio * 5)
  const ratedVoltage = 220
  const voltageRatio = Math.max(0, Math.min(1, U4 / ratedVoltage))
  const userBrightness = Math.max(0.08, voltageRatio)

  // ─── 布局坐标（响应式）───────────────────────────────────────────────────────
  const chartTop = H * 0.06
  const chartBottom = H * 0.36
  const networkTop = H * 0.44
  const networkBottom = H * 0.92
  const nodeY = (networkTop + networkBottom) / 2

  const plantX = W * 0.08
  const stepUpX = W * 0.24
  const lineStartX = W * 0.34
  const lineEndX = W * 0.66
  const stepDownX = W * 0.76
  const userX = W * 0.92

  // ─── 脉冲球动画参数 ──────────────────────────────────────────────────────────
  const currentSpeed = useMemo(() => {
    const maxI = P1 / 1000
    return maxI === 0 ? 0 : I_line / maxI
  }, [I_line, P1])

  const ballVisualRadius = useMemo(() => {
    const baseR = px(4)
    const voltageFactor = Math.log10(Math.max(U2, 100)) / Math.log10(50000)
    return baseR + voltageFactor * px(5)
  }, [U2, px])

  const ballSpeed = useMemo(() => 0.08 + currentSpeed * 0.25, [currentSpeed])
  const ballDensity = useMemo(() => 0.3 + currentSpeed * 0.7, [currentSpeed])
  const spawnInterval = useMemo(() => Math.max(80, 600 / (ballDensity + 0.1)), [ballDensity])

  // ─── 线路视觉 ────────────────────────────────────────────────────────────────
  const lineColor = useMemo(() => {
    const rVal = Math.round(147 + (185 - 147) * heatIntensity)
    const gVal = Math.round(197 + (28 - 197) * heatIntensity)
    const bVal = Math.round(253 + (28 - 253) * heatIntensity)
    return `rgb(${rVal},${gVal},${bVal})`
  }, [heatIntensity])

  const blurStd = px(2) + heatIntensity * px(14)
  const shadowOpacity = 0.1 + heatIntensity * 0.5
  const lineWidth = px(2) + heatIntensity * px(3)

  // ─── 电压剖面图数据 ──────────────────────────────────────────────────────────
  const U1_display = 10000
  const minVisibleDrop = px(30)
  const voltageDropRatio = Math.min(1, Math.max(0, deltaU / U2))
  const actualDropPixels = (chartBottom - chartTop) * voltageDropRatio
  const visibleDropPixels = Math.max(actualDropPixels, minVisibleDrop)
  const u3Y = chartTop + visibleDropPixels

  const u4Target = 220 * (k / 0.02)
  const u4Y = chartBottom - (chartBottom - chartTop) * 0.7 * (u4Target === 0 ? 0 : U4 / u4Target)

  const voltagePoints: VoltagePoint[] = [
    { x: plantX, y: chartBottom, label: 'U₁', value: U1_display },
    { x: stepUpX, y: chartTop, label: 'U₂', value: U2 },
    { x: lineEndX, y: u3Y, label: 'U₃', value: U3 },
    { x: userX, y: u4Y, label: 'U₄', value: U4 },
  ]

  const ratedY = chartBottom - (chartBottom - chartTop) * 0.7 * (u4Target === 0 ? 0 : 220 / u4Target)

  const idealPoints: VoltagePoint[] = showIdeal ? [
    { x: plantX, y: chartBottom, label: '', value: 0 },
    { x: stepUpX, y: chartTop, label: '', value: 0 },
    { x: lineEndX, y: chartTop, label: '', value: 0 },
    { x: userX, y: chartBottom - (chartBottom - chartTop) * 0.7, label: '', value: 0 },
  ] : []

  // ─── 用户端灯泡数量 ──────────────────────────────────────────────────────────
  const bulbCount = mode === 1 ? Math.min(20, Math.max(3, Math.ceil(N / 50))) : 3
  const bulbSpacing = px(22)
  const bulbsStartX = stepDownX + px(35)

  return {
    physics: { P1: P1_real, I_line, deltaU, P_loss, U3, U4, P_user, eta, isOverloaded },
    heatIntensity,
    voltageRatio,
    userBrightness,
    ratedVoltage,
    currentSpeed,
    ballVisualRadius,
    ballSpeed,
    ballDensity,
    spawnInterval,
    lineColor,
    blurStd,
    shadowOpacity,
    lineWidth,
    chartTop,
    chartBottom,
    networkTop,
    networkBottom,
    nodeY,
    plantX,
    stepUpX,
    lineStartX,
    lineEndX,
    stepDownX,
    userX,
    voltagePoints,
    idealPoints,
    ratedY,
    U1_display,
    u3Y,
    bulbCount,
    bulbSpacing,
    bulbsStartX,
  }
}
