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

/** 开普勒轨道状态（物理坐标，以椭圆几何中心为原点，y↑） */
export interface KeplerOrbitState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 行星到太阳（右焦点）的距离 */
  r: number;
  v: number;
  e: number;
}

/**
 * 开普勒轨道核心求解（以**偏心率 + 周期**为输入）。
 *
 * 之所以以 e 而不是 b 为输入：`b > a` 在几何上不可表达，旧实现用
 * `sqrt(max(0, a² − b²))` 静默吞掉，会把非法参数画成一个"竖直椭圆、e = 0"的假象。
 * 以 e 为输入后 b 是派生量，非法几何从源头消失。
 *
 * @category M4
 */
function solveOrbitCore(a: number, e: number, t: number, period: number): KeplerOrbitState {
  const eSafe = Math.min(Math.max(e, 0), 0.999);
  const b = a * Math.sqrt(1 - eSafe * eSafe);
  if (!(a > 0) || !(period > 0)) {
    return { x: a, y: 0, vx: 0, vy: 0, r: a, v: 0, e: eSafe };
  }

  // 平近点角 MMean
  const omega = (2 * Math.PI) / period;
  const MMean = (omega * t) % (2 * Math.PI);

  // 求解偏近点角 E
  const E = solveKeplerEquation(MMean, eSafe);

  // 以椭圆中心为原点的位置
  const x = a * Math.cos(E);
  const y = b * Math.sin(E);

  // E 对 t 的导数 dE/dt = omega / (1 - e * cos(E))
  const dEdT = omega / (1 - eSafe * Math.cos(E));

  // 速度分量
  const vx = -a * Math.sin(E) * dEdT;
  const vy = b * Math.cos(E) * dEdT;

  // 离太阳焦点(放在右焦点 c)的距离 r = a * (1 - e * cos(E))
  const r = a * (1 - eSafe * Math.cos(E));

  return { x, y, vx, vy, r, v: Math.hypot(vx, vy), e: eSafe };
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
): KeplerOrbitState {
  // 唯一的一处 e 推导：其余模块一律通过本函数或 evaluateKeplerOrbit 取轨道，不再各算一遍 c / e
  const e = a > 0 ? Math.sqrt(Math.max(0, 1 - (b / a) * (b / a))) : 0;
  return solveOrbitCore(a, e, t, period);
}

// ─── 开普勒轨道：以「偏心率 + 中心天体质量」为输入的模型 ────────────────────
//
// 这一段存在的理由是：开普勒第三定律讲的是 `a³/T² = GM/4π²`，
// 其中 T 应该由中心天体（GM）决定，而不是反过来由第三定律推出 T。
// 旧实现 `T₂ = T₁·√(a₂/a₁)³` 用要证明的定律生成了用来证明它的数据，
// T²–a³ 图像上的"直线"因此是恒等式而非结果。

/** 教学归一化引力常量（与双星模型 CELESTIAL_SIM_G 保持同一约定） */
export const KEPLER_SIM_G = 1.0;

/** 中心天体的引力参数 μ = GM (m³/s²) */
export function gravitationalParameter(mass: number, G: number = KEPLER_SIM_G): number {
  return G * mass;
}

/**
 * 由中心天体质量求轨道周期：T = 2π√(a³/μ)。
 * 这是第三定律的**来源**（牛顿引力下的动力学结果），不是它的推论。
 *
 * @category M4
 */
export function orbitalPeriodFromMass(a: number, mass: number, G: number = KEPLER_SIM_G): number {
  const mu = gravitationalParameter(mass, G);
  if (!(a > 0) || !(mu > 0)) return 0;
  return 2 * Math.PI * Math.sqrt((a * a * a) / mu);
}

/** 由 (a, e) 导出椭圆其余几何量（b、c、近远日距） */
export function ellipseFromEccentricity(
  a: number,
  e: number,
): { a: number; b: number; c: number; e: number; rMin: number; rMax: number } {
  const eSafe = Math.min(Math.max(e, 0), 0.999);
  const b = a * Math.sqrt(1 - eSafe * eSafe);
  const c = a * eSafe;
  return { a, b, c, e: eSafe, rMin: a - c, rMax: a + c };
}

/** 单位质量角动量 h = √(μ·a·(1−e²)) */
export function specificAngularMomentum(
  a: number,
  e: number,
  mass: number,
  G: number = KEPLER_SIM_G,
): number {
  const mu = gravitationalParameter(mass, G);
  const eSafe = Math.min(Math.max(e, 0), 0.999);
  return Math.sqrt(Math.max(0, mu * a * (1 - eSafe * eSafe)));
}

/**
 * 面积速度 dS/dt = h/2 —— 开普勒第二定律的定量表述。
 * 对任意偏心率都恒定，因此"等时间扫过等面积"等价于"该值不随位置变化"。
 */
export function arealVelocity(
  a: number,
  e: number,
  mass: number,
  G: number = KEPLER_SIM_G,
): number {
  return specificAngularMomentum(a, e, mass, G) / 2;
}

export interface OrbitLegality {
  ok: boolean;
  /** 不合法的原因（ok 为 true 时为空） */
  reason?: string;
  /** 近日点距离（即便不合法也返回，供调用方展示） */
  rMin: number;
}

/**
 * 轨道合法性：把"这个参数组合在物理上是否可能存在"变成显式返回值。
 * `minClearance` 传中心天体半径，用于挡住"近日点已进入恒星内部"的配置。
 */
export function orbitLegality(a: number, e: number, minClearance = 0): OrbitLegality {
  const { rMin } = ellipseFromEccentricity(a, e);
  if (!(a > 0)) return { ok: false, reason: '半长轴必须为正', rMin };
  if (e < 0 || e >= 1) return { ok: false, reason: '偏心率必须落在 [0, 1) 内', rMin };
  if (minClearance > 0 && rMin <= minClearance) {
    return {
      ok: false,
      reason: `近日点 r_min = ${rMin.toFixed(2)} 已进入中心天体内部（需 > ${minClearance.toFixed(2)}）`,
      rMin,
    };
  }
  return { ok: true, rMin };
}

export interface KeplerOrbitByMass extends KeplerOrbitState {
  /** 由中心天体质量决定的周期 */
  period: number;
  /** 单位质量角动量 */
  h: number;
  /** 面积速度 h/2 */
  arealVelocity: number;
}

/**
 * 以 (a, e, 中心天体质量) 求某一时刻的轨道状态 —— 中屏与看板共用此函数，
 * 避免同一个 r / v 在两处各算一遍。
 *
 * @category M4
 */
export function evaluateKeplerOrbit(
  a: number,
  e: number,
  mass: number,
  t: number,
  G: number = KEPLER_SIM_G,
): KeplerOrbitByMass {
  const period = orbitalPeriodFromMass(a, mass, G);
  const core = solveOrbitCore(a, e, t, period);
  const h = specificAngularMomentum(a, e, mass, G);
  return { ...core, period, h, arealVelocity: h / 2 };
}

/**
 * 数值累积一个周期内扫过的面积（以太阳为顶点，逐段三角形累加）。
 *
 * 这里故意**不用** h/2 的解析式 —— 用解析式画出来的 S–t 直线是定义式的必然结果，
 * 用真实位置累积才是"测出来的直线"，也是唯一能自查的量（S(T) 必须等于 πab）。
 *
 * 内部积分步长取 `samples × AREA_INTEGRATION_FACTOR`：近日点附近行星扫过的角度每步很大，
 * 只用 48 个弦会低估该段的面积（实测单段偏差可达 12%），曲线虽然仍是直线但会抖。
 * 加密积分、只按 samples 取输出点，既保证面积精度，又让图上点数可控。
 *
 * @returns 从近日点起、按 samples 等分时间采样的 { t, area } 序列，首项为 0
 */
const AREA_INTEGRATION_FACTOR = 16;

export function sampleSweptArea(
  a: number,
  e: number,
  mass: number,
  samples = 48,
  G: number = KEPLER_SIM_G,
): { t: number; area: number }[] {
  const period = orbitalPeriodFromMass(a, mass, G);
  if (!(period > 0) || samples < 2) return [];
  const { c } = ellipseFromEccentricity(a, e);

  const steps = samples * AREA_INTEGRATION_FACTOR;
  const start = solveOrbitCore(a, e, 0, period);
  let px = start.x - c;
  let py = start.y;
  let area = 0;
  const out: { t: number; area: number }[] = [{ t: 0, area: 0 }];

  for (let i = 1; i <= steps; i += 1) {
    const t = (i / steps) * period;
    const s = solveOrbitCore(a, e, t, period);
    const cx = s.x - c;
    const cy = s.y;
    area += 0.5 * Math.abs(px * cy - py * cx);
    px = cx;
    py = cy;
    if (i % AREA_INTEGRATION_FACTOR === 0) {
      out.push({ t, area });
    }
  }
  return out;
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

/** 教学归一化引力常量（双星/三星运动模型） */
export const CELESTIAL_SIM_G = 1.0
/** 双星系统默认总质量 (kg) */
export const BINARY_STARS_DEFAULT_TOTAL_MASS = 10.0
/** 三星系统默认单星质量 (kg) */
export const TRIPLE_STARS_DEFAULT_MASS = 5.0

/**
 * 计算双星系统的质量、轨道半径、线速度、周期与向心力
 *
 * 注意：双星/三星模型按教学惯例做了归一化（G = 1.0、m₁ + m₂ = 10 kg），
 * 看板上的 F 与 a 必须由本函数一并给出，不能再用真实 G = 6.67×10⁻¹¹ 另算——
 * 否则同一张看板上，T 由归一化模型算、F 由真实常量算，互相矛盾且 F 会显示成 0.00。
 *
 * @param L 双星间距 (m)
 * @param massRatio 质量比 m1/m2
 * @param G 万有引力常数，默认 1.0 (归一化教学模型)
 * @param totalMass 双星系统总质量，默认 10.0 kg
 * @returns 包含各星质量、轨道半径、线速度、角速度、周期、向心力与向心加速度的对象
 */
export function calculateBinaryStars(
  L: number,
  massRatio: number,
  G: number = CELESTIAL_SIM_G,
  totalMass: number = BINARY_STARS_DEFAULT_TOTAL_MASS
): {
  m1: number;
  m2: number;
  r1: number;
  r2: number;
  v1: number;
  v2: number;
  omega: number;
  T: number;
  F: number;
  a1: number;
  a2: number;
} {
  const m1 = (totalMass * massRatio) / (1 + massRatio);
  const m2 = totalMass / (1 + massRatio);
  
  // 质心分配半径：r1/r2 = m2/m1 -> r1 + r2 = L
  const r1 = L / (1 + massRatio);
  const r2 = (L * massRatio) / (1 + massRatio);
  
  // omega^2 = G * (m1 + m2) / L^3
  const omega = Math.sqrt((G * totalMass) / Math.pow(L, 3));
  const T = (2 * Math.PI) / omega;
  
  const v1 = omega * r1;
  const v2 = omega * r2;

  // 向心力与向心加速度：模型约定下 G=1.0，与运动轨道周期完全闭环
  const F = (G * m1 * m2) / (L * L);
  const a1 = m1 > 0 ? F / m1 : 0;
  const a2 = m2 > 0 ? F / m2 : 0;
  
  return { m1, m2, r1, r2, v1, v2, omega, T, F, a1, a2 };
}

/**
 * 计算等边三角形三星系统的轨道半径、向心力、线速度及周期
 * 
 * @param L 三星之间的距离 (等边三角形边长) (m)
 * @param G 万有引力常数，默认 1.0
 * @param starMass 单个星体质量，默认 5.0 (三星质量相等)
 * @returns 包含轨道半径、合向心力、线速度、角速度和周期的对象
 */
export function calculateTripleStars(
  L: number,
  G: number = CELESTIAL_SIM_G,
  starMass: number = TRIPLE_STARS_DEFAULT_MASS
): {
  r: number;
  fNet: number;
  v: number;
  omega: number;
  T: number;
} {
  // 轨道半径：r = L / (2 * cos(30°)) = L / √3
  const r = L / Math.sqrt(3);
  
  // 每颗星受另外两颗星的引力合力：F_net = √3 * G * m^2 / L^2
  const fNet = Math.sqrt(3) * G * starMass * starMass / (L * L);
  
  // 合引力等于向心力：F_net = m * omega^2 * r -> omega = √(F_net / (m * r)) = √(3 * G * m / L^3)
  const omega = Math.sqrt((3 * G * starMass) / Math.pow(L, 3));
  const T = (2 * Math.PI) / omega;
  const v = omega * r;
  
  return { r, fNet, v, omega, T };
}


