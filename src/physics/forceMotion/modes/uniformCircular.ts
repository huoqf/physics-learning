import type { ModeResult } from '../types'
import { vecHypot } from '../utils'

/** 模式5: 匀速圆周运动 — 向心力大小恒定，始终垂直于v */
export function calcUniformCircular(
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
