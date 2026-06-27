import { GRAVITY, DEFAULT_STATIC_FRICTION_RATIO } from './constants'

export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * Math.abs(q1 * q2) / (r * r) };
}

/**
 * 计算万有引力大小
 *
 * 万有引力定律：F = G·m₁·m₂ / r²
 *
 * @param G 万有引力常量 [N·m²/kg²]
 * @param m1 物体1质量 [kg]
 * @param m2 物体2质量 [kg]
 * @param r 两物体质心距离 [m]，必须 > 0
 * @returns F 引力大小 [N]，始终为正
 *
 * @category M1
 */
export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number } {
  return { F: (G * m1 * m2) / (r * r) };
}

/**
 * 计算胡克定律弹力（恢复力）
 *
 * 以弹簧平衡位置为原点，x 为相对平衡位置的有符号位移：
 *   - 拉伸时 x > 0，返回 F < 0（指向平衡位置）
 *   - 压缩时 x < 0，返回 F > 0（指向平衡位置）
 *
 * 即 F = -k·x
 *
 * @param k 弹簧劲度系数 [N/m]
 * @param x 相对平衡位置的有符号位移 [m]；拉伸为正，压缩为负
 * @returns F 恢复力 [N]，方向总指向平衡位置
 *
 * @category M1
 */
export function calculateElasticForce(k: number, x: number): { F: number } {
  return { F: -k * x };
}

/**
 * 连接体问题静态张力范围（仅静止态有意义）
 *
 * 静止时张力由静摩擦分配决定，不唯一。取值范围受两物体最大静摩擦力约束：
 *   T_min = max(0, F - f₂_max)   —— m₂ 即将滑动时绳的最小拉力
 *   T_max = min(f₁_max, F)       —— m₁ 即将滑动时绳的最大拉力
 */
export interface StaticTensionRange {
  /** 张力下界 (N) */
  min: number
  /** 张力上界 (N) */
  max: number
}

/**
 * 连接体问题计算结果
 */
export interface ConnectedBodyResult {
  /** 系统是否发生共同运动 */
  isMoving: boolean
  /** 系统加速度 (m/s²)，静止时为 0 */
  a: number
  /** 绳/弹簧内力张力 (N)，运动时为精确值，静止时为 0（展示值） */
  T: number
  /** UI 展示用张力 (N)，与 T 相同，语义上强调"展示值" */
  displayTension: number
  /** m₁ 实际摩擦力 (N)，仅运动时有意义，静止时为 null */
  f1: number | null
  /** m₂ 实际摩擦力 (N)，仅运动时有意义，静止时为 null */
  f2: number | null
  /** m₁ 最大静摩擦力 (N) */
  f1Max: number
  /** m₂ 最大静摩擦力 (N) */
  f2Max: number
  /** 系统总最大静摩擦力 (N) */
  totalFrictionMax: number
  /** 静止态张力取值范围，运动时为 null */
  staticTensionRange: StaticTensionRange | null
}

/**
 * 计算水平面上连接体问题的运动状态与内力
 *
 * 物理模型：两个物体 m₁、m₂ 通过轻绳/弹簧连接，置于同一粗糙水平面上，
 * 水平外力 F 作用于 m₂ 右侧，两物体摩擦系数相同（均为 μ）。
 *
 * 运动时（F > μ(m₁+m₂)g）：
 *   加速度 a = [F - μ(m₁+m₂)g] / (m₁+m₂)
 *   张力 T = m₁F / (m₁+m₂)（与 μ 无关，高中秒杀结论）
 *
 * 静止时（F ≤ μ(m₁+m₂)g）：
 *   张力不唯一，取值范围由两物体最大静摩擦力约束。
 *   为教学展示简洁，displayTension 返回 0，但 staticTensionRange 提供完整范围。
 *
 * @param m1 物体1质量 (kg)，必须 > 0
 * @param m2 物体2质量 (kg)，必须 > 0
 * @param F  水平外拉力 (N)，作用于 m₂ 右侧，必须 ≥ 0
 * @param mu 动摩擦因数（两物体相同），必须 ≥ 0
 * @param g  重力加速度 (m/s²)，通常取 9.8
 * @returns 连接体运动状态与内力
 *
 * @category M1
 */
export function calculateConnectedBody(
  m1: number,
  m2: number,
  F: number,
  mu: number,
  g: number
): ConnectedBodyResult {
  const f1Max = mu * m1 * g
  const f2Max = mu * m2 * g
  const totalFrictionMax = f1Max + f2Max
  const isMoving = F > totalFrictionMax

  if (!isMoving) {
    const staticTensionMin = Math.max(0, F - f2Max)
    const staticTensionMax = Math.min(f1Max, F)

    return {
      isMoving: false,
      a: 0,
      T: 0,
      displayTension: 0,
      f1: null,
      f2: null,
      f1Max,
      f2Max,
      totalFrictionMax,
      staticTensionRange: { min: staticTensionMin, max: staticTensionMax },
    }
  }

  const totalMass = m1 + m2
  const a = (F - totalFrictionMax) / totalMass
  const T = (m1 * F) / totalMass

  return {
    isMoving: true,
    a,
    T,
    displayTension: T,
    f1: f1Max,
    f2: f2Max,
    f1Max,
    f2Max,
    totalFrictionMax,
    staticTensionRange: null,
  }
}

/**
 * 连接体问题时间线状态
 */
export interface ConnectedBodyTimelineResult {
  /** 当前时刻加速度 (m/s²) */
  a: number
  /** 当前时刻速度 (m/s) */
  v: number
  /** 当前时刻位移 (m) */
  s: number
  /** 当前时刻张力 (N) */
  T: number
  /** 系统是否在运动 */
  isMoving: boolean
}

/**
 * 计算连接体问题在给定时刻的运动状态
 *
 * 基于匀变速直线运动公式：
 *   v = a·t
 *   s = ½·a·t²
 *
 * 若系统未启动（F ≤ μ(m₁+m₂)g），则 a = v = s = 0。
 *
 * @param m1 物体1质量 (kg)
 * @param m2 物体2质量 (kg)
 * @param F  水平外拉力 (N)
 * @param mu 动摩擦因数
 * @param g  重力加速度 (m/s²)
 * @param t  时间 (s)，必须 ≥ 0
 * @returns 给定时刻的运动状态
 *
 * @category M1
 */
export function calculateConnectedBodyTimeline(
  m1: number,
  m2: number,
  F: number,
  mu: number,
  g: number,
  t: number
): ConnectedBodyTimelineResult {
  const { isMoving, a, T } = calculateConnectedBody(m1, m2, F, mu, g)

  if (!isMoving || t <= 0) {
    return { a: 0, v: 0, s: 0, T: 0, isMoving: false }
  }

  const v = a * t
  const s = 0.5 * a * t * t

  return { a, v, s, T, isMoving: true }
}

/**
 * 计算地球表面重力、万有引力与自转向心力的矢量分量及夹角关系
 * @param latitudeDeg 纬度 (度, 0~90)
 * @param m 物体质量
 * @param F_gravitation 万有引力相对大小基准值
 * @param omegaScale 向心力放大系数 (用于在画面上清晰展示夹角)
 */
export function calculateEarthGravity(
  latitudeDeg: number,
  m: number,
  F_gravitation: number,
  omegaScale: number
): {
  F_grav: number;
  F_centripetal: number;
  G_force: number;
  angleDeviation: number;
  Fx_grav: number; Fy_grav: number;
  Fx_cent: number; Fy_cent: number;
  Gx: number; Gy: number;
} {
  const latitudeRad = (latitudeDeg * Math.PI) / 180;
  
  // 真实物理中赤道处向心力约为万有引力的 0.346%
  // 引入 omegaScale 放大显示（例如 omegaScale=80 时，比例为 0.00346 * 80 ≈ 27.7%）
  const ratioAtEquator = 0.00346 * omegaScale; 
  const F_c_equator = F_gravitation * ratioAtEquator;
  
  // 向心力大小跟纬度余弦成正比
  const F_centripetal = m * F_c_equator * Math.cos(latitudeRad);
  
  const cosL = Math.cos(latitudeRad);
  const sinL = Math.sin(latitudeRad);
  
  // 万有引力矢量，指向地心 (0,0) (这里以地心指向物体为正方向)
  const Fx_grav = -F_gravitation * cosL;
  const Fy_grav = -F_gravitation * sinL;
  
  // 向心力矢量，垂直指向自转轴（水平向左即 -X 方向）
  const Fx_cent = -F_centripetal;
  const Fy_cent = 0;
  
  // 重力矢量 G = F_grav - F_cent
  const Gx = Fx_grav - Fx_cent;
  const Gy = Fy_grav - Fy_cent;
  
  const G_force = Math.sqrt(Gx * Gx + Gy * Gy);
  
  // 计算重力与万有引力之间的夹角 (偏角)
  const dotProduct = Gx * Fx_grav + Gy * Fy_grav;
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (G_force * F_gravitation)));
  const angleDeviation = (Math.acos(cosTheta) * 180) / Math.PI;
  
  return {
    F_grav: F_gravitation,
    F_centripetal,
    G_force,
    angleDeviation,
    Fx_grav,
    Fy_grav,
    Fx_cent,
    Fy_cent,
    Gx,
    Gy
  };
}

export function calculateFrictionPullModel(
  m: number,
  mu: number,
  F_applied: number,
  g: number
): {
  F_normal: number;
  muStatic: number;
  f_max: number;
  f_slip: number;
  f_actual: number;
  a: number;
  F_net: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const F_normal = weight;
  const muStatic = mu * DEFAULT_STATIC_FRICTION_RATIO;
  const f_max = muStatic * F_normal;
  const f_slip = mu * F_normal;
  const isSliding = F_applied > f_max;
  const f_actual = isSliding ? f_slip : F_applied;
  const a = isSliding ? (F_applied - f_slip) / m : 0;
  const F_net = F_applied - f_actual;

  return { F_normal, muStatic, f_max, f_slip, f_actual, a, F_net, isSliding };
}

export function calculateFrictionInclineModel(
  m: number,
  mu: number,
  angleDeg: number,
  g: number
): {
  F_normal: number;
  F_gravity_parallel: number;
  muStatic: number;
  f_max: number;
  f_slip: number;
  f_actual: number;
  a: number;
  criticalAngle: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const angleRad = (angleDeg * Math.PI) / 180;
  const muStatic = mu * DEFAULT_STATIC_FRICTION_RATIO;
  const criticalAngleRad = Math.atan(muStatic);
  const criticalAngle = (criticalAngleRad * 180) / Math.PI;
  const isSliding = angleDeg > criticalAngle;

  const F_normal = weight * Math.cos(angleRad);
  const F_gravity_parallel = weight * Math.sin(angleRad);
  const f_max = muStatic * F_normal;
  const f_slip = mu * F_normal;
  const f_actual = isSliding ? f_slip : F_gravity_parallel;
  const a = isSliding ? g * Math.sin(angleRad) - mu * g * Math.cos(angleRad) : 0;

  return {
    F_normal,
    F_gravity_parallel,
    muStatic,
    f_max,
    f_slip,
    f_actual,
    a,
    criticalAngle,
    isSliding
  };
}

/**
 * 进阶模式：双重摩擦力斜面模型物理动力学解算器
 *
 * 物理模型：斜面体 M 置于粗糙水平地面上（摩擦系数 μ₂），滑块 m 置于斜面上（摩擦系数 μ₁），
 * 斜面倾角为 θ，系统仅在重力作用下运动。
 *
 * @param params 输入自变量
 * @param params.m 滑块质量 (kg)
 * @param params.M 斜面体质量 (kg)
 * @param params.theta 斜面倾角 (度)
 * @param params.mu_1 滑块与斜面板之间的动摩擦系数
 * @param params.mu_2 斜面板与地面之间的动摩擦系数
 * @param params.g 重力加速度 (m/s²)
 * @returns 运动学与动力学因变量
 */
export function calculateDoubleFrictionIncline(params: {
  m: number
  M: number
  theta: number
  mu_1: number
  mu_2: number
  g: number
}): {
  isBlockSliding: boolean
  isInclineSliding: boolean
  a_M: number
  a_rel: number
  a_1x: number
  a_1y: number
  f1: number
  FN1: number
  f2: number
  FN2: number
  F_drive: number
  f2_max: number
  criticalAngle: number
} {
  const { m, M, theta, mu_1, mu_2, g } = params
  const angleRad = (theta * Math.PI) / 180

  // 1.12倍最大静摩擦系数，与基础模式对齐
  const mu_1_static = 1.12 * mu_1
  const criticalAngleRad = Math.atan(mu_1_static)
  const criticalAngle = (criticalAngleRad * 180) / Math.PI

  // 判断滑块是否相对斜面下滑
  const isBlockSliding = theta > criticalAngle

  if (!isBlockSliding) {
    const FN1 = m * g * Math.cos(angleRad)
    const f1 = m * g * Math.sin(angleRad)
    const F_drive = 0
    const FN2 = (m + M) * g
    const f2 = 0
    const f2_max = 1.12 * mu_2 * FN2

    return {
      isBlockSliding: false,
      isInclineSliding: false,
      a_M: 0,
      a_rel: 0,
      a_1x: 0,
      a_1y: 0,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  }

  // 滑块在斜面上滑动 (f1 = mu_1 * FN1)
  // 先假设斜面体静止 (a_M = 0)
  const FN1_static = m * g * Math.cos(angleRad)
  const f1_static = mu_1 * FN1_static
  const F_drive_static = FN1_static * Math.sin(angleRad) - f1_static * Math.cos(angleRad)
  const FN2_static = M * g + FN1_static * Math.cos(angleRad) + f1_static * Math.sin(angleRad)
  const f2_max = 1.12 * mu_2 * FN2_static

  const isInclineSliding = F_drive_static > f2_max

  if (!isInclineSliding) {
    const FN1 = FN1_static
    const f1 = f1_static
    const F_drive = F_drive_static
    const FN2 = FN2_static
    const f2 = Math.max(0, F_drive) // 静摩擦力
    const a_rel = g * Math.sin(angleRad) - mu_1 * g * Math.cos(angleRad)
    const a_1x = a_rel * Math.cos(angleRad)
    const a_1y = a_rel * Math.sin(angleRad)

    return {
      isBlockSliding: true,
      isInclineSliding: false,
      a_M: 0,
      a_rel: Math.max(0, a_rel),
      a_1x,
      a_1y,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  } else {
    // 斜面发生滑动，联立方程求解 a_M
    const C1 =
      Math.sin(angleRad) -
      mu_1 * Math.cos(angleRad) -
      mu_2 * (Math.cos(angleRad) + mu_1 * Math.sin(angleRad))
    let a_M = (g * (m * C1 * Math.cos(angleRad) - mu_2 * M)) / (M + m * C1 * Math.sin(angleRad))
    if (a_M < 0) a_M = 0 // 防御截断

    const FN1_raw = m * (g * Math.cos(angleRad) - a_M * Math.sin(angleRad))
    const FN1 = Math.max(0, FN1_raw)
    const f1 = mu_1 * FN1
    const F_drive = FN1 * Math.sin(angleRad) - f1 * Math.cos(angleRad)
    const FN2 = M * g + FN1 * Math.cos(angleRad) + f1 * Math.sin(angleRad)
    const f2 = mu_2 * FN2

    const a_rel =
      g * Math.sin(angleRad) +
      a_M * Math.cos(angleRad) -
      mu_1 * (g * Math.cos(angleRad) - a_M * Math.sin(angleRad))
    const a_1x = a_rel * Math.cos(angleRad) - a_M
    const a_1y = a_rel * Math.sin(angleRad)

    return {
      isBlockSliding: true,
      isInclineSliding: true,
      a_M,
      a_rel: Math.max(0, a_rel),
      a_1x,
      a_1y,
      f1,
      FN1,
      f2,
      FN2,
      F_drive,
      f2_max,
      criticalAngle,
    }
  }
}


/**
 * 计算两个共点力的合成（以 F1 方向为 x 轴正方向）
 * @param f1 力 F1 的大小 (N)，必须 ≥ 0
 * @param f2 力 F2 的大小 (N)，必须 ≥ 0
 * @param angleDeg 两力夹角 θ (度)，范围 [0, 180]
 */
export function calculateVectorAddition(
  f1: number,
  f2: number,
  angleDeg: number
): {
  fResultant: number;
  resultAngleDeg: number;
  fx1: number;
  fy1: number;
  fx2: number;
  fy2: number;
  fx: number;
  fy: number;
} {
  const angleRad = (angleDeg * Math.PI) / 180;
  const fx1 = f1;
  const fy1 = 0;
  const fx2 = f2 * Math.cos(angleRad);
  const fy2 = f2 * Math.sin(angleRad);
  const fx = fx1 + fx2;
  const fy = fy1 + fy2;
  const fResultant = Math.sqrt(fx * fx + fy * fy);
  // atan2 返回范围 [-PI, PI]，转换为度 [-180, 180]
  const resultAngleDeg = (Math.atan2(fy, fx) * 180) / Math.PI;

  return {
    fResultant,
    resultAngleDeg,
    fx1,
    fy1,
    fx2,
    fy2,
    fx,
    fy,
  };
}

/**
 * 计算一个力的正交分解
 * @param f 力的大小 (N)，必须 ≥ 0
 * @param angleDeg 与 x 轴正方向的夹角 (度)，范围 [0, 360]
 */
export function calculateOrthogonalDecomposition(
  f: number,
  angleDeg: number
): {
  fx: number;
  fy: number;
} {
  const angleRad = (angleDeg * Math.PI) / 180;
  const fx = f * Math.cos(angleRad);
  const fy = f * Math.sin(angleRad);
  return { fx, fy };
}

/**
 * 计算双绳悬挂重物的共点力平衡绳子张力大小
 * @param m 重物质量 (kg)
 * @param theta1Deg 左绳与水平天花板夹角 (度)
 * @param theta2Deg 右绳与水平天花板夹角 (度)
 * @param g 重力加速度 (m/s²)
 */
export function calculateEquilibriumTension(
  m: number,
  theta1Deg: number,
  theta2Deg: number,
  g: number
): {
  t1: number;
  t2: number;
  gravity: number;
} {
  const theta1Rad = (theta1Deg * Math.PI) / 180;
  const theta2Rad = (theta2Deg * Math.PI) / 180;
  const gravity = m * g;
  
  const sinSum = Math.sin(theta1Rad + theta2Rad);
  
  // 防止分母趋近于 0 导致溢出
  if (Math.abs(sinSum) < 0.05) {
    return { t1: 999, t2: 999, gravity };
  }

  // T1 = G * cos(theta2) / sin(theta1 + theta2)
  const t1 = (gravity * Math.cos(theta2Rad)) / sinSum;
  // T2 = G * cos(theta1) / sin(theta1 + theta2)
  const t2 = (gravity * Math.cos(theta1Rad)) / sinSum;

  return { t1, t2, gravity };
}

// ─── 共点力平衡仿真：Euler-Cromer 积分纯计算 ───────────────────────────────

/**
 * 共点力平衡仿真的物理状态
 * @property x 水平位置 (px)
 * @property y 垂直位置 (px)
 * @property vx 水平速度 (px/s)
 * @property vy 垂直速度 (px/s)
 * @property brokenLine 断绳状态
 */
export interface EquilibriumSimState {
  x: number
  y: number
  vx: number
  vy: number
  brokenLine: 'none' | 'left' | 'right' | 'both'
}

/**
 * 共点力平衡仿真的外部输入（每帧只读）
 */
export interface EquilibriumSimInput {
  /** 质量 (kg) */
  m: number
  /** 左绳夹角 (度) */
  theta1: number
  /** 右绳夹角 (度) */
  theta2: number
  /** 画布高度 (px) */
  canvasHeight: number
  /** 左挂点 (px) */
  leftAnchor: { cx: number; cy: number }
  /** 右挂点 (px) */
  rightAnchor: { cx: number; cy: number }
  /** 画布中心 X (px) */
  centerX: number
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽鼠标位置 X (px) */
  mouseX: number
  /** 拖拽鼠标位置 Y (px) */
  mouseY: number
}

/**
 * 共点力平衡仿真的单步积分结果
 * @property state 更新后的物理状态
 * @property t1 左绳张力 (N)
 * @property t2 右绳张力 (N)
 */
export interface EquilibriumSimStepResult {
  state: EquilibriumSimState
  t1: number
  t2: number
}
/** 两侧固定点水平像素距离 (px) */
export const EQUIL_L = 360

/** 绳刚度系数 (N/m) */
const EQUIL_KS = 250
/** 鼠标拖拽刚度 (N/m) */
const EQUIL_KMOUSE = 150
/** 阻尼系数 */
const EQUIL_C_DAMPING = 2.5
/** 像素与米的换算：100px = 1m */
const EQUIL_PX_PER_M = 100
/** 断绳安全阈值 (N) */
const EQUIL_BREAK_THRESHOLD = 50
/** 稳定收敛距离阈值 (px) */
const EQUIL_SNAP_DIST = 0.5
/** 稳定收敛速度阈值 (px/s) */
const EQUIL_SNAP_SPEED = 1.0

/**
 * 计算理论静平衡位置（像素坐标）
 * @param theta1 左绳夹角 (度)
 * @param theta2 右绳夹角 (度)
 * @param centerX 画布中心 X (px)
 * @param leftAnchorCy 左挂点 Y (px)
 * @returns 平衡位置 (px)
 */
export function calculateTheoreticalEquilibriumPos(
  theta1: number,
  theta2: number,
  centerX: number,
  leftAnchorCy: number
): { cx: number; cy: number } {
  const t1Rad = (theta1 * Math.PI) / 180
  const t2Rad = (theta2 * Math.PI) / 180
  const tan1 = Math.tan(t1Rad)
  const tan2 = Math.tan(t2Rad)
  const denom = tan1 + tan2

  let px = 0
  let py = -120 // 默认悬挂高度
  if (denom > 0.05) {
    px = (EQUIL_L / 2) * ((tan2 - tan1) / denom)
    py = -(EQUIL_L * (tan1 * tan2)) / denom
  }
  return {
    cx: centerX + px,
    cy: leftAnchorCy - py,
  }
}

/**
 * 共点力平衡仿真单步 Euler-Cromer 积分（纯计算，无副作用）
 *
 * 物理模型：双绳悬挂重物，绳子视为弹簧（刚度 Ks），含阻尼和鼠标拖拽力。
 * 100px = 1m 比例换算。
 *
 * @param state 当前物理状态
 * @param input 外部输入参数
 * @param dt 时间步长 (s)
 * @returns 更新后的状态与力的大小
 */
export function simulateEquilibriumStep(
  state: EquilibriumSimState,
  input: EquilibriumSimInput,
  dt: number
): EquilibriumSimStepResult {
  const { m, theta1, theta2, canvasHeight, leftAnchor, rightAnchor, centerX, isDragging, mouseX, mouseY } = input

  // 计算理论挂绳原长
  const eqPos = calculateTheoreticalEquilibriumPos(theta1, theta2, centerX, leftAnchor.cy)
  const L10 = Math.sqrt((eqPos.cx - leftAnchor.cx) ** 2 + (eqPos.cy - leftAnchor.cy) ** 2)
  const L20 = Math.sqrt((eqPos.cx - rightAnchor.cx) ** 2 + (eqPos.cy - rightAnchor.cy) ** 2)

  // 绳子当前拉伸长度
  const d1 = Math.sqrt((state.x - leftAnchor.cx) ** 2 + (state.y - leftAnchor.cy) ** 2) || 1
  const d2 = Math.sqrt((state.x - rightAnchor.cx) ** 2 + (state.y - rightAnchor.cy) ** 2) || 1

  // 物理受力计算
  let t1 = 0
  let t2 = 0

  if (state.brokenLine !== 'left' && state.brokenLine !== 'both') {
    if (d1 > L10) {
      t1 = EQUIL_KS * (d1 - L10) / EQUIL_PX_PER_M
    }
  }
  if (state.brokenLine !== 'right' && state.brokenLine !== 'both') {
    if (d2 > L20) {
      t2 = EQUIL_KS * (d2 - L20) / EQUIL_PX_PER_M
    }
  }

  // 重力及鼠标拖拽拉力
  const gravityVal = m * GRAVITY
  let fMouseX = 0
  let fMouseY = 0

  if (isDragging) {
    fMouseX = EQUIL_KMOUSE * (mouseX - state.x) / EQUIL_PX_PER_M
    fMouseY = EQUIL_KMOUSE * (mouseY - state.y) / EQUIL_PX_PER_M
  }

  // 加速度解算
  const u1x = (leftAnchor.cx - state.x) / d1
  const u1y = (leftAnchor.cy - state.y) / d1
  const u2x = (rightAnchor.cx - state.x) / d2
  const u2y = (rightAnchor.cy - state.y) / d2

  const ax = ((t1 * u1x + t2 * u2x + fMouseX) / m) * EQUIL_PX_PER_M - EQUIL_C_DAMPING * state.vx
  const ay = ((t1 * u1y + t2 * u2y + fMouseY + gravityVal) / m) * EQUIL_PX_PER_M - EQUIL_C_DAMPING * state.vy

  // 积分更新速度与位置
  let vx = state.vx + ax * dt
  let vy = state.vy + ay * dt
  let nextX = state.x + vx * dt
  let nextY = state.y + vy * dt

  // 过载拉力断绳判定
  let nextBroken = state.brokenLine
  if (t1 > EQUIL_BREAK_THRESHOLD && nextBroken !== 'left' && nextBroken !== 'both') {
    nextBroken = nextBroken === 'right' ? 'both' : 'left'
  }
  if (t2 > EQUIL_BREAK_THRESHOLD && nextBroken !== 'right' && nextBroken !== 'both') {
    nextBroken = nextBroken === 'left' ? 'both' : 'right'
  }

  // 边界触底
  const bottomLimit = canvasHeight - 24
  if (nextY > bottomLimit) {
    nextY = bottomLimit
    vx = 0
    vy = 0
  }

  // 稳定 Snap 状态收敛
  if (nextBroken === 'none' && !isDragging) {
    const distToEq = Math.sqrt((nextX - eqPos.cx) ** 2 + (nextY - eqPos.cy) ** 2)
    const speed = Math.sqrt(vx * vx + vy * vy)
    if (distToEq < EQUIL_SNAP_DIST && speed < EQUIL_SNAP_SPEED) {
      nextX = eqPos.cx
      nextY = eqPos.cy
      vx = 0
      vy = 0
    }
  } else if (nextBroken === 'left' && !isDragging) {
    const rightEqX = rightAnchor.cx
    const rightEqY = rightAnchor.cy + L20
    const dist = Math.sqrt((nextX - rightEqX) ** 2 + (nextY - rightEqY) ** 2)
    const speed = Math.sqrt(vx * vx + vy * vy)
    if (dist < EQUIL_SNAP_DIST && speed < EQUIL_SNAP_SPEED) {
      nextX = rightEqX
      nextY = rightEqY
      vx = 0
      vy = 0
    }
  } else if (nextBroken === 'right' && !isDragging) {
    const leftEqX = leftAnchor.cx
    const leftEqY = leftAnchor.cy + L10
    const dist = Math.sqrt((nextX - leftEqX) ** 2 + (nextY - leftEqY) ** 2)
    const speed = Math.sqrt(vx * vx + vy * vy)
    if (dist < EQUIL_SNAP_DIST && speed < EQUIL_SNAP_SPEED) {
      nextX = leftEqX
      nextY = leftEqY
      vx = 0
      vy = 0
    }
  }

  return {
    state: { x: nextX, y: nextY, vx, vy, brokenLine: nextBroken },
    t1,
    t2,
  }
}

/**
 * 计算牛顿第二定律变力模型状态
 * 
 * 模式 0: 线性递增力 F(t) = k * t，含摩擦力。
 * 模式 1: 正弦力 F(t) = F0 * sin(omega * t)，无摩擦力。
 *
 * @param modelType 变力模型类型 (0=线性, 1=正弦)
 * @param params 输入参数 (m: 质量, mu: 动摩擦因数, k?: 斜率, F0?: 正弦幅值, omega?: 角速度, g?: 重力加速度)
 * @param t 当前时间 (s)
 * @returns 包含当前施加力、摩擦力、合力、加速度、速度和位移的对象
 */
export function calculateNewtonSecondVariableMotion(
  modelType: 0 | 1,
  params: {
    m: number;
    mu: number;
    k?: number;
    F0?: number;
    omega?: number;
    g?: number;
  },
  t: number
): {
  F_applied: number;
  f: number;
  F_net: number;
  a: number;
  v: number;
  s: number;
} {
  const m = params.m;
  const mu = params.mu;
  const g = params.g ?? 9.8;
  const N = m * g;

  if (modelType === 0) {
    // 线性变力 F = k * t
    const k = params.k ?? 2;
    const F_applied = k * t;
    const f_max = mu * N;

    if (F_applied <= f_max) {
      return { F_applied, f: F_applied, F_net: 0, a: 0, v: 0, s: 0 };
    } else {
      const t_start = f_max / k;
      const tau = t - t_start;
      const a = (F_applied - f_max) / m;
      const v = (k * tau * tau) / (2 * m);
      const s = (k * tau * tau * tau) / (6 * m);
      return { F_applied, f: f_max, F_net: F_applied - f_max, a, v, s };
    }
  } else {
    // 正弦变力 F = F0 * sin(omega * t)，在光滑平面上 (mu = 0)
    const F0 = params.F0 ?? 15;
    const omega = params.omega ?? 1.5;
    const F_applied = F0 * Math.sin(omega * t);

    // a = F / m = F0 / m * sin(omega * t)
    const a = F_applied / m;
    // v = F0 / (m * omega) * (1 - cos(omega * t))
    const v = (F0 / (m * omega)) * (1 - Math.cos(omega * t));
    // s = F0 / (m * omega) * t - F0 / (m * omega * omega) * sin(omega * t)
    const s = (F0 / (m * omega)) * t - (F0 / (m * omega * omega)) * Math.sin(omega * t);

    return { F_applied, f: 0, F_net: F_applied, a, v, s };
  }
}

/**
 * 计算超重与失重电梯变运动模型下的物理状态
 * 
 * 模式 0: 变速升降电梯 (启动加速 -> 匀速 -> 制动减速 -> 停靠)
 * 模式 1: 钢索断裂自由落体 (静止 -> 自由落体 -> 底部阻尼刹车 -> 停靠)
 * 模式 2: 恒定加速度电梯 (匀变速直线运动)
 * 
 * @param modelIdx 运动模型类型 (0=变速升降, 1=自由落体, 2=恒定加速度)
 * @param m 物体质量 (kg)
 * @param g 重力加速度 (m/s²)
 * @param t 当前时间 (s)
 * @param a_ext 外部加速度 (m/s²)，仅模式 2 使用，向上为正
 * @returns 包含加速度、速度、位移、支持力、重力和当前状态名称的对象
 */
export function calculateElevatorMotion(
  modelIdx: 0 | 1 | 2,
  m: number,
  g: number,
  t: number,
  a_ext?: number
): {
  a: number;         // 电梯加速度 (m/s²，向上为正)
  v: number;         // 电梯速度 (m/s，向上为正)
  y: number;         // 电梯位移 (m，向上为正)
  N: number;         // 体重计支持力 (N)
  weight: number;    // 重力 (N)
  state: 'overweight' | 'underweight' | 'weightless' | 'normal'; // 超失重状态
} {
  const weight = m * g;
  let a = 0;
  let v = 0;
  let y = 0;
  let N = weight;
  let state: 'overweight' | 'underweight' | 'weightless' | 'normal' = 'normal';

  if (modelIdx === 0) {
    // 变速升降电梯 (0~10s)
    if (t < 2.0) {
      a = 2.0;
      v = a * t;
      y = 0.5 * a * t * t;
    } else if (t < 5.0) {
      const v1 = 4.0;
      const y1 = 4.0;
      a = 0;
      v = v1;
      y = y1 + v1 * (t - 2.0);
    } else if (t < 7.0) {
      const v1 = 4.0;
      const y2 = 16.0;
      a = -2.0;
      v = v1 + a * (t - 5.0);
      y = y2 + v1 * (t - 5.0) + 0.5 * a * (t - 5.0) * (t - 5.0);
    } else {
      a = 0;
      v = 0;
      y = 20.0;
    }
  } else if (modelIdx === 1) {
    // 钢索断裂自由落体 (0~6s)
    if (t < 1.5) {
      a = 0;
      v = 0;
      y = 0;
    } else if (t < 4.0) {
      // 自由落体，电梯加速度为 -g，支持力为 0
      a = -g;
      v = -g * (t - 1.5);
      y = -0.5 * g * (t - 1.5) * (t - 1.5);
    } else if (t < 5.0) {
      // 刹车，电梯向上加速度为 2.5g
      const v_fall = -g * 2.5;
      const y_fall = -0.5 * g * 2.5 * 2.5;
      a = 2.5 * g;
      v = v_fall + a * (t - 4.0);
      y = y_fall + v_fall * (t - 4.0) + 0.5 * a * (t - 4.0) * (t - 4.0);
    } else {
      // 停在最底部
      const y_bottom = -0.5 * g * 2.5 * 2.5 - 1.25 * g;
      a = 0;
      v = 0;
      y = y_bottom;
    }
  } else {
    // 模式 2: 恒定加速度电梯
    a = a_ext ?? 0;
    v = a * t;
    y = 0.5 * a * t * t;
  }

  // 计算支持力 N = m(g + a)
  N = m * (g + a);
  if (N < 0) N = 0;

  // 状态判定
  if (Math.abs(a) < 0.01) {
    state = 'normal';
  } else if (Math.abs(a + g) < 0.1) {
    state = 'weightless';
  } else if (a > 0) {
    state = 'overweight';
  } else {
    state = 'underweight';
  }

  return { a, v, y, N, weight, state };
}

/**
 * 竖直圆轨道动力学模拟轨迹点接口
 */
export interface VerticalCircularMotionPoint {
  /** 当前时间 (s) */
  time: number
  /** 水平物理坐标 (m) */
  x: number
  /** 竖直物理坐标 (m) */
  y: number
  /** 水平物理速度 (m/s) */
  vx: number
  /** 竖直物理速度 (m/s) */
  vy: number
  /** 相对最低点的弧度角 (rad)，最低点为 0，逆时针为正 */
  theta: number
  /** 角速度 (rad/s) */
  omega: number
  /** 轨道支持力或拉力 (N)，正值代表向心拉/压，负值代表离心支/推 */
  N: number
  /** 运行状态：'on-track' 轨道滑动，'flying' 脱轨飞行 */
  state: 'on-track' | 'flying'
  /** 运动类型判定：'swing' 摆动，'fall' 脱轨掉落，'loop' 完整圆周 */
  caseType: 'swing' | 'fall' | 'loop'
}

/**
 * 计算竖直圆轨道动力学仿真数据（纯函数，无副作用，完全可序列化）
 *
 * @param r 轨道半径 (m)，范围 [3, 5]
 * @param v0 最低点初速度 (m/s)
 * @param m 小球质量 (kg)
 * @param trackType 轨道模型 (0: 单面轨/绳模型, 1: 双面轨/杆模型)
 * @param maxTime 仿真最大时间上限 (s)，默认 30
 * @param dt 数值积分步长 (s)，默认 0.002
 * @returns 包含轨迹点数组、摆动临界速 (m/s) 与通关临界速 (m/s) 的对象
 */
export function precomputeVerticalCircularMotion(
  r: number,
  v0: number,
  m: number,
  trackType: number,
  maxTime = 30,
  dt = 0.002
): { trajectory: VerticalCircularMotionPoint[]; vSwingLimit: number; vLoopLimit: number } {
  const g = GRAVITY
  const steps = Math.ceil(maxTime / dt)
  const trajectory: VerticalCircularMotionPoint[] = []

  const vSwingLimit = Math.sqrt(2 * g * r)
  const vLoopLimit = trackType === 1 ? Math.sqrt(4 * g * r) : Math.sqrt(5 * g * r)

  let category: 'swing' | 'fall' | 'loop' = 'fall'
  if (v0 <= vSwingLimit) {
    category = 'swing'
  } else if (v0 >= vLoopLimit) {
    category = 'loop'
  } else if (trackType === 1) {
    category = 'swing'
  }

  let state: 'on-track' | 'flying' = 'on-track'
  let theta = 0
  let omega = v0 / r

  let flyTime = 0
  let xFly = 0
  let yFly = 0
  let vxFly = 0
  let vyFly = 0

  let x = 0
  let y = -r
  let vx = v0
  let vy = 0
  let N = m * g + (m * v0 * v0) / r

  for (let i = 0; i <= steps; i++) {
    const currentTime = i * dt

    if (state === 'on-track') {
      const alpha = -(g / r) * Math.sin(theta)
      omega += alpha * dt
      theta += omega * dt

      x = r * Math.sin(theta)
      y = -r * Math.cos(theta)

      vx = r * omega * Math.cos(theta)
      vy = r * omega * Math.sin(theta)

      N = m * g * Math.cos(theta) + m * r * omega * omega

      // 仅在单面轨道下，且属于脱轨类型时，在支持力减为 0 处脱轨
      if (trackType === 0 && category === 'fall' && N <= 0) {
        state = 'flying'
        flyTime = currentTime
        xFly = x
        yFly = y
        vxFly = vx
        vyFly = vy
        N = 0
      }
    } else {
      const tFly = currentTime - flyTime
      x = xFly + vxFly * tFly
      y = yFly + vyFly * tFly - 0.5 * g * tFly * tFly
      vx = vxFly
      vy = vyFly - g * tFly
      N = 0

      // 再次撞击圆轨道壁的回收碰撞检测
      if (tFly > 0.05 && x * x + y * y >= r * r) {
        const dist = Math.sqrt(x * x + y * y)
        x = (x / dist) * r
        y = (y / dist) * r
        theta = Math.atan2(x, -y)

        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const vt = vx * cosT + vy * sinT

        state = 'on-track'
        omega = vt / r
        vx = r * omega * cosT
        vy = r * omega * sinT
        N = m * g * cosT + m * r * omega * omega
      }
    }

    trajectory.push({
      time: currentTime,
      x,
      y,
      vx,
      vy,
      theta,
      omega,
      N,
      state,
      caseType: category,
    })
  }

  return { trajectory, vSwingLimit, vLoopLimit }
}