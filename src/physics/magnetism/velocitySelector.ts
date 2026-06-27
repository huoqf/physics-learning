export interface VelocitySelectorPoint {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  fx: number
  fy: number
  fEx: number
  fEy: number
}

function solveTOut(v0: number, vd: number, omega: number, L: number): number {
  let tMin = 0
  let tMax = Math.max(10.0, (10 * L) / Math.max(0.1, v0))
  for (let i = 0; i < 30; i++) {
    const tMid = (tMin + tMax) / 2
    const xMid = vd * tMid + ((v0 - vd) / omega) * Math.sin(omega * tMid)
    if (xMid < L) {
      tMin = tMid
    } else {
      tMax = tMid
    }
  }
  return (tMin + tMax) / 2
}

/**
 * 洛伦兹力与速度选择器模型粒子轨迹解析解计算。
 */
export function calculateVelocitySelectorTrajectory(
  q: number,
  m: number,
  v0: number,
  E_y: number,
  B_z: number,
  L: number,
  d: number,
  t: number
): {
  point: VelocitySelectorPoint
  tHit: number | null
  tOut: number
  hitsPlate: boolean
  hitType: 'none' | 'top' | 'bottom'
} {
  const omega = m > 0 ? (q * B_z) / m : 0
  const vd = Math.abs(B_z) > 1e-6 ? E_y / B_z : 0
  
  let tHit: number | null = null
  let hitType: 'none' | 'top' | 'bottom' = 'none'
  let hitsPlate = false

  const halfD = d / 2

  if (Math.abs(B_z) < 1e-6) {
    if (Math.abs(E_y) > 1e-6 && Math.abs(q) > 1e-9 && m > 0) {
      const a_y = (q * E_y) / m
      if (Math.abs(a_y) > 1e-6) {
        tHit = Math.sqrt(halfD / (0.5 * Math.abs(a_y)))
        hitType = a_y > 0 ? 'top' : 'bottom'
        hitsPlate = true
      }
    }
  } else {
    if (Math.abs(omega) > 1e-6) {
      const A = (v0 - vd) / omega
      if (Math.abs(A) > 1e-6) {
        if (A < 0) {
          const val = 1 + halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'top'
            hitsPlate = true
          }
        } else {
          const val = 1 - halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'bottom'
            hitsPlate = true
          }
        }
      }
    }
  }

  let tOut = L / Math.max(0.1, v0)
  if (Math.abs(B_z) >= 1e-6 && Math.abs(omega) > 1e-6) {
    tOut = solveTOut(v0, vd, omega, L)
  }

  if (hitsPlate && tHit !== null && tHit < tOut) {
    // 粒子撞板，不穿出
  } else {
    hitsPlate = false
    hitType = 'none'
    tHit = null
  }

  let px = 0
  let py = 0
  let vx = v0
  let vy = 0

  const tEffective = hitsPlate && tHit !== null ? Math.min(t, tHit) : t

  if (tEffective <= 0) {
    px = 0
    py = 0
    vx = v0
    vy = 0
  } else if (!hitsPlate && tEffective > tOut) {
    let px_out = 0
    let py_out = 0
    let vx_out = v0
    let vy_out = 0

    if (Math.abs(omega) < 1e-9) {
      px_out = v0 * tOut
      py_out = 0.5 * ((q * E_y) / m) * tOut * tOut
      vx_out = v0
      vy_out = ((q * E_y) / m) * tOut
    } else {
      px_out = vd * tOut + ((v0 - vd) / omega) * Math.sin(omega * tOut)
      py_out = ((v0 - vd) / omega) * (Math.cos(omega * tOut) - 1)
      vx_out = vd + (v0 - vd) * Math.cos(omega * tOut)
      vy_out = -(v0 - vd) * Math.sin(omega * tOut)
    }

    const tAfter = tEffective - tOut
    px = px_out + vx_out * tAfter
    py = py_out + vy_out * tAfter
    vx = vx_out
    vy = vy_out
  } else {
    if (Math.abs(omega) < 1e-9) {
      px = v0 * tEffective
      py = 0.5 * ((q * E_y) / m) * tEffective * tEffective
      vx = v0
      vy = ((q * E_y) / m) * tEffective
    } else {
      px = vd * tEffective + ((v0 - vd) / omega) * Math.sin(omega * tEffective)
      py = ((v0 - vd) / omega) * (Math.cos(omega * tEffective) - 1)
      vx = vd + (v0 - vd) * Math.cos(omega * tEffective)
      vy = -(v0 - vd) * Math.sin(omega * tEffective)
    }
  }

  const isInside = tEffective <= tOut
  const fx = isInside && Math.abs(B_z) > 0 ? q * B_z * vy : 0
  const fy = isInside && Math.abs(B_z) > 0 ? -q * B_z * vx : 0
  const fEx = 0
  const fEy = isInside && Math.abs(E_y) > 0 ? q * E_y : 0

  return {
    point: { t: tEffective, x: px, y: py, vx, vy, fx, fy, fEx, fEy },
    tHit,
    tOut,
    hitsPlate,
    hitType
  }
}
