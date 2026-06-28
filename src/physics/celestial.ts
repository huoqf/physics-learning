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
 * v3 ≈ 16.7 km/s（地球表面的第三宇宙速度近似，返回 m/s）
 *
 * @param M 中心天体质量 (kg)，必须 > 0
 * @param R 中心天体半径 (m)，必须 > 0
 * @param G 万有引力常量 (N·m²/kg²)
 * @returns v1 第一宇宙速度 (m/s)、v2 第二宇宙速度 (m/s)、v3 地球第三宇宙速度近似 (m/s)
 *
 * @category M4
 */
export function calculateEscapeSpeed(M: number, R: number, G: number): { v1: number; v2: number; v3: number } {
  const v1 = Math.sqrt(G * M / R);
  const v2 = Math.sqrt(2 * G * M / R);
  const v3 = 16.7e3;
  return { v1, v2, v3 };
}

/**
 * 求解开普勒方程 E - e * sin(E) = M
 *
 * @param MMean 平近点角 (rad)
 * @param e 偏心率 (0 <= e < 1)
 * @returns E 偏近点角 (rad)
 *
 * @category M4
 */
export function solveKeplerEquation(MMean: number, e: number): number {
  let E = MMean;
  // 使用牛顿迭代法快速逼近解，迭代 5 次已能达到极高浮点数精度
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - MMean) / (1 - e * Math.cos(E));
  }
  return E;
}

/**
 * 计算开普勒椭圆轨道的空间位置和精确速度分量
 *
 * @param a 半长轴
 * @param b 半短轴
 * @param t 当前时间 (s)
 * @param period 轨道周期 (s)
 * @returns x, y (以椭圆几何中心为原点的物理坐标), vx, vy (速度矢量分量), r (行星离焦点太阳的距离), v (速度大小), e (偏心率)
 *
 * @category M4
 */
export function calculateKeplerOrbit(
  a: number,
  b: number,
  t: number,
  period: number
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  v: number;
  e: number;
} {
  const c = Math.sqrt(Math.max(0, a * a - b * b));
  const e = a > 0 ? c / a : 0;
  
  // 平近点角 MMean
  const omega = (2 * Math.PI) / period;
  const MMean = (omega * t) % (2 * Math.PI);
  
  // 求解偏近点角 E
  const E = solveKeplerEquation(MMean, e);
  
  // 以椭圆中心为原点的位置
  const x = a * Math.cos(E);
  const y = b * Math.sin(E);
  
  // E 对 t 的导数 dE/dt = omega / (1 - e * cos(E))
  const dEdT = omega / (1 - e * Math.cos(E));
  
  // 速度分量
  const vx = -a * Math.sin(E) * dEdT;
  const vy = b * Math.cos(E) * dEdT;
  
  // 离太阳焦点(放在右焦点 c)的距离 r = a * (1 - e * cos(E))
  const r = a * (1 - e * Math.cos(E));
  
  const v = Math.sqrt(vx * vx + vy * vy);
  
  return { x, y, vx, vy, r, v, e };
}

/**
 * 依据切向抛射初速度计算轨道力学参数
 * 
 * @param v0 发射速度 (m/s)，必须 > 0
 * @param M 中心天体质量 (kg)
 * @param R 中心天体半径 (m)
 * @param G 万有引力常量
 * @returns 包含轨道类型、偏心率 e、半正焦弦 p、近地点 r_peri、远地点 r_apo 的对象
 * 
 * @category M4
 */
export function calculateLaunchTrajectory(
  v0: number,
  M: number,
  R: number,
  G: number
): {
  orbitType: 'crash' | 'circular' | 'ellipse' | 'escape';
  e: number;
  p: number;
  rPeri: number;
  rApo: number;
} {
  const v_c = Math.sqrt((G * M) / R);
  const v_e = Math.sqrt((2 * G * M) / R);
  
  const alpha = (R * v0 * v0) / (G * M);
  const e = Math.abs(alpha - 1);
  
  let orbitType: 'crash' | 'circular' | 'ellipse' | 'escape' = 'ellipse';
  let p = R;
  let rPeri = R;
  let rApo = R;
  
  if (Math.abs(v0 - v_c) < 10) { // 误差 10m/s 内视为圆形轨道
    orbitType = 'circular';
    p = R;
    rPeri = R;
    rApo = R;
  } else if (v0 >= v_e) {
    orbitType = 'escape';
    p = R * (1 + e);
    rPeri = R;
    rApo = Infinity;
  } else if (v0 > v_c) {
    orbitType = 'ellipse';
    p = R * (1 + e);
    rPeri = R;
    rApo = p / (1 - e);
  } else {
    // v0 < v_c
    p = R * (1 - e);
    rPeri = p / (1 + e);
    rApo = R;
    // 如果近地点半径小于地球半径，则是 crash
    // 允许有微小的边界宽容，如果小于地球半径 99.9% 视为坠地
    if (rPeri < R * 0.999) {
      orbitType = 'crash';
    } else {
      orbitType = 'ellipse';
    }
  }
  
  return { orbitType, e, p, rPeri, rApo };
}

