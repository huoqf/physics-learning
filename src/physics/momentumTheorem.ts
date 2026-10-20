/**
 * src/physics/momentumTheorem.ts
 * 动量定理（Momentum Theorem）纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m, m/s, N, s, kg/m³, m²）
 */

// ─── 基础模式：缓冲垫碰撞模型 ──────────────────────────────────────────────

/**
 * 计算自由落体着地速度
 * v = √(2gh)
 *
 * @param h 下落高度 (m)，必须 ≥ 0
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns v 着地速度 (m/s)
 */
export function calculateFallVelocity(h: number, g: number = 9.8): number {
  return Math.sqrt(2 * g * h)
}

/**
 * 计算缓冲碰撞的平均冲力
 * F_avg = Δp/Δt + mg
 * 其中 Δp = mv（碰前动量，碰后为0）
 *
 * @param m 物体质量 (kg)
 * @param v 碰前速度 (m/s)
 * @param dt 碰撞时间 (s)，必须 > 0
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns F_avg 平均冲力 (N)
 */
export function calculateAverageImpactForce(
  m: number, v: number, dt: number, g: number = 9.8
): number {
  return (m * v) / dt + m * g
}

/**
 * 计算缓冲垫接触时间（粘性阻尼模型的时间常数）
 * 模型：缓冲垫以粘性阻尼 k 吸收动量，动量衰减的时间常数为 m/k。
 * Δt = m / k，其中 k 的单位是 kg/s（与界面标注一致）。
 *
 * 注意：若把 k 当成弹簧刚度（N/m），则必须改用 Δt = π√(m/k)，两者不可混用。
 *
 * @param m 物体质量 (kg)
 * @param k 缓冲垫阻尼系数 (kg/s)，必须 > 0
 * @returns dt 接触时间 (s)
 */
export function calculateCollisionTime(m: number, k: number): number {
  return m / k
}

/**
 * 计算动量变化量
 * Δp = m·v（碰后为0）
 *
 * @param m 物体质量 (kg)
 * @param v 碰前速度 (m/s)
 * @returns Δp 动量变化量 (kg·m/s)
 */
export function calculateMomentumChange(m: number, v: number): number {
  return m * v
}

// ─── 进阶模式：流体冲击模型 ──────────────────────────────────────────────

/**
 * 计算微元质量
 * Δm = ρ·S·v·Δt
 *
 * @param rho 流体密度 (kg/m³)
 * @param S 管口截面积 (m²)
 * @param v 流速 (m/s)
 * @param dt 微元时间 (s)
 * @returns dm 微元质量 (kg)
 */
export function calculateFluidElementMass(
  rho: number, S: number, v: number, dt: number
): number {
  return rho * S * v * dt
}

/**
 * 计算流体碰前总动量
 * p_初 = Δm·v = ρ·S·v²·Δt
 *
 * @param rho 流体密度 (kg/m³)
 * @param S 截面积 (m²)
 * @param v 流速 (m/s)
 * @param dt 微元时间 (s)
 * @returns p_initial 碰前动量 (kg·m/s)
 */
export function calculateFluidInitialMomentum(
  rho: number, S: number, v: number, dt: number
): number {
  return rho * S * v * v * dt
}

/**
 * 计算流体碰后总动量
 * p_末 = -α·Δm·v = -α·ρ·S·v²·Δt
 * α=0：贴墙流下（碰后动量为0）
 * α=1：完全弹性反弹（碰后动量 = -碰前动量）
 *
 * @param rho 流体密度 (kg/m³)
 * @param S 截面积 (m²)
 * @param v 流速 (m/s)
 * @param dt 微元时间 (s)
 * @param alpha 反弹系数 (0~1)
 * @returns p_final 碰后动量 (kg·m/s)，带负号
 */
export function calculateFluidFinalMomentum(
  rho: number, S: number, v: number, dt: number, alpha: number
): number {
  return -alpha * rho * S * v * v * dt
}

/**
 * 计算挡板冲击力
 * F = Δp/Δt = ρ·S·v²·(1+α)
 *
 * @param rho 流体密度 (kg/m³)
 * @param S 截面积 (m²)
 * @param v 流速 (m/s)
 * @param alpha 反弹系数 (0~1)
 * @returns F 冲击力 (N)
 */
export function calculateFluidImpactForce(
  rho: number, S: number, v: number, alpha: number
): number {
  return rho * S * v * v * (1 + alpha)
}

/**
 * 计算动量变化率
 * Δp/Δt = ρ·S·v²·(1+α)
 *
 * @param rho 流体密度 (kg/m³)
 * @param S 截面积 (m²)
 * @param v 流速 (m/s)
 * @param alpha 反弹系数 (0~1)
 * @returns dp_dt 动量变化率 (N)
 */
export function calculateMomentumChangeRate(
  rho: number, S: number, v: number, alpha: number
): number {
  return rho * S * v * v * (1 + alpha)
}
