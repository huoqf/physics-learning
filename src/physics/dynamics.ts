export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateElasticForce(k: number, x: number): { F: number } {
  return { F: -k * x };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * q1 * q2 / (r * r) };
}

/**
 * 计算万有引力
 * F = G·m1·m2 / r²
 *
 * @param G 万有引力常量 (N·m²/kg²)，通常取 6.674e-11
 * @param m1 物体1质量 (kg)，必须 > 0
 * @param m2 物体2质量 (kg)，必须 > 0
 * @param r 两物体间距 (m)，必须 > 0
 * @returns F 万有引力大小 (N)
 *
 * @category M4
 */
export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number } {
  return { F: G * m1 * m2 / (r * r) };
}

export function calculateInclinedPlane(m: number, angleDeg: number, mu: number, g: number): { N: number; f: number; a: number; F_parallel: number; F_vertical: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const F_parallel = m * g * Math.sin(angleRad);
  const F_vertical = m * g * Math.cos(angleRad);
  const N = F_vertical;
  const f = mu * N;
  const a = (F_parallel - f) / m;
  return { N, f, a, F_parallel, F_vertical };
}

export function calculateConnectedBody(m1: number, m2: number, F: number, mu: number, g: number): { a: number; T: number } {
  const totalMass = m1 + m2;
  const f = mu * m2 * g;
  const a = (F - f) / totalMass;
  const T = m2 * (a + mu * g);
  return { a, T };
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
  f_max: number;
  f_slip: number;
  f_actual: number;
  a: number;
  F_net: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const F_normal = weight;
  const mu_static = mu * 1.12; // 最大静摩擦系数
  const f_max = mu_static * F_normal;
  const f_slip = mu * F_normal;
  const isSliding = F_applied > f_max;
  const f_actual = isSliding ? f_slip : F_applied;
  const a = isSliding ? (F_applied - f_slip) / m : 0;
  const F_net = F_applied - f_actual;

  return { F_normal, f_max, f_slip, f_actual, a, F_net, isSliding };
}

export function calculateFrictionInclineModel(
  m: number,
  mu: number,
  angleDeg: number,
  g: number
): {
  F_normal: number;
  F_gravity_parallel: number;
  f_max: number;
  f_actual: number;
  a: number;
  criticalAngle: number;
  isSliding: boolean;
} {
  const weight = m * g;
  const angleRad = (angleDeg * Math.PI) / 180;
  const mu_static = mu * 1.12; // 最大静摩擦系数
  const criticalAngleRad = Math.atan(mu_static);
  const criticalAngle = (criticalAngleRad * 180) / Math.PI;
  const isSliding = angleDeg > criticalAngle;

  const F_normal = weight * Math.cos(angleRad);
  const F_gravity_parallel = weight * Math.sin(angleRad);
  const f_max = mu_static * F_normal;
  const f_actual = isSliding ? mu * F_normal : F_gravity_parallel;
  const a = isSliding ? g * Math.sin(angleRad) - mu * g * Math.cos(angleRad) : 0;

  return {
    F_normal,
    F_gravity_parallel,
    f_max,
    f_actual,
    a,
    criticalAngle,
    isSliding
  };
}

/**
 * 计算两个共点力的合成（以 F1 方向为 x 轴正方向）
 * @param f1 力 F1 的大小 (N)
 * @param f2 力 F2 的大小 (N)
 * @param angleDeg 两力夹角 θ (度)
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
 * @param f 力的大小 (N)
 * @param angleDeg 与 x 轴正方向的夹角 (度)
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
const EQUIL_L = 360

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
  const g = 9.8
  const gravityVal = m * g
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