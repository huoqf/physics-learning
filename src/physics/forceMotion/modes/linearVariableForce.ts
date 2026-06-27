import type { ModeResult } from '../types'
import { degToRad } from '../utils'

/** 模式8: 线性变力运动 — F = κt */
export function calcLinearVariableForce(
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
