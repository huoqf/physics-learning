import { calculateVariableAcceleration, type VariableMotionModel, type VariableMotionParams } from './base'
import { calcGByLatitude, calcGByAltitude } from './acceleration'
import { GRAVITY } from '../constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 自由落体 / 滴水法物理高度 (m) */
export const FREE_FALL_TUBE_HEIGHT = 2.0

/** 牛顿管实验物体材质参数 (SSOT) */
export const FREE_FALL_MATERIALS = {
  ironBall: { mass: 0.5,   baseDragK: 0.001, label: '铁球' },
  coin:     { mass: 0.01,  baseDragK: 0.01,  label: '硬币' },
  feather:  { mass: 0.003, baseDragK: 0.02,  label: '羽毛' },
  paper:    { mass: 0.005, baseDragK: 0.015, label: '纸片' },
} as const

export interface FreeFallTrajectoryPoint {
  t: number
  y: number
  v: number
  a: number
  fDrag: number
  swayAngle: number
  swayDx: number
}

/**
 * 预计算带阻力的自由落体轨迹
 * @param v0 初速度 (m/s)
 * @param g 重力加速度 (m/s²)
 * @param dragK 阻力系数 (kg/m)
 * @param m 质量 (kg)
 * @param maxFallHeight 最大下落高度 (m)
 * @param dt 积分步长 (s)，默认 0.001
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 */
export function precomputeFreeFallWithDrag(
  v0: number,
  g: number,
  dragK: number,
  m: number,
  maxFallHeight: number,
  dt: number = 0.001,
  samplingInterval: number = 0.01
): { points: FreeFallTrajectoryPoint[]; groundTime: number } {
  const points: FreeFallTrajectoryPoint[] = []
  let t = 0
  let y = 0
  let v = v0
  let lastSampleTime = -samplingInterval

  const maxSteps = 100000 // 安全阈值，防止死循环 (相当于 100 秒)
  let steps = 0

  const addPoint = (time: number, posY: number, velV: number, accA: number, dragF: number) => {
    // 羽毛摆动物理模拟（与阻力及速度挂钩）
    let swayAngle = 0
    let swayDx = 0
    if (dragK > 0 && velV > 0.01) {
      const omega = 12 // 摆动角速度 (rad/s)
      const maxAngle = Math.min(0.5, 3 * (dragF / m)) // 最大摆动幅度，上限 0.5rad
      swayAngle = maxAngle * Math.sin(omega * time)
      swayDx = 35 * maxAngle * Math.cos(omega * time)
    }
    points.push({
      t: time,
      y: posY,
      v: velV,
      a: accA,
      fDrag: dragF,
      swayAngle,
      swayDx
    })
  }

  // 初始状态
  addPoint(0, 0, v0, g, 0)
  lastSampleTime = 0

  while (y < maxFallHeight && steps < maxSteps) {
    const dragF = dragK * v * Math.abs(v)
    const a = g - dragF / m
    v += a * dt
    y += v * dt
    t += dt
    steps++

    // 落地截断
    if (y >= maxFallHeight) {
      y = maxFallHeight
      v = 0 // 落地后速度归零
      addPoint(t, y, v, 0, 0)
      break
    }

    if (t - lastSampleTime >= samplingInterval - 1e-9) {
      addPoint(t, y, v, a, dragF)
      lastSampleTime = t
    }
  }

  return {
    points,
    groundTime: t
  }
}

export interface VariableMotionTrajectoryPoint {
  t: number
  x: number
  v: number
  a: number
  s: number // 累计路程 (distance)
}

/**
 * 预计算变加速/简谐/多阶段运动轨迹（含累计路程）
 * @param model 运动模型
 * @param params 运动参数
 * @param tMax 最大预计算时间 (s)
 * @param dt 积分步长 (s)，默认 0.001
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 */
export function precomputeVariableMotion(
  model: VariableMotionModel,
  params: VariableMotionParams,
  tMax: number,
  dt: number = 0.001,
  samplingInterval: number = 0.01
): VariableMotionTrajectoryPoint[] {
  const points: VariableMotionTrajectoryPoint[] = []
  let t = 0
  let distance = 0
  let lastSampleTime = -samplingInterval

  // 初始状态
  const init = calculateVariableAcceleration(model, params, 0)
  points.push({
    t: 0,
    x: init.x,
    v: init.v,
    a: init.a,
    s: 0
  })
  lastSampleTime = 0

  let prevV = init.v
  const steps = Math.ceil(tMax / dt)

  for (let i = 1; i <= steps; i++) {
    const nextT = Math.min(i * dt, tMax)
    const actualDt = nextT - t
    if (actualDt <= 0) break

    const state = calculateVariableAcceleration(model, params, nextT)

    // 累加路程 ds = |平均速度| * dt
    const avgV = 0.5 * (state.v + prevV)
    distance += Math.abs(avgV) * actualDt

    t = nextT
    prevV = state.v

    // 离散点采样保留
    if (t - lastSampleTime >= samplingInterval - 1e-9 || t >= tMax) {
      points.push({
        t,
        x: state.x,
        v: state.v,
        a: state.a,
        s: distance
      })
      lastSampleTime = t
    }
  }

  return points
}

export interface ProjectileTrajectoryPoint {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  ax: number
  ay: number
}

export interface ProjectileResult {
  points: ProjectileTrajectoryPoint[]
  vacuumPoints: ProjectileTrajectoryPoint[]
  groundTime: number
  groundTimeVac: number
}

/**
 * 预计算平抛运动轨迹（含空气阻力与真空对照）
 * 物理坐标系：抛出点为 (0, 0)，Y 轴向上为正，落地判定为 y <= -h
 * @param v0x 水平初速度 (m/s)
 * @param g 重力加速度 (m/s²)，正值
 * @param k 空气阻力系数 (kg/m)，0=无阻力
 * @param h 抛出点物理高度 (m)，正值
 * @param m 质量 (kg)，默认 1.0
 * @param dt 积分步长 (s)，默认 0.001
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 */
export function precomputeProjectileWithDrag(
  v0x: number,
  g: number,
  k: number,
  h: number,
  m: number = 1.0,
  dt: number = 0.001,
  samplingInterval: number = 0.01
): ProjectileResult {
  // 1. 计算无阻力真空对照组
  const groundTimeVac = g > 0 ? Math.sqrt((2 * h) / g) : 0
  const vacuumPoints: ProjectileTrajectoryPoint[] = []

  const vacSteps = Math.ceil(groundTimeVac / samplingInterval)
  for (let i = 0; i <= vacSteps; i++) {
    const t = Math.min(i * samplingInterval, groundTimeVac)
    const x = v0x * t
    const y = -0.5 * g * t * t
    const vx = v0x
    const vy = -g * t
    const v = Math.sqrt(vx * vx + vy * vy)
    vacuumPoints.push({
      t,
      x,
      y: Math.max(y, -h),
      vx,
      vy,
      v,
      ax: 0,
      ay: -g
    })
  }

  // 2. 如果无空气阻力，直接复用真空组数据
  if (k === 0) {
    return {
      points: [...vacuumPoints],
      vacuumPoints,
      groundTime: groundTimeVac,
      groundTimeVac
    }
  }

  // 3. 计算带空气阻力的实际轨迹 (欧拉积分)
  const points: ProjectileTrajectoryPoint[] = []
  let t = 0
  let x = 0
  let y = 0
  let vx = v0x
  let vy = 0
  let lastSampleTime = -samplingInterval

  const addPoint = (time: number, px: number, py: number, velX: number, velY: number, accX: number, accY: number) => {
    const vel = Math.sqrt(velX * velX + velY * velY)
    points.push({
      t: time,
      x: px,
      y: py,
      vx: velX,
      vy: velY,
      v: vel,
      ax: accX,
      ay: accY
    })
  }

  addPoint(0, 0, 0, v0x, 0, 0, -g)
  lastSampleTime = 0

  const maxSteps = 100000
  let step = 0

  while (y > -h && step < maxSteps) {
    const v = Math.sqrt(vx * vx + vy * vy)
    const ax = -(k * v * vx) / m
    const ay = -g - (k * v * vy) / m

    vx += ax * dt
    vy += ay * dt
    x += vx * dt
    y += vy * dt
    t += dt
    step++

    if (y <= -h) {
      y = -h
      addPoint(t, x, -h, vx, vy, ax, ay)
      break
    }

    if (t - lastSampleTime >= samplingInterval - 1e-9) {
      addPoint(t, x, y, vx, vy, ax, ay)
      lastSampleTime = t
    }
  }

  return {
    points,
    vacuumPoints,
    groundTime: t,
    groundTimeVac
  }
}

export interface ObliqueThrowTrajectoryPoint {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  ax: number
  ay: number
}

export interface ObliqueThrowResult {
  points: ObliqueThrowTrajectoryPoint[]
  vacuumPoints: ObliqueThrowTrajectoryPoint[]
  groundTime: number
  groundTimeVac: number
  maxHeight: number
  maxHeightVac: number
  range: number
  rangeVac: number
}

/**
 * 预计算斜抛运动轨迹（含空气阻力与真空对照）
 * 物理坐标系：起抛点为 (0, 0)，Y 轴向上为正，落地判定为 y < 0
 * @param v0 初速度模长 (m/s)
 * @param angleDeg 抛射角 (°)
 * @param g 重力加速度 (m/s²)，正值
 * @param k 空气阻力系数 (kg/m)，0=无阻力
 * @param m 质量 (kg)，默认 1.0
 * @param dt 积分步长 (s)，默认 0.001
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 */
export function precomputeObliqueThrowWithDrag(
  v0: number,
  angleDeg: number,
  g: number,
  k: number,
  m: number = 1.0,
  dt: number = 0.001,
  samplingInterval: number = 0.01
): ObliqueThrowResult {
  const angleRad = (angleDeg * Math.PI) / 180
  const v0x = v0 * Math.cos(angleRad)
  const v0y = v0 * Math.sin(angleRad)

  // 1. 计算真空对照组
  const groundTimeVac = g > 0 ? (2 * v0y) / g : 0
  const rangeVac = v0x * groundTimeVac
  const maxHeightVac = g > 0 ? (v0y * v0y) / (2 * g) : 0
  const vacuumPoints: ObliqueThrowTrajectoryPoint[] = []

  const vacSteps = Math.ceil(groundTimeVac / samplingInterval)
  for (let i = 0; i <= vacSteps; i++) {
    const t = Math.min(i * samplingInterval, groundTimeVac)
    const x = v0x * t
    const y = v0y * t - 0.5 * g * t * t
    const vx = v0x
    const vy = v0y - g * t
    const v = Math.sqrt(vx * vx + vy * vy)
    vacuumPoints.push({
      t,
      x,
      y: Math.max(y, 0),
      vx,
      vy,
      v,
      ax: 0,
      ay: -g,
    })
  }

  // 2. 计算带空气阻力的实际轨迹 (欧拉积分)
  const points: ObliqueThrowTrajectoryPoint[] = []
  let t = 0
  let x = 0
  let y = 0
  let vx = v0x
  let vy = v0y
  let lastSampleTime = -samplingInterval
  let maxHeight = 0

  const addPoint = (time: number, px: number, py: number, velX: number, velY: number, accX: number, accY: number) => {
    const vel = Math.sqrt(velX * velX + velY * velY)
    points.push({
      t: time,
      x: px,
      y: py,
      vx: velX,
      vy: velY,
      v: vel,
      ax: accX,
      ay: accY,
    })
  }

  addPoint(0, 0, 0, v0x, v0y, 0, -g)
  lastSampleTime = 0

  const maxSteps = 100000
  let step = 0

  while (step < maxSteps) {
    const v = Math.sqrt(vx * vx + vy * vy)
    const ax = -(k * v * vx) / m
    const ay = -g - (k * v * vy) / m

    vx += ax * dt
    vy += ay * dt
    x += vx * dt
    y += vy * dt
    t += dt
    step++

    if (y > maxHeight) {
      maxHeight = y
    }

    if (y <= 0 && t > 0.05) {
      y = 0
      addPoint(t, x, 0, vx, vy, ax, ay)
      break
    }

    if (t - lastSampleTime >= samplingInterval - 1e-9) {
      addPoint(t, x, y, vx, vy, ax, ay)
      lastSampleTime = t
    }
  }

  const range = points[points.length - 1]?.x ?? 0

  return {
    points: k === 0 ? [...vacuumPoints] : points,
    vacuumPoints,
    groundTime: k === 0 ? groundTimeVac : t,
    groundTimeVac,
    maxHeight: k === 0 ? maxHeightVac : maxHeight,
    maxHeightVac,
    range: k === 0 ? rangeVac : range,
    rangeVac,
  }
}

export interface ProjectileTimeline {
  groundTime: number
  inclineLandingT: number
  inclinePerpendicularT: number
  inclineFarPointT: number
}

/**
 * 平抛 / 斜面平抛关键时刻解算（与 useProjectilePhysics 共用同一真源）
 */
export function computeProjectileTimeline(params: {
  v0x?: number
  g?: number
  height?: number
  inclineAngle?: number
}): ProjectileTimeline {
  const safeV0 = Math.max(params.v0x ?? 10, 0.1)
  const safeG = Math.max(params.g ?? 9.8, 0.1)
  const safeH = Math.max(params.height ?? 10, 1)
  const inclineAngle = params.inclineAngle ?? 30

  const groundTime = Math.sqrt((2 * safeH) / safeG)
  const phiRad = (inclineAngle * Math.PI) / 180
  const tanPhi = Math.tan(phiRad)

  const rawInclineLandingT = (2 * safeV0 * tanPhi) / safeG
  const inclineLandingT = Math.min(rawInclineLandingT, groundTime)
  const inclinePerpendicularT = tanPhi > 0.01 ? safeV0 / (safeG * tanPhi) : 0
  const inclineFarPointT = (safeV0 * tanPhi) / safeG

  return {
    groundTime,
    inclineLandingT,
    inclinePerpendicularT,
    inclineFarPointT,
  }
}

/**
 * 平抛运动（anim-projectile）临界时刻列表。
 */
export function getProjectileCriticalTimes(
  params: Record<string, number>,
  maxTime = 30,
): CriticalTimePoint[] {
  const modelMode = params.modelMode ?? 0
  const tl = computeProjectileTimeline({
    v0x: params.v0x,
    g: params.g,
    height: 10,
    inclineAngle: params.inclineAngle,
  })

  if (modelMode !== 2) {
    const tGround = alignCriticalTime(tl.groundTime, 'before')
    if (tGround > 0 && tGround <= maxTime) {
      return [
        {
          time: tGround,
          label: '🎯 落地前瞬间',
          variant: 'critical',
          autoPause: false,
        },
      ]
    }
    return []
  }

  const events: CriticalTimePoint[] = []
  if (tl.inclineFarPointT > 0 && tl.inclineFarPointT < tl.inclineLandingT) {
    const tFar = alignCriticalTime(tl.inclineFarPointT, 'nearest')
    if (tFar > 0 && tFar <= maxTime) {
      events.push({
        time: tFar,
        label: '⚡ 距斜面最远 (v∥斜面)',
        variant: 'critical',
        autoPause: true,
      })
    }
  }
  if (tl.inclinePerpendicularT > 0 && tl.inclinePerpendicularT <= tl.inclineLandingT) {
    const tPerp = alignCriticalTime(tl.inclinePerpendicularT, 'nearest')
    if (tPerp > 0 && tPerp <= maxTime) {
      events.push({
        time: tPerp,
        label: '速度垂直斜面时刻',
        variant: 'info',
        autoPause: false,
      })
    }
  }
  const tLand = alignCriticalTime(tl.inclineLandingT, 'before')
  if (tLand > 0 && tLand <= maxTime) {
    events.push({
      time: tLand,
      label: '🎯 落到斜面上',
      variant: 'critical',
      autoPause: true,
    })
  }
  return events.sort((a, b) => a.time - b.time)
}

export interface FreeFallCriticalParams {
  v0?: number
  g?: number
  pressure?: number
  objectA?: number
  objectB?: number
  advancedMode?: number
  dripPeriod?: number
  latitude?: number
  altitude?: number
}

/**
 * 计算自由落体（牛顿管 / 滴水法测 g）关键时刻（SSOT）
 */
export function getFreeFallCriticalTimes(
  params: FreeFallCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  const advancedMode = params.advancedMode ?? 0
  const events: CriticalTimePoint[] = []

  if (advancedMode === 1) {
    const dripPeriod = params.dripPeriod ?? 0.5
    const latitude = params.latitude ?? 45
    const altitudeKm = params.altitude ?? 0
    const g0 = calcGByLatitude(latitude)
    const g = calcGByAltitude(g0, altitudeKm)
    const fallTime = g > 0 ? Math.sqrt((2 * FREE_FALL_TUBE_HEIGHT) / g) : 0
    const t1 = alignCriticalTime(fallTime, 'before')
    if (t1 > 0 && t1 <= maxTime) {
      events.push({
        time: t1,
        label: '第1滴到达管底',
        variant: 'critical',
        autoPause: false,
      })
    }
    const t2 = alignCriticalTime(fallTime + dripPeriod, 'before')
    if (t2 > t1 + 0.05 && t2 <= maxTime) {
      events.push({
        time: t2,
        label: '第2滴到达管底',
        variant: 'info',
        autoPause: false,
      })
    }
    return events
  }

  const v0 = params.v0 ?? 0
  const g = params.g ?? GRAVITY
  const pressure = params.pressure ?? 0
  const matA = params.objectA === 1 ? FREE_FALL_MATERIALS.coin : FREE_FALL_MATERIALS.ironBall
  const matB = params.objectB === 1 ? FREE_FALL_MATERIALS.paper : FREE_FALL_MATERIALS.feather

  const { groundTime: gtA } = precomputeFreeFallWithDrag(
    v0, g, pressure * matA.baseDragK, matA.mass, FREE_FALL_TUBE_HEIGHT,
  )
  const { groundTime: gtB } = precomputeFreeFallWithDrag(
    v0, g, pressure * matB.baseDragK, matB.mass, FREE_FALL_TUBE_HEIGHT,
  )

  const tA = alignCriticalTime(gtA, 'before')
  const tB = alignCriticalTime(gtB, 'before')

  if (Math.abs(tA - tB) <= 0.02) {
    if (tA > 0 && tA <= maxTime) {
      events.push({
        time: tA,
        label: `${matA.label}与${matB.label}同时落地`,
        variant: 'critical',
        autoPause: false,
      })
    }
  } else {
    const first = tA <= tB
      ? { t: tA, label: `${matA.label}先落地` }
      : { t: tB, label: `${matB.label}先落地` }
    const second = tA <= tB
      ? { t: tB, label: `${matB.label}后落地` }
      : { t: tA, label: `${matA.label}后落地` }

    if (first.t > 0 && first.t <= maxTime) {
      events.push({ time: first.t, label: first.label, variant: 'critical', autoPause: false })
    }
    if (second.t > first.t + 0.02 && second.t <= maxTime) {
      events.push({ time: second.t, label: second.label, variant: 'info', autoPause: false })
    }
  }

  return events.sort((a, b) => a.time - b.time)
}
