/**
 * 机械波（Mechanical Wave）纯函数库。
 *
 * 约定（全文件一致）：
 *  - 位移 y / 振幅 A：米 (m)
 *  - 位置 x：米 (m)
 *  - 时间 t：秒 (s)
 *  - 频率 f：赫兹 (Hz)
 *  - 波速 v：米/秒 (m/s)
 *  - 波长 λ = v / f：米 (m)
 *
 * 向右传播行波（因果阶跃）：
 *   y(x,t) = A · sin(2π f (t − x/v) + φ₀) · Θ(t − x/v)
 *
 * 本文件为纯函数模块，禁止依赖 DOM / React / window（铁律 2），
 * 所有输出均为可序列化数值，兼容 IndexedDB 持久化。
 */

/** 默认质点链个数（含振源） */
export const DEFAULT_WAVE_PARTICLE_COUNT = 25

/** 默认质点链物理长度 (m) */
export const DEFAULT_WAVE_CHAIN_LENGTH = 4

/** 追踪质点默认索引（0-based，第 13 个 → 12） */
export const DEFAULT_TRACKED_PARTICLE_INDEX = 12

/** 单脉冲包络默认半宽 σ (s) */
export const DEFAULT_PULSE_SIGMA = 0.18

/** 单脉冲中心相对延迟 t_c (s) */
export const DEFAULT_PULSE_CENTER = 0.45

/** 波模式：0 连续简谐，1 单脉冲 */
export type MechanicalWaveMode = 0 | 1

export interface MechanicalWaveParams {
  /** 振幅 A，单位 m；须 ≥ 0 */
  amplitude: number
  /** 频率 f，单位 Hz；须 > 0（脉冲模式下仍用于载波） */
  frequency: number
  /** 波速 v，单位 m/s；须 > 0 */
  waveSpeed: number
  /** 初相 φ₀，单位 rad */
  phase0?: number
  /** 0=连续简谐，1=单脉冲 */
  mode: MechanicalWaveMode
  /** 单脉冲包络 σ，单位 s；可选 */
  pulseSigma?: number
  /** 单脉冲中心 t_c，单位 s；可选 */
  pulseCenter?: number
}

export interface WaveParticleState {
  /** 平衡位置 x，单位 m */
  x: number
  /** 横向位移 y，单位 m（横波：垂直于传播方向） */
  y: number
  /** 质点索引，0 = 振源 */
  index: number
}

export interface DiffractionFieldParams {
  /** 缝宽 d，单位 m；须 > 0 */
  slitWidth: number
  /** 波长 λ，单位 m；须 > 0 */
  wavelength: number
  /** 入射振幅 A，无量纲相对值 */
  amplitude: number
  /** 缝中心 x 坐标（传播方向），单位 m */
  slitX: number
  /** 缝中心 y 坐标，单位 m */
  slitY?: number
  /** 波速 v，单位 m/s；须 > 0 */
  waveSpeed: number
}

export interface TwoSourceParams {
  /** 源 1 坐标 (m) */
  source1: { x: number; y: number }
  /** 源 2 坐标 (m) */
  source2: { x: number; y: number }
  /** 波长 λ，单位 m；须 > 0 */
  wavelength: number
  /** 振幅 A（两源相同），无量纲 */
  amplitude: number
  /** 波速 v，单位 m/s；须 > 0 */
  waveSpeed: number
  /** 初相差 φ₂−φ₁，单位 rad */
  phaseDiff?: number
}

/**
 * 波长 λ = v / f。
 * @returns 单位 m；非法输入返回 0
 */
export function computeWavelength(frequency: number, waveSpeed: number): number {
  if (frequency <= 0 || waveSpeed <= 0) return 0
  return waveSpeed / frequency
}

/**
 * 周期 T = 1 / f。
 * @returns 单位 s；非法输入返回 0
 */
export function computeWavePeriod(frequency: number): number {
  if (frequency <= 0) return 0
  return 1 / frequency
}

/**
 * 波数 k = 2π / λ。
 * @returns 单位 rad/m；非法输入返回 0
 */
export function computeWaveNumber(wavelength: number): number {
  if (wavelength <= 0) return 0
  return (2 * Math.PI) / wavelength
}

/**
 * 角频率 ω = 2π f。
 * @returns 单位 rad/s
 */
export function computeWaveAngularFrequency(frequency: number): number {
  if (frequency <= 0) return 0
  return 2 * Math.PI * frequency
}

/**
 * 单缝夫琅禾费相对强度 I/I₀ = sinc²(β)，β = π d sinθ / λ。
 * 屏远场：sinθ ≈ y / √(y² + D²)。
 *
 * @param y 屏上位置，单位 m（相对中央）
 * @param slitWidth 缝宽 d，单位 m
 * @param wavelength 波长 λ，单位 m
 * @param screenDistance 缝到屏距离 D，单位 m
 * @param I0 中央强度，默认 1
 */
export function computeSingleSlitIntensity(
  y: number,
  slitWidth: number,
  wavelength: number,
  screenDistance: number,
  I0 = 1,
): number {
  if (slitWidth <= 0 || wavelength <= 0 || screenDistance <= 0) return 0
  const r = Math.hypot(y, screenDistance)
  if (r === 0) return I0
  const sinTheta = y / r
  const beta = (Math.PI * slitWidth * sinTheta) / wavelength
  if (Math.abs(beta) < 1e-10) return I0
  const sinc = Math.sin(beta) / beta
  return I0 * sinc * sinc
}

/**
 * 程差 δ = r₂ − r₁，单位 m。
 */
export function computeTwoSourcePathDifference(r1: number, r2: number): number {
  return r2 - r1
}

/**
 * 干涉条件判定（相对波长）。
 * 容差默认 0.05λ。
 */
export function computeInterferenceCondition(
  delta: number,
  wavelength: number,
  tolerance = 0.05,
): 'constructive' | 'destructive' | 'partial' {
  if (wavelength <= 0) return 'partial'
  const n = delta / wavelength
  const frac = n - Math.floor(n)
  // 映射到 [-0.5, 0.5]
  const wrapped = frac > 0.5 ? frac - 1 : frac
  if (Math.abs(wrapped) <= tolerance) return 'constructive'
  if (Math.abs(Math.abs(wrapped) - 0.5) <= tolerance) return 'destructive'
  return 'partial'
}

/**
 * 行波 / 脉冲在 (x, t) 处的横向位移。
 * 因果性：t < x/v 时 y = 0。
 */
export function computeWaveDisplacement(
  x: number,
  t: number,
  params: MechanicalWaveParams,
): number {
  const A = params.amplitude
  const f = params.frequency
  const v = params.waveSpeed
  if (A === 0 || f <= 0 || v <= 0) return 0

  const travel = x / v
  if (t < travel) return 0

  const tau = t - travel
  const phase0 = params.phase0 ?? 0
  const omega = computeWaveAngularFrequency(f)

  if (params.mode === 1) {
    const sigma = params.pulseSigma ?? DEFAULT_PULSE_SIGMA
    const tc = params.pulseCenter ?? DEFAULT_PULSE_CENTER
    if (sigma <= 0) return 0
    const u = (tau - tc) / sigma
    const envelope = Math.exp(-0.5 * u * u)
    // 载波取与连续波相同的 ω，便于对照
    return A * envelope * Math.sin(omega * tau + phase0)
  }

  // 连续简谐波
  return A * Math.sin(omega * tau + phase0)
}

/**
 * 生成等间距质点链在时刻 t 的状态（可序列化）。
 */
export function computeWaveParticleStates(
  t: number,
  params: MechanicalWaveParams,
  options?: { count?: number; length?: number },
): WaveParticleState[] {
  const count = options?.count ?? DEFAULT_WAVE_PARTICLE_COUNT
  const length = options?.length ?? DEFAULT_WAVE_CHAIN_LENGTH
  if (count < 2 || length <= 0) return []

  const dx = length / (count - 1)
  const states: WaveParticleState[] = []
  for (let i = 0; i < count; i++) {
    const x = i * dx
    states.push({
      x,
      y: computeWaveDisplacement(x, t, params),
      index: i,
    })
  }
  return states
}

/**
 * 简化衍射标量场采样（教学可视化）。
 * 缝内用惠更斯子波相干叠加的一维离散近似；缝前区近似平面波。
 * 返回相对位移（可正可负），供 Canvas 着色。
 */
export function sampleDiffractionField(
  x: number,
  y: number,
  t: number,
  params: DiffractionFieldParams,
): number {
  const { slitWidth, wavelength, amplitude, slitX, waveSpeed } = params
  const slitY = params.slitY ?? 0
  if (wavelength <= 0 || waveSpeed <= 0 || amplitude === 0 || slitWidth <= 0) return 0

  const k = computeWaveNumber(wavelength)
  const omega = (2 * Math.PI * waveSpeed) / wavelength

  // 缝前：平面波向 +x
  if (x < slitX) {
    const travel = x / waveSpeed
    if (t < travel) return 0
    return amplitude * Math.sin(omega * t - k * x)
  }

  // 缝后：沿缝宽均匀取子波源叠加
  const nSources = 9
  const half = slitWidth / 2
  let sum = 0
  let weight = 0
  for (let i = 0; i < nSources; i++) {
    const sy = slitY - half + (slitWidth * i) / (nSources - 1)
    const r = Math.hypot(x - slitX, y - sy)
    const travel = (slitX + r) / waveSpeed
    if (t < travel) continue
    // 柱面波 1/√r 衰减（r→0 保护）
    const atten = 1 / Math.sqrt(Math.max(r, wavelength * 0.05))
    sum += atten * Math.sin(omega * t - k * (slitX + r))
    weight += atten
  }
  if (weight === 0) return 0
  return amplitude * (sum / weight)
}

/**
 * 双源干涉标量场采样。
 */
export function sampleTwoSourceField(
  x: number,
  y: number,
  t: number,
  params: TwoSourceParams,
): number {
  const { source1, source2, wavelength, amplitude, waveSpeed } = params
  const phaseDiff = params.phaseDiff ?? 0
  if (wavelength <= 0 || waveSpeed <= 0 || amplitude === 0) return 0

  const k = computeWaveNumber(wavelength)
  const omega = (2 * Math.PI * waveSpeed) / wavelength

  const r1 = Math.hypot(x - source1.x, y - source1.y)
  const r2 = Math.hypot(x - source2.x, y - source2.y)
  const t1 = r1 / waveSpeed
  const t2 = r2 / waveSpeed

  let y1 = 0
  let y2 = 0
  if (t >= t1) {
    const a1 = 1 / Math.sqrt(Math.max(r1, wavelength * 0.05))
    y1 = amplitude * a1 * Math.sin(omega * t - k * r1)
  }
  if (t >= t2) {
    const a2 = 1 / Math.sqrt(Math.max(r2, wavelength * 0.05))
    y2 = amplitude * a2 * Math.sin(omega * t - k * r2 + phaseDiff)
  }
  return y1 + y2
}

/**
 * 双缝/双源在远场屏上的相对强度（等幅、同频、相干）。
 * I ∝ cos²(π a sinθ / λ)，a 为源间距。
 */
export function computeTwoSourceScreenIntensity(
  y: number,
  sourceSeparation: number,
  wavelength: number,
  screenDistance: number,
  I0 = 1,
): number {
  if (sourceSeparation < 0 || wavelength <= 0 || screenDistance <= 0) return 0
  const r = Math.hypot(y, screenDistance)
  if (r === 0) return I0
  const sinTheta = y / r
  const arg = (Math.PI * sourceSeparation * sinTheta) / wavelength
  const c = Math.cos(arg)
  return I0 * c * c
}
