/**
 * 高考力学基础实验（打点计时器纸带 / 光电门测速 / 胡克定律）—— 纯物理模型。
 *
 * 单一可信源（SSOT）：右屏看板（src/data/quantities/mechanics/experiment-base.ts）、
 * 中屏场景 Hook（useMechanicsExperimentPhysics）与上屏 v-t / F-Δx 图必须全部消费本模块。
 * 禁止各自重写运动学公式——否则会出现"看板位移不钳制、场景已钳制"这类同屏两套数值。
 *
 * 单位约定：位移 x(m)、速度 v(m/s)、加速度 a(m/s²)、时间 t(s)、力 F(N)、劲度系数 k(N/m)。
 */

import { GRAVITY } from './constants'

// ─── 器材与轨道常量 ──────────────────────────────────────────────────────────

/** 打点计时器标准频率 (Hz)：人教版实验取 50 Hz ⇒ 打点周期 T₀ = 0.02 s */
export const TICKER_FREQ_HZ = 50

/** 每 5 个打点取 1 个计数点 ⇒ 计数周期 T = 5T₀ = 0.1 s（逐差法公式中的 T 即此值） */
export const COUNT_INTERVAL = 5

/** 实验长木板轨道的有效长度 (m)：小车到达末端挡块即停止，其后位移与速度不再增长 */
export const TRACK_MAX_M = 2.0

/** 光电门 A 在轨道上的安装位置 (m) */
export const PHOTOGATE_A_X_M = 0.3

/** 光电门 B 在轨道上的安装位置 (m) */
export const PHOTOGATE_B_X_M = 0.8

/**
 * 遮光条中心相对小车左端的偏移 (m)。
 * x 定义为"小车左端距轨道起点的位移"，故遮光条（感应件）中心位置 = x + FLAG_OFFSET_M。
 */
export const FLAG_OFFSET_M = 0.05

/** 逐差法最少需要的计数点个数（x₀…x₆，共 6 段位移） */
export const DIFF_METHOD_MIN_DOTS = 7

/** 纸带计数点渲染安全上限（防止极端频/时长组合下无限增长） */
const MAX_TAPE_DOTS = 200

/** 弹簧自然长度 (m)：胡克定律页竖尺的 L₀ 基准与 F-Δx 图的起点 */
export const SPRING_NATURAL_M = 0.08

// ─── 基础运动学解析式 ───────────────────────────────────────────────────────

/**
 * 匀变速直线运动位移解析式。
 * @param v0 初速度 (m/s)
 * @param a 加速度 (m/s²)
 * @param t 时间 (s)
 * @returns 位移 (m)
 */
export function displacementAt(v0: number, a: number, t: number): number {
  return v0 * t + 0.5 * a * t * t
}

/**
 * 匀变速直线运动速度解析式。
 * @param v0 初速度 (m/s)
 * @param a 加速度 (m/s²)
 * @param t 时间 (s)
 * @returns 速度 (m/s)
 */
export function velocityAt(v0: number, a: number, t: number): number {
  return v0 + a * t
}

/**
 * 打点周期 T₀ = 1/f (s)。
 * @param freq 打点频率 (Hz)
 */
export function tickerPeriod(freq: number): number {
  return 1 / Math.max(1, freq)
}

/**
 * 计数周期 T = 5T₀ (s)——逐差法 a = [(x₆−x₃)−(x₃−x₀)]/(9T²) 中的 T。
 * @param freq 打点频率 (Hz)
 */
export function countingPeriod(freq: number): number {
  return COUNT_INTERVAL * tickerPeriod(freq)
}

/**
 * 小车位移达到 xMax 所需时间 (s)；若永远达不到则返回 Infinity。
 * @param v0 初速度 (m/s)
 * @param a 加速度 (m/s²)
 * @param xMax 目标位移 (m)
 */
export function timeToReach(v0: number, a: number, xMax: number): number {
  if (Math.abs(a) > 1e-9) {
    const disc = v0 * v0 + 2 * a * xMax
    if (disc < 0) return Infinity
    const t = (-v0 + Math.sqrt(disc)) / a
    return Number.isFinite(t) && t > 0 ? t : Infinity
  }
  return v0 > 1e-9 ? xMax / v0 : Infinity
}

// ─── 长木板轨道上的小车运动（含末端挡块钳制）────────────────────────────────

export interface TrackMotionInput {
  /** 初速度 (m/s) */
  v0: number
  /** 加速度 (m/s²) */
  a: number
  /** 动画累计时间 (s)，可超过有效运动时长 */
  time: number
  /** 轨道有效长度 (m)，默认 TRACK_MAX_M */
  xMax?: number
}

export interface TrackMotion {
  /** 已钳制位移 (m)，落在 [0, xMax] */
  x: number
  /** 已钳制速度 (m/s)：到达末端挡块后归零 */
  v: number
  /** 到达末端挡块的时刻 (s)，永不到达则为 Infinity */
  tEnd: number
  /** 有效运动时长 (s) = min(time, tEnd) */
  tActive: number
  /** 是否已到达末端挡块 */
  reachedEnd: boolean
}

/**
 * 求解长木板轨道上小车的运动状态。
 *
 * 物理图像：小车沿长木板匀变速运动，行程满 xMax 后被末端挡块挡住（非弹性），
 * 位移停止、速度归零。看板、场景与 v-t 图必须共用本函数，杜绝"图上还在加速、
 * 看板位移已经 24 m"的两张皮现象。
 */
export function solveTrackMotion({
  v0,
  a,
  time,
  xMax = TRACK_MAX_M,
}: TrackMotionInput): TrackMotion {
  const t = Math.max(0, time)
  const tEnd = timeToReach(v0, a, xMax)
  const reachedEnd = t >= tEnd
  const tActive = reachedEnd ? tEnd : t

  // 到达挡块时位移严格等于 xMax：解析上 displacementAt(v0, a, tEnd) ≡ xMax，
  // 这里直接取 xMax 以消除浮点尾差（否则会给纸带坐标与看板带入 1.9999999999999996 之类的噪声）
  const x = reachedEnd ? xMax : Math.max(0, Math.min(displacementAt(v0, a, tActive), xMax))
  const v = reachedEnd ? 0 : velocityAt(v0, a, t)

  return { x, v, tEnd, tActive, reachedEnd }
}

// ─── 打点纸带 ───────────────────────────────────────────────────────────────

export interface TapeDotsInput {
  v0: number
  a: number
  time: number
  /** 打点频率 (Hz)，默认 TICKER_FREQ_HZ */
  freq?: number
  /** 设计比例：1 m 位移对应的纸带长度 (design-unit/px) */
  pxPerMeter: number
  /** 轨道有效长度 (m)，默认 TRACK_MAX_M */
  xMax?: number
}

/**
 * 生成打点纸带上各**计数点**的位置（单位同 pxPerMeter，原点为纸带穿过计时器出口处）。
 *
 * 纸带随小车运动：第 k 个点在小车位移为 x(t_k) 时打印，故当前时刻它距计时器出口
 * 的距离为 [x(t) − x(t_k)]，t_k = k·T（计数周期）。小车被挡块挡住后纸带停止，不再打点。
 *
 * 索引 0 对应 t=0 的首点，索引递增方向为"打印时间由早到晚"。
 */
export function buildTapeCountingDots({
  v0,
  a,
  time,
  freq = TICKER_FREQ_HZ,
  pxPerMeter,
  xMax = TRACK_MAX_M,
}: TapeDotsInput): number[] {
  const { x, tActive } = solveTrackMotion({ v0, a, time, xMax })
  const T = countingPeriod(freq)

  const dots: number[] = []
  for (let k = 0; k < MAX_TAPE_DOTS; k++) {
    const tk = k * T
    if (tk > tActive + 1e-9) break
    dots.push((x - displacementAt(v0, a, tk)) * pxPerMeter)
  }
  return dots
}

/**
 * 逐差法求加速度：a = [(x₆−x₃) − (x₃−x₀)] / (9T²)。
 *
 * 计数点不足 7 个（运动时间太短）时返回 null —— **严禁回退成设定值**，
 * 否则"逐差法测量值"就变成了"直接抄参数"，教学意义完全丧失。
 *
 * @param dotsPx 计数点在纸带上的位置数组（索引 0 为 x₀）
 * @param pxPerMeter 设计比例（1 m 对应多少像素）
 * @param countingPeriodS 计数周期 T (s)
 * @returns 加速度 (m/s²)，或 null（点数不足）
 */
export function calcDiffMethodAcceleration(
  dotsPx: number[],
  pxPerMeter: number,
  countingPeriodS: number
): number | null {
  if (dotsPx.length < DIFF_METHOD_MIN_DOTS || pxPerMeter <= 0 || countingPeriodS <= 0) {
    return null
  }
  const firstGroup = (dotsPx[0] - dotsPx[3]) / pxPerMeter // x₃ − x₀ (m)
  const secondGroup = (dotsPx[3] - dotsPx[6]) / pxPerMeter // x₆ − x₃ (m)
  return (secondGroup - firstGroup) / (9 * countingPeriodS * countingPeriodS)
}

/** 中间时刻瞬时速度 v_n = (x_n + x_{n+1}) / (2T) (m/s) */
export function calcMidTimeVelocity(
  segmentBefore: number,
  segmentAfter: number,
  countingPeriodS: number
): number {
  if (countingPeriodS <= 0) return 0
  return (segmentBefore + segmentAfter) / (2 * countingPeriodS)
}

// ─── 光电门测速 ─────────────────────────────────────────────────────────────

export interface PhotogateInput {
  /** 当前小车位移 (m) */
  x: number
  v0: number
  a: number
  /** 遮光条宽度 d (m) */
  d: number
  /** 光电门安装位置 (m) */
  gateX: number
  /** 遮光条中心相对小车左端的偏移 (m)，默认 FLAG_OFFSET_M */
  flagOffset?: number
}

export interface PhotogateReading {
  /** 遮光时间 Δt (ms)：未到达光电门时为 0 */
  dtMs: number
  /** 测速结果 v = d/Δt (m/s)：未到达光电门时为 0 */
  velocity: number
  /** 遮光条中心是否正处于光电门感应区内（用于触发指示灯） */
  isBlocked: boolean
}

/**
 * 读取单个光电门的遮光时间与测速结果。
 *
 * 遮光条中心到达光电门（即 x + flagOffset = gateX）时开始计时，遮光时间
 * Δt = d / v，测得速度 v = d/Δt 为遮光条通过光电门的**平均速度**——
 * d 越窄越接近瞬时速度（高考核心考点）。
 */
export function readPhotogate({
  x,
  v0,
  a,
  d,
  gateX,
  flagOffset = FLAG_OFFSET_M,
}: PhotogateInput): PhotogateReading {
  const flagX = x + flagOffset
  const half = d / 2
  const reached = flagX >= gateX - half
  const isBlocked = reached && flagX <= gateX + half

  // 遮光条中心到达光电门时的速度（匀变速位移-速度关系式 v² = v₀² + 2as）
  const vAtGate = Math.sqrt(Math.max(0, v0 * v0 + 2 * a * Math.max(0, gateX - flagOffset)))
  const dtMs = reached ? (d / Math.max(0.01, vAtGate)) * 1000 : 0

  return {
    // 测得速度即 d/Δt，与 Δt 同源（未触发时无读数）
    dtMs,
    velocity: reached ? vAtGate : 0,
    isBlocked,
  }
}

// ─── 胡克定律 ───────────────────────────────────────────────────────────────

export interface HookeState {
  /** 钩码重力 F = mg (N) */
  force: number
  /** 弹簧伸长量 Δx = F/k (m) */
  extension: number
}

/**
 * 胡克定律：F = kΔx。用竖直悬挂钩码的重力作为弹簧所受拉力。
 * @param mass 钩码质量 m (kg)
 * @param stiffness 弹簧劲度系数 k (N/m)
 */
export function solveHooke(mass: number, stiffness: number): HookeState {
  const force = Math.max(0, mass) * GRAVITY
  const extension = force / Math.max(1, stiffness)
  return { force, extension }
}

/**
 * 胡克定律实验的挂钩码序列数据点：依次挂 1…count 个质量为 hookMass 的钩码。
 * 返回点集共线且过原点，斜率即弹簧劲度系数 k。
 *
 * @param hookMass 单个钩码质量 (kg)
 * @param stiffness 弹簧劲度系数 (N/m)
 * @param count 钩码个数上限，默认 6
 */
export function hookeSeries(
  hookMass: number,
  stiffness: number,
  count = 6
): { extension: number; force: number }[] {
  const k = Math.max(1, stiffness)
  const m = Math.max(0, hookMass)
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const force = (i + 1) * m * GRAVITY
    return { extension: force / k, force }
  })
}
