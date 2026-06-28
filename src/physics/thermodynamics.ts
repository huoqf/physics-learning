/**
 * 热学纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

/**
 * 理想气体状态方程及三大实验定律。
 *
 * 物理模型：
 * 理想气体状态方程 pV = nRT，其中 n 为物质的量，R = 8.314 J/(mol·K)。
 *
 * 已知三组状态参量中的三个，求解第四个：
 *   - 已知 p1, V1, T1 以及 p2, V2 → 求 T2（综合气态方程）
 *   - 已知 p1, V1, T1 以及 p2, T2 → 求 V2
 *   - 已知 p1, V1, T1 以及 V2, T2 → 求 p2
 *
 * 三大定律（固定一个变量）：
 *   - 玻意耳定律（T 恒定）：p₁V₁ = p₂V₂
 *   - 查理定律（V 恒定）：p₁/T₁ = p₂/T₂
 *   - 盖-吕萨克定律（p 恒定）：V₁/T₁ = V₂/T₂
 *
 * 温度必须使用热力学温度 K（K = ℃ + 273.15）。
 *
 * @param p1 初始压强 (Pa)
 * @param V1 初始体积 (m³)
 * @param T1 初始热力学温度 (K)，T > 0
 * @param p2 末态压强 (Pa)，可选（与 V2/T2 至少提供一个）
 * @param V2 末态体积 (m³)，可选
 * @param T2 末态热力学温度 (K)，可选
 * @returns solved 未提供的那个参量的求解值，以及定律类型判定
 */
export function calculateIdealGas(
  p1: number,
  V1: number,
  T1: number,
  p2?: number,
  V2?: number,
  T2?: number
): {
  p2: number
  V2: number
  T2: number
  law: 'boyle' | 'charles' | 'gay-lussac' | 'combined'
} {
  // 求解缺失变量（已知任意三个求第四个）
  let solvedP2 = p2 ?? 0
  let solvedV2 = V2 ?? 0
  let solvedT2 = T2 ?? 0

  // 综合气态方程 p1V1/T1 = p2V2/T2 → 求缺失的那个
  if (solvedP2 === 0 && V2 !== undefined && T2 !== undefined) {
    // 求 p2
    solvedP2 = T1 > 0 && V2 > 0 ? (p1 * V1 * T2) / (V2 * T1) : 0
  } else if (solvedV2 === 0 && p2 !== undefined && T2 !== undefined) {
    // 求 V2
    solvedV2 = T1 > 0 ? (p1 * V1 * T2) / (p2 * T1) : 0
  } else if (solvedT2 === 0 && p2 !== undefined && V2 !== undefined) {
    // 求 T2
    solvedT2 = V1 > 0 && p1 > 0 ? (p2 * V2 * T1) / (p1 * V1) : 0
  }

  // 判定定律类型
  const eps = 1e-9
  let law: 'boyle' | 'charles' | 'gay-lussac' | 'combined' = 'combined'

  if (T2 !== undefined && Math.abs(T1 - (T2 ?? T1)) < eps) {
    law = 'boyle'
  } else if (V2 !== undefined && Math.abs(V1 - (V2 ?? V1)) < eps) {
    law = 'charles'
  } else if (p2 !== undefined && Math.abs(p1 - (p2 ?? p1)) < eps) {
    law = 'gay-lussac'
  }

  return {
    p2: solvedP2,
    V2: solvedV2,
    T2: solvedT2,
    law,
  }
}

/**
 * 热力学第一定律：ΔU = Q + W。
 *
 * 符号规定（物理学通用）：
 *   - Q > 0：系统吸热；Q < 0：系统放热
 *   - W > 0：外界对系统做功（压缩）；W < 0：系统对外界做功（膨胀）
 *   - ΔU > 0：内能增加；ΔU < 0：内能减少
 *
 * @param deltaQ 系统吸收的热量 (J)，正为吸热，负为放热
 * @param deltaW 外界对系统做的功 (J)，正为外界对系统做功，负为系统对外界做功
 * @returns deltaU 内能变化量 (J)
 */
export function calculateInternalEnergy(
  deltaQ: number,
  deltaW: number
): { deltaU: number } {
  return { deltaU: deltaQ + deltaW }
}

/**
 * 计算理想气体等温/等容/等压过程的功与热量。
 *
 * 物理模型：
 *   - 等温过程（ΔT=0）：W = -nRT·ln(V2/V1)，Q = -W（ΔU=0）
 *   - 等容过程（ΔV=0）：W = 0，Q = nCv·ΔT，ΔU = Q
 *   - 等压过程（Δp=0）：W = -p·ΔV，Q = nCp·ΔT
 *
 * @param process 过程类型：'isothermal' | 'isochoric' | 'isobaric'
 * @param n 物质的量 (mol)
 * @param T 当前热力学温度 (K)，等温过程需提供
 * @param T2 末态温度 (K)，等容/等压过程需提供
 * @param V1 初始体积 (m³)
 * @param V2 末态体积 (m³)
 * @param p 压强 (Pa)，等压过程需提供
 * @param Cv 定容摩尔热容 (J/(mol·K))，单原子 12.47，双原子 20.79
 * @param Cp 定压摩尔热容 (J/(mol·K))，单原子 20.79，双原子 29.10
 * @returns W 功 (J)，Q 热量 (J)，deltaU 内能变化 (J)
 */
export function calculateThermoProcess(options: {
  process: 'isothermal' | 'isochoric' | 'isobaric'
  n: number
  T?: number
  T2?: number
  V1: number
  V2: number
  p?: number
  Cv?: number
  Cp?: number
}): { W: number; Q: number; deltaU: number } {
  const { process, n, V1, V2 } = options
  const R = 8.314 // J/(mol·K)
  const T = options.T ?? 300
  const T2 = options.T2 ?? T
  const p = options.p ?? 0
  const Cv = options.Cv ?? 12.47 // 默认单原子
  const Cp = options.Cp ?? 20.79

  let W = 0
  let Q = 0
  let deltaU = 0

  if (process === 'isothermal') {
    // 等温过程：ΔU = 0，W = -nRT·ln(V2/V1)，Q = -W
    const safeRatio = V1 > 0 ? V2 / V1 : 1
    W = -n * R * T * Math.log(safeRatio)
    deltaU = 0
    Q = -W
  } else if (process === 'isochoric') {
    // 等容过程：W = 0，ΔU = nCv·ΔT，Q = ΔU
    W = 0
    deltaU = n * Cv * (T2 - T)
    Q = deltaU
  } else {
    // 等压过程：W = -p·ΔV，ΔU = nCv·ΔT，Q = nCp·ΔT
    W = -p * (V2 - V1)
    deltaU = n * Cv * (T2 - T)
    Q = n * Cp * (T2 - T)
  }

  return { W, Q, deltaU }
}
