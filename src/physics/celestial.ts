/**
 * 天体物理计算模块
 *
 * @category M4 — 天体物理（预留，当前无消费方）
 */

/**
 * 计算天体圆周运动的轨道速度、周期与向心加速度
 *
 * @param M 中心天体质量 (kg)
 * @param r 轨道半径 (m)，必须 > 0
 * @param G 万有引力常量 (N·m²/kg²)，默认 6.674e-11
 * @returns v 轨道速度 (m/s)、T 轨道周期 (s)、a_c 向心加速度 (m/s²)
 */
export function calculateOrbitalSpeed(M: number, r: number, G: number): { v: number; T: number; a_c: number } {
  const v = Math.sqrt(G * M / r);
  const T = (2 * Math.PI * r) / v;
  const a_c = v * v / r;
  return { v, T, a_c };
}

/**
 * 开普勒第三定律：由轨道1的半径和周期推算轨道2的周期
 * T² ∝ r³ → T2 = T1 × √(r2/r1)³
 *
 * @param r1 轨道1半径 (m)，必须 > 0
 * @param T1 轨道1周期 (s)，必须 > 0
 * @param r2 轨道2半径 (m)，必须 > 0
 * @returns T2 轨道2周期 (s)
 *
 * @category M4
 */
export function calculateKeplerThird(r1: number, T1: number, r2: number): { T2: number } {
  const T2 = T1 * Math.sqrt(Math.pow(r2 / r1, 3));
  return { T2 };
}

/**
 * 由圆轨道半径和周期反推中心天体质量
 * M = 4π²r³ / (G·T²)
 *
 * @param r 轨道半径 (m)，必须 > 0
 * @param T 轨道周期 (s)，必须 > 0
 * @param G 万有引力常量 (N·m²/kg²)
 * @returns M 中心天体质量 (kg)
 *
 * @category M4
 */
export function calculateCentralMass(r: number, T: number, G: number): { M: number } {
  const M = (4 * Math.PI * Math.PI * r * r * r) / (G * T * T);
  return { M };
}

/**
 * 由天体表面重力周期估算天体平均密度
 * ρ = 3π / (G·T²)
 * 推导：g = 4π²R/T²，M = gR²/G，ρ = M/(4πR³/3) = 3π/(GT²)
 *
 * @param T_surface 表面重力摆的周期 (s)，必须 > 0
 * @param G 万有引力常量 (N·m²/kg²)
 * @returns rho 天体平均密度 (kg/m³)
 *
 * @category M4
 */
export function calculatePlanetDensity(T_surface: number, G: number): { rho: number } {
  const rho = (3 * Math.PI) / (G * T_surface * T_surface);
  return { rho };
}

/**
 * 计算三个宇宙速度
 * v1 = √(GM/R)（环绕速度）
 * v2 = √(2GM/R)（逃逸速度）
 * v3 = √(11.2)（相对地球的第三宇宙速度近似，单位 km/s）
 *
 * @param M 中心天体质量 (kg)，必须 > 0
 * @param R 中心天体半径 (m)，必须 > 0
 * @param G 万有引力常量 (N·m²/kg²)
 * @returns v1 第一宇宙速度 (m/s)、v2 第二宇宙速度 (m/s)、v3 第三宇宙速度近似 (km/s)
 *
 * @category M4
 */
export function calculateEscapeSpeed(M: number, R: number, G: number): { v1: number; v2: number; v3: number } {
  const v1 = Math.sqrt(G * M / R);
  const v2 = Math.sqrt(2 * G * M / R);
  const v3 = Math.sqrt(11.2);
  return { v1, v2, v3 };
}
