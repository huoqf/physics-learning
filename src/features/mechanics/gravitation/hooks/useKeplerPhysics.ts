/**
 * useKeplerPhysics.ts
 * 开普勒定律动画 view model：轨道几何、天体坐标、扇形路径、矢量大小、图表数据
 *
 * 零 JSX，纯数据计算，可独立单测
 * 所有位置以物理坐标返回（轨道中心为原点，y 轴向上）
 *
 * ── 参数模型的约定（2026-10 重构）─────────────────────────────────────
 * 输入是 **(a, e, 中心天体质量 M)**，不是 (a, b, 周期 T)：
 *   · e 取代 b —— `b > a` 在几何上不可表达，从源头消灭"竖直椭圆 + e=0"的假象；
 *   · M 取代 T —— 周期由 T = 2π√(a³/GM) 派生。这样 T²–a³ 图像上的直线是
 *     **动力学的结果**，而不是把第三定律再代回去得到的恒等式；
 *   · 于是 k = a³/T² 只随 M 变化、与 a 无关，与教材结论一致。
 */
import { useMemo } from 'react'
import {
  ellipseFromEccentricity,
  evaluateKeplerOrbit,
  orbitalPeriodFromMass,
  orbitLegality,
  sampleSweptArea,
  solveKeplerEquation,
} from '@/physics/celestial'
import { KEPLER_CONFIG, VECTOR_DISPLAY } from '@/theme/physics'

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
  /** 内轨周期（由 M 派生） */
  T1: number
  /** 中心天体质量参数（归一化，G = KEPLER_SIM_G） */
  mass: number

  // ── 天体物理坐标（轨道中心为原点，y↑）──
  sunPhysX: number
  sunPhysY: number
  foci2PhysX: number
  foci2PhysY: number

  // ── 行星 A ──
  planetX: number
  planetY: number
  orbitA: KeplerOrbitData

  // ── 行星 B（第三定律模式） ──
  a2: number
  b2: number
  c2: number
  e2: number
  T2: number
  /**
   * 外轨椭圆的中心（世界坐标 x）。
   *
   * `evaluateKeplerOrbit` 返回的是「以椭圆中心为原点、右焦点在 +c」的坐标，
   * 而本页的太阳在内轨右焦点 `c1` 上。两条轨道必须**共焦于太阳**（开普勒第一定律：
   * 绕同一中心天体的所有轨道共用那个焦点），所以外轨中心不能放在 (0, 0)，
   * 而要平移 `c1 − c2`，让它的右焦点正好落在太阳上。
   */
  orbitBCenterX: number
  planetBX: number
  planetBY: number
  orbitB: KeplerOrbitData

  /**
   * 画面里两条轨道在 x 方向的并集范围（世界坐标，含行星 B 只在该模式出现）。
   * 供取景用：`center` 是并集中点，把它放到画布中心，任何参数组合都不会顶出画布。
   */
  orbitSpanX: { left: number; right: number; center: number }

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

  // ── 矢量量程峰值（供 refMagnitudes 校准） ──
  vectorPeaks: KeplerVectorPeaks

  // ── 第二定律的守恒量 ──
  /** 单位质量角动量 h（= r_min·v_近日 = r_max·v_远日） */
  h: number
  /** 面积速度 h/2 */
  arealVelocity: number
  vPeri: number
  vApo: number

  // ── 第三定律 ──
  a3_1: number
  t2_1: number
  a3_2: number
  t2_2: number
  /** k = a₁³/T₁²，由实际驱动运动的周期算出（不另算一遍） */
  k_ratio: number
  maxA3: number
  maxT2: number
  /** 与 T²–a³ 同斜率的参考行星族（同一中心天体，a 取一组示例值） */
  referenceFamily: { a: number; a3: number; t2: number }[]

  /** 扫过时间占周期比例（第二定律） */
  deltaTPercent: number
  /** 一个周期内扫过面积的数值累积（t, area） */
  sweptTrace: { t: number; area: number }[]

  /** 轨道合法性（近日点是否已进入恒星本体等） */
  legality: { ok: boolean; reason?: string }
}

/** 一个周期内的矢量量程峰值（显示量级，供 refMagnitudes 校准） */
export interface KeplerVectorPeaks {
  /** 速度矢量在全轨道上的最大显示模长 */
  speed: number
  /** 引力矢量在全轨道上的最大显示模长（近拱点） */
  gravity: number
}

export interface KeplerOrbitData {
  x: number; y: number; vx: number; vy: number; r: number
}

export interface KeplerVectors {
  vxA: number; vyA: number
  fxA: number; fyA: number
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
    { x: a1 * e1, y: 0 },
    { x: a1 * Math.cos(E_start), y: b1 * Math.sin(E_start) },
    { x: a1 * Math.cos(E_end), y: b1 * Math.sin(E_end) },
  ]
}

// ── 矢量计算（纯函数，可独立测试）──

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
 * 第三定律参考行星族的分段数（同一中心天体，仅用于把"直线"画成一条折线）。
 *
 * 族的半长轴范围**跟着参数走**（0 … max(a₁, a₂)），不能写死一组常数：
 * 写死到 7.5 时，把 a₂ 拖到 10 会让 `maxA3` 撑到 1120，而折线仍在 a=7.5（37% 高度）处收尾，
 * 点 B 就悬在线外的右上角 —— 图上"共线"这件事当场破功。
 */
const REFERENCE_FAMILY_STEPS = 8

/**
 * 开普勒定律动画物理/视图模型 Hook
 *
 * @param params a / e / mass / a2 / e2 / mode
 * @param time 当前时间
 */
export function useKeplerPhysics(
  params: Record<string, number>,
  time: number,
): KeplerPhysicsResult {
  // ── 轨道参数 ──
  const mode = params.mode ?? 0
  const a1 = params.a ?? 4.5
  const e1 = params.e ?? 0.75
  const mass = params.mass ?? 36
  const a2 = params.a2 ?? 7.5
  const e2 = params.e2 ?? 0.6

  // 几何量一律由 (a, e) 派生，不再从 b 反解
  const geo1 = ellipseFromEccentricity(a1, e1)
  const { b: b1, c: c1, rMin, rMax } = geo1
  const geo2 = ellipseFromEccentricity(a2, e2)
  const { b: b2, c: c2 } = geo2

  // 周期由中心天体质量决定（第三定律的动力学来源）
  const T1 = orbitalPeriodFromMass(a1, mass)
  const T2 = orbitalPeriodFromMass(a2, mass)

  // ── 天体物理坐标（轨道中心为原点，y↑）──
  // 太阳在右焦点；副焦点在左焦点（第一定律的"双焦点"正是靠这两个点撑起来的）
  const sunPhysX = c1
  const sunPhysY = 0
  const foci2PhysX = -c1
  const foci2PhysY = 0

  // ── 行星 A ──
  const orbitA = useMemo(
    () => evaluateKeplerOrbit(a1, e1, mass, time),
    [a1, e1, mass, time],
  )

  const planetX = orbitA.x
  const planetY = orbitA.y

  // ── 矢量量程峰值：沿整条轨道采样，取速度/引力的最大模长 ──
  // 不写死常数、也不复制 VECTOR_DISPLAY 的标定系数：采样点复用 computeKeplerVectors，
  // 保证「峰值」与「逐帧渲染的矢量」出自同一套换算（单一真源）。
  const vectorPeaks = useMemo<KeplerVectorPeaks>(() => {
    const N = 64
    let speed = 0
    let gravity = 0
    for (let i = 0; i < N; i++) {
      const orbit = evaluateKeplerOrbit(a1, e1, mass, (i / N) * T1)
      const v = computeKeplerVectors(orbit, sunPhysX, sunPhysY)
      speed = Math.max(speed, Math.hypot(v.vxA, v.vyA))
      gravity = Math.max(gravity, Math.hypot(v.fxA, v.fyA))
    }
    return { speed, gravity }
  }, [a1, e1, mass, T1, sunPhysX, sunPhysY])

  // ── 行星 B ──（周期同样来自 M，不来自第三定律）
  const orbitB = useMemo(
    () => evaluateKeplerOrbit(a2, e2, mass, time),
    [a2, e2, mass, time],
  )

  // 外轨与内轨共焦点于太阳（开普勒第一定律）：把外轨中心从「自己的椭圆中心」平移到
  // c1 − c2，使它的右焦点恰好落在太阳上。若留在 0，太阳就不在外轨焦点上，
  // 行星 B 会绕太阳右侧 1.125（默认参数）处的"空气焦点"加减速 —— 画面直接违背本页要讲的第一定律。
  const orbitBCenterX = c1 - c2

  const planetBX = orbitB.x + orbitBCenterX
  const planetBY = orbitB.y

  // ── 取景：两轨并集在 x 方向的跨度（太阳中心不动，只平移场景原点）──
  // 共焦之后外轨左端伸到 c1 − c2 − a2（默认 8.625，最坏 18.0 世界单位 > 画布半宽 13.125），
  // 所以必须让并集中点落在画布中心，否则行星 B 会在远日端跑出画布。
  const orbitSpanX = useMemo(() => {
    const left = mode === 2 ? Math.min(-a1, orbitBCenterX - a2) : -a1
    const right = mode === 2 ? Math.max(a1, orbitBCenterX + a2) : a1
    return { left, right, center: (left + right) / 2 }
  }, [mode, a1, a2, orbitBCenterX])

  // ── 尾迹 ──
  const trail = useMemo(() => {
    const points: { x: number; y: number; opacity: number }[] = []
    const step = 0.12
    const count = 7
    for (let i = 1; i <= count; i++) {
      const histTime = Math.max(0, time - i * step)
      const histOrbit = evaluateKeplerOrbit(a1, e1, mass, histTime)
      points.push({ x: histOrbit.x, y: histOrbit.y, opacity: 0.7 * (1 - i / (count + 1)) })
    }
    return points
  }, [a1, e1, mass, time])

  // ── 第二定律扇形 ──
  const deltaTPercent = KEPLER_CONFIG.sweepTimeRatio
  const deltaM = 2 * Math.PI * deltaTPercent

  const sectorPoints = useMemo(() => {
    return {
      perihelion: buildSectorPoints(a1, b1, geo1.e, deltaM, 0),
      aphelion: buildSectorPoints(a1, b1, geo1.e, deltaM, Math.PI),
    }
  }, [a1, b1, geo1.e, deltaM])

  const M_current = ((2 * Math.PI) / T1 * time) % (2 * Math.PI)
  const isInPerihelion =
    M_current <= deltaM / 2 || M_current >= 2 * Math.PI - deltaM / 2
  const isInAphelion =
    M_current >= Math.PI - deltaM / 2 && M_current <= Math.PI + deltaM / 2

  // ── 守恒量：h 与 v 的极值（在近/远日点分别取值，供"r·v 相等"的读数）──
  const vPeri = useMemo(
    () => evaluateKeplerOrbit(a1, e1, mass, 0).v,
    [a1, e1, mass],
  )
  const vApo = useMemo(
    () => evaluateKeplerOrbit(a1, e1, mass, T1 / 2).v,
    [a1, e1, mass, T1],
  )

  // ── 面积–时间的数值累积（一个整周期）──
  const sweptTrace = useMemo(
    () => sampleSweptArea(a1, e1, mass, 48),
    [a1, e1, mass],
  )

  // ── 合法性：近日点是否已进入恒星本体 ──
  const legality = useMemo(
    () => orbitLegality(a1, e1, KEPLER_CONFIG.sunCoreR / KEPLER_CONFIG.scaleBase),
    [a1, e1],
  )

  // ── 矢量大小（物理单位）──
  const { vxA, vyA, fxA, fyA } = computeKeplerVectors(orbitA, sunPhysX, sunPhysY)

  // ── 第三定律图表数据 ──
  const a3_1 = a1 * a1 * a1
  const t2_1 = T1 * T1
  // k 取教材定义 a³/T²（= GM/4π²），且由"实际驱动运动的那条周期"算出：
  // 一旦 T 的来源变了，k 立刻跟着变，不会两处各说一套。
  const k_ratio = a3_1 / t2_1

  const a3_2 = a2 * a2 * a2
  const t2_2 = T2 * T2

  // 参考行星族：同一中心天体下 a 从 0 到 max(a₁, a₂) 均匀取值，T 同样由 M 派生
  // → 全部落在 y = k x 上，且折线一定从原点起、到最远那颗行星止（A、B 都不会脱线）。
  // a = 0 时 `orbitalPeriodFromMass` 返回 0，于是首点正是 (0, 0)，满足"正比例函数过原点"的读图习惯。
  const aMax = Math.max(a1, a2)
  const referenceFamily = useMemo(
    () =>
      Array.from({ length: REFERENCE_FAMILY_STEPS + 1 }, (_, i) => {
        const a = (i / REFERENCE_FAMILY_STEPS) * aMax
        const T = orbitalPeriodFromMass(a, mass)
        return { a, a3: a * a * a, t2: T * T }
      }),
    [aMax, mass],
  )

  const maxA3 = Math.max(a3_1, a3_2, ...referenceFamily.map((p) => p.a3)) * 1.12
  // a³ = k·T² → T² = a³/k，故横轴（T²）的上限由纵轴上限换算而来
  const maxT2 = maxA3 / k_ratio

  return {
    mode,
    a1, b1, c1, e1, rMin, rMax, T1, mass,
    sunPhysX, sunPhysY, foci2PhysX, foci2PhysY,
    planetX, planetY, orbitA,
    a2, b2, c2, e2, T2, orbitBCenterX, planetBX, planetBY, orbitB, orbitSpanX,
    trail,
    sectorPoints,
    M_current, isInPerihelion, isInAphelion,
    vxA, vyA, fxA, fyA,
    vectorPeaks,
    h: orbitA.h,
    arealVelocity: orbitA.arealVelocity,
    vPeri, vApo,
    a3_1, t2_1, a3_2, t2_2, k_ratio, maxA3, maxT2,
    referenceFamily,
    deltaTPercent,
    sweptTrace,
    legality,
  }
}
