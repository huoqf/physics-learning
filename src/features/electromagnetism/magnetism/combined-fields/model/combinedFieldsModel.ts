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
  y1: 130, // 速度选择器下端孔 (修改高度，避免与底片/挡板冲突)
  plateHalf: 37.5, // 极板半间距
  slitR: 3,
  magneticB2RegionY: 130,
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
  /** 连续曲线：固定当前粒子 q，变 m，展示 x = x₀ - 2mv/(qB₂) 线性规律 */
  filmCurve: { x: number; y: number }[]
  /** 3 种实际粒子的标记点（m, xHit） */
  filmMarkers: { x: number; y: number; label: string }[]
  endTime: number // 实际物理结束时间（秒）
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
    // 半圆运动时间 T = πm/(|q|B)，负电荷偏转方向相反但周期相同
    const tHalf = (Math.PI * p.m) / (Math.abs(p.q) * B2)

    // 负电荷在磁场中偏转方向相反（逆时针 vs 顺时针）
    // 正电荷：圆心在左侧，顺时针偏转
    // 负电荷：圆心在右侧，逆时针偏转
    const isNegativeCharge = p.q < 0
    const cx = isNegativeCharge ? SPECTROMETER.xMid + rPx : SPECTROMETER.xMid - rPx
    const cy = SPECTROMETER.y1

    const halfSteps = 40
    const tStart = lastSelector.t

    for (let i = 1; i <= halfSteps; i++) {
      const frac = i / halfSteps
      const t = tStart + frac * tHalf
      // 正电荷：顺时针偏转，theta 从 0 到 PI
      // 负电荷：逆时针偏转，theta 从 PI 到 0
      const theta = isNegativeCharge ? Math.PI - frac * Math.PI : frac * Math.PI
      const x = cx + rPx * Math.cos(theta)
      const y = cy + rPx * Math.sin(theta)
      
      const ek = lastSelector.ek // 磁场不做功，动能恒定
      trajectory.push({ x, y, t, v: vIn, ek })
    }
    hitReason = 'film'
    hitPoint = { x: cx + (isNegativeCharge ? rPx : -rPx), y: cy } // 落在底片上
  }

  // 构建 Ek-t 数据点（使用轨迹实际时间，无需填充空白）
  // 质谱仪动能较低，用 eV 数量级展示（除以 1.602e-19）
  const ekPoints: { x: number; y: number }[] = []
  const lastVal = trajectory[trajectory.length - 1]

  trajectory.forEach(pt => {
    ekPoints.push({ x: pt.t, y: pt.ek / 1.602e-19 }) // J → eV
  })

  // 连续曲线：固定当前粒子 q，变 m，展示 x = x₀ - 2mv/(qB₂) 线性规律
  // m 范围覆盖 3 种粒子 (4 ~ 26 ×10⁻²³ kg)，用当前粒子的 q 计算
  const filmCurve: { x: number; y: number }[] = []
  const mMin = 4.0
  const mMax = 26.0
  const curveSteps = 40
  for (let i = 0; i <= curveSteps; i++) {
    const mVal = mMin + (mMax - mMin) * (i / curveSteps)
    const mPhys = mVal * 1e-23
    const rTemp = (mPhys * vParticle) / (p.q * B2)
    const xHit = SPECTROMETER.xMid - 2 * rTemp * SCALE
    filmCurve.push({ x: mVal, y: xHit })
  }

  // 3 种实际粒子的标记点（各自用真实 q 计算）
  const filmMarkers: { x: number; y: number; label: string }[] = []
  for (const [, particle] of Object.entries(PARTICLES)) {
    const rTemp = (particle.m * vParticle) / (particle.q * B2)
    const xHit = SPECTROMETER.xMid - 2 * rTemp * SCALE
    filmMarkers.push({ x: particle.m * 1e23, y: xHit, label: particle.label })
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
    filmCurve,
    filmMarkers,
    endTime: lastVal.t, // 实际物理结束时间（秒）
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
  endTime: number // 实际物理结束时间（秒）
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

  // 1. Ek - t 曲线（使用轨迹实际时间，无需填充空白）
  // 用 keV 数量级展示，更细致地展现动态波动
  const lastVal = trajectory[trajectory.length - 1]
  const ekPoints: { x: number; y: number }[] = []
  trajectory.forEach((pt) => {
    ekPoints.push({ x: pt.t, y: pt.ek / 1.602e-16 }) // J → keV
  })

  // 2. R - n 曲线 (回旋半径 vs 加速次数)
  const rnPoints: { x: number; y: number }[] = []
  segments.forEach((seg, idx) => {
    rnPoints.push({ x: idx + 1, y: seg.rPx })
  })

  // 3. 最大动能 - 加速电压 U 曲线 (静态理论曲线)
  const ekMaxVsUPoints: { x: number; y: number }[] = []
  const constEkMaxKeV = maxEk / 1.602e-16
  for (let uKV = 1.0; uKV <= 10.0; uKV += 0.5) {
    ekMaxVsUPoints.push({ x: uKV, y: constEkMaxKeV })
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
    endTime: lastVal ? lastVal.t : 0, // 实际物理结束时间（秒）
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
  endTime: number // 实际物理结束时间（秒）
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
  // 电场方向向下（从正极板到负极板）
  // 正电荷：受力向下，向下偏转（y 增加）
  // 负电荷：受力向上，向上偏转（y 减少）
  // x(t) = xStart + v0 * t * SCALE
  // y(t) = yMid + sign(q) * 0.5 * |a_y| * t^2 * SCALE
  const ay = Math.abs(p.q) * E / p.m // 加速度大小（始终为正）
  const direction = p.q > 0 ? 1 : -1 // 正电荷向下，负电荷向上

  for (let i = 0; i <= steps; i++) {
    const frac = i / steps
    const t = frac * tSelector
    const x = DEFLECT.xStart + vParticle * t * SCALE
    const yOffsetPhys = 0.5 * ay * t * t
    const yOffsetPx = yOffsetPhys * SCALE
    const y = DEFLECT.yMid + direction * yOffsetPx // 正电荷向下偏转

    const vy = direction * ay * t // 竖直分速度（正电荷向下为正）
    const v = Math.sqrt(vParticle * vParticle + vy * vy)
    const ek = 0.5 * p.m * v * v

    if (Math.abs(yOffsetPx) >= DEFLECT.plateHalf) {
      const borderY = DEFLECT.yMid + direction * DEFLECT.plateHalf
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

    // 磁场偏转物理半径 R = mv/(|q|B)，始终为正值
    const rPhys = (p.m * vIn) / (Math.abs(p.q) * B2)
    rPx = rPhys * SCALE

    // 粒子出电场时速度方向分析：
    // 正电荷向下偏转：vx 向右，vy 向下（屏幕坐标 y 增加）
    // 速度方向：向右下方，与水平夹角 theta（正角度表示向下）
    const theta = out.theta

    // 洛伦兹力方向（圆心方向），B₂ 入纸面（×）：
    //   正电荷 → 速度向右下 → 洛伦兹力向右上 → 圆心在右上方
    //   负电荷 → 速度向右下 → 洛伦兹力向左下 → 圆心在左下方
    const isNegativeCharge = p.q < 0

    if (isNegativeCharge) {
      // 负电荷：圆心在左下方
      cx = DEFLECT.xEnd - rPx * Math.sin(theta)
      cy = lastSelector.y + rPx * Math.cos(theta)
    } else {
      // 正电荷：圆心在右上方
      cx = DEFLECT.xEnd + rPx * Math.sin(theta)
      cy = lastSelector.y - rPx * Math.cos(theta)
    }

    const tStart = lastSelector.t
    // 磁场偏转时间 = 半圆周期 T/2 = πm/(|q|B)
    const maxCircleTime = (Math.PI * p.m) / (Math.abs(p.q) * B2)
    const circleSteps = 80
    // 角速度 omega = |q|B/m（始终为正）
    const omega = (Math.abs(p.q) * B2) / p.m

    // B₂ 入纸面：正电荷顺时针（phi 减小），负电荷逆时针（phi 增加）
    const phi0 = Math.atan2(lastSelector.y - cy, DEFLECT.xEnd - cx)

    for (let i = 1; i <= circleSteps; i++) {
      const frac = i / circleSteps
      const t = tStart + frac * maxCircleTime
      // 正电荷：顺时针（phi 减小）
      // 负电荷：逆时针（phi 增加）
      const phi = isNegativeCharge ? phi0 + omega * (t - tStart) : phi0 - omega * (t - tStart)

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

  // 3. 构建 速度-时间 (v - t) 曲线（使用轨迹实际时间，无需填充空白）
  const lastVal = trajectory[trajectory.length - 1]
  const vPoints: { x: number; y: number }[] = []
  trajectory.forEach((pt) => {
    vPoints.push({ x: pt.t, y: pt.v / 1000 }) // m/s → km/s
  })

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
    endTime: lastVal ? lastVal.t : 0, // 实际物理结束时间（秒）
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
