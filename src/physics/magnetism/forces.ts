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

/**
 * 双平行边界磁场 [0, d] 的出射计算
 * 返回出射点 (x, y)、出射速度 (vx, vy)、在磁场中的运动时间 t、以及是否穿透 isPenetrated
 */
export function calculateDoubleBoundaryExit(
  q: number,
  m: number,
  v: number,
  B: number,
  thetaDeg: number,
  d: number
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  isPenetrated: boolean;
  R: number;
  R_crit: number;
} {
  const R = calcParticleRadius(m, v, q, B)
  const omega = Math.abs((q * B) / m)
  const thetaRad = (thetaDeg * Math.PI) / 180
  const sign = (q * B) >= 0 ? -1 : 1 // -1 为顺时针，1 为逆时针

  // 临界半径 R_crit = d / (1 - sign * cos(theta))
  // 当 sign = -1 (右偏) 时，R_crit = d / (1 + cos(theta))，这里需要注意极角方向
  // 顺时针旋转下，粒子初速度与边界夹角为 theta，其圆心在 y_c = -R * cos(theta)
  // 最高点为 y_max = y_c + R = R * (1 - cos(theta))。因此临界条件是 R * (1 - cos(theta)) = d => R_crit = d / (1 - cos(theta))
  // 逆时针旋转下，圆心在 y_c = R * cos(theta)，最高点为 y_c + R = R * (1 + cos(theta)) => R_crit = d / (1 + cos(theta))
  // 统一公式：R_crit = d / (1 - sign_y * cos(theta))。顺时针 sign_y = 1，逆时针 sign_y = -1
  const sign_y = sign === -1 ? 1 : -1
  const R_crit = Math.abs(d / (1 - sign_y * Math.cos(thetaRad)))

  const cxAngle = thetaRad + sign * Math.PI / 2
  const xc = R * Math.cos(cxAngle)
  const yc = R * Math.sin(cxAngle)

  const isPenetrated = R >= R_crit

  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let t = 0

  if (!isPenetrated) {
    // 未穿透，折回单边界 (y=0)
    // 根据对称性，出射点 x_out = 2 * xc
    x = 2 * xc
    y = 0
    // 偏转角
    const deltaPhi = sign === -1 ? 2 * thetaRad : 2 * (Math.PI - thetaRad)
    t = deltaPhi / omega
    // 出射速度
    const exitAngle = thetaRad + sign * deltaPhi
    vx = v * Math.cos(exitAngle)
    vy = v * Math.sin(exitAngle)
  } else {
    // 穿透上边界 y = d
    y = d
    // 解 (x - xc)^2 + (d - yc)^2 = R^2 => x = xc - sign * sqrt(R^2 - (d - yc)^2)
    const sqrtVal = Math.sqrt(Math.max(0, R * R - (d - yc) * (d - yc)))
    x = xc - sign * sqrtVal

    // 计算入射极角和出射极角
    // 入射极角 (0,0)
    const phiIn = Math.atan2(-yc, -xc)
    // 出射极角 (x, d)
    const phiOut = Math.atan2(d - yc, x - xc)

    // 圆心角 deltaPhi
    let deltaPhi = Math.abs(phiOut - phiIn)
    if (deltaPhi > Math.PI) {
      deltaPhi = 2 * Math.PI - deltaPhi
    }
    t = deltaPhi / omega

    const exitAngle = thetaRad + sign * deltaPhi
    vx = v * Math.cos(exitAngle)
    vy = v * Math.sin(exitAngle)
  }

  return { x, y, vx, vy, t, isPenetrated, R, R_crit }
}

/**
 * 圆形边界磁场（圆心在 (0, Rb)，半径为 Rb，粒子从 (0,0) 向上射入指向磁场圆心）的偏转计算
 * 返回出射点 (x, y)、出射速度 (vx, vy)、在磁场中的运动时间 t
 */
export function calculateCircularBoundaryExit(
  q: number,
  m: number,
  v: number,
  B: number,
  Rb: number
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  R: number;
  deltaPhi: number;
} {
  const R = calcParticleRadius(m, v, q, B)
  const omega = Math.abs((q * B) / m)
  const sign = (q * B) >= 0 ? -1 : 1

  // 根据推导：
  // x_out = sign * 2 * R * Rb^2 / (R^2 + Rb^2)
  // y_out = 2 * R^2 * Rb / (R^2 + Rb^2)
  const denom = R * R + Rb * Rb
  const x = sign * (2 * R * Rb * Rb) / denom
  const y = (2 * R * R * Rb) / denom

  // 偏转角 deltaPhi 满足 tan(deltaPhi/2) = Rb / R
  const deltaPhi = 2 * Math.atan(Rb / R)
  const t = deltaPhi / omega

  // 出射速度：入射方向是向上(90度)，顺时针偏转为 -deltaPhi，逆时针为 +deltaPhi
  // 出射极角在轨迹圆中，初速度方向为 90 度，即沿着切线。
  const exitAngle = Math.PI / 2 + sign * deltaPhi
  const vx = v * Math.cos(exitAngle)
  const vy = v * Math.sin(exitAngle)

  return { x, y, vx, vy, t, R, deltaPhi }
}

