import type { ModeResult } from '../types'

/** 模式7: 简谐运动 — F = -kx */
export function calcSimpleHarmonic(
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
