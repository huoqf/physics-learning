import type { ModeResult } from '../types'
import { degToRad, vecHypot } from '../utils'

/** 模式1: 匀加速直线 — F合恒定，a恒定，v0与F同向或反向 */
export function calcUniformAccelLine(
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
