import { GRAVITY } from '../constants'
import { clampPositive, vecHypot } from './utils'
import type { ForceMotionMode, ForceMotionState, ForceMotionSample, ModeResult } from './types'
import { calcBalance } from './modes/balance'
import { calcUniformAccelLine } from './modes/uniformAccelLine'
import { calcUniformDecelLine } from './modes/uniformDecelLine'
import { calcConstantAngleCurve } from './modes/constantAngleCurve'
import { calcProjectileLike } from './modes/projectileLike'
import { calcUniformCircular } from './modes/uniformCircular'
import { calcVariableCircular, findVariableCircularEvents } from './modes/variableCircular'
import { calcSimpleHarmonic } from './modes/simpleHarmonic'
import { calcLinearVariableForce } from './modes/linearVariableForce'
import { calcTerminalVariableForce, findTerminalVariableForceTime } from './modes/terminalVariableForce'
import { finalizeCriticalPoints, type RawCriticalPoint } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

export type { ForceMotionMode, ForceMotionState, ForceMotionSample } from './types'

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
  const Ek = 0.5 * m * v * v
  // 一维运动（如简谐振动、直线运动）保持位移有符号标量；二维平面曲线运动取位移模长
  const isOneD = mode === 'simple-harmonic' || mode === 'uniform-accel-line' || mode === 'uniform-decel-line' || mode === 'linear-variable-force'
  const displacement = isOneD ? result.x : (mode === 'terminal-variable-force' ? result.y : vecHypot(result.x, result.y))

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
    Ek,
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

/**
 * 力与运动专题（anim-force-motion-topic）全模式临界时刻计算（SSOT）。
 */
export function getForceMotionCriticalTimes(
  params: Record<string, number>,
  maxTime = 60,
): CriticalTimePoint[] {
  const mode = getForceMotionMode(params.mode)
  const m = clampPositive(params.m ?? 2, 2)
  const v0 = Number.isFinite(params.v0) ? params.v0 ?? 0 : 0
  const theta = Number.isFinite(params.theta) ? params.theta ?? 0 : 0
  const raw: RawCriticalPoint[] = []

  switch (mode) {
    case 'uniform-decel-line': {
      const F = clampPositive(params.env1 ?? 10, 10)
      const aMag = F / m
      if (v0 > 1e-6 && aMag > 1e-6) {
        raw.push({
          rawTime: v0 / aMag,
          align: 'before',
          label: '⚡ 减速停稳 (v = 0)',
          variant: 'critical',
          autoPause: true,
        })
      }
      break
    }
    case 'constant-angle-curve': {
      const g = clampPositive(params.env1 ?? GRAVITY, GRAVITY)
      const vy0 = v0 * Math.sin((theta * Math.PI) / 180)
      if (vy0 > 1e-4) {
        const tTop = vy0 / g
        raw.push({ rawTime: tTop, align: 'after', label: '⚡ 斜抛最高点 (v_y = 0)', variant: 'warning', autoPause: true })
        raw.push({ rawTime: 2 * tTop, align: 'before', label: '⚡ 落回抛出高度', variant: 'critical', autoPause: true })
      }
      break
    }
    case 'uniform-circular': {
      const R = clampPositive(params.env1 ?? 5, 5)
      if (Math.abs(v0) > 1e-6) {
        const T = (2 * Math.PI * R) / Math.abs(v0)
        raw.push({ rawTime: T / 2, align: 'nearest', label: '半周反相位置', variant: 'info', autoPause: false })
        raw.push({ rawTime: T, align: 'nearest', label: '完成 1 个圆周周期 T', variant: 'info', autoPause: false })
      }
      break
    }
    case 'variable-circular': {
      const R = clampPositive(params.env1 ?? 5, 5)
      const model = (params.env2 ?? 0) > 0.5 ? 'rod' : 'rope'
      const ev = findVariableCircularEvents(v0, m, R, model, maxTime)
      if (ev.slackTime) {
        raw.push({ rawTime: ev.slackTime, align: 'after', label: '⚡ 绳松弛脱离圆周', variant: 'critical', autoPause: true })
      }
      if (ev.swingPeakTime) {
        raw.push({ rawTime: ev.swingPeakTime, align: 'nearest', label: '⚡ 摆动最高点 (v = 0)', variant: 'critical', autoPause: true })
      }
      if (ev.loopTopTime) {
        raw.push({ rawTime: ev.loopTopTime, align: 'nearest', label: '首次经过圆周最高点', variant: 'warning', autoPause: false })
      }
      if (ev.loopFullTime) {
        raw.push({ rawTime: ev.loopFullTime, align: 'nearest', label: '完成 1 个竖直圆周期', variant: 'info', autoPause: false })
      }
      break
    }
    case 'simple-harmonic': {
      const k = clampPositive(params.env1 ?? 60, 60)
      const T = 2 * Math.PI * Math.sqrt(m / k)
      raw.push({ rawTime: T / 4, align: 'nearest', label: '首次最大位移 (T/4)', variant: 'warning', autoPause: false })
      raw.push({ rawTime: T / 2, align: 'nearest', label: '首次回到平衡位置 (T/2)', variant: 'info', autoPause: false })
      raw.push({ rawTime: T, align: 'nearest', label: '完成 1 个简谐周期 T', variant: 'info', autoPause: false })
      break
    }
    case 'terminal-variable-force': {
      const P = clampPositive(params.env1 ?? 100, 100)
      const kf = clampPositive(params.env2 ?? 4, 4)
      const subMode = (params.env3 ?? 0) > 0.5 ? 'drag' : 'power'
      const tTerm = findTerminalVariableForceTime(v0, m, P, kf, subMode, maxTime)
      if (tTerm) {
        raw.push({ rawTime: tTerm, align: 'after', label: '⚡ 趋近收尾速度', variant: 'critical', autoPause: true })
      }
      break
    }
    default:
      break
  }

  return finalizeCriticalPoints(raw, maxTime)
}
