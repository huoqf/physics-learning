import { GRAVITY } from '../constants'

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
