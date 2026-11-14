import type { ModeResult } from '../types'
import { GRAVITY } from '../../constants'

/** 模式6: 变速圆周运动 — 竖直面内，重力+约束力 */
export function calcVariableCircular(
  t: number,
  v0: number,
  m: number,
  R: number,
  model: 'rope' | 'rod'
): ModeResult {
  const g = GRAVITY
  const theta0 = 0
  const omega0 = v0 / R

  const dt = 0.001
  let theta = theta0
  let omega = omega0
  let slackState: { t: number; x: number; y: number; vx: number; vy: number } | null = null

  const stateOnCircle = () => {
    const v = omega * R
    const x = R * Math.sin(theta)
    const y = -R * Math.cos(theta)
    const vx = v * Math.cos(theta)
    const vy = v * Math.sin(theta)
    const tension = m * (v * v / R + g * Math.cos(theta))
    return { v, x, y, vx, vy, tension }
  }

  const steps = Math.floor(t / dt)
  let curT = 0
  for (let i = 0; i < steps; i++) {
    const cur = stateOnCircle()
    if (model === 'rope' && cur.tension <= 0) {
      slackState = { t: curT, x: cur.x, y: cur.y, vx: cur.vx, vy: cur.vy }
      break
    }
    const domega = -(g / R) * Math.sin(theta) * dt
    omega += domega
    theta += omega * dt
    curT += dt
  }

  if (!slackState) {
    const rem = t - steps * dt
    const cur = stateOnCircle()
    if (model === 'rope' && cur.tension <= 0) {
      slackState = { t: curT, x: cur.x, y: cur.y, vx: cur.vx, vy: cur.vy }
    } else {
      omega += -(g / R) * Math.sin(theta) * rem
      theta += omega * rem
    }
  }

  if (slackState) {
    const tau = Math.max(0, t - slackState.t)
    const x = slackState.x + slackState.vx * tau
    const y = slackState.y + slackState.vy * tau - 0.5 * g * tau * tau
    const vx = slackState.vx
    const vy = slackState.vy - g * tau
    const v2 = vx * vx + vy * vy
    return {
      x, y, vx, vy,
      ax: 0, ay: -g,
      Fx: 0, Fy: -m * g,
      work: 0.5 * m * v2 - 0.5 * m * v0 * v0,
      impulse: 0,
      isTerminal: true,
      pauseReason: 'terminal',
    }
  }

  const v = omega * R
  const x = R * Math.sin(theta)
  const y = -R * Math.cos(theta)
  const vx = v * Math.cos(theta)
  const vy = v * Math.sin(theta)

  const aCentripetal = v * v / R
  const aTangential = -g * Math.sin(theta)

  const ax = -aCentripetal * Math.sin(theta) + aTangential * Math.cos(theta)
  const ay = aCentripetal * Math.cos(theta) + aTangential * Math.sin(theta)

  const Fx = m * ax
  const Fy = m * ay

  return {
    x, y, vx, vy, ax, ay, Fx, Fy,
    work: 0.5 * m * v * v - 0.5 * m * v0 * v0,
    impulse: 0,
    isTerminal: false,
  }
}

/** 扫描竖直圆周临界事件（脱轨 / 摆动最高点 / 首次过顶与一周期） */
export function findVariableCircularEvents(
  v0: number,
  m: number,
  R: number,
  model: 'rope' | 'rod',
  maxTime: number,
): { slackTime?: number; swingPeakTime?: number; loopTopTime?: number; loopFullTime?: number } {
  if (!(R > 1e-6) || !(Math.abs(v0) > 1e-6)) return {}
  const g = GRAVITY
  const dt = 0.002
  let theta = 0
  let omega = v0 / R
  let prevOmega = omega
  const limit = Math.min(maxTime, 30)
  let loopTopTime: number | undefined
  let swingPeakTime: number | undefined

  for (let curT = 0; curT <= limit; curT += dt) {
    const v = omega * R
    const tension = m * ((v * v) / R + g * Math.cos(theta))
    if (model === 'rope' && tension <= 0 && curT > 0) {
      return { slackTime: curT }
    }
    if (swingPeakTime == null && prevOmega > 0 && omega <= 0 && curT > 0) {
      swingPeakTime = curT
      return { swingPeakTime }
    }
    if (loopTopTime == null && theta >= Math.PI) {
      loopTopTime = curT
    }
    if (theta >= 2 * Math.PI) {
      return { loopTopTime, loopFullTime: curT }
    }
    prevOmega = omega
    omega += -(g / R) * Math.sin(theta) * dt
    theta += omega * dt
  }
  return { loopTopTime }
}
