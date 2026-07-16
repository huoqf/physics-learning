/**
 * 热力学第一定律 — 可视化辅助纯函数。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 核心公式 ΔU = Q + W 已在 thermodynamics.ts 的 calculateInternalEnergy 中实现。
 * 本文件补充可视化映射函数和绝热过程计算。
 */

/**
 * 内能增量 → 温度变化量。
 * ΔU = nCvΔT → ΔT = ΔU/(nCv)
 *
 * @param deltaU 内能变化量 (J)
 * @param n 物质的量 (mol)，默认 1
 * @param Cv 定容摩尔热容 (J/(mol·K))，默认单原子 12.47
 * @returns deltaT 温度变化量 (K)
 */
export function deltaUtoDeltaT(
  deltaU: number,
  n: number = 1,
  Cv: number = 12.47,
): number {
  if (n <= 0 || Cv <= 0) return 0
  return deltaU / (n * Cv)
}

/**
 * 温度 → 粒子速度缩放因子。
 * 分子平均动能正比于热力学温度：½mv² ∝ T → v ∝ √T
 *
 * @param T 当前温度 (K)
 * @param TRef 参考温度 (K)，默认 300
 * @returns 速度缩放因子
 */
export function temperatureToSpeedScale(
  T: number,
  TRef: number = 300,
): number {
  if (TRef <= 0) return 1
  return Math.sqrt(Math.max(0, T) / TRef)
}

/**
 * 内能增量 → 气缸背景颜色（冷蓝 → 深紫渐变映射）。
 * 用于绝热压缩实验的视觉反馈：ΔU 越大，颜色越紫。
 *
 * @param deltaU 内能变化量 (J)
 * @param maxAbsDU 最大绝对内能变化量 (J)，用于归一化
 * @returns CSS 颜色字符串
 */
export function internalEnergyToColor(
  deltaU: number,
  maxAbsDU: number = 500,
): string {
  const clamped = Math.max(-maxAbsDU, Math.min(maxAbsDU, deltaU))
  const t = (clamped + maxAbsDU) / (2 * maxAbsDU) // 0 (放热) → 1 (吸热/做功)

  // 冷蓝 (59,130,246) → 中性白 (240,240,250) → 深紫 (109,40,217)
  let r: number, g: number, b: number
  if (t < 0.5) {
    const s = t / 0.5
    r = Math.round(59 + s * (240 - 59))
    g = Math.round(130 + s * (240 - 130))
    b = Math.round(246 + s * (250 - 246))
  } else {
    const s = (t - 0.5) / 0.5
    r = Math.round(240 + s * (109 - 240))
    g = Math.round(240 + s * (40 - 240))
    b = Math.round(250 + s * (217 - 250))
  }
  return `rgb(${r},${g},${b})`
}

/**
 * 计算绝热过程功（泊松方程）。
 * PV^γ = const, W = (P1V1 - P2V2)/(γ-1)
 *
 * @param P1 初始压强 (Pa)
 * @param V1 初始体积 (m³)
 * @param V2 末态体积 (m³)
 * @param gamma 绝热指数，默认单原子 5/3 ≈ 1.667
 * @returns { W: 功 (J), T2: 末态温度 (K) }
 */
export function calculateAdiabaticWork(
  P1: number,
  V1: number,
  V2: number,
  gamma: number = 5 / 3,
): { W: number; T2: number } {
  if (V1 <= 0 || V2 <= 0 || P1 <= 0) {
    return { W: 0, T2: 0 }
  }
  // P2 = P1 * (V1/V2)^γ
  const P2 = P1 * Math.pow(V1 / V2, gamma)
  // W = (P1*V1 - P2*V2) / (γ - 1)
  const W = (P1 * V1 - P2 * V2) / (gamma - 1)
  // T2 = P2 * V2 / (nR), nR = P1*V1/T1, T1 = P1*V1/(nR) → T2 = T1 * (V1/V2)^(γ-1)
  const T1 = (P1 * V1) / (1 * 8.314) // n=1
  const T2 = T1 * Math.pow(V1 / V2, gamma - 1)
  return { W, T2 }
}

/**
 * 联动的物理状态数据结构。
 */
export interface FirstLawPhysicsState {
  P: number     // 压强 (Pa)
  V: number     // 体积 (m³)
  T: number     // 温度 (K)
  W: number     // 外界做功的累计量 (J)
  Q: number     // 吸收热量的累计量 (J)
  deltaU: number // 内能变化的累计量 (J)
  currentStepIndex?: number // 仅循环模式：当前处于哪一步 (0-3)
  stepProgress?: number     // 仅循环模式：当前步进度 (0-1)
}

/**
 * 沙箱模式下的物理状态求解。
 * 输入滑块参数 W 和 Q，以及绝热开关，求解对应的 P, V, T 等。
 */
export function calculateSandboxState(
  W: number,
  Q: number,
  adiabatic: boolean,
): FirstLawPhysicsState {
  const effectiveQ = adiabatic ? 0 : Q
  const deltaU = effectiveQ + W
  // 系统热容 C_sys = n * Cv = 0.5 J/K (其中 nR = 1/3 J/K, Cv = 1.5R)
  const deltaT = deltaU / 0.5
  const T = 300 + deltaT

  // 体积：线性映射做功，W = 0 时 V = 1.0e-3 m³
  // W 增加，体积缩小；W 减小，体积增大。
  const V = 1.0e-3 - 1.0e-6 * W

  // 压强：P = nRT/V = T / (3 * V)
  const P = V > 0 ? T / (3 * V) : 0

  return {
    P,
    V,
    T,
    W,
    Q: effectiveQ,
    deltaU,
  }
}

/**
 * 循环模式下的物理状态求解（时间插值）。
 * 周期 20 秒，4步循环各占 5秒。
 */
export function calculateCycleState(time: number): FirstLawPhysicsState {
  const cycle = 20
  const t = ((time % cycle) + cycle) % cycle // 保证正数
  const stepIndex = Math.min(3, Math.floor(t / 5))
  const stepProgress = (t % 5) / 5

  let P = 1.0e5
  let V = 1.0e-3
  let T = 300
  let W = 0
  let Q = 0
  let deltaU = 0

  if (stepIndex === 0) {
    // 1. A -> B: 等压膨胀 (0 <= t < 5)
    P = 1.0e5
    V = 1.0e-3 + stepProgress * 1.0e-3
    T = 300 + stepProgress * 300
    deltaU = 150 * stepProgress
    W = -100 * stepProgress
    Q = 250 * stepProgress
  } else if (stepIndex === 1) {
    // 2. B -> C: 等容加热 (5 <= t < 10)
    V = 2.0e-3
    P = 1.0e5 + stepProgress * 1.0e5
    T = 600 + stepProgress * 600
    deltaU = 150 + 300 * stepProgress
    W = -100
    Q = 250 + 300 * stepProgress
  } else if (stepIndex === 2) {
    // 3. C -> D: 等压压缩 (10 <= t < 15)
    P = 2.0e5
    V = 2.0e-3 - stepProgress * 1.0e-3
    T = 1200 - stepProgress * 600
    deltaU = 450 - 300 * stepProgress
    W = -100 + 200 * stepProgress
    Q = 550 - 500 * stepProgress
  } else {
    // 4. D -> A: 等容冷却 (15 <= t < 20)
    V = 1.0e-3
    P = 2.0e5 - stepProgress * 1.0e5
    T = 600 - stepProgress * 300
    deltaU = 150 - 150 * stepProgress
    W = 100
    Q = 50 - 150 * stepProgress
  }

  return {
    P,
    V,
    T,
    W,
    Q,
    deltaU,
    currentStepIndex: stepIndex,
    stepProgress,
  }
}

