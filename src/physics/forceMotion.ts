import { GRAVITY } from './constants'
import { rk4Step } from '@/math/numerical'

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export type ForceMotionMode =
  | 'balance'
  | 'uniform-accel-line'
  | 'uniform-decel-line'
  | 'constant-angle-curve'
  | 'projectile-like'
  | 'uniform-circular'
  | 'variable-circular'
  | 'simple-harmonic'
  | 'linear-variable-force'
  | 'terminal-variable-force'

export interface ForceMotionState {
  mode: ForceMotionMode
  t: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  ax: number
  ay: number
  a: number
  Fx: number
  Fy: number
  F: number
  p: number
  work: number
  impulse: number
  chartValueF: number
  chartValueV: number
  chartValueX: number
  slopeTextF: string
  slopeTextV: string
  slopeTextX: string
  areaTextF: string
  areaTextV: string
  areaTextX: string
  terminalVelocity?: number
  isTerminal: boolean
  pauseReason?: 'boundary' | 'terminal' | 'brake' | 'none'
}

export interface ForceMotionSample {
  t: number
  F: number
  v: number
  x: number
  y: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// 模式索引
// ═══════════════════════════════════════════════════════════════════════════════

const MODES: ForceMotionMode[] = [
  'balance',
  'uniform-accel-line',
  'uniform-decel-line',
  'constant-angle-curve',
  'projectile-like',
  'uniform-circular',
  'variable-circular',
  'simple-harmonic',
  'linear-variable-force',
  'terminal-variable-force',
]

export function getForceMotionMode(modeIndex: number | undefined): ForceMotionMode {
  return MODES[Math.round(modeIndex ?? 0)] ?? 'balance'
}

export function getForceMotionModeIndex(mode: ForceMotionMode): number {
  return MODES.indexOf(mode)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

function clampPositive(value: number, fallback: number, min = 1e-6): number {
  if (!Number.isFinite(value) || value <= min) return fallback
  return value
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function vecHypot(vx: number, vy: number): number {
  return Math.hypot(vx, vy)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式物理计算
// ═══════════════════════════════════════════════════════════════════════════════

interface ModeResult {
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  Fx: number
  Fy: number
  work: number
  impulse: number
  terminalVelocity?: number
  isTerminal: boolean
  pauseReason?: ForceMotionState['pauseReason']
}

/** 模式0: 平衡状态 — F合=0，a=0，v恒定 */
function calcBalance(t: number, v0: number, theta: number): ModeResult {
  const rad = degToRad(theta)
  const vx = v0 * Math.cos(rad)
  const vy = v0 * Math.sin(rad)
  return {
    x: vx * t,
    y: vy * t,
    vx,
    vy,
    ax: 0,
    ay: 0,
    Fx: 0,
    Fy: 0,
    work: 0,
    impulse: 0,
    isTerminal: true,
  }
}

/** 模式1: 匀加速直线 — F合恒定，a恒定，v0与F同向或反向 */
function calcUniformAccelLine(
  t: number,
  v0: number,
  theta: number,
  m: number,
  Fmag: number
): ModeResult {
  const rad = degToRad(theta)
  const Fx = Fmag * Math.cos(rad)
  const Fy = Fmag * Math.sin(rad)
  const ax = Fx / m
  const ay = Fy / m
  const vx = v0 * Math.cos(rad) + ax * t
  const vy = v0 * Math.sin(rad) + ay * t
  return {
    x: v0 * Math.cos(rad) * t + 0.5 * ax * t * t,
    y: v0 * Math.sin(rad) * t + 0.5 * ay * t * t,
    vx,
    vy,
    ax,
    ay,
    Fx,
    Fy,
    work: Fx * (v0 * Math.cos(rad) * t + 0.5 * ax * t * t) + Fy * (v0 * Math.sin(rad) * t + 0.5 * ay * t * t),
    impulse: vecHypot(Fx, Fy) * t,
    isTerminal: false,
  }
}

/** 模式2: 匀减速直线 — F合恒定与v反向，直到v=0后停止（刹车陷阱） */
function calcUniformDecelLine(
  t: number,
  v0: number,
  theta: number,
  m: number,
  Fmag: number
): ModeResult {
  const rad = degToRad(theta)
  // 力方向与初速度方向相反（theta=180°表示完全反向）
  const Fx = -Fmag * Math.cos(rad)
  const Fy = -Fmag * Math.sin(rad)
  const ax = Fx / m
  const ay = Fy / m
  const v0x = v0 * Math.cos(rad)
  const v0y = v0 * Math.sin(rad)

  // 刹车陷阱：检测速度方向是否反转（点积判据），v=0后不再运动
  const vxRaw = v0x + ax * t
  const vyRaw = v0y + ay * t

  // 当速度矢量与初速度方向反向（点积≤0）时，物体已停止
  if (vxRaw * v0x + vyRaw * v0y <= 0) {
    const tStop = v0 / (Fmag / m)
    return {
      x: v0x * tStop + 0.5 * ax * tStop * tStop,
      y: v0y * tStop + 0.5 * ay * tStop * tStop,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      Fx: 0,
      Fy: 0,
      work: -0.5 * m * v0 * v0,
      impulse: -m * v0,
      isTerminal: true,
      pauseReason: 'brake',
    }
  }

  return {
    x: v0x * t + 0.5 * ax * t * t,
    y: v0y * t + 0.5 * ay * t * t,
    vx: vxRaw,
    vy: vyRaw,
    ax,
    ay,
    Fx,
    Fy,
    work: Fx * (v0x * t + 0.5 * ax * t * t) + Fy * (v0y * t + 0.5 * ay * t * t),
    impulse: vecHypot(Fx, Fy) * t,
    isTerminal: false,
  }
}

/** 模式3: 匀变速曲线（定角）— F合恒定，与v0成固定夹角，如斜抛 */
function calcConstantAngleCurve(
  t: number,
  v0: number,
  theta: number,
  m: number,
  g: number
): ModeResult {
  const rad = degToRad(theta)
  const vx = v0 * Math.cos(rad)
  const vy = v0 * Math.sin(rad) - g * t
  const x = vx * t
  const y = v0 * Math.sin(rad) * t - 0.5 * g * t * t
  const Fx = 0
  const Fy = -m * g
  return {
    x,
    y,
    vx,
    vy,
    ax: 0,
    ay: -g,
    Fx,
    Fy,
    work: m * g * (0 - y),
    impulse: m * g * t,
    isTerminal: false,
  }
}

/** 模式4: 类平抛运动 — 初速垂直于恒力方向 */
function calcProjectileLike(
  t: number,
  v0: number,
  theta: number,
  m: number,
  Fmag: number
): ModeResult {
  const rad = degToRad(theta)
  const Fx = Fmag * Math.cos(rad)
  const Fy = Fmag * Math.sin(rad)
  const ax = Fx / m
  const ay = Fy / m
  // 初速度方向垂直于力的方向（theta=90°时v0沿x轴）
  const vx = v0 + ax * t
  const vy = ay * t
  return {
    x: v0 * t + 0.5 * ax * t * t,
    y: 0.5 * ay * t * t,
    vx,
    vy,
    ax,
    ay,
    Fx,
    Fy,
    work: Fx * (v0 * t + 0.5 * ax * t * t) + Fy * (0.5 * ay * t * t),
    impulse: vecHypot(Fx, Fy) * t,
    isTerminal: false,
  }
}

/** 模式5: 匀速圆周运动 — 向心力大小恒定，始终垂直于v */
function calcUniformCircular(
  t: number,
  v0: number,
  m: number,
  R: number
): ModeResult {
  const omega = v0 / R
  const theta = omega * t
  const x = R * Math.cos(theta)
  const y = R * Math.sin(theta)
  const vx = -v0 * Math.sin(theta)
  const vy = v0 * Math.cos(theta)
  const ax = -v0 * omega * Math.cos(theta)
  const ay = -v0 * omega * Math.sin(theta)
  const F = m * v0 * v0 / R
  const Fx = F * Math.cos(theta + Math.PI)
  const Fy = F * Math.sin(theta + Math.PI)
  return {
    x,
    y,
    vx,
    vy,
    ax,
    ay,
    Fx,
    Fy,
    work: 0,
    impulse: vecHypot(m * vx - 0, m * (vy - v0)),
    isTerminal: false,
  }
}

/** 模式6: 变速圆周运动 — 竖直面内，重力+约束力 */
function calcVariableCircular(
  t: number,
  v0: number,
  m: number,
  R: number,
  model: 'rope' | 'rod'
): ModeResult {
  const g = GRAVITY
  // 使用能量守恒求速度
  // 设最低点为参考点，theta从最低点开始（逆时针）
  const theta0 = 0
  const omega0 = v0 / R

  // 数值积分：角运动方程
  // d²θ/dt² = -(g/R)sin(θ)
  const dt = 0.001
  let theta = theta0
  let omega = omega0
  const steps = Math.floor(t / dt)
  for (let i = 0; i < steps; i++) {
    const domega = -(g / R) * Math.sin(theta) * dt
    omega += domega
    theta += omega * dt
  }
  // 剩余时间
  const rem = t - steps * dt
  omega += -(g / R) * Math.sin(theta) * rem
  theta += omega * rem

  const v = omega * R
  const x = R * Math.sin(theta)
  const y = -R * Math.cos(theta)
  const vx = v * Math.cos(theta)
  const vy = v * Math.sin(theta)

  // 向心加速度
  const aCentripetal = v * v / R
  // 切向加速度
  const aTangential = -g * Math.sin(theta)

  const ax = -aCentripetal * Math.sin(theta) + aTangential * Math.cos(theta)
  const ay = aCentripetal * Math.cos(theta) + aTangential * Math.sin(theta)

  // 合力 = m * a（包含切向与法向分量）
  const Fx = m * ax
  const Fy = m * ay

  // 绳模型临界：最高点v >= sqrt(gR)
  if (model === 'rope' && Math.cos(theta) < -0.99 && v < Math.sqrt(g * R)) {
    return {
      x, y, vx: 0, vy: 0, ax: 0, ay: 0,
      Fx: 0, Fy: 0,
      work: m * g * (R - y),
      impulse: 0,
      isTerminal: true,
      pauseReason: 'terminal',
    }
  }

  return {
    x, y, vx, vy, ax, ay, Fx, Fy,
    work: 0.5 * m * v * v - 0.5 * m * v0 * v0,
    impulse: 0,
    isTerminal: false,
  }
}

/** 模式7: 简谐运动 — F = -kx */
function calcSimpleHarmonic(
  t: number,
  v0: number,
  m: number,
  k: number
): ModeResult {
  const omega = Math.sqrt(k / m)
  const A = v0 / omega
  const x = A * Math.sin(omega * t)
  const vx = v0 * Math.cos(omega * t)
  const ax = -omega * omega * x
  const Fx = -k * x
  return {
    x,
    y: 0,
    vx,
    vy: 0,
    ax,
    ay: 0,
    Fx,
    Fy: 0,
    work: 0.5 * k * (0 - x * x),
    impulse: m * vx - m * v0,
    isTerminal: false,
  }
}

/** 模式8: 线性变力运动 — F = κt */
function calcLinearVariableForce(
  t: number,
  v0: number,
  theta: number,
  m: number,
  kappa: number
): ModeResult {
  const rad = degToRad(theta)
  const Fx = kappa * t * Math.cos(rad)
  const Fy = kappa * t * Math.sin(rad)
  const ax = Fx / m
  const ay = Fy / m
  const vx = v0 * Math.cos(rad) + (kappa / (2 * m)) * t * t * Math.cos(rad)
  const vy = v0 * Math.sin(rad) + (kappa / (2 * m)) * t * t * Math.sin(rad)
  return {
    x: v0 * Math.cos(rad) * t + (kappa / (6 * m)) * t * t * t * Math.cos(rad),
    y: v0 * Math.sin(rad) * t + (kappa / (6 * m)) * t * t * t * Math.sin(rad),
    vx,
    vy,
    ax,
    ay,
    Fx,
    Fy,
    work: 0.5 * m * (vx * vx + vy * vy) - 0.5 * m * v0 * v0,
    impulse: 0.5 * kappa * t * t,
    isTerminal: false,
  }
}

/** 模式9: 收尾变力运动 — 恒定功率启动(F=P/v - f) 或 电磁感应单杆(F_dirve - kf*v) */
function calcTerminalVariableForce(
  t: number,
  v0: number,
  m: number,
  firstParam: number,
  secondParam: number,
  mode: 'power' | 'drag'
): ModeResult {
  const dt = 0.005
  const steps = Math.floor(t / dt)

  // 状态: [y, vy]
  let y = 0
  let vy = v0

  if (mode === 'power') {
    // 汽车恒定功率启动：F_net = P/v - f（f为恒定摩擦力）
    for (let i = 0; i < steps; i++) {
      const deriv = (_tStep: number, state: number[]) => {
        const v = Math.max(Math.abs(state[1]), 0.01)
        const F = firstParam / v - secondParam
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, i * dt, state, dt)
      y = next[0]
      vy = next[1]
    }
    const rem = t - steps * dt
    if (rem > 0) {
      const deriv = (_tStep: number, state: number[]) => {
        const v = Math.max(Math.abs(state[1]), 0.01)
        const F = firstParam / v - secondParam
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, steps * dt, state, rem)
      y = next[0]
      vy = next[1]
    }
  } else {
    // 电磁感应单杆：F_net = F_drive - kf*v（kf为阻力系数）
    for (let i = 0; i < steps; i++) {
      const deriv = (_tStep: number, state: number[]) => {
        const F = firstParam - secondParam * state[1]
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, i * dt, state, dt)
      y = next[0]
      vy = next[1]
    }
    const rem = t - steps * dt
    if (rem > 0) {
      const deriv = (_tStep: number, state: number[]) => {
        const F = firstParam - secondParam * state[1]
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, steps * dt, state, rem)
      y = next[0]
      vy = next[1]
    }
  }

  const v = Math.abs(vy)
  const terminalVelocity = (mode === 'power')
    ? firstParam / secondParam       // v_m = P/f
    : firstParam / secondParam       // v_m = F_drive/kf

  // 收尾检测
  const isTerminal = Math.abs(v - terminalVelocity) < 0.05

  const ay = (mode === 'power')
    ? (firstParam / Math.max(v, 0.01) - secondParam * (vy >= 0 ? 1 : -1)) / m
    : (firstParam - secondParam * vy) / m

  const Fy = m * ay

  return {
    x: 0,
    y,
    vx: 0,
    vy,
    ax: 0,
    ay,
    Fx: 0,
    Fy,
    work: 0.5 * m * vy * vy - 0.5 * m * v0 * v0,
    impulse: m * (vy - v0),
    terminalVelocity,
    isTerminal,
    pauseReason: isTerminal ? 'terminal' : undefined,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统一状态计算入口
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 计算"力与运动专题"的统一物理状态。
 *
 * 支持10大运动模式：
 * 0-balance, 1-uniform-accel-line, 2-uniform-decel-line,
 * 3-constant-angle-curve, 4-projectile-like, 5-uniform-circular,
 * 6-variable-circular, 7-simple-harmonic, 8-linear-variable-force,
 * 9-terminal-variable-force
 *
 * 输入参数来自动画 params：mode, v0, theta, m, env1, env2。
 * 函数无副作用，自动保护质量、半径等正值边界。
 */
export function calculateForceMotionState(
  params: Record<string, number>,
  time: number,
): ForceMotionState {
  const mode = getForceMotionMode(params.mode)
  const t = Math.max(0, Number.isFinite(time) ? time : 0)
  const m = clampPositive(params.m ?? 2, 2)
  const v0 = Number.isFinite(params.v0) ? params.v0 ?? 0 : 0
  const theta = Number.isFinite(params.theta) ? params.theta ?? 0 : 0

  let result: ModeResult

  switch (mode) {
    case 'balance':
      result = calcBalance(t, v0, theta)
      break
    case 'uniform-accel-line': {
      const F = clampPositive(params.env1 ?? 10, 10)
      result = calcUniformAccelLine(t, v0, theta, m, F)
      break
    }
    case 'uniform-decel-line': {
      const F = clampPositive(params.env1 ?? 10, 10)
      result = calcUniformDecelLine(t, v0, theta, m, F)
      break
    }
    case 'constant-angle-curve': {
      const g = clampPositive(params.env1 ?? GRAVITY, GRAVITY)
      result = calcConstantAngleCurve(t, v0, theta, m, g)
      break
    }
    case 'projectile-like': {
      const F = clampPositive(params.env1 ?? 10, 10)
      result = calcProjectileLike(t, v0, theta, m, F)
      break
    }
    case 'uniform-circular': {
      const R = clampPositive(params.env1 ?? 5, 5)
      result = calcUniformCircular(t, v0, m, R)
      break
    }
    case 'variable-circular': {
      const R = clampPositive(params.env1 ?? 5, 5)
      const model = (params.env2 ?? 0) > 0.5 ? 'rod' : 'rope'
      result = calcVariableCircular(t, v0, m, R, model)
      break
    }
    case 'simple-harmonic': {
      const k = clampPositive(params.env1 ?? 60, 60)
      result = calcSimpleHarmonic(t, v0, m, k)
      break
    }
    case 'linear-variable-force': {
      const kappa = clampPositive(params.env1 ?? 8, 8)
      result = calcLinearVariableForce(t, v0, theta, m, kappa)
      break
    }
    case 'terminal-variable-force': {
      const P = clampPositive(params.env1 ?? 100, 100)
      const kf = clampPositive(params.env2 ?? 4, 4)
      const subMode = (params.env3 ?? 0) > 0.5 ? 'drag' : 'power'
      result = calcTerminalVariableForce(t, v0, m, P, kf, subMode)
      break
    }
    default:
      result = calcBalance(t, v0, theta)
  }

  const v = vecHypot(result.vx, result.vy)
  const a = vecHypot(result.ax, result.ay)
  const F = vecHypot(result.Fx, result.Fy)
  const p = m * v

  // 位移大小（用于x-t图）
  const displacement = vecHypot(result.x, result.y)

  return {
    mode,
    t,
    x: result.x,
    y: result.y,
    vx: result.vx,
    vy: result.vy,
    v,
    ax: result.ax,
    ay: result.ay,
    a,
    Fx: result.Fx,
    Fy: result.Fy,
    F,
    p,
    work: result.work,
    impulse: result.impulse,
    chartValueF: F,
    chartValueV: v,
    chartValueX: displacement,
    slopeTextF: 'dF/dt',
    slopeTextV: 'dv/dt = a',
    slopeTextX: 'dx/dt = v',
    areaTextF: '∫F dt = I',
    areaTextV: '∫v dt = Δx',
    areaTextX: '位移累积',
    terminalVelocity: result.terminalVelocity,
    isTerminal: result.isTerminal,
    pauseReason: result.pauseReason,
  }
}

/** 对当前模式从 0 到 time 进行轨迹采样。 */
export function sampleForceMotionTrajectory(
  params: Record<string, number>,
  time: number,
  sampleCount: number,
): ForceMotionState[] {
  const count = Math.max(2, Math.floor(sampleCount))
  const end = Math.max(0.001, time)
  return Array.from({ length: count }, (_, index) => {
    const t = (end * index) / (count - 1)
    return calculateForceMotionState(params, t)
  })
}

/** 对当前模式从 0 到 time 进行三图表曲线采样。 */
export function sampleForceMotionChart(
  params: Record<string, number>,
  time: number,
  sampleCount: number,
): ForceMotionSample[] {
  return sampleForceMotionTrajectory(params, time, sampleCount).map((state) => ({
    t: state.t,
    F: state.F,
    v: state.v,
    x: state.x,
    y: state.y,
  }))
}

/** 获取默认图表类型索引（三图表并列时不需要切换，此函数保留兼容） */
export function getForceMotionDefaultChartType(_modeIndex: number): number {
  return 0
}

/** 获取默认环境参数 */
export function getForceMotionDefaultEnv(modeIndex: number): number {
  switch (Math.round(modeIndex)) {
    case 0: return 0
    case 1: return 10
    case 2: return 10
    case 3: return GRAVITY
    case 4: return 10
    case 5: return 5
    case 6: return 5
    case 7: return 60
    case 8: return 8
    case 9: return 100
    default: return GRAVITY
  }
}
