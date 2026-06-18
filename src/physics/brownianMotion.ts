/**
 * 布朗运动纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

const K_B = 1.38e-23      // 玻尔兹曼常数 J/K
const RHO_POLLEN = 1000   // 花粉密度 kg/m³
const ETA_WATER = 1e-3     // 水的动力粘度 Pa·s

interface BrownianState {
  x: number
  y: number
  vx: number
  vy: number
}

interface BrownianParams {
  temperature: number       // K
  particleDiameter: number  // μm
  dt: number                // s（帧间隔）
}

interface BrownianResult extends BrownianState {
  FnetX: number
  FnetY: number
}

/**
 * Stokes 阻力系数 γ = 3πηd
 */
function stokesDrag(d: number, eta: number = ETA_WATER): number {
  return 3 * Math.PI * eta * d
}

/**
 * 花粉微粒质量 m = (4/3)π(d/2)³ρ
 */
function pollenMass(d: number): number {
  const r = d / 2
  return (4 / 3) * Math.PI * r * r * r * RHO_POLLEN
}

/**
 * Box-Muller 高斯随机数生成器
 * 返回 N(0,1) 标准正态分布随机数
 */
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * 单步 Langevin 方程积分（Euler-Maruyama 方法）
 *
 * 物理模型：
 *   F_net = F_thermal + F_drag
 *   F_thermal = sqrt(2γk_BT/dt) · ξ(t)   // ξ(t) ~ N(0,1)
 *   F_drag = -γv                           // Stokes 粘滞阻力
 *
 * @returns 更新后的状态 + 合力分量（用于矢量渲染）
 */
export function stepBrownianMotion(
  state: BrownianState,
  params: BrownianParams,
  bounds: { width: number; height: number },
): BrownianResult {
  const { temperature: T, particleDiameter: dMicron, dt } = params
  const d = dMicron * 1e-6       // μm → m
  const gamma = stokesDrag(d)
  const mass = pollenMass(d)

  // 热涨落噪声幅值 σ = sqrt(2γk_BT/dt)
  const sigma = Math.sqrt((2 * gamma * K_B * T) / dt)

  // 随机热力
  const FthX = sigma * gaussianRandom()
  const FthY = sigma * gaussianRandom()

  // 粘滞阻力
  const FdX = -gamma * state.vx
  const FdY = -gamma * state.vy

  // 合力
  const FnetX = FthX + FdX
  const FnetY = FthY + FdY

  // Euler-Maruyama 积分
  const ax = FnetX / mass
  const ay = FnetY / mass
  let vx = state.vx + ax * dt
  let vy = state.vy + ay * dt
  let x = state.x + vx * dt
  let y = state.y + vy * dt

  // 边界反弹（粒子半径约 d/2，映射到画布像素）
  const particleRadius = dMicron * 2  // 视觉半径（像素）
  if (x < particleRadius) { x = particleRadius; vx = Math.abs(vx) * 0.8 }
  if (x > bounds.width - particleRadius) { x = bounds.width - particleRadius; vx = -Math.abs(vx) * 0.8 }
  if (y < particleRadius) { y = particleRadius; vy = Math.abs(vy) * 0.8 }
  if (y > bounds.height - particleRadius) { y = bounds.height - particleRadius; vy = -Math.abs(vy) * 0.8 }

  return { x, y, vx, vy, FnetX, FnetY }
}

/**
 * Maxwell-Boltzmann 速率分布函数
 *
 * f(v) = 4π (m/(2πk_BT))^(3/2) v² exp(-mv²/(2k_BT))
 *
 * @param v 速率 (m/s)
 * @param T 温度 (K)
 * @param m 质量 (kg)
 * @returns 概率密度 f(v)
 */
export function maxwellBoltzmannSpeed(v: number, T: number, m: number): number {
  if (T <= 0 || v < 0) return 0
  const factor1 = 4 * Math.PI
  const factor2 = Math.pow(m / (2 * Math.PI * K_B * T), 1.5)
  const factor3 = v * v
  const factor4 = Math.exp((-m * v * v) / (2 * K_B * T))
  return factor1 * factor2 * factor3 * factor4
}

/**
 * 生成 Maxwell-Boltzmann 分布曲线数据点
 *
 * @param T 温度 (K)
 * @param d 粒子直径 (m)
 * @returns { v, fv } 数组，用于 MiniChart 渲染
 */
export function generateMBCurve(T: number, d: number): { v: number; fv: number }[] {
  const m = pollenMass(d * 1e-6)
  const points: { v: number; fv: number }[] = []

  // 最概然速率 v_p = sqrt(2k_BT/m)，取 0~4 倍范围
  const vp = Math.sqrt((2 * K_B * T) / m)
  const vMax = vp * 4
  const steps = 80

  for (let i = 0; i <= steps; i++) {
    const v = (vMax * i) / steps
    const fv = maxwellBoltzmannSpeed(v, T, m)
    points.push({ v, fv })
  }

  return points
}

/**
 * 计算平均速率 v_avg = sqrt(8k_BT/(πm))
 */
export function averageSpeed(T: number, d: number): number {
  const m = pollenMass(d * 1e-6)
  return Math.sqrt((8 * K_B * T) / (Math.PI * m))
}

/**
 * 计算最概然速率 v_p = sqrt(2k_BT/m)
 */
export function mostProbableSpeed(T: number, d: number): number {
  const m = pollenMass(d * 1e-6)
  return Math.sqrt((2 * K_B * T) / m)
}

/**
 * 计算分子平均动能 Ēk = (3/2)kT
 */
export function averageKineticEnergy(T: number): number {
  return 1.5 * K_B * T
}
