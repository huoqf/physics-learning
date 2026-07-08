/**
 * 简谐运动（Simple Harmonic Motion, SHM）纯函数库。
 *
 * 运动学方程：x(t) = A·cos(ωt + φ)
 *   - 位移  x：单位 米 (m)
 *   - 速度  v = -Aω·sin(ωt + φ)：单位 米/秒 (m/s)
 *   - 加速度 a = -Aω²·cos(ωt + φ) = -ω²·x：单位 米/秒² (m/s²)
 *   - 角频率 ω = 2π / T：单位 弧度/秒 (rad/s)
 *
 * 本文件为纯函数模块，禁止依赖 DOM / React / window（铁律 2），
 * 所有输出均为可序列化数值，兼容 IndexedDB 持久化。
 */

/** 计算角频率 ω（单位 rad/s）。周期 T 单位秒 (s)，须 > 0。 */
export function computeAngularFrequency(period: number): number {
  if (period <= 0) return 0
  return (2 * Math.PI) / period
}

export interface SHMState {
  /** 位移 x，单位 m */
  displacement: number
  /** 速度 v，单位 m/s */
  velocity: number
  /** 加速度 a，单位 m/s² */
  acceleration: number
}

/**
 * 计算简谐运动在给定相位下的运动状态。
 * @param amplitude 振幅 A（m）
 * @param angularFrequency 角频率 ω（rad/s）
 * @param phase 相位 θ = ωt + φ（rad）
 */
export function computeSHMState(
  amplitude: number,
  angularFrequency: number,
  phase: number,
): SHMState {
  const cos = Math.cos(phase)
  const sin = Math.sin(phase)
  return {
    displacement: amplitude * cos,
    velocity: -amplitude * angularFrequency * sin,
    acceleration: -amplitude * angularFrequency * angularFrequency * cos,
  }
}

export interface SHMEnergy {
  /** 动能 E_k，单位 J */
  kinetic: number
  /** 弹性势能 E_p，单位 J */
  potential: number
  /** 总机械能 E，单位 J */
  total: number
}

/**
 * 计算质量-弹簧系统的能量分配（弹簧劲度 k = m·ω²）。
 * @param mass 振子质量 m（kg）
 * @param amplitude 振幅 A（m）
 * @param angularFrequency 角频率 ω（rad/s）
 * @param displacement 当前位移 x（m）
 */
export function computeSHMEnergy(
  mass: number,
  amplitude: number,
  angularFrequency: number,
  displacement: number,
): SHMEnergy {
  const k = mass * angularFrequency * angularFrequency
  const total = 0.5 * k * amplitude * amplitude
  const potential = 0.5 * k * displacement * displacement
  const kinetic = Math.max(0, total - potential)
  return { kinetic, potential, total }
}

export interface VerticalSpringForces {
  /** 平衡位置偏离原长的距离，单位 m */
  equilibriumOffset: number
  /** 重力，单位 N */
  gravity: number
  /** 弹簧弹力（向上为负，向下为正，与位移 y 同一坐标系），单位 N */
  springForce: number
  /** 合外力（回复力，指向平衡位置），单位 N */
  netForce: number
}

/**
 * 计算竖直弹簧振子的受力状态。
 * 设定平衡位置为 y = 0，向下位移 y 为正。
 */
export function computeVerticalSpringForces(
  mass: number,
  k: number,
  y: number,
  g = 9.8,
): VerticalSpringForces {
  const equilibriumOffset = (mass * g) / k
  const gravity = mass * g
  // 弹簧伸长量为 equilibriumOffset + y。弹力向上（为负方向）
  const springForce = -k * (equilibriumOffset + y)
  const netForce = gravity + springForce // 重力向下(正)，弹力力向上(负)
  return {
    equilibriumOffset,
    gravity,
    springForce,
    netForce,
  }
}

export interface PendulumState {
  /** 当前摆角 θ，单位 rad */
  angle: number
  /** 弧长位移 s = L*θ，单位 m */
  displacement: number
  /** 切向速度 v，单位 m/s */
  velocity: number
  /** 切向加速度 a_t = -g*sinθ，单位 m/s² */
  acceleration: number
  /** 摆线拉力 T = m*(g*cosθ + v²/L)，单位 N */
  tension: number
  /** 重力 mg，单位 N */
  gravity: number
  /** 切向回复力 F_t = -mg*sinθ，单位 N */
  restoringForce: number
}

/**
 * 计算单摆在小偏角简谐运动下的状态。
 * @param mass 摆球质量，单位 kg
 * @param L 摆长，单位 m
 * @param g 重力加速度，单位 m/s²
 * @param theta0Deg 最大摆角，单位 °
 * @param phase 运动相位 ωt + φ，单位 rad
 */
export function computePendulumState(
  mass: number,
  L: number,
  g: number,
  theta0Deg: number,
  phase: number,
): PendulumState {
  const theta0 = (theta0Deg * Math.PI) / 180
  const omega = Math.sqrt(g / L)
  
  // 简谐运动状态：θ(t) = θ0 * cos(ωt + φ)
  const angle = theta0 * Math.cos(phase)
  const angularVelocity = -theta0 * omega * Math.sin(phase)
  
  const displacement = L * angle
  const velocity = L * angularVelocity
  const acceleration = -g * Math.sin(angle) // 切向加速度
  
  const gravity = mass * g
  const tension = mass * (g * Math.cos(angle) + (velocity * velocity) / L)
  const restoringForce = -gravity * Math.sin(angle)
  
  return {
    angle,
    displacement,
    velocity,
    acceleration,
    tension,
    gravity,
    restoringForce,
  }
}

export interface RealPendulumTrajectoryPoint {
  t: number
  angle: number
  angularVelocity: number
}

/**
 * 计算大角单摆的真实周期（使用椭圆积分级数展开）
 */
export function computeRealPendulumPeriod(L: number, g: number, theta0Deg: number): number {
  const T0 = 2 * Math.PI * Math.sqrt(L / g)
  const theta0Rad = (theta0Deg * Math.PI) / 180
  const k = Math.sin(theta0Rad / 2)
  // 四阶椭圆积分展开
  const factor = 1 + 0.25 * k * k + (9 / 64) * Math.pow(k, 4) + (25 / 256) * Math.pow(k, 6)
  return T0 * factor
}

/**
 * 使用 RK4 积分计算大角单摆在一个周期内的运动轨迹表（用于后续插值）
 */
export function generateRealPendulumTrajectory(
  L: number,
  g: number,
  theta0Deg: number,
  steps = 200
): RealPendulumTrajectoryPoint[] {
  const T_real = computeRealPendulumPeriod(L, g, theta0Deg)
  const dt = T_real / steps
  const theta0Rad = (theta0Deg * Math.PI) / 180
  
  const trajectory: RealPendulumTrajectoryPoint[] = []
  let angle = theta0Rad
  let omega = 0
  
  const deriv = (a: number, w: number) => {
    return {
      dAngle: w,
      dOmega: -(g / L) * Math.sin(a)
    }
  }
  
  for (let i = 0; i <= steps; i++) {
    trajectory.push({ t: i * dt, angle, angularVelocity: omega })
    
    // RK4 step
    const k1 = deriv(angle, omega)
    const k2 = deriv(angle + 0.5 * dt * k1.dAngle, omega + 0.5 * dt * k1.dOmega)
    const k3 = deriv(angle + 0.5 * dt * k2.dAngle, omega + 0.5 * dt * k2.dOmega)
    const k4 = deriv(angle + dt * k3.dAngle, omega + dt * k3.dOmega)
    
    angle += (dt / 6) * (k1.dAngle + 2 * k2.dAngle + 2 * k3.dAngle + k4.dAngle)
    omega += (dt / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega)
  }
  
  // 确保首尾完全闭合，避免周期边界跳变
  if (trajectory.length > 0) {
    trajectory[trajectory.length - 1].angle = theta0Rad
    trajectory[trajectory.length - 1].angularVelocity = 0
  }
  
  return trajectory
}

/**
 * 根据预计算的轨迹表，对任意时间 t 进行线性插值，获取单摆当前状态
 */
export function getPendulumStateFromTrajectory(
  trajectory: RealPendulumTrajectoryPoint[],
  T_real: number,
  t: number,
  phiDeg: number,
  omegaReal: number
): { angle: number; angularVelocity: number } {
  if (trajectory.length === 0) return { angle: 0, angularVelocity: 0 }
  
  // 将初相转换为时间偏移：t_offset = phi / omega_real
  const phiRad = (phiDeg * Math.PI) / 180
  const tOffset = phiRad / omegaReal
  
  // 计算查表时间，映射到一个周期 [0, T_real]
  let tLookup = (t + tOffset) % T_real
  if (tLookup < 0) tLookup += T_real
  
  const steps = trajectory.length - 1
  const dt = T_real / steps
  const indexFloat = tLookup / dt
  const index = Math.floor(indexFloat)
  const nextIndex = (index + 1) % trajectory.length
  const frac = indexFloat - index
  
  const p1 = trajectory[index]
  const p2 = trajectory[nextIndex]
  
  if (!p1 || !p2) return { angle: 0, angularVelocity: 0 }
  
  return {
    angle: p1.angle + frac * (p2.angle - p1.angle),
    angularVelocity: p1.angularVelocity + frac * (p2.angularVelocity - p1.angularVelocity)
  }
}

