/**
 * 组合场（速度选择器 + 回旋加速器）级联模型纯函数库。
 *
 * 约定（铁律 2：纯函数、无 DOM / React / window，JSDoc + 单位）：
 *  - 电场强度 E：N/C
 *  - 磁感应强度 B / B₁ / B₂：T
 *  - 电荷 q：C；质量 m：kg
 *  - 加速电压 U：V；交流频率 f：Hz
 *  - 半径 r / R_max：m；能量：J
 */

/** 速度选择器直线通过条件：qE = qvB₁ ⇒ v₀ = E / B₁（单位 m/s）。 */
export function computeVelocitySelectorPassVelocity(E: number, B1: number): number {
  if (Math.abs(B1) < 1e-9) return 0
  return E / B1
}

export interface ForceBalance {
  /** 电场力 F_E = qE（竖直方向），单位 N */
  electricForce: number
  /** 洛伦兹力 F_f = q·v·B₁（竖直方向，与电场力反向），单位 N */
  magneticForce: number
  /** 是否受力平衡（近似） */
  balanced: boolean
  /** 平衡所需速度 v₀ = E / B₁，单位 m/s */
  passVelocity: number
}

/**
 * 速度选择器受力分析。
 * @param E 电场强度（N/C）
 * @param B1 选择器磁场（T）
 * @param vParticle 粒子实际速度（m/s）
 * @param q 粒子电荷（C）
 */
export function computeVelocitySelectorBalance(
  E: number,
  B1: number,
  vParticle: number,
  q: number,
): ForceBalance {
  const electricForce = q * E
  const magneticForce = q * vParticle * B1
  const passVelocity = computeVelocitySelectorPassVelocity(E, B1)
  const tol = 1e-6 * (Math.abs(electricForce) + Math.abs(magneticForce) + 1e-12)
  const balanced = Math.abs(electricForce - magneticForce) < tol
  return { electricForce, magneticForce, balanced, passVelocity }
}

/** 回旋加速器频率硬核匹配：f = qB₂ / (2πm)（单位 Hz）。 */
export function computeCyclotronResonanceFrequency(B2: number, q: number, m: number): number {
  if (m <= 0) return 0
  return (q * B2) / (2 * Math.PI * m)
}

/** 最终能量终点（高考陷阱）：E_k,max = q²B₂²R_max² / (2m)（单位 J）。 */
export function computeCyclotronMaxEnergy(
  B2: number,
  q: number,
  rMax: number,
  m: number,
): number {
  if (m <= 0) return 0
  const num = q * q * B2 * B2 * rMax * rMax
  return num / (2 * m)
}

/** 达到最大能量所需加速次数 n = E_k,max / (qU)。 */
export function computeCyclotronTurns(ekMax: number, q: number, U: number): number {
  const denom = q * U
  if (Math.abs(denom) < 1e-12) return 0
  return ekMax / denom
}

export interface CyclotronSlitStep {
  /** 下一步动能（J） */
  nextVk: number
  /** 下一步轨道半径（m） */
  nextRadius: number
  /** 是否已到达 D 形盒边缘逃逸 */
  isEscaped: boolean
  /** 是否处于共振加速窗口 */
  phaseMatched: boolean
  /** 本次能量增量 Δ(½mv²) = qU·η（J） */
  deltaE: number
}

/**
 * 判定粒子在 D 形盒狭缝交变电场中的一次加速结果。
 *
 * 物理修正（相对原始粗糙实现）：
 *  - 回旋磁频率 f_mag = qB / (2πm) 由磁场唯一决定；
 *  - 仅当交流频率 fAC ≈ f_mag（共振）时，粒子每次过狭缝都获得稳定加速；
 *  - 失谐时加速效率 η = cos(2π·Δf·t) 振荡，净能量增益趋于 0，粒子难以逃逸——
 *    这正是“频率硬核匹配 f = qB₂/(2πm)”的动画化表达。
 *
 * @param currentVk 当前动能（J）
 * @param rMax D 形盒最大半径（m）
 * @param U 加速电压（V）
 * @param fAC 交流电频率（Hz）
 * @param tCurrent 当前累积时间（s）
 * @param q 粒子电荷量（C）
 * @param m 粒子质量（kg）
 * @param B 磁场强度（T）
 */
export function stepCyclotronSlit(
  currentVk: number,
  rMax: number,
  U: number,
  fAC: number,
  tCurrent: number,
  q: number,
  m: number,
  B: number,
): CyclotronSlitStep {
  const fMag = m > 0 ? (q * B) / (2 * Math.PI * m) : 0
  const resonanceErr = fAC - fMag
  const efficiency = Math.cos(2 * Math.PI * resonanceErr * tCurrent)
  const deltaE = q * U * efficiency
  const nextVk = Math.max(0, currentVk + deltaE)
  const nextV = Math.sqrt((2 * nextVk) / Math.max(m, 1e-30))
  const nextRadius = m > 0 ? (m * nextV) / (q * B) : 0
  const isEscaped = nextRadius >= rMax
  const phaseMatched = Math.abs(resonanceErr) < 1e-3 * Math.max(1, fMag)
  return { nextVk, nextRadius, isEscaped, phaseMatched, deltaE }
}

/**
 * 计算质谱仪偏转磁场中的圆周半径。
 * 
 * 物理公式：R = m * v / (q * B2)
 *
 * @param v 粒子进入磁场时的速度，单位：m/s
 * @param B2 偏转磁场的磁感应强度，单位：T
 * @param q 粒子电荷量，单位：C
 * @param m 粒子质量，单位：kg
 * @returns 偏转圆周半径，单位：m
 */
export function computeSpectrometerRadius(v: number, B2: number, q: number, m: number): number {
  if (q <= 0 || B2 <= 0 || m <= 0 || v <= 0) return 0
  return (m * v) / (q * B2)
}

export interface DeflectionOutState {
  /** 出电场时的竖直偏转位移，单位：m */
  yOffset: number
  /** 出电场时的竖直分速度，单位：m/s */
  vy: number
  /** 出电场时的末速度大小，单位：m/s */
  vOut: number
  /** 偏转角，单位：rad */
  theta: number
  /** 粒子在电场中是否已撞击极板 */
  hitsPlate: boolean
}

/**
 * 计算带电粒子在匀强偏转电场中的类平抛运动状态。
 * 
 * 约定：电场强度 E 大于 0 时，电场力沿 y 轴负方向（向上偏转）。
 * 物理公式：
 *  - 运动时间 t = L / v0
 *  - 竖直加速度 a_y = q * E / m
 *  - 偏转位移 y_offset = 0.5 * a_y * t^2
 *  - 竖直分速度 v_y = a_y * t
 *  - 出射速度 v_out = sqrt(v_0^2 + v_y^2)
 *  - 偏转角 theta = arctan(v_y / v_0)
 *
 * @param v0 水平初速度，单位：m/s
 * @param E 偏转电场强度，单位：N/C
 * @param L 极板长度，单位：m
 * @param d 极板间距，单位：m
 * @param q 粒子电荷量，单位：C
 * @param m 粒子质量，单位：kg
 * @returns 出射运动状态及撞板判定
 */
export function computeElectricDeflection(
  v0: number,
  E: number,
  L: number,
  d: number,
  q: number,
  m: number,
): DeflectionOutState {
  if (m <= 0 || v0 <= 0 || L <= 0 || d <= 0 || q <= 0) {
    return { yOffset: 0, vy: 0, vOut: v0, theta: 0, hitsPlate: false }
  }
  const a = (q * E) / m
  const t = L / v0
  const yOffset = 0.5 * a * t * t
  const vy = a * t
  const vOut = Math.sqrt(v0 * v0 + vy * vy)
  const theta = Math.atan2(vy, v0)
  
  // 极板间距为 d，若粒子沿极板中心射入，则偏转位移绝对值超过 d/2 时撞板
  const hitsPlate = Math.abs(yOffset) >= d / 2
  return { yOffset, vy, vOut, theta, hitsPlate }
}

