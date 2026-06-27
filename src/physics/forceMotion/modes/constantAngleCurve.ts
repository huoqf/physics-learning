import type { ModeResult } from '../types'
import { degToRad } from '../utils'

/** 模式3: 匀变速曲线（定角）— F合恒定，与v0成固定夹角，如斜抛 */
export function calcConstantAngleCurve(
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
