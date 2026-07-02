/**
 * useKeplerPhysics.ts
 * 开普勒定律动画 view model：轨道几何、天体坐标、扇形路径、矢量大小、图表数据
 *
 * 零 JSX，纯数据计算，可独立单测
 */
import { useMemo } from 'react'
import { physicsToCanvas } from '@/utils/coordinate'
import {
  calculateKeplerOrbit,
  solveKeplerEquation,
} from '@/physics/celestial'
import {
  KEPLER_CONFIG,
  VECTOR_DISPLAY,
  INSET_CHART,
} from '@/theme/physics'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── 类型定义 ─────────────────────────────────────────────────────

export interface KeplerPhysicsResult {
  /** 开普勒定律模式：0=第一定律, 1=第二定律, 2=第三定律 */
  mode: number

  // ── 轨道几何参数 ──
  a1: number
  b1: number
  c1: number
  e1: number
  rMin: number
  rMax: number
  T1: number

  // ── Canvas 坐标 ──
  centerX: number
  centerY: number
  sunX: number
  sunY: number
  foci2X: number
  foci2Y: number

  // ── 行星 A ──
  planetXA: number
  planetYA: number
  orbitA: { x: number; y: number; vx: number; vy: number; r: number }

  // ── 行星 B（第三定律模式） ──
  a2: number
  b2: number
  T2: number
  planetXB: number
  planetYB: number
  orbitB: { x: number; y: number; vx: number; vy: number; r: number }

  // ── 尾迹 ──
  trailA: { x: number; y: number; opacity: number }[]

  // ── 第二定律扇形 ──
  perihelionSector: string
  aphelionSector: string
  M_current: number
  isInPerihelion: boolean
  isInAphelion: boolean

  // ── 矢量大小 ──
  vxA: number
  vyA: number
  fxA: number
  fyA: number

  // ── 第三定律图表 ──
  chartW: number
  chartH: number
  a3_1: number
  t2_1: number
  a3_2: number
  t2_2: number
  k_ratio: number
  maxA3: number
  maxT2: number
  /** 扫过时间占周期比例（第二定律时间卡片） */
  deltaTPercent: number
  /** 画中画图表边距 (px) */
  chartPadding: number
  /** 轨道缩放因子（用于 SVG 椭圆 rx/ry 等计算） */
  scale: number
}

// ── 工具：SVG 椭圆弧扇形的 Path 生成 ──
function buildSectorPath(
  sunX: number,
  sunY: number,
  a1: number,
  b1: number,
  e1: number,
  canvasSize: { width: number; height: number },
  scale: number,
  deltaM: number,
  mCenter: number,
): string {
  const M_start = mCenter - deltaM / 2
  const M_end = mCenter + deltaM / 2
  const E_start = solveKeplerEquation(M_start, e1)
  const E_end = solveKeplerEquation(M_end, e1)

  const { cx: xA, cy: yA } = physicsToCanvas(
    a1 * Math.cos(E_start),
    b1 * Math.sin(E_start),
    canvasSize.width,
    canvasSize.height,
    scale,
  )
  const { cx: xB, cy: yB } = physicsToCanvas(
    a1 * Math.cos(E_end),
    b1 * Math.sin(E_end),
    canvasSize.width,
    canvasSize.height,
    scale,
  )

  return `M ${sunX} ${sunY} L ${xA} ${yA} A ${a1 * scale} ${b1 * scale} 0 0 0 ${xB} ${yB} Z`
}

// ─── 主 Hook ─────────────────────────────────────────────────────

/**
 * 开普勒定律动画物理/视图模型 Hook
 *
 * @param params 动画参数
 * @param time 当前时间
 * @param canvasSize 画布尺寸（来自 useCanvasSize）
 * @param viewport 视口信息（来自 useViewport）：{ centerX, centerY, scale }
 */
export function useKeplerPhysics(
  params: Record<string, number>,
  time: number,
  canvasSize: { width: number; height: number },
  viewport: { centerX: number; centerY: number; scale: number },
): KeplerPhysicsResult {
  const { width: cw, height: ch } = canvasSize
  const { centerX, centerY, scale: vpScale } = viewport

  // ── 轨道缩放 ──
  const scale = KEPLER_CONFIG.scaleBase * vpScale

  // ── 轨道参数 ──
  const mode = params.mode ?? 0
  const a1 = params.a ?? 4.5
  const b1 = params.b ?? 3.0
  const T1 = params.period ?? 10
  const a2 = params.a2 ?? 7.5
  const b2 = params.b2 ?? 6.0

  const c1 = Math.sqrt(Math.max(0, a1 * a1 - b1 * b1))
  const e1 = a1 > 0 ? c1 / a1 : 0
  const rMin = a1 - c1
  const rMax = a1 + c1

  const sunX = centerX + c1 * scale
  const sunY = centerY
  const foci2X = centerX - c1 * scale
  const foci2Y = centerY

  // ── 行星 A ──
  const orbitA = useMemo(
    () => calculateKeplerOrbit(a1, b1, time, T1),
    [a1, b1, time, T1],
  )

  const { cx: planetXA, cy: planetYA } = physicsToCanvas(
    orbitA.x, orbitA.y, cw, ch, scale,
  )

  // ── 行星 B ──
  const T2 = T1 * Math.sqrt(Math.pow(a2 / a1, 3))

  const orbitB = useMemo(
    () => calculateKeplerOrbit(a2, b2, time, T2),
    [a2, b2, time, T2],
  )

  const { cx: planetXB, cy: planetYB } = physicsToCanvas(
    orbitB.x, orbitB.y, cw, ch, scale,
  )

  // ── 尾迹 ──
  const trailA = useMemo(() => {
    const points: { x: number; y: number; opacity: number }[] = []
    const step = 0.12
    const count = 7
    for (let i = 1; i <= count; i++) {
      const histTime = Math.max(0, time - i * step)
      const histOrbit = calculateKeplerOrbit(a1, b1, histTime, T1)
      const { cx, cy } = physicsToCanvas(
        histOrbit.x, histOrbit.y, cw, ch, scale,
      )
      points.push({ x: cx, y: cy, opacity: 0.7 * (1 - i / (count + 1)) })
    }
    return points
  }, [a1, b1, time, T1, cw, ch, scale])

  // ── 第二定律扇形 ──
  const deltaTPercent = KEPLER_CONFIG.sweepTimeRatio
  const deltaM = 2 * Math.PI * deltaTPercent

  const { perihelionSector, aphelionSector } = useMemo(() => {
    return {
      perihelionSector: buildSectorPath(
        sunX, sunY, a1, b1, e1, canvasSize, scale, deltaM, 0,
      ),
      aphelionSector: buildSectorPath(
        sunX, sunY, a1, b1, e1, canvasSize, scale, deltaM, Math.PI,
      ),
    }
  }, [sunX, sunY, a1, b1, e1, canvasSize, scale, deltaM])

  const M_current = ((2 * Math.PI) / T1 * time) % (2 * Math.PI)
  const isInPerihelion =
    M_current <= deltaM / 2 || M_current >= 2 * Math.PI - deltaM / 2
  const isInAphelion =
    M_current >= Math.PI - deltaM / 2 && M_current <= Math.PI + deltaM / 2

  // ── 矢量大小 ──
  const speedScale = VECTOR_DISPLAY.velocity.scaleBase
  const vxA = orbitA.vx * speedScale * scale * 0.05
  const vyA = -orbitA.vy * speedScale * scale * 0.05

  const forceScale = VECTOR_DISPLAY.force.scaleBase
  const gravityMagA = forceScale / (orbitA.r * orbitA.r)
  const forceDirXA = (sunX - planetXA) / (orbitA.r * scale)
  const forceDirYA = (sunY - planetYA) / (orbitA.r * scale)
  const fxA = forceDirXA * gravityMagA
  const fyA = forceDirYA * gravityMagA

  // ── 第三定律图表 ──
  const chartDimensions = useMemo(() => {
    const width = clamp(
      cw * INSET_CHART.widthRatio,
      INSET_CHART.minWidth,
      cw * INSET_CHART.maxWidthRatio,
    )
    const height = clamp(
      ch * INSET_CHART.heightRatio,
      INSET_CHART.minHeight,
      ch * INSET_CHART.maxHeightRatio,
    )
    const _padding = cw * INSET_CHART.paddingRatio
    return { width, height, padding: _padding }
  }, [cw, ch])

  const chartW = chartDimensions.width
  const chartH = chartDimensions.height
  const chartPadding = chartDimensions.padding

  const a3_1 = a1 * a1 * a1
  const t2_1 = T1 * T1
  const k_ratio = t2_1 / a3_1

  const a3_2 = a2 * a2 * a2
  const t2_2 = T2 * T2

  const maxA3 = Math.max(a3_1, a3_2) * 1.15
  const maxT2 = maxA3 * k_ratio

  return {
    mode,
    a1, b1, c1, e1, rMin, rMax, T1,
    centerX, centerY, sunX, sunY, foci2X, foci2Y,
    planetXA, planetYA, orbitA,
    a2, b2, T2, planetXB, planetYB, orbitB,
    trailA,
    perihelionSector, aphelionSector,
    M_current, isInPerihelion, isInAphelion,
    vxA, vyA, fxA, fyA,
    chartW, chartH, chartPadding,
    a3_1, t2_1, a3_2, t2_2, k_ratio, maxA3, maxT2, deltaTPercent,
    scale,
  }
}