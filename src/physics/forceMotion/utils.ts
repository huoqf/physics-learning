export function clampPositive(value: number, fallback: number, min = 1e-6): number {
  if (!Number.isFinite(value) || value <= min) return fallback
  return value
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function vecHypot(vx: number, vy: number): number {
  return Math.hypot(vx, vy)
}
