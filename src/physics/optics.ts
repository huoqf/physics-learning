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
 * 薄透镜成像公式：1/v + 1/u = 1/f（符号约定：实物/实像为正，虚为负）。
 *
 * 物理模型：
 *   透镜公式 1/v = 1/f - 1/u（实物 u > 0）。
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

  // 1/v = 1/f - 1/u → v = fu / (u - f)
  const denominator = u - f

  // u = f 时物在焦点处，不成像
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

/**
 * 平行玻璃砖侧移量计算。
 *
 * 物理模型：
 *   光线以入射角 θ₁ 射入厚度为 d 的平行玻璃砖（折射率 n），
 *   经两次折射后出射，出射光线与入射光线平行，侧移距离 Δx 由下式给出：
 *     Δx = d × sin(θ₁ − θ₂) / cos(θ₂)
 *   其中 θ₂ 由斯涅尔定律 1·sinθ₁ = n·sinθ₂ 确定。
 *
 * @param theta1_deg 入射角 (°)，范围 [0, 90]
 * @param n 玻璃折射率，n > 0
 * @param d 玻璃砖厚度 (mm)，d > 0
 * @returns 侧移距离 Δx (mm)；全反射时 delta_x 为 NaN
 */
export function calculateLateralDisplacement(
  theta1_deg: number,
  n: number,
  d: number,
): { delta_x: number } {
  if (n <= 0 || d <= 0) return { delta_x: NaN }

  const { theta2_deg } = calculateRefraction(theta1_deg, 1, n)
  if (isNaN(theta2_deg)) return { delta_x: NaN }

  const theta1_rad = (theta1_deg * Math.PI) / 180
  const theta2_rad = (theta2_deg * Math.PI) / 180

  const delta_x = d * Math.sin(theta1_rad - theta2_rad) / Math.cos(theta2_rad)

  return { delta_x }
}

/**
 * 水下点光源透光圆半径。
 *
 * 物理模型：
 *   光源在水下深度 h 处，水的折射率 n（>1）。
 *   全反射临界角 C = arcsin(1/n)，透光圆半径 R = h·tan(C) = h / √(n²-1)。
 *
 * @param h 水下深度 (m)，h > 0
 * @param n 水的折射率，n > 1
 * @returns radius 透光圆半径 (m)，不满足条件时返回 NaN
 */
export function calculateIlluminatedRadius(
  h: number,
  n: number,
): { radius: number } {
  if (h <= 0 || n <= 1) return { radius: NaN }

  const denom = n * n - 1
  if (denom <= 0) return { radius: NaN }

  const radius = h / Math.sqrt(denom)
  return { radius }
}

/**
 * 水下点光源透光圆面积。
 *
 * 物理模型：
 *   光源在水下深度 h 处，水的折射率 n（>1）。
 *   透光圆面积 S = π·R² = π·h² / (n²-1)。
 *
 * @param h 水下深度 (m)，h > 0
 * @param n 水的折射率，n > 1
 * @returns area 透光圆面积 (m²)，不满足条件时返回 NaN
 */
export function calculateIlluminatedArea(
  h: number,
  n: number,
): { area: number } {
  const { radius } = calculateIlluminatedRadius(h, n)
  if (isNaN(radius)) return { area: NaN }

  const area = Math.PI * radius * radius
  return { area }
}

/**
 * 共轭法（二次成像法）计算两组物距/像距。
 *
 * 物理模型：
 *   物与光屏距离 L 固定，移动透镜可找到两个位置均能成清晰实像。
 *   方程：u(L-u)/f = L → u² - Lu + Lf = 0
 *   判别式 Δ = L² - 4Lf，要求 L ≥ 4f。
 *
 * @param L 物屏距离 (m)，L > 0
 * @param f 焦距 (m)，f > 0（凸透镜）
 * @returns 两组物距像距，不满足条件时 valid=false
 */
export function calculateConjugatePositions(
  L: number,
  f: number,
): {
  u1: number; v1: number
  u2: number; v2: number
  valid: boolean
} {
  if (L <= 0 || f <= 0 || L < 4 * f - 1e-12) {
    return { u1: NaN, v1: NaN, u2: NaN, v2: NaN, valid: false }
  }

  const discriminant = L * L - 4 * L * f
  const sqrtD = Math.sqrt(Math.max(0, discriminant))
  const u1 = (L - sqrtD) / 2
  const v1 = L - u1
  const u2 = (L + sqrtD) / 2
  const v2 = L - u2

  return { u1, v1, u2, v2, valid: true }
}
