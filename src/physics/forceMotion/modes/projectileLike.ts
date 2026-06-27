import type { ModeResult } from '../types'
import { degToRad } from '../utils'

/** 模式4: 类平抛运动 — 初速垂直于恒力方向 */
export function calcProjectileLike(
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
    impulse: Math.hypot(Fx, Fy) * t,
    isTerminal: false,
  }
}
