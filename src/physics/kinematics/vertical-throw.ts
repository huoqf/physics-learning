import { calculateFreeFall } from './base'

/**
 * 竖直上抛运动（含空气阻力）——欧拉法数值求解
 * 取向上为正方向，a = -g - k·v（k 为阻力系数，m=1）
 * @param v0 初速度 (m/s)，向上为正
 * @param g 重力加速度 (m/s²)，正值
 * @param k 空气阻力系数 (kg/s)，0=无阻力
 * @param t 查询时刻 (s)
 * @param dt 积分步长 (s)，默认 0.01
 * @returns 速度 v (m/s) 和位移 y (m)
 */
export function calculateVerticalThrowWithDrag(
  v0: number,
  g: number,
  k: number,
  t: number,
  dt: number = 0.01
): { v: number; y: number } {
  // 无阻力时直接用解析解
  if (k === 0) {
    return calculateFreeFall(v0, -g, t)
  }
  if (t <= 0) return { v: v0, y: 0 }
  // 欧拉法积分
  let currentV = v0
  let currentY = 0
  let currentTime = 0
  const maxSteps = Math.ceil(t / dt) + 1
  for (let i = 0; i < maxSteps; i++) {
    const nextTime = Math.min(currentTime + dt, t)
    const actualDt = nextTime - currentTime
    if (actualDt <= 0) break
    // a = -g - k·v·|v|（二次阻力，与 precomputeVerticalThrowTrajectory 一致）
    const a = -g - k * currentV * Math.abs(currentV)
    currentV += a * actualDt
    currentY += currentV * actualDt
    currentTime = nextTime
    // 落地检测
    if (currentY < 0 && currentTime > dt) {
      currentY = 0
      currentV = 0
      break
    }
  }
  return { v: currentV, y: currentY }
}

/**
 * 预计算竖直上抛运动完整轨迹（含空气阻力）
 * @param v0 初速度 (m/s)
 * @param g 重力加速度 (m/s²)
 * @param k 空气阻力系数 (kg/s)
 * @param dt 时间步长 (s)，默认 0.02
 * @returns 轨迹点数组和关键时间
 */
export interface VerticalThrowTrajectoryPoint {
  t: number
  v: number
  y: number
}

export interface VerticalThrowResult {
  points: VerticalThrowTrajectoryPoint[]
  vacuumPoints: VerticalThrowTrajectoryPoint[]
  peakTime: number
  landTime: number
  maxHeight: number
  peakTimeVac: number
  landTimeVac: number
  maxHeightVac: number
}

export function precomputeVerticalThrowTrajectory(
  v0: number,
  g: number,
  k: number,
  dt: number = 0.02
): VerticalThrowResult {
  // 1. 计算真空对照组 (vacuumPoints)
  const peakTimeVac = v0 / g
  const maxHeightVac = (v0 * v0) / (2 * g)
  const landTimeVac = (2 * v0) / g
  const vacuumPoints: VerticalThrowTrajectoryPoint[] = []

  const vacSteps = Math.ceil(landTimeVac / dt)
  for (let i = 0; i <= vacSteps; i++) {
    const t = Math.min(i * dt, landTimeVac)
    const v = v0 - g * t
    const y = v0 * t - 0.5 * g * t * t
    vacuumPoints.push({ t, v, y: Math.max(y, 0) })
  }

  // 2. 如果无空气阻力，直接复用真空组数据
  if (k === 0) {
    return {
      points: [...vacuumPoints],
      vacuumPoints,
      peakTime: peakTimeVac,
      landTime: landTimeVac,
      maxHeight: maxHeightVac,
      peakTimeVac,
      landTimeVac,
      maxHeightVac,
    }
  }

  // 3. 计算有阻力组 (points)，采用欧拉法数值积分
  let currentV = v0
  let currentY = 0
  let currentTime = 0
  let peakTime = 0
  let maxHeight = 0
  let landTime = 0
  const points: VerticalThrowTrajectoryPoint[] = [{ t: 0, v: v0, y: 0 }]
  const maxIter = 50000

  for (let i = 0; i < maxIter; i++) {
    // 阻力方向与速度方向相反：a = -g - k * v * |v|
    const a = -g - k * currentV * Math.abs(currentV)
    currentV += a * dt
    currentY += currentV * dt
    currentTime += dt

    if (currentY > maxHeight) {
      maxHeight = currentY
      peakTime = currentTime
    }

    if (currentY < 0 && currentTime > dt) {
      currentY = 0
      currentV = 0
      landTime = currentTime
      points.push({ t: currentTime, v: 0, y: 0 })
      break
    }
    points.push({ t: currentTime, v: currentV, y: Math.max(currentY, 0) })
  }

  if (landTime === 0) landTime = currentTime

  return {
    points,
    vacuumPoints,
    peakTime,
    landTime,
    maxHeight,
    peakTimeVac,
    landTimeVac,
    maxHeightVac,
  }
}
