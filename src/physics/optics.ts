/**
 * 光学纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

/**
 * 折射定律（斯涅尔定律）：n₁·sinθ₁ = n₂·sinθ₂。
 *
 * 物理模型：
 *   光从折射率 n₁ 的介质射入折射率 n₂ 的介质。
 *   - n₁ < n₂（疏→密）：折射角 θ₂ < θ₁，光线靠近法线
 *   - n₁ > n₂（密→疏）：折射角 θ₂ > θ₁，光线偏离法线
 *   - 当 n₁ > n₂ 且 θ₁ ≥ 临界角时发生全反射（此函数不处理，返回 theta2=NaN）
 *
 * @param theta1_deg 入射角 (°)，范围 [0, 90]
 * @param n1 入射介质折射率，n1 > 0
 * @param n2 折射介质折射率，n2 > 0
 * @returns theta2_deg 折射角 (°)，全反射时返回 NaN
 */
export function calculateRefraction(
  theta1_deg: number,
  n1: number,
  n2: number
): { theta2_deg: number } {
  if (n1 <= 0 || n2 <= 0) return { theta2_deg: NaN }

  const theta1_rad = (theta1_deg * Math.PI) / 180
  const sinTheta2 = (n1 * Math.sin(theta1_rad)) / n2

  // 全反射检测：|sinθ₂| > 1
  if (Math.abs(sinTheta2) > 1) {
    return { theta2_deg: NaN }
  }

  const theta2_rad = Math.asin(sinTheta2)
  const theta2_deg = (theta2_rad * 180) / Math.PI

  return { theta2_deg }
}

/**
 * 全反射临界角：sinC = n₂/n₁（要求 n₁ > n₂）。
 *
 * 物理模型：
 *   光从光密介质（n₁）射向光疏介质（n₂）时，折射角达到 90° 对应的入射角。
 *   - 当入射角 θ₁ ≥ C 时发生全反射
 *   - n₁ ≤ n₂ 时不存在临界角（返回 NaN）
 *
 * @param n1 入射介质折射率（光密介质），n1 > 0
 * @param n2 折射介质折射率（光疏介质），n2 > 0
 * @returns theta_c_deg 临界角 (°)，不存在时返回 NaN
 */
export function calculateCriticalAngle(
  n1: number,
  n2: number
): { theta_c_deg: number } {
  if (n1 <= 0 || n2 <= 0 || n1 <= n2) {
    return { theta_c_deg: NaN }
  }

  const sinC = n2 / n1
  if (sinC > 1) return { theta_c_deg: NaN }

  const theta_c_rad = Math.asin(sinC)
  const theta_c_deg = (theta_c_rad * 180) / Math.PI

  return { theta_c_deg }
}

/**
 * 薄透镜成像公式：1/v - 1/u = 1/f（符号约定：实物/实像为正，虚为负）。
 *
 * 物理模型：
 *   透镜公式 1/v = 1/f + 1/u（实物 u > 0）。
 *   放大率 m = v/u。
 *
 *   凸透镜（f > 0）成像规律：
 *     u > 2f  → 实像，倒立，缩小（|m| < 1）
 *     u = 2f  → 实像，倒立，等大（|m| = 1）
 *     f < u < 2f → 实像，倒立，放大（|m| > 1）
 *     u = f   → 平行光（不成像，v → ∞）
 *     u < f   → 虚像，正立，放大（v < 0）
 *
 *   凹透镜（f < 0）始终成虚像，正立，缩小。
 *
 * @param f 焦距 (m)，凸透镜 f > 0，凹透镜 f < 0
 * @param u 物距 (m)，u > 0（实物）
 * @returns v 像距 (m)，m 放大率，type 像的性质，valid 是否成像
 */
export function calculateThinLens(
  f: number,
  u: number
): {
  v: number
  m: number
  type: 'real-inverted' | 'virtual-upright' | 'none'
  valid: boolean
} {
  if (f === 0 || u <= 0) {
    return { v: NaN, m: NaN, type: 'none', valid: false }
  }

  // 1/v = 1/f + 1/u → v = fu / (u + f)
  const denominator = u + f

  // u + f = 0 → u = |f| 且 f < 0，或 u = -f，即物在焦点处，不成像
  if (Math.abs(denominator) < 1e-12) {
    return { v: Infinity, m: Infinity, type: 'none', valid: false }
  }

  const v = (f * u) / denominator
  const m = v / u

  // 判断像的性质
  let type: 'real-inverted' | 'virtual-upright' | 'none'
  if (v > 0) {
    // 实像（像与物在透镜异侧）
    type = 'real-inverted'
  } else {
    // 虚像（像与物在透镜同侧）
    type = 'virtual-upright'
  }

  return { v, m, type, valid: true }
}
