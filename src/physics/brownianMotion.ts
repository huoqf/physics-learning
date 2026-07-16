/**
 * 布朗运动纯函数库。
 * 无副作用，不依赖 React/DOM/window。
 * 物理引擎使用模拟单位，通过 useSceneScale + worldToDesign 映射到设计坐标。
 */

const K_B = 1.38e-23      // 玻尔兹曼常数 J/K（用于 MB 分布图表）
const RHO_POLLEN = 1000   // 花粉密度 kg/m³（用于 MB 分布图表）

// ─── 模拟参数（非 SI，纯模拟单位）──────────────────────────────────────────
const DRAG_COEFF = 0.5          // 阻尼系数
const NOISE_AMPLITUDE = 0.3    // 热噪声幅值基础值
const MAX_VELOCITY = 5         // 最大速度（模拟单位/帧）

interface BrownianState {
  x: number
  y: number
  vx: number
  vy: number
}

interface BrownianParams {
  temperature: number       // K
  particleDiameter: number  // μm（影响视觉大小，不影响运动）
  dt: number                // s（帧间隔）
}

interface BrownianResult extends BrownianState {
  FnetX: number
  FnetY: number
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
 * 花粉微粒质量（用于 MB 分布图表计算）
 */
function pollenMass(d: number): number {
  const r = d / 2
  return (4 / 3) * Math.PI * r * r * r * RHO_POLLEN
}

/**
 * 单步 Langevin 方程积分（Euler-Maruyama 方法）
 *
 * 物理模型（模拟单位）：
 *   F_net = F_thermal + F_drag
 *   F_thermal = noiseAmplitude × √(T/300) × ξ(t)
 *   F_drag = -dragCoeff × v
 *
 * @returns 更新后的状态 + 合力分量（用于矢量渲染）
 */
export function stepBrownianMotion(
  state: BrownianState,
  params: BrownianParams,
  _bounds: { width: number; height: number },
): BrownianResult {
  const { temperature: T, dt } = params

  // 温度缩放因子
  const tempFactor = Math.sqrt(T / 300)

  // 随机热力
  const FthX = NOISE_AMPLITUDE * tempFactor * gaussianRandom()
  const FthY = NOISE_AMPLITUDE * tempFactor * gaussianRandom()

  // 粘滞阻力
  const FdX = -DRAG_COEFF * state.vx
  const FdY = -DRAG_COEFF * state.vy

  // 合力
  const FnetX = FthX + FdX
  const FnetY = FthY + FdY

  // Euler-Maruyama 积分
  let vx = state.vx + FnetX * dt
  let vy = state.vy + FnetY * dt

  // 限速
  const speed = Math.sqrt(vx * vx + vy * vy)
  if (speed > MAX_VELOCITY) {
    vx = (vx / speed) * MAX_VELOCITY
    vy = (vy / speed) * MAX_VELOCITY
  }

  // 位移（模拟单位）
  let x = state.x + vx * dt * 60
  let y = state.y + vy * dt * 60

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

// ─── 估算与解题预设（阿伏伽德罗常数微观估算模型） ───────────────────────────

export interface SubstancePreset {
  name: string
  symbol: string
  molMass: number    // 摩尔质量 (kg/mol)，例如水为 0.018 kg/mol
  density: number    // 密度 (kg/m³)，例如水为 1000 kg/m³
  model: 'sphere' | 'cube' // 微观模型：球形（液体/固体）或立方体（气体/理想固体）
  unitName: string   // 微观实体称呼 (如"分子"、"原子")
}

export const SUBSTANCE_PRESETS: SubstancePreset[] = [
  { name: '水', symbol: 'H₂O', molMass: 0.018, density: 1000, model: 'sphere', unitName: '分子' },
  { name: '金', symbol: 'Au', molMass: 0.197, density: 19300, model: 'sphere', unitName: '原子' },
  { name: '铁', symbol: 'Fe', molMass: 0.056, density: 7800, model: 'sphere', unitName: '原子' },
  { name: '铜', symbol: 'Cu', molMass: 0.064, density: 8900, model: 'sphere', unitName: '原子' },
  { name: '标况气体', symbol: 'O₂等', molMass: 0.032, density: 1.429, model: 'cube', unitName: '分子分子间距' },
]

export const N_A = 6.022e23 // 阿伏伽德罗常数 mol⁻¹

export interface MicroEstimationResult {
  V_mol: number    // 摩尔体积 (m³/mol)
  mass: number     // 物质质量 (kg)
  volume: number   // 物质体积 (m³)
  n: number        // 物质的量 (mol)
  N: number        // 分子/原子总数 (个)
  m0: number       // 单个分子/原子质量 (kg)
  V0: number       // 单个分子/原子占据体积 (m³)
  size: number     // 直径或平均距离 (m)
}

/**
 * 根据输入的宏观量估算微观物理参数
 *
 * @param substance 选中的物质预设
 * @param inputMode 输入模式：'mass' (质量，单位为 g) 或 'volume' (体积，单位为 cm³)
 * @param value 输入的数值（对应 inputMode 的单位）
 */
export function estimateMicroQuantities(
  substance: SubstancePreset,
  inputMode: 'mass' | 'volume',
  value: number,
): MicroEstimationResult {
  const M = substance.molMass
  const rho = substance.density

  // 1. 摩尔体积 (m³/mol)
  const V_mol = M / rho

  // 转换输入单位到 SI 标准单位
  let mass = 0
  let volume = 0
  if (inputMode === 'mass') {
    mass = value * 1e-3 // g -> kg
    volume = mass / rho
  } else {
    volume = value * 1e-6 // cm³ -> m³
    mass = volume * rho
  }

  // 2. 物质的量 n (mol) 和总数 N
  const n = mass / M
  const N = n * N_A

  // 3. 单个分子质量 m0 (kg)
  const m0 = M / N_A

  // 4. 单个分子体积 / 占据空间 V0 (m³)
  const V0 = V_mol / N_A

  // 5. 分子直径 d (球体模型) 或分子间距 L (立方体模型) (m)
  let size = 0
  if (substance.model === 'sphere') {
    // V0 = (4/3)*pi*r³ = (1/6)*pi*d³ => d = (6*V0/pi)^(1/3)
    size = Math.pow((6 * V0) / Math.PI, 1 / 3)
  } else {
    // V0 = L³ => L = V0^(1/3)
    size = Math.pow(V0, 1 / 3)
  }

  return {
    V_mol,
    mass,
    volume,
    n,
    N,
    m0,
    V0,
    size,
  }
}

