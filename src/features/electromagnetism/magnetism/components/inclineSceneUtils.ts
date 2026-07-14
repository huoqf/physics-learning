import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

export type Point = { x: number; y: number }

export const VIEW_W = 600
export const VIEW_H = 300
export const EFFECTIVE_L = 4.0

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const normalize = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-6) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export const pointOnRail = (layout: ReturnType<typeof getInclinedLayout>, k: number, frontRatio = 0): Point => ({
  x: layout.rail1StartX + layout.railDx * k + layout.dx * frontRatio,
  y: layout.rail1StartY + layout.railDy * k + layout.dy * frontRatio,
})

export const getDisplaySlopeAngleDeg = (theta: number) => {
  return clamp(theta * 0.55 + 2, 8, 25)
}

export const getInclinedLayout = (L: number, theta: number) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL
  const displayAngleRad = (getDisplaySlopeAngleDeg(theta) * Math.PI) / 180
  const railDx = 420
  const railDy = -railDx * Math.tan(displayAngleRad)

  return {
    rail1StartX: 65,
    rail1StartY: 230,
    rail1EndX: 65 + railDx,
    rail1EndY: 230 + railDy,
    railDx,
    railDy,
    dx,
    dy,
  }
}

export const describeAmpereForce = (physicsResult: AdvancedAmperePhysicsResult, bFieldDir: number) => {
  if (Math.abs(physicsResult.F_ampere) < 1e-4) return 'F_安 = 0'
  if (bFieldDir === 0) return physicsResult.F_ampere > 0 ? 'F_安 水平向右' : 'F_安 水平向左'
  if (bFieldDir === 1) return physicsResult.F_ampere > 0 ? 'F_安 沿斜面向上' : 'F_安 沿斜面向下'
  return physicsResult.F_ampere > 0 ? 'F_安 竖直向上' : 'F_安 竖直向下'
}
