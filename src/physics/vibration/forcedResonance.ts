/**
 * 受迫振动与共振物理纯计算函数
 * 遵循高中物理与大学物理基础力学振动规范，零 React/DOM 依赖，返回物理量数值
 */

export interface ForcedResonanceConfig {
  /** 振子质量 m (kg) */
  m: number
  /** 劲度系数 k (N/m) */
  k: number
  /** 阻尼系数 gamma (N·s/m) 或阻尼因子 beta = gamma / (2m) */
  gamma: number
  /** 驱动力振幅 F0 (N) */
  F0: number
  /** 驱动力圆频率 omega (rad/s) 或频率 f (Hz) */
  f: number
}

export interface SteadyStateResonanceResult {
  /** 固有频率 f0 (Hz) */
  f0: number
  /** 固有圆频率 omega0 (rad/s) */
  omega0: number
  /** 阻尼因子 beta = gamma / (2m) (s^-1) */
  beta: number
  /** 阻尼固有圆频率 omega1 = sqrt(omega0^2 - beta^2) */
  omega1: number
  /** 稳态受迫振动振幅 A (m) */
  amplitude: number
  /** 稳态滞后相位 phi (rad) */
  phaseLag: number
  /** 共振频率 f_res (Hz) = sqrt(omega0^2 - 2*beta^2) / (2*pi) (当弱阻尼时近似为 f0) */
  fRes: number
  /** 共振最大振幅 A_res (m) */
  maxAmplitude: number
}

/**
 * 计算受迫振动稳态物理特征量
 */
export function calculateSteadyStateResonance(config: ForcedResonanceConfig): SteadyStateResonanceResult {
  const { m, k, gamma, F0, f } = config
  const safeM = Math.max(0.01, m)
  const safeK = Math.max(0.1, k)
  const omega0 = Math.sqrt(safeK / safeM)
  const f0 = omega0 / (2 * Math.PI)
  const beta = Math.max(0, gamma) / (2 * safeM)
  const omega1 = omega0 * omega0 > beta * beta ? Math.sqrt(omega0 * omega0 - beta * beta) : 0

  const omega = 2 * Math.PI * Math.max(0.01, f)

  // 稳态振幅公式: A = (F0 / m) / sqrt((omega0^2 - omega^2)^2 + (2 * beta * omega)^2)
  const term1 = omega0 * omega0 - omega * omega
  const term2 = 2 * beta * omega
  const denom = Math.sqrt(term1 * term1 + term2 * term2)
  const amplitude = denom > 1e-6 ? (F0 / safeM) / denom : 0

  // 滞后初相位: tan(phi) = 2*beta*omega / (omega0^2 - omega^2)
  const phaseLag = Math.atan2(term2, term1)

  // 位移共振圆频率: omega_res = sqrt(max(0, omega0^2 - 2*beta^2))
  const omegaResSq = Math.max(0, omega0 * omega0 - 2 * beta * beta)
  const omegaRes = Math.sqrt(omegaResSq)
  const fRes = omegaRes / (2 * Math.PI)

  // 共振最大振幅
  const maxDenom = 2 * beta * Math.sqrt(Math.max(1e-6, omega0 * omega0 - beta * beta))
  const maxAmplitude = (beta > 1e-4 && maxDenom > 1e-6) ? (F0 / safeM) / maxDenom : (F0 / safeK)

  return {
    f0,
    omega0,
    beta,
    omega1,
    amplitude,
    phaseLag,
    fRes,
    maxAmplitude,
  }
}

/**
 * 计算某一时刻 t 振子的实时位移、速度与受迫状态
 * 采用稳态近似与初态过渡相结合的解析模型
 */
export function calculateForcedVibrationState(
  config: ForcedResonanceConfig,
  time: number,
  mode: number = 1 // 0: 自由 vs 受迫, 1: 共振现象, 2: 阻尼对比
): {
  x: number // 位移 (m)
  v: number // 速度 (m/s)
  driverX: number // 驱动端位移 (m)
  fDriver: number // 实时驱动力 (N)
  elasticForce: number // 弹簧弹力 -k*x (N)
  dampingForce: number // 阻尼阻力 -gamma*v (N)
} {
  const steady = calculateSteadyStateResonance(config)
  const { F0, f, k, gamma } = config
  const omega = 2 * Math.PI * f

  // 驱动源位移 (偏心轮或连杆)
  const driverX = 0.04 * Math.sin(omega * time)
  const fDriver = F0 * Math.sin(omega * time)

  // 稳态受迫振动位移 x_steady = A * sin(omega * t - phi)
  const xSteady = steady.amplitude * Math.sin(omega * time - steady.phaseLag)
  const vSteady = steady.amplitude * omega * Math.cos(omega * time - steady.phaseLag)

  let x = xSteady
  let v = vSteady

  // 若在模式 0 (演示初始过渡到稳态)，引入衰减的齐次自由振动分量
  if (mode === 0) {
    const decay = Math.exp(-steady.beta * time)
    const xTransient = -steady.amplitude * Math.sin(-steady.phaseLag) * Math.cos(steady.omega1 * time) * decay
    const vTransient = steady.amplitude * Math.sin(-steady.phaseLag) * steady.omega1 * Math.sin(steady.omega1 * time) * decay
    x = xSteady + xTransient
    v = vSteady + vTransient
  }

  const elasticForce = -k * x
  const dampingForce = -gamma * v

  return {
    x,
    v,
    driverX,
    fDriver,
    elasticForce,
    dampingForce,
  }
}

/**
 * 生成 A-f 共振特性曲线采样点集
 */
export function generateResonanceCurvePoints(
  m: number,
  k: number,
  gamma: number,
  F0: number,
  fMax: number = 3.0,
  stepCount: number = 80
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const step = fMax / stepCount

  for (let i = 1; i <= stepCount; i++) {
    const f = i * step
    const res = calculateSteadyStateResonance({ m, k, gamma, F0, f })
    points.push({ x: f, y: res.amplitude })
  }

  return points
}
