import type { ModeResult } from '../types'
import { degToRad } from '../utils'

/** 模式0: 平衡状态 — F合=0，a=0，v恒定 */
export function calcBalance(t: number, v0: number, theta: number): ModeResult {
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
