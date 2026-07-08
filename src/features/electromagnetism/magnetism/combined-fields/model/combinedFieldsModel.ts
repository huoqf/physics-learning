import {
  computeVelocitySelectorBalance,
  computeSpectrometerRadius,
  computeElectricDeflection,
  stepCyclotronSlit,
  computeCyclotronResonanceFrequency,
  computeCyclotronMaxEnergy,
  computeCyclotronTurns,
} from '@/physics/fieldsCascade'

/** 教学用粒子常量（相对物理自洽） */
export interface ParticleConstants {
  q: number
  m: number
  name: string
  label: string
  chargeSign: '+' | '-'
}

export const PARTICLES: Record<number, ParticleConstants> = {
  0: { q: 6.0e-18, m: 6.0e-23, name: 'proton', label: '质子 (¹H⁺)', chargeSign: '+' },
  1: { q: 6.0e-18, m: 12.0e-23, name: 'deuteron', label: '氘核 (²H⁺)', chargeSign: '+' },
  2: { q: 12.0e-18, m: 24.0e-23, name: 'alpha', label: 'α 粒子 (⁴He²⁺)', chargeSign: '+' },
}

/** 统一的像素比例尺（像素/米） */
export const SCALE = 7500 as const

export interface TrajectoryPoint {
  x: number
  y: number
  t: number
  v: number
  ek: number
}

// ── 模式 0：质谱仪设计坐标与仿真 ──
export const SPECTROMETER = {
  xMid: 350,
  y0: 20,
  y1: 140, // 速度选择器下端孔
  plateHalf: 37.5, // 极板半间距
  slitR: 3,
  magneticB2RegionY: 140,
} as const

export interface SpectrometerSimulation {
  balanced: boolean
  trajectory: TrajectoryPoint[]
  hitReason: 'none' | 'plate' | 'wall' | 'film'
  hitPoint: { x: number; y: number } | null
  passVelocity: number
  finalEk: number
  rPx: number
  ekPoints: { x: number; y: number }[]
  filmPoints: { x: number; y: number }[] // 质子、氘核等落在底片上的静态参考线
}

export function buildSpectrometerSimulation(
  E: number,
  B1: number,
  B2: number,
  vParticle: number,
  particleType: number,
): SpectrometerSimulation {
  const p = PARTICLES[particleType] ?? PARTICLES[0]
  const bal = computeVelocitySelectorBalance(E, B1, vParticle, p.q)
  
  // 选择器长度 L = 120px / 7500 = 0.016 m
  const L = (SPECTROMETER.y1 - SPECTROMETER.y0) / SCALE
  // 电场力为水平方向，粒子自上而下注入。
  // x轴加速度 a_x = (F_E - F_B)/m. 电场线向右，正电荷电场力向右 (qE)；洛伦兹力向左 (qvB1)
  const a_x = (p.q * E - p.q * vParticle * B1) / p.m
  const tSelector = L / vParticle

  const steps = 40
  const trajectory: TrajectoryPoint[] = []
  let hitReason: 'none' | 'plate' | 'wall' | 'film' = 'none'
  let hitPoint: { x: number; y: number } | null = null

  // 1. 模拟速度选择器内运动
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps
    const t = frac * tSelector
    const y = SPECTROMETER.y0 + (SPECTROMETER.y1 - SPECTROMETER.y0) * frac
    // 匀加速水平位移
    const xOffset = 0.5 * a_x * t * t * SCALE
    const x = SPECTROMETER.xMid + xOffset

    // 速度大小 (物理上只有 x 方向分速度 vx 增长，由于小角度这里可以计算总速度或近似速度)
    const vx = a_x * t
    const v = Math.sqrt(vParticle * vParticle + vx * vx)
    const ek = 0.5 * p.m * v * v

    // 检测是否撞击左右极板
    if (Math.abs(xOffset) >= SPECTROMETER.plateHalf) {
      // 截断在撞击点
      const borderX = SPECTROMETER.xMid + Math.sign(xOffset) * SPECTROMETER.plateHalf
      trajectory.push({ x: borderX, y, t, v, ek })
      hitReason = 'plate'
      hitPoint = { x: borderX, y }
      break
    }
    trajectory.push({ x, y, t, v, ek })
  }

  // 2. 检测是否从小孔穿出
  const lastSelector = trajectory[trajectory.length - 1]
  let passed = false
  if (hitReason === 'none') {
    const errorX = Math.abs(lastSelector.x - SPECTROMETER.xMid)
    if (errorX < SPECTROMETER.slitR) {
      passed = true
    } else {
      hitReason = 'wall'
      hitPoint = { x: lastSelector.x, y: lastSelector.y }
    }
  }

  let rPx = 0
  // 3. 模拟偏转磁场中的半圆运动
  if (passed) {
    const vIn = lastSelector.v
    const rPhys = computeSpectrometerRadius(vIn, B2, p.q, p.m)
    rPx = rPhys * SCALE
    const tHalf = (Math.PI * p.m) / (p.q * B2)

    // 半圆圆心在 xC = 350 - rPx, yC = 140
    const cx = SPECTROMETER.xMid - rPx
    const cy = SPECTROMETER.y1

    const halfSteps = 40
    const tStart = lastSelector.t

    for (let i = 1; i <= halfSteps; i++) {
      const frac = i / halfSteps
      const t = tStart + frac * tHalf
      // 粒子沿 -y 射入，洛伦兹力向左。做顺时针半圆偏转
      // 角度 theta 从 0 到 PI 弧度变动
      // x = cx + rPx * cos(theta), y = cy + rPx * sin(theta)
      const theta = frac * Math.PI
      const x = cx + rPx * Math.cos(theta)
      const y = cy + rPx * Math.sin(theta)
      
      const ek = lastSelector.ek // 磁场不做功，动能恒定
      trajectory.push({ x, y, t, v: vIn, ek })
    }
    hitReason = 'film'
    hitPoint = { x: cx - rPx, y: cy } // 落在底片上
  }

  // 构建 Ek-t 数据点 (完整时间段 [0, 0.0006s] 用于 RelationChart 展示)
  // 图表 A：动能-时间 ($E_k - t$)，由于粒子可能在中途撞板终止，我们需要补足到 maxTime
  const maxTime = 0.0006
  const ekPoints: { x: number; y: number }[] = []
  const lastVal = trajectory[trajectory.length - 1]
  
  trajectory.forEach(pt => {
    ekPoints.push({ x: pt.t, y: pt.ek / 1.602e-13 }) // J → MeV
  })
  
  if (lastVal.t < maxTime) {
    // 若中途停止，则此后动能为 0 (或保持静止，高考为了直观，撞击后不再变化可以画 0，或者保持撞击时能量。我们设定撞击后在图表上保持恒定，表示已经静止打在底片上)
    const fillSteps = 10
    const tStart = lastVal.t
    for (let i = 1; i <= fillSteps; i++) {
      const t = tStart + (maxTime - tStart) * (i / fillSteps)
      ekPoints.push({ x: t, y: hitReason === 'film' ? lastVal.ek / 1.602e-13 : 0 })
    }
  }

  // 静态同位素底片落点参考曲线 (图表 B：x_hit 与质量的关系)
  // 我们只计算质子 (m=6e-23, R_1=75px), 氘核 (m=12e-23, R_2=150px) 在 vParticle = 1500m/s, B2 = 1.5T 时的理论位置
  // R = (m * v) / (q * B2)
  const filmPoints: { x: number; y: number }[] = []
  for (let mVal = 4.0e-23; mVal <= 26.0e-23; mVal += 0.5e-23) {
    const rTemp = (mVal * vParticle) / (p.q * B2)
    const xHit = SPECTROMETER.xMid - 2 * rTemp * SCALE
    filmPoints.push({ x: mVal * 1e23, y: xHit }) // 质量以 1e-23 kg 为单位
  }

  return {
    balanced: bal.balanced,
    trajectory,
    hitReason,
    hitPoint,
    passVelocity: bal.passVelocity,
    finalEk: lastVal.ek,
    rPx,
    ekPoints,
    filmPoints,
  }
}

// ── 模式 1：回旋加速器 ──
export const CYCLOTRON = {
  cx: 350,
  cy: 162.5,
  rScale: 270, // 物理 rMax = 0.5m 对应 135px 半径
} as const

export interface CyclotronSimulation {
  segments: {
    k: number
    rPx: number
    side: 'right' | 'left'
    tStart: number
    tEnd: number
  }[]
  escaped: boolean
  resonance: boolean
  turns: number
  fMag: number
  tau: number
  trajectory: TrajectoryPoint[]
  ekPoints: { x: number; y: number }[] // Ek - t 曲线 (MeV)
  rnPoints: { x: number; y: number }[] // R - n 曲线 (px)
  ekMaxVsUPoints: { x: number; y: number }[] // Ek_max - U 曲线
}

export function buildCyclotronSimulation(
  B2: number,
  U: number,
  fAC: number,
  resonanceLock: boolean,
): CyclotronSimulation {
  const q = 6.0e-18
  const m = 6.0e-23
  const rMax = 0.5
  const vParticle = 1500

  const omega = (q * B2) / m
  const tau = omega > 0 ? Math.PI / omega : 0
  const fMag = computeCyclotronResonanceFrequency(B2, q, m)
  const actualFAC = resonanceLock ? fMag : fAC
  const resonance = Math.abs(actualFAC - fMag) < 1e-3 * Math.max(1, fMag)
  const maxEk = computeCyclotronMaxEnergy(B2, q, rMax, m)
  const turns = computeCyclotronTurns(maxEk, q, U)

  let vk = 0.5 * m * vParticle * vParticle
  let r = (m * vParticle) / (q * B2)
  const segments: { k: number; rPx: number; side: 'right' | 'left'; tStart: number; tEnd: number }[] = []
  const trajectory: TrajectoryPoint[] = []

  let t = 0
  let escaped = false
  const MAX_SEG = 120
  
  // 初始小球位置在正中心，向上方半圆出发
  trajectory.push({ x: CYCLOTRON.cx, y: CYCLOTRON.cy, t: 0, v: vParticle, ek: vk })

  for (let k = 1; k <= MAX_SEG; k++) {
    const tStart = t
    const tEnd = t + tau
    const side: 'right' | 'left' = k % 2 === 1 ? 'right' : 'left'
    const rPx = r * CYCLOTRON.rScale
    
    segments.push({ k, rPx, side, tStart, tEnd })

    // 细化半圆弧上的插值点，方便平滑动画
    const subSteps = 15
    for (let i = 1; i <= subSteps; i++) {
      const frac = i / subSteps
      const currT = tStart + frac * tau
      const theta = side === 'right' ? -Math.PI / 2 + frac * Math.PI : Math.PI / 2 + frac * Math.PI
      const x = CYCLOTRON.cx + rPx * Math.cos(theta)
      const y = CYCLOTRON.cy + rPx * Math.sin(theta)
      const v = Math.sqrt((2 * vk) / m)
      trajectory.push({ x, y, t: currT, v, ek: vk })
    }

    // 判定狭缝加速
    const step = stepCyclotronSlit(vk, rMax, U, actualFAC, tEnd, q, m, B2)
    vk = step.nextVk
    
    if (step.isEscaped) {
      escaped = true
      break
    }
    r = step.nextRadius
    t = tEnd
    if (vk <= 0) break
  }

  // 1. Ek - t 曲线 (MeV)
  const maxTime = 0.0006
  const ekPoints: { x: number; y: number }[] = []
  trajectory.forEach((pt) => {
    ekPoints.push({ x: pt.t, y: pt.ek / 1.602e-13 })
  })
  
  // 补齐时间段
  const lastVal = trajectory[trajectory.length - 1]
  if (lastVal && lastVal.t < maxTime) {
    const fillSteps = 15
    const tStart = lastVal.t
    for (let i = 1; i <= fillSteps; i++) {
      const currT = tStart + (maxTime - tStart) * (i / fillSteps)
      ekPoints.push({ x: currT, y: lastVal.ek / 1.602e-13 })
    }
  }

  // 2. R - n 曲线 (回旋半径 vs 加速次数)
  const rnPoints: { x: number; y: number }[] = []
  segments.forEach((seg, idx) => {
    rnPoints.push({ x: idx + 1, y: seg.rPx })
  })

  // 3. 最大动能 - 加速电压 U 曲线 (静态理论曲线，展示无关性，但标出当前 U 点)
  // EkMax = q^2 * B2^2 * rMax^2 / 2m = 常数
  // 横轴为加速电压 U (kV)，纵轴为 EkMax (MeV)
  const ekMaxVsUPoints: { x: number; y: number }[] = []
  const constEkMaxMeV = maxEk / 1.602e-13
  for (let uKV = 1.0; uKV <= 10.0; uKV += 0.5) {
    ekMaxVsUPoints.push({ x: uKV, y: constEkMaxMeV })
  }

  return {
    segments,
    escaped,
    resonance,
    turns,
    fMag,
    tau,
    trajectory,
    ekPoints,
    rnPoints,
    ekMaxVsUPoints,
  }
}

// ── 模式 2：电偏转 + 磁偏转级联 ──
export const DEFLECT = {
  // 电偏转 x 范围 50 ~ 300, y 范围 60 ~ 260. 中线 y = 160
  xStart: 50,
  xEnd: 300,
  yMid: 160,
  plateHalf: 70, // 极板半间距 (间距 d = 140)
  // 磁偏转 x 范围 300 ~ 650
  magneticB2StartX: 300,
  screenX: 650,
} as const

export interface DeflectSimulation {
  trajectory: TrajectoryPoint[]
  hitReason: 'none' | 'plate' | 'film'
  hitPoint: { x: number; y: number } | null
  yOffsetPx: number
  theta: number
  rPx: number
  cx: number
  cy: number
  vOut: number
  vPoints: { x: number; y: number }[] // 速度大小 v - t 曲线 (km/s)
  tanThetaVsEPoints: { x: number; y: number }[] // tan(theta) - E 曲线
}

export function buildDeflectSimulation(
  E: number,
  B2: number,
  vParticle: number,
  particleType: number,
): DeflectSimulation {
  const p = PARTICLES[particleType] ?? PARTICLES[0]
  
  // 极板物理长度 L = 250px / 7500 = 0.0333 m
  const L = (DEFLECT.xEnd - DEFLECT.xStart) / SCALE
  // 极板物理间距 d = 140px / 7500 = 0.0187 m
  const d = (DEFLECT.plateHalf * 2) / SCALE

  const out = computeElectricDeflection(vParticle, E, L, d, p.q, p.m)
  const tSelector = L / vParticle

  const steps = 40
  const trajectory: TrajectoryPoint[] = []
  let hitReason: 'none' | 'plate' | 'film' = 'none'
  let hitPoint: { x: number; y: number } | null = null

  // 1. 模拟电偏转类平抛运动
  // x(t) = xStart + v0 * t * SCALE
  // y(t) = yMid - 0.5 * a_y * t^2 * SCALE (E > 0 向上偏转，y坐标减少)
  const ay = (p.q * E) / p.m

  for (let i = 0; i <= steps; i++) {
    const frac = i / steps
    const t = frac * tSelector
    const x = DEFLECT.xStart + vParticle * t * SCALE
    const yOffsetPhys = 0.5 * ay * t * t
    const yOffsetPx = yOffsetPhys * SCALE
    const y = DEFLECT.yMid - yOffsetPx

    const vy = ay * t
    const v = Math.sqrt(vParticle * vParticle + vy * vy)
    const ek = 0.5 * p.m * v * v

    if (Math.abs(yOffsetPx) >= DEFLECT.plateHalf) {
      const borderY = DEFLECT.yMid - Math.sign(yOffsetPx) * DEFLECT.plateHalf
      trajectory.push({ x, y: borderY, t, v, ek })
      hitReason = 'plate'
      hitPoint = { x, y: borderY }
      break
    }
    trajectory.push({ x, y, t, v, ek })
  }

  let rPx = 0
  let cx = 0
  let cy = 0

  // 2. 模拟磁场中做匀速圆周运动
  if (hitReason === 'none') {
    const lastSelector = trajectory[trajectory.length - 1]
    const vIn = lastSelector.v
    
    // 磁场偏转物理半径
    const rPhys = (p.m * vIn) / (p.q * B2)
    rPx = rPhys * SCALE

    // 圆弧的圆心位置
    // 在 x = 300 处，粒子出电场。速度方向与水平夹角为 theta
    // 水平速度向右，竖直速度向上 (因为 y 减少)。所以速度向右上方倾斜 theta 弧度
    // 根据左手定则，正电荷速度向右上方，磁场入纸面，洛伦兹力指向右下方 (与速度垂直)
    // 圆心坐标：
    // cx = 300 + rPx * sin(theta)
    // cy = yOut + rPx * cos(theta)
    const theta = out.theta
    cx = DEFLECT.xEnd + rPx * Math.sin(theta)
    cy = lastSelector.y + rPx * Math.cos(theta)

    const tStart = lastSelector.t
    const maxCircleTime = 0.0006 - tStart
    const circleSteps = 80
    const omega = (p.q * B2) / p.m

    for (let i = 1; i <= circleSteps; i++) {
      const frac = i / circleSteps
      const t = tStart + frac * maxCircleTime
      // 粒子作顺时针圆周运动。
      // 粒子相对于圆心的初始极角为 phi_start = PI + theta (因为粒子在圆心左上方)
      // 在顺时针回旋中，极角减小：phi(t) = PI + theta - omega * (t - tStart)
      const phi = Math.PI + theta - omega * (t - tStart)
      
      const x = cx + rPx * Math.cos(phi)
      const y = cy + rPx * Math.sin(phi)
      
      const ek = lastSelector.ek

      // 检测是否撞击右侧荧光屏
      if (x >= DEFLECT.screenX) {
        trajectory.push({ x: DEFLECT.screenX, y, t, v: vIn, ek })
        hitReason = 'film'
        hitPoint = { x: DEFLECT.screenX, y }
        break
      }

      // 检测是否超出上下边界
      if (y <= 10 || y >= 315) {
        trajectory.push({ x, y, t, v: vIn, ek })
        hitReason = 'film'
        hitPoint = { x, y }
        break
      }

      trajectory.push({ x, y, t, v: vIn, ek })
    }
  }

  // 3. 构建 速度-时间 (v - t) 曲线 (km/s)
  const maxTime = 0.0006
  const vPoints: { x: number; y: number }[] = []
  trajectory.forEach((pt) => {
    vPoints.push({ x: pt.t, y: pt.v / 1000 }) // m/s → km/s
  })
  const lastVal = trajectory[trajectory.length - 1]
  if (lastVal && lastVal.t < maxTime) {
    const fillSteps = 10
    const tStart = lastVal.t
    for (let i = 1; i <= fillSteps; i++) {
      const t = tStart + (maxTime - tStart) * (i / fillSteps)
      vPoints.push({ x: t, y: hitReason === 'film' ? lastVal.v / 1000 : 0 })
    }
  }

  // 4. tan(theta) - 电场强度 E 曲线 (静态理论，展示正比关系)
  // tan(theta) = q * E * L / (m * v0^2)
  const tanThetaVsEPoints: { x: number; y: number }[] = []
  for (let eVal = 100; eVal <= 1000; eVal += 50) {
    const tanT = (p.q * eVal * L) / (p.m * vParticle * vParticle)
    tanThetaVsEPoints.push({ x: eVal, y: tanT })
  }

  return {
    trajectory,
    hitReason,
    hitPoint,
    yOffsetPx: out.yOffset * SCALE,
    theta: out.theta,
    rPx,
    cx,
    cy,
    vOut: out.vOut,
    vPoints,
    tanThetaVsEPoints,
  }
}

/** 供外部根据时间获取插值轨迹位置 */
export function getPositionAt(
  trajectory: TrajectoryPoint[],
  time: number,
): TrajectoryPoint {
  if (trajectory.length === 0) {
    return { x: 350, y: 162.5, t: 0, v: 0, ek: 0 }
  }
  if (time <= trajectory[0].t) {
    return trajectory[0]
  }
  const last = trajectory[trajectory.length - 1]
  if (time >= last.t) {
    return last
  }

  // 二分查找插值
  let low = 0
  let high = trajectory.length - 1
  while (low < high - 1) {
    const mid = (low + high) >> 1
    if (trajectory[mid].t <= time) {
      low = mid
    } else {
      high = mid
    }
  }
  const p0 = trajectory[low]
  const p1 = trajectory[high]
  const dt = p1.t - p0.t
  const frac = dt > 0 ? (time - p0.t) / dt : 0
  return {
    x: p0.x + (p1.x - p0.x) * frac,
    y: p0.y + (p1.y - p0.y) * frac,
    t: time,
    v: p0.v + (p1.v - p0.v) * frac,
    ek: p0.ek + (p1.ek - p0.ek) * frac,
  }
}
