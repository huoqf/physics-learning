/**
 * 热力学第一定律 — 纯函数模块。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 核心公式 ΔU = Q + W 已在 thermodynamics.ts 的 calculateInternalEnergy 中实现。
 * 本文件补充可视化映射、粒子仿真、活塞/矢量计算。
 */

// ─── 物理常量 ─────────────────────────────────────────────────────────────
/** 气体分子粒子数 */
export const PARTICLE_COUNT = 32
/** 分子基础运动速度 (m/s) */
export const BASE_SPEED = 1.8
/** 参考温度 (K)，用于速度缩放 */
export const T_REF = 300
/** 系统热容 C_sys = n * Cv (J/K)，其中 nR = 1/3, Cv = 1.5R */
export const C_SYS = 0.5

// ─── 粒子数据结构 ──────────────────────────────────────────────────────────
/** 气体分子粒子 */
export interface GasParticle {
  x: number  // 物理坐标 x (m)
  y: number  // 物理坐标 y (m)
  vx: number // 物理速度 vx (m/s)
  vy: number // 物理速度 vy (m/s)
}

/** 热流视觉粒子 */
export interface HeatParticle {
  x: number   // 物理坐标 x
  y: number   // 物理坐标 y
  vy: number  // 浮动速度
  life: number // 生命周期 (0-1)
}

// ─── 粒子初始化 ────────────────────────────────────────────────────────────
/**
 * 初始化随机气体分子粒子。
 * x 限制在 [-0.8, 0.8]，y 限制在 [0.8, 2.3]。
 */
export function initGasParticles(count: number): GasParticle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    return {
      x: (Math.random() - 0.5) * 1.6,
      y: 0.8 + Math.random() * 1.5,
      vx: Math.cos(angle) * BASE_SPEED,
      vy: Math.sin(angle) * BASE_SPEED,
    }
  })
}

// ─── 活塞与矢量计算 ───────────────────────────────────────────────────────
/**
 * 根据物理状态计算活塞像素高度。
 * 气缸底部 y=0.6m，开口 y=5.2m，活塞范围 [1.5, 4.9]。
 *
 * @param mode 0=沙箱, 1=循环
 * @param V 当前体积 (m³)
 * @param W_input 外界做功输入 (J)，沙箱模式下使用
 * @returns 活塞 y 坐标 (物理坐标，米)
 */
export function calculatePistonY(
  mode: number,
  V: number,
  W_input: number,
): number {
  let pistonY = 3.2
  if (mode === 1) {
    pistonY = 3.2 + ((V - 1.0e-3) / 1.0e-3) * 1.5
  } else {
    pistonY = 3.2 - (W_input / 500) * 1.5
  }
  return Math.max(1.5, Math.min(4.9, pistonY))
}

/**
 * 计算做功外力矢量。
 * W > 0 外界做功（力向下），W < 0 系统做功（力向上）。
 *
 * @param W 外界做功 (J)
 * @param pistonY 当前活塞 y 坐标
 */
export function calculateForceVector(
  W: number,
  pistonY: number,
): {
  isWorkApplied: boolean
  forceVector: { x: number; y: number }
  forceOrigin: { x: number; y: number }
} {
  const isWorkApplied = W !== 0
  const forceVector = {
    x: 0,
    y: W > 0 ? -1.5 : W < 0 ? 1.5 : 0,
  }
  const forceOrigin = {
    x: 0,
    y: W > 0 ? pistonY + 1.8 : pistonY,
  }
  return { isWorkApplied, forceVector, forceOrigin }
}

// ─── 温度与速度 ────────────────────────────────────────────────────────────
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
  TRef: number = T_REF,
): number {
  if (TRef <= 0) return 1
  return Math.sqrt(Math.max(0, T) / TRef)
}

// ─── 颜色映射 (纯函数，不依赖 theme import) ──────────────────────────────
/**
 * 解析 hex 颜色 → {r, g, b}。
 * @param hex 6位十六进制颜色，如 '#3B82F6'
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

// 主题 token 预解析（与 THERMO_COLORS.temperatureLow/High 对齐）
const TEMP_LOW = hexToRgb('#3B82F6')  // temperatureLow — 冷蓝
const TEMP_HIGH = hexToRgb('#EF4444') // temperatureHigh — 亮红

/**
 * 温度 → 气体分子颜色（冷蓝 → 亮红渐变）。
 * 用于粒子渲染，颜色随温度连续变化。
 *
 * @param T 当前温度 (K)
 * @param TRef 参考低温 (K)，默认 300
 * @param THigh 参考高温 (K)，默认 1200
 * @returns CSS rgb 颜色字符串
 */
export function temperatureToColor(
  T: number,
  TRef: number = 300,
  THigh: number = 1200,
): string {
  const t = Math.max(0, Math.min(1, (T - TRef) / (THigh - TRef)))
  const r = Math.round(TEMP_LOW.r + t * (TEMP_HIGH.r - TEMP_LOW.r))
  const g = Math.round(TEMP_LOW.g + t * (TEMP_HIGH.g - TEMP_LOW.g))
  const b = Math.round(TEMP_LOW.b + t * (TEMP_HIGH.b - TEMP_LOW.b))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 内能增量 → 气缸背景颜色（带透明度）。
 * ΔU > 0 吸热偏暖橙，ΔU < 0 放热偏冷青，ΔU ≈ 0 中性。
 *
 * @param deltaU 内能变化量 (J)
 * @param maxAbsDU 归一化基准 (J)，默认 500
 * @returns CSS rgba 颜色字符串
 */
export function deltaUToBgColor(
  deltaU: number,
  maxAbsDU: number = 500,
): string {
  const normU = Math.max(-1, Math.min(1, deltaU / maxAbsDU))
  if (normU > 0) {
    return `rgba(249, 115, 22, ${0.04 + normU * 0.16})`  // heatAbsorb + alpha
  } else if (normU < 0) {
    return `rgba(8, 145, 178, ${0.04 + Math.abs(normU) * 0.16})` // heatRelease + alpha
  }
  return `rgba(224, 231, 238, 0.4)` // gasVolumeBase + alpha
}

/**
 * 内能增量 → 气缸背景色 token 名。
 * 用于场景层选择颜色 token（不返回 CSS 字符串，供 SVG fill 直接使用）。
 *
 * @param deltaU 内能变化量 (J)
 * @returns 'heatAbsorb' | 'heatRelease' | 'gasVolumeBase'
 */
export function deltaUBgToken(
  deltaU: number,
): 'heatAbsorb' | 'heatRelease' | 'gasVolumeBase' {
  if (deltaU > 0) return 'heatAbsorb'
  if (deltaU < 0) return 'heatRelease'
  return 'gasVolumeBase'
}

// ─── 绝热过程计算 ──────────────────────────────────────────────────────────
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
  const P2 = P1 * Math.pow(V1 / V2, gamma)
  const W = (P1 * V1 - P2 * V2) / (gamma - 1)
  const T1 = (P1 * V1) / (1 * 8.314) // n=1
  const T2 = T1 * Math.pow(V1 / V2, gamma - 1)
  return { W, T2 }
}

// ─── 状态求解 ──────────────────────────────────────────────────────────────
/** 联动的物理状态数据结构 */
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
  const deltaT = deltaU / C_SYS
  const T = 300 + deltaT

  // 体积：线性映射做功，W = 0 时 V = 1.0e-3 m³
  const V = 1.0e-3 - 1.0e-6 * W

  // 压强：P = nRT/V = T / (3 * V)
  const P = V > 0 ? T / (3 * V) : 0

  return { P, V, T, W, Q: effectiveQ, deltaU }
}

/**
 * 循环模式下的物理状态求解（时间插值）。
 * 周期 20 秒，4步循环各占 5秒。
 */
export function calculateCycleState(time: number): FirstLawPhysicsState {
  const cycle = 20
  const t = ((time % cycle) + cycle) % cycle
  const stepIndex = Math.min(3, Math.floor(t / 5))
  const stepProgress = (t % 5) / 5

  let P = 1.0e5
  let V = 1.0e-3
  let T = 300
  let W = 0
  let Q = 0
  let deltaU = 0

  if (stepIndex === 0) {
    // A -> B: 等压膨胀
    P = 1.0e5
    V = 1.0e-3 + stepProgress * 1.0e-3
    T = 300 + stepProgress * 300
    deltaU = 150 * stepProgress
    W = -100 * stepProgress
    Q = 250 * stepProgress
  } else if (stepIndex === 1) {
    // B -> C: 等容加热
    V = 2.0e-3
    P = 1.0e5 + stepProgress * 1.0e5
    T = 600 + stepProgress * 600
    deltaU = 150 + 300 * stepProgress
    W = -100
    Q = 250 + 300 * stepProgress
  } else if (stepIndex === 2) {
    // C -> D: 等压压缩
    P = 2.0e5
    V = 2.0e-3 - stepProgress * 1.0e-3
    T = 1200 - stepProgress * 600
    deltaU = 450 - 300 * stepProgress
    W = -100 + 200 * stepProgress
    Q = 550 - 500 * stepProgress
  } else {
    // D -> A: 等容冷却
    V = 1.0e-3
    P = 2.0e5 - stepProgress * 1.0e5
    T = 600 - stepProgress * 300
    deltaU = 150 - 150 * stepProgress
    W = 100
    Q = 50 - 150 * stepProgress
  }

  return { P, V, T, W, Q, deltaU, currentStepIndex: stepIndex, stepProgress }
}
