/** 安培力 F = BIL·sinθ（N），θ 为电流与磁场夹角 */
export function calculateAmpereForce(
  B: number,
  I: number,
  L: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: B * I * L * Math.sin(angleRad) }
}

/** 洛伦兹力 F = qvB·sinθ（N），θ 为速度与磁场夹角 */
export function calculateLorentzForce(
  q: number,
  v: number,
  B: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: q * v * B * Math.sin(angleRad) }
}

/**
 * 带电粒子在匀强磁场中圆周运动（垂直入射）。
 * r = mv/(qB)，T = 2πm/(qB)，ω = qB/m
 */
export function calculateChargeInMagField(
  q: number,
  m: number,
  v: number,
  B: number
): { r: number; T: number; omega: number } {
  const denom = q * B
  const r = denom === 0 ? 0 : Math.abs((m * v) / denom)
  const T = denom === 0 ? 0 : Math.abs((2 * Math.PI * m) / denom)
  const omega = m === 0 ? 0 : denom / m
  return { r, T, omega }
}

/**
 * 计算带电粒子在匀强磁场中的圆周运动轨迹点。
 * x = R sin(ωt), y = R(1 - cos(ωt))
 */
export function calculateLorentzTrajectory(
  q: number,
  m: number,
  B: number,
  v0: number,
  t: number
): { x: number; y: number; vx: number; vy: number } {
  const { omega } = calculateChargeInMagField(q, m, v0, B)
  
  if (Math.abs(omega) < 1e-9) {
    return { x: v0 * t, y: 0, vx: v0, vy: 0 }
  }

  const x = (v0 / omega) * Math.sin(omega * t)
  const y = (v0 / omega) * (Math.cos(omega * t) - 1)
  const vx = v0 * Math.cos(omega * t)
  const vy = -v0 * Math.sin(omega * t)
  
  return { x, y, vx, vy }
}

/** 计算带电粒子在匀强磁场中的回旋半径 */
export const calcParticleRadius = (m: number, v: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (m * v) / (Math.abs(q) * Math.abs(B))
}

/** 计算粒子在磁场中的运动周期 */
export const calcParticlePeriod = (m: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (2 * Math.PI * m) / (Math.abs(q) * Math.abs(B))
}

/** 计算动态圆圆心物理坐标 (xc, yc) */
export const calcTrajectoryCenter = (entryAngle: number, R: number, q: number = 1, B: number = 1) => {
  const sign = (q * B) >= 0 ? -1 : 1
  const cxAngle = entryAngle + sign * Math.PI / 2
  return {
    xc: R * Math.cos(cxAngle),
    yc: R * Math.sin(cxAngle)
  }
}

/** 计算粒子运动的圆心角 */
export const calcParticleArcAngle = (entryAngle: number, _q: number, _B: number): number => {
  return 2 * entryAngle
}
