/**
 * useKeplerPhysics.ts
 * 开普勒定律动画 view model：轨道几何、天体坐标、扇形路径、矢量大小、图表数据
 *
 * 零 JSX，纯数据计算，可独立单测
 * 所有位置以物理坐标返回（轨道中心为原点，y 轴向上）
 */
import { useMemo } from 'react'
import {
  calculateKeplerOrbit,
  solveKeplerEquation,
} from '@/physics/celestial'
import {
  KEPLER_CONFIG,
  VECTOR_DISPLAY,
} from '@/theme/physics'

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

  // ── 天体物理坐标（轨道中心为原点，y↑）──
  sunPhysX: number
  sunPhysY: number
  foci2PhysX: number
  foci2PhysY: number

  // ── 行星 A ──
  planetX: number
  planetY: number
  orbitA: { x: number; y: number; vx: number; vy: number; r: number }

  // ── 行星 B（第三定律模式） ──
  a2: number
  b2: number
  T2: number
  planetBX: number
  planetBY: number
  orbitB: { x: number; y: number; vx: number; vy: number; r: number }

  // ── 尾迹（物理坐标）──
  trail: { x: number; y: number; opacity: number }[]

  // ── 第二定律扇形（物理坐标点）──
  sectorPoints: {
    perihelion: { x: number; y: number }[]
    aphelion: { x: number; y: number }[]
  }
  M_current: number
  isInPerihelion: boolean
  isInAphelion: boolean

  // ── 矢量大小（物理单位）──
  vxA: number
  vyA: number
  fxA: number
  fyA: number

  // ── 第三定律图表 ──
  a3_1: number
  t2_1: number
  a3_2: number
  t2_2: number
  k_ratio: number
  maxA3: number
  maxT2: number
  /** 扫过时间占周期比例（第二定律时间卡片） */
  deltaTPercent: number
}

// ── 工具：扇形物理坐标点（渲染层转 canvas 坐标构建 SVG path）──
function buildSectorPoints(
  a1: number,
  b1: number,
  e1: number,
  deltaM: number,
  mCenter: number,
): { x: number; y: number }[] {
  const M_start = mCenter - deltaM / 2
  const M_end = mCenter + deltaM / 2
  const E_start = solveKeplerEquation(M_start, e1)
  const E_end = solveKeplerEquation(M_end, e1)

  return [
    { x: 0, y: 0 },
    {
      x: a1 * Math.cos(E_start),
      y: b1 * Math.sin(E_start),
    },
    {
      x: a1 * Math.cos(E_end),
      y: b1 * Math.sin(E_end),
    },
  ]
}

// ── 矢量计算（纯函数，可独立测试）──

export interface KeplerOrbitData {
  x: number; y: number; vx: number; vy: number; r: number
}

export interface KeplerVectors {
  vxA: number; vyA: number
  fxA: number; fyA: number
}

/**
 * 从轨道数据计算速度与引力矢量（物理坐标，y↑）。
 * 约定：返回值直接传给 VectorArrow 的 origin/vector，不含额外 y 翻转。
 */
export function computeKeplerVectors(
  orbit: KeplerOrbitData,
  sunPhysX: number,
  sunPhysY: number,
): KeplerVectors {
  const speedScale = VECTOR_DISPLAY.velocity.scaleBase
  const vxA = orbit.vx * speedScale
  const vyA = orbit.vy * speedScale

  const forceScale = VECTOR_DISPLAY.force.scaleBase
  const gravityMagA = forceScale / (orbit.r * orbit.r)
  const forceDirXA = (sunPhysX - orbit.x) / orbit.r
  const forceDirYA = (sunPhysY - orbit.y) / orbit.r
  const fxA = forceDirXA * gravityMagA
  const fyA = forceDirYA * gravityMagA

  return { vxA, vyA, fxA, fyA }
}

// ─── 主 Hook ─────────────────────────────────────────────────────

/**
 * 开普勒定律动画物理/视图模型 Hook
 *
 * @param params 动画参数
 * @param time 当前时间
 */
export function useKeplerPhysics(
  params: Record<string, number>,
  time: number,
): KeplerPhysicsResult {

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

  // ── 天体物理坐标（轨道中心为原点，y↑）──
  const sunPhysX = c1
  const sunPhysY = 0
  const foci2PhysX = -c1
  const foci2PhysY = 0

  // ── 行星 A ──
  const orbitA = useMemo(
    () => calculateKeplerOrbit(a1, b1, time, T1),
    [a1, b1, time, T1],
  )

  const planetX = orbitA.x
  const planetY = orbitA.y

  // ── 行星 B ──
  const T2 = T1 * Math.sqrt(Math.pow(a2 / a1, 3))

  const orbitB = useMemo(
    () => calculateKeplerOrbit(a2, b2, time, T2),
    [a2, b2, time, T2],
  )

  const planetBX = orbitB.x
  const planetBY = orbitB.y

  // ── 尾迹 ──
  const trail = useMemo(() => {
    const points: { x: number; y: number; opacity: number }[] = []
    const step = 0.12
    const count = 7
    for (let i = 1; i <= count; i++) {
      const histTime = Math.max(0, time - i * step)
      const histOrbit = calculateKeplerOrbit(a1, b1, histTime, T1)
      points.push({ x: histOrbit.x, y: histOrbit.y, opacity: 0.7 * (1 - i / (count + 1)) })
    }
    return points
  }, [a1, b1, time, T1])

  // ── 第二定律扇形 ──
  const deltaTPercent = KEPLER_CONFIG.sweepTimeRatio
  const deltaM = 2 * Math.PI * deltaTPercent

  const sectorPoints = useMemo(() => {
    return {
      perihelion: buildSectorPoints(a1, b1, e1, deltaM, 0),
      aphelion: buildSectorPoints(a1, b1, e1, deltaM, Math.PI),
    }
  }, [a1, b1, e1, deltaM])

  const M_current = ((2 * Math.PI) / T1 * time) % (2 * Math.PI)
  const isInPerihelion =
    M_current <= deltaM / 2 || M_current >= 2 * Math.PI - deltaM / 2
  const isInAphelion =
    M_current >= Math.PI - deltaM / 2 && M_current <= Math.PI + deltaM / 2

  // ── 矢量大小（物理单位）──
  const { vxA, vyA, fxA, fyA } = computeKeplerVectors(orbitA, sunPhysX, sunPhysY)

  // ── 第三定律图表数据 ──
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
    sunPhysX, sunPhysY, foci2PhysX, foci2PhysY,
    planetX, planetY, orbitA,
    a2, b2, T2, planetBX, planetBY, orbitB,
    trail,
    sectorPoints,
    M_current, isInPerihelion, isInAphelion,
    vxA, vyA, fxA, fyA,
    a3_1, t2_1, a3_2, t2_2, k_ratio, maxA3, maxT2, deltaTPercent,
  }
}
