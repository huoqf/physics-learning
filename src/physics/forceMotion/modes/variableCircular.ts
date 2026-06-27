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
  const steps = Math.floor(t / dt)
  for (let i = 0; i < steps; i++) {
    const domega = -(g / R) * Math.sin(theta) * dt
    omega += domega
    theta += omega * dt
  }
  const rem = t - steps * dt
  omega += -(g / R) * Math.sin(theta) * rem
  theta += omega * rem

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
