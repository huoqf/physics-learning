import type { ModeResult } from '../types'
import { degToRad, vecHypot } from '../utils'

/** 模式2: 匀减速直线 — F合恒定与v反向，直到v=0后停止（刹车陷阱） */
export function calcUniformDecelLine(
  t: number,
  v0: number,
  theta: number,
  m: number,
  Fmag: number
): ModeResult {
  const rad = degToRad(theta)
  const Fx = -Fmag * Math.cos(rad)
  const Fy = -Fmag * Math.sin(rad)
  const ax = Fx / m
  const ay = Fy / m
  const v0x = v0 * Math.cos(rad)
  const v0y = v0 * Math.sin(rad)

  const vxRaw = v0x + ax * t
  const vyRaw = v0y + ay * t

  if (vxRaw * v0x + vyRaw * v0y <= 0) {
    const tStop = v0 / (Fmag / m)
    return {
      x: v0x * tStop + 0.5 * ax * tStop * tStop,
      y: v0y * tStop + 0.5 * ay * tStop * tStop,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      Fx: 0,
      Fy: 0,
      work: -0.5 * m * v0 * v0,
      impulse: -m * v0,
      isTerminal: true,
      pauseReason: 'brake',
    }
  }

  return {
    x: v0x * t + 0.5 * ax * t * t,
    y: v0y * t + 0.5 * ay * t * t,
    vx: vxRaw,
    vy: vyRaw,
    ax,
    ay,
    Fx,
    Fy,
    work: Fx * (v0x * t + 0.5 * ax * t * t) + Fy * (v0y * t + 0.5 * ay * t * t),
    impulse: vecHypot(Fx, Fy) * t,
    isTerminal: false,
  }
}
