// ─── 速度概念教学：平均速度 / 瞬时速度 / 割线切线 ────────────────────────────

/**
 * 计算平均速度
 * @param x1 初始位置 (m)
 * @param x2 末位置 (m)
 * @param t1 初始时刻 (s)
 * @param t2 末时刻 (s)
 * @returns 平均速度 v̄ (m/s)、位移差 Δx (m)、时间差 Δt (s)
 */
export function calculateAverageVelocity(
  x1: number, x2: number, t1: number, t2: number
): { vBar: number; deltaX: number; deltaT: number } {
  const deltaT = t2 - t1
  const deltaX = x2 - x1
  const vBar = deltaT !== 0 ? deltaX / deltaT : 0
  return { vBar, deltaX, deltaT }
}

/** 变加速运动模型类型 */
export type VariableMotionModel = 'force-increasing' | 'shm' | 'multi-stage'

/** 变加速运动模型参数 */
export interface VariableMotionParams {
  /** 力递增模型：加速度系数 k (m/s³)，a = k·t */
  k?: number
  /** 简谐振动：振幅 A (m) */
  A?: number
  /** 简谐振动：角频率 ω (rad/s) */
  omega?: number
  /** 多阶段模型：初速度 v0 (m/s) */
  v0?: number
  /** 多阶段模型：加速度 a1 (m/s²) */
  a1?: number
  /** 多阶段模型：匀速段速度 vMax (m/s) */
  vMax?: number
  /** 多阶段模型：减速段加速度 a3 (m/s²)，正值 */
  a3?: number
  /** 多阶段模型：加速段时长 t1 (s) */
  t1?: number
  /** 多阶段模型：匀速段时长 t2 (s) */
  t2Duration?: number
  /** 多阶段模型：卸货停留时长 tStop (s) */
  tStop?: number
  /** 多阶段模型：返回段加速度 a5 (m/s²)，正值 */
  a5?: number
}

/**
 * 计算变加速直线运动在时刻 t 的位置、速度、加速度
 *
 * 三种模型：
 * - `'force-increasing'`：a = k·t，v = v₀ + ½k·t²，x = v₀·t + k·t³/6
 * - `'shm'`：x = A·sin(ωt)，v = Aω·cos(ωt)，a = -Aω²·sin(ωt)
 * - `'multi-stage'`：三段式（加速→匀速→减速）
 *
 * @param model 运动模型类型
 * @param params 模型参数
 * @param t 查询时刻 (s)
 * @returns 位置 x (m)、速度 v (m/s)、加速度 a (m/s²)
 */
export function calculateVariableAcceleration(
  model: VariableMotionModel,
  params: VariableMotionParams,
  t: number
): { x: number; v: number; a: number } {
  switch (model) {
    case 'force-increasing': {
      // a = k·t, v = v₀ + ½k·t², x = v₀·t + k·t³/6
      const k = params.k ?? 1
      const v0 = params.v0 ?? 0
      return {
        a: k * t,
        v: v0 + 0.5 * k * t * t,
        x: v0 * t + (k * t * t * t) / 6,
      }
    }
    case 'shm': {
      // x = A·sin(ωt), v = Aω·cos(ωt), a = -Aω²·sin(ωt)
      const A = params.A ?? 5
      const omega = params.omega ?? 2
      return {
        x: A * Math.sin(omega * t),
        v: A * omega * Math.cos(omega * t),
        a: -A * omega * omega * Math.sin(omega * t),
      }
    }
    case 'multi-stage': {
      // 五段式：正向加速(a1) → 正向匀速(vMax) → 正向减速(a3) → 卸货停留 → 快速返回(a5)
      const v0 = params.v0 ?? 0
      const a1 = params.a1 ?? 2
      const vMax = params.vMax ?? 6
      const a3 = params.a3 ?? 3
      const t1 = params.t1 ?? 3
      const t2Duration = params.t2Duration ?? 2
      const tStop = params.tStop ?? 2
      const a5 = params.a5 ?? 3

      // 阶段1：正向加速 0→t1End
      const t1End = t1
      const x1End = v0 * t1 + 0.5 * a1 * t1 * t1

      // 阶段2：正向匀速 t1End→t2End
      const t2End = t1End + t2Duration
      const x2End = x1End + vMax * t2Duration

      // 阶段3：正向减速 t2End→t3End
      const t3Duration = vMax / a3
      const t3End = t2End + t3Duration
      const x3End = x2End + vMax * t3Duration - 0.5 * a3 * t3Duration * t3Duration

      // 阶段4：卸货停留 t3End→t4End
      const t4End = t3End + tStop

      // 阶段5：快速返回 t4End→t5End
      const t5Duration = Math.sqrt(2 * x3End / a5)
      const t5End = t4End + t5Duration

      if (t <= t1End) {
        // 阶段1：正向加速
        return {
          x: v0 * t + 0.5 * a1 * t * t,
          v: v0 + a1 * t,
          a: a1,
        }
      } else if (t <= t2End) {
        // 阶段2：正向匀速
        const dt = t - t1End
        return {
          x: x1End + vMax * dt,
          v: vMax,
          a: 0,
        }
      } else if (t <= t3End) {
        // 阶段3：正向减速
        const dt = t - t2End
        return {
          x: x2End + vMax * dt - 0.5 * a3 * dt * dt,
          v: vMax - a3 * dt,
          a: -a3,
        }
      } else if (t <= t4End) {
        // 阶段4：卸货停留
        return {
          x: x3End,
          v: 0,
          a: 0,
        }
      } else if (t <= t5End) {
        // 阶段5：快速返回（向左加速）
        const dt = t - t4End
        return {
          x: x3End - 0.5 * a5 * dt * dt,
          v: -a5 * dt,
          a: -a5,
        }
      } else {
        // 全程结束，回到起点
        return { x: 0, v: 0, a: 0 }
      }
    }
  }
}

/**
 * 计算割线斜率（平均速度的几何意义）
 *
 * 在 x-t 图象上，连接 t₀ 和 t₀+Δt 两点的割线斜率即为该时间段的平均速度。
 *
 * @param model 运动模型类型
 * @param params 模型参数
 * @param t0 考察时刻 (s)
 * @param deltaT 时间间隔 Δt (s)，必须 > 0
 * @returns 割线斜率 slope (m/s)、位移差 deltaX (m)、时间差 deltaT (s)
 */
export function calculateSecantSlope(
  model: VariableMotionModel,
  params: VariableMotionParams,
  t0: number,
  deltaT: number
): { slope: number; deltaX: number; deltaT: number } {
  const p0 = calculateVariableAcceleration(model, params, t0)
  const p1 = calculateVariableAcceleration(model, params, t0 + deltaT)
  const deltaX = p1.x - p0.x
  const slope = deltaT !== 0 ? deltaX / deltaT : 0
  return { slope, deltaX, deltaT }
}

/**
 * 计算切线斜率（瞬时速度的几何意义）
 *
 * 使用解析导数直接计算，而非数值逼近。
 *
 * @param model 运动模型类型
 * @param params 模型参数
 * @param t0 考察时刻 (s)
 * @returns 切线斜率即瞬时速度 (m/s)
 */
export function calculateTangentSlope(
  model: VariableMotionModel,
  params: VariableMotionParams,
  t0: number
): number {
  const { v } = calculateVariableAcceleration(model, params, t0)
  return v
}

/**
 * 计算瞬时速度逼近：同时给出割线斜率（平均速度）和切线斜率（瞬时速度）及其残差
 *
 * 用于进阶版"Δt→0 极限逼近"教学演示。
 *
 * @param model 运动模型类型
 * @param params 模型参数
 * @param t0 考察时刻 (s)
 * @param deltaT 时间间隔 Δt (s)
 * @returns 割线斜率 vBar (m/s)、切线斜率 vInst (m/s)、绝对残差 residual (m/s)
 */
export function calculateInstantaneousVelocity(
  model: VariableMotionModel,
  params: VariableMotionParams,
  t0: number,
  deltaT: number
): { vBar: number; vInst: number; residual: number } {
  const { slope: vBar } = calculateSecantSlope(model, params, t0, deltaT)
  const vInst = calculateTangentSlope(model, params, t0)
  return { vBar, vInst, residual: Math.abs(vBar - vInst) }
}

export function calculateUniformMotion(v: number, t: number): { s: number } {
  return { s: v * t };
}

export function calculateAcceleratedMotion(v0: number, a: number, t: number): { v: number; s: number } {
  return {
    v: v0 + a * t,
    s: v0 * t + 0.5 * a * t * t
  };
}

export function calculateFreeFall(v0: number, g: number, t: number): { v: number; y: number } {
  return {
    v: v0 + g * t,
    y: v0 * t + 0.5 * g * t * t
  };
}

/**
 * 计算平抛运动状态（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，x 轴向右为正，y 轴向上为正。
 * 水平方向匀速，竖直方向自由落体（加速度向下）。
 *
 * @param v0x 水平初速度 (m/s)，正值
 * @param g 重力加速度 (m/s²)，正值
 * @param t 运动时间 (s)
 * @returns x 水平位移 (m)、y 竖直位移 (m，下落为负)、vx 水平速度 (m/s)、vy 竖直速度 (m/s，向下为负)、v 合速度大小 (m/s)、angle 合速度与水平方向夹角 (rad)
 */
export function calculateProjectileMotion(v0x: number, g: number, t: number): { x: number; y: number; vx: number; vy: number; v: number; angle: number } {
  const x = v0x * t;
  const y = -0.5 * g * t * t;
  const vx = v0x;
  const vy = -g * t;
  const v = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(vy, vx);
  return { x, y, vx, vy, v, angle };
}

/**
 * 计算斜抛运动状态（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，x 轴向右为正，y 轴向上为正。
 * 水平方向匀速，竖直方向初速度向上、加速度向下。
 *
 * @param v0 初速度大小 (m/s)
 * @param angleDeg 抛射角 (°)，相对水平方向，向上为正
 * @param g 重力加速度 (m/s²)，正值
 * @param t 运动时间 (s)
 * @returns x 水平位移 (m)、y 竖直位移 (m，向上为正)、vx 水平速度 (m/s)、vy 竖直速度 (m/s，向上为正)
 */
export function calculateObliqueThrow(v0: number, angleDeg: number, g: number, t: number): { x: number; y: number; vx: number; vy: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);
  return {
    x: v0x * t,
    y: v0y * t - 0.5 * g * t * t,
    vx: v0x,
    vy: v0y - g * t
  };
}

/**
 * 计算斜抛运动的射程、最大高度和总飞行时间（无空气阻力）
 *
 * 物理坐标系：抛出点为原点，y 轴向上为正，落回抛出高度时飞行结束。
 * 公式：R = v₀²sin2θ/g，H = v₀²sin²θ/(2g)，T = 2v₀sinθ/g
 *
 * @param v0 初速度大小 (m/s)
 * @param angleDeg 抛射角 (°)，相对水平方向，向上为正
 * @param g 重力加速度 (m/s²)，正值
 * @returns range 水平射程 (m)、maxHeight 最大高度 (m)、totalTime 总飞行时间 (s)
 */
export function calculateObliqueThrowRange(v0: number, angleDeg: number, g: number): { range: number; maxHeight: number; totalTime: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const totalTime = (2 * v0 * Math.sin(angleRad)) / g;
  const range = (v0 * v0 * Math.sin(2 * angleRad)) / g;
  const maxHeight = (v0 * v0 * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * g);
  return { range, maxHeight, totalTime };
}

/**
 * 计算匀速圆周运动状态
 *
 * 物理坐标系：圆心为原点，x 轴向右为正，y 轴向上为正。
 * 角度从 x 正方向逆时针旋转，θ = ωt。
 *
 * @param r 圆周运动半径 (m)，正值
 * @param omega 角速度 (rad/s)，正值表示逆时针
 * @param t 运动时间 (s)
 * @returns x 水平坐标 (m)、y 竖直坐标 (m，向上为正)、v 线速度大小 (m/s)、a_c 向心加速度大小 (m/s²)、period 周期 (s)
 */
export function calculateCircularMotion(r: number, omega: number, t: number): { x: number; y: number; v: number; a_c: number; period: number } {
  const angle = omega * t;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    v: r * omega,
    a_c: r * omega * omega,
    period: (2 * Math.PI) / omega
  };
}

/**
 * 由周期推算匀速圆周运动参数
 *
 * @param r 圆周运动半径 (m)，正值
 * @param T 周期 (s)，正值
 * @returns omega 角速度 (rad/s)、v 线速度大小 (m/s)、a_c 向心加速度大小 (m/s²)
 */
export function calculateCircularFromPeriod(r: number, T: number): { omega: number; v: number; a_c: number } {
  const omega = (2 * Math.PI) / T;
  return {
    omega,
    v: r * omega,
    a_c: r * omega * omega
  };
}

interface FreeFallPoint {
  time: number;
  y: number;
  v: number;
  a: number;
}

export function calculateFreeFallWithDrag(v0: number, g: number, dragK: number, m: number, totalTime: number, dt: number = 0.001): { positions: FreeFallPoint[]; finalY: number; finalV: number; isTerminal: boolean } {
  if (dragK === 0) {
    const points: FreeFallPoint[] = [];
    for (let t = 0; t <= totalTime + 0.0001; t += 0.1) {
      const { v, y } = calculateFreeFall(v0, g, t);
      points.push({ time: t, y, v, a: g });
    }
    const { v: finalV, y: finalY } = calculateFreeFall(v0, g, totalTime);
    return { positions: points, finalY, finalV, isTerminal: false };
  }

  const points: FreeFallPoint[] = []
  let currentV = v0;
  let currentY = 0;
  let t = 0;

  points.push({ time: 0, y: 0, v: v0, a: g });

  const terminalV = Math.sqrt((m * g) / dragK);

  while (t <= totalTime + 0.0001) {
    const acceleration = g - (dragK * currentV * Math.abs(currentV)) / m;
    currentV += acceleration * dt;
    currentY += currentV * dt;
    t += dt;

    if (Math.abs(acceleration) < 0.001 || Math.abs(currentV) >= terminalV * 0.999) {
      break;
    }
  }

  return {
    positions: points,
    finalY: currentY,
    finalV: currentV,
    isTerminal: Math.abs(currentV) >= terminalV * 0.999
  };
}

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
    // a = -g - k·v（阻力方向始终与速度方向相反）
    const a = -g - k * currentV
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

// ─── 加速度概念教学：双物体对比 / 运动状态判定 / 变加速运动 ──────────────────

/**
 * 双物体加速度对比计算（基础版）。
 * 飞机A做匀速运动（a=0），跑车B从静止做匀加速运动。
 * @param vA - 飞机A恒定速度 (m/s)
 * @param aB - 跑车B加速度 (m/s²)
 * @param deltaT - 观测时间微元 (s)
 * @param t - 当前时刻 (s)
 * @returns 双物体各物理量及核心结论
 */
export function calculateDualObjectComparison(
  vA: number,
  aB: number,
  deltaT: number,
  t: number
): {
  /** 飞机当前速度 (m/s) */
  vA: number
  /** 跑车当前速度 (m/s) */
  vB: number
  /** 飞机速度变化量 (m/s)，恒为0 */
  deltaVA: number
  /** 跑车速度变化量 (m/s) */
  deltaVB: number
  /** 飞机加速度 (m/s²)，恒为0 */
  aA: number
  /** 跑车加速度 (m/s²) */
  aB: number
  /** 飞机位移 (m) */
  sA: number
  /** 跑车位移 (m) */
  sB: number
  /** 核心结论文字 */
  conclusion: string
} {
  const vB = aB * t
  const deltaVA = 0
  const deltaVB = aB * deltaT
  const aA = 0
  const sA = vA * t
  const sB = 0.5 * aB * t * t

  let conclusion: string
  if (t === 0) {
    conclusion = '点击播放，观察速度与加速度的区别'
  } else if (vA > vB) {
    conclusion = `v_A > v_B，但 a_A < a_B`
  } else {
    conclusion = `v_B 已超过 v_A！加速度的"延迟回报"显现`
  }

  return { vA, vB, deltaVA, deltaVB, aA, aB, sA, sB, conclusion }
}

/**
 * 根据速度与加速度方向判定运动状态（进阶版）。
 * @param v - 当前速度 (m/s)
 * @param a - 当前加速度 (m/s²)
 * @returns 矢量方向关系与运动状态
 */
export function determineMotionState(
  v: number,
  a: number
): {
  /** v⃗ 与 a⃗ 的方向关系 */
  direction: '同向' | '反向' | '速度为零'
  /** 运动状态判定 */
  motion: '加速' | '减速' | '匀速'
} {
  if (Math.abs(v) < 1e-9) {
    return { direction: '速度为零', motion: a !== 0 ? '加速' : '匀速' }
  }
  if (Math.abs(a) < 1e-9) {
    return { direction: v > 0 ? '同向' : '反向', motion: '匀速' }
  }
  const sameDirection = (v > 0 && a > 0) || (v < 0 && a < 0)
  return {
    direction: sameDirection ? '同向' : '反向',
    motion: sameDirection ? '加速' : '减速',
  }
}

/**
 * 变加速直线运动计算（进阶版）。
 * 加速度随时间线性减小：a(t) = a₀ - k·t
 * v(t) = v₀ + a₀·t - ½·k·t²
 * s(t) = v₀·t + ½·a₀·t² - (1/6)·k·t³
 * @param v0 - 初速度 (m/s)
 * @param a0 - 初始加速度 (m/s²)
 * @param k - 加速度衰减率 (m/s³)，正值表示加速度在减小
 * @param t - 当前时刻 (s)
 * @returns 速度、位移、当前加速度
 */
export function calculateVariableAccelerationMotion(
  v0: number,
  a0: number,
  k: number,
  t: number
): {
  /** 当前速度 (m/s) */
  v: number
  /** 位移 (m) */
  s: number
  /** 当前加速度 (m/s²) */
  a: number
} {
  const a = a0 - k * t
  const v = v0 + a0 * t - 0.5 * k * t * t
  const s = v0 * t + 0.5 * a0 * t * t - (k * t * t * t) / 6
  return { v, s, a }
}

/**
 * 根据纬度计算重力加速度（Somigliana 近似）
 * @param latitude 纬度 φ (°)
 * @returns g (m/s²)
 */
export function calcGByLatitude(latitude: number): number {
  const phi = (latitude * Math.PI) / 180
  return 9.780327 * (1 + 0.0053024 * Math.sin(phi) * Math.sin(phi) - 0.0000058 * Math.sin(2 * phi) * Math.sin(2 * phi))
}

/**
 * 根据海拔修正重力加速度
 * @param g0 海平面重力加速度 (m/s²)
 * @param altitude 海拔高度 (km)
 * @returns 修正后 g (m/s²)
 */
export function calcGByAltitude(g0: number, altitude: number): number {
  const EARTH_RADIUS_KM = 6371
  return g0 * (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitude)) ** 2
}

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

// ─── 轨迹插值器（从 features/ Hook 中提取 of 纯计算逻辑）────────────────────────

/**
 * 自由落体轨迹插值状态
 * @property y 位置 (m)
 * @property v 速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property fDrag 空气阻力 (N)
 * @property swayAngle 摆动角度 (rad)
 * @property swayDx 摆动水平偏移 (px)
 * @property isLanded 是否已落地
 */
export interface FreeFallState {
  y: number
  v: number
  a: number
  fDrag: number
  swayAngle: number
  swayDx: number
  isLanded: boolean
}

/**
 * 根据时间从预计算离散轨迹点中插值出自由落体状态
 *
 * 时间复杂度 O(1)：通过 samplingInterval 直接计算数组索引，再做线性插值。
 *
 * @param points 预计算轨迹点数组（由 precomputeFreeFallWithDrag 生成）
 * @param time 查询时刻 (s)
 * @param groundTime 落地时刻 (s)
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 * @returns 插值后的自由落体状态
 */
export function getPhysicsAtTime(
  points: FreeFallTrajectoryPoint[],
  time: number,
  groundTime: number,
  samplingInterval: number = 0.01
): FreeFallState {
  if (points.length === 0) {
    return { y: 0, v: 0, a: 0, fDrag: 0, swayAngle: 0, swayDx: 0, isLanded: false }
  }

  // 落地边界截断
  if (time >= groundTime) {
    const last = points[points.length - 1]
    return {
      y: last.y,
      v: 0, // 落地后速度归零
      a: 0,
      fDrag: 0,
      swayAngle: 0,
      swayDx: 0,
      isLanded: true
    }
  }

  if (time <= 0) {
    const first = points[0]
    return {
      y: first.y,
      v: first.v,
      a: first.a,
      fDrag: first.fDrag,
      swayAngle: first.swayAngle,
      swayDx: first.swayDx,
      isLanded: false
    }
  }

  // 索引定位 + 线性插值
  const idx = Math.floor(time / samplingInterval)

  if (idx >= points.length - 1) {
    const last = points[points.length - 1]
    return {
      y: last.y,
      v: last.v,
      a: last.a,
      fDrag: last.fDrag,
      swayAngle: last.swayAngle,
      swayDx: last.swayDx,
      isLanded: false
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const tDiff = p1.t - p0.t
  const ratio = tDiff > 0 ? (time - p0.t) / tDiff : 0

  return {
    y: p0.y + (p1.y - p0.y) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    fDrag: p0.fDrag + (p1.fDrag - p0.fDrag) * ratio,
    swayAngle: p0.swayAngle + (p1.swayAngle - p0.swayAngle) * ratio,
    swayDx: p0.swayDx + (p1.swayDx - p0.swayDx) * ratio,
    isLanded: false
  }
}

/**
 * 变速运动轨迹插值状态
 * @property x 位置 (m)
 * @property v 速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property s 累计路程 (m)
 */
export interface VariableMotionState {
  x: number
  v: number
  a: number
  s: number
}

/**
 * 根据时间从预计算离散轨迹点中插值出变速运动状态
 *
 * 时间复杂度 O(1)：通过 samplingInterval 直接计算数组索引，再做线性插值。
 *
 * @param points 预计算轨迹点数组（由 precomputeVariableMotion 生成）
 * @param time 查询时刻 (s)
 * @param tMax 最大预计算时间 (s)
 * @param samplingInterval 采样间隔 (s)，默认 0.01
 * @returns 插值后的变速运动状态
 */
export function getVariablePhysicsAtTime(
  points: VariableMotionTrajectoryPoint[],
  time: number,
  tMax: number,
  samplingInterval: number = 0.01
): VariableMotionState {
  if (points.length === 0) {
    return { x: 0, v: 0, a: 0, s: 0 }
  }

  // 边界截断
  if (time >= tMax) {
    const last = points[points.length - 1]
    return {
      x: last.x,
      v: last.v,
      a: last.a,
      s: last.s
    }
  }

  if (time <= 0) {
    const first = points[0]
    return {
      x: first.x,
      v: first.v,
      a: first.a,
      s: first.s
    }
  }

  // 索引定位 + 线性插值
  const idx = Math.floor(time / samplingInterval)

  if (idx >= points.length - 1) {
    const last = points[points.length - 1]
    return {
      x: last.x,
      v: last.v,
      a: last.a,
      s: last.s
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const tDiff = p1.t - p0.t
  const ratio = tDiff > 0 ? (time - p0.t) / tDiff : 0

  return {
    x: p0.x + (p1.x - p0.x) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    s: p0.s + (p1.s - p0.s) * ratio
  }
}

/**
 * 匀变速运动频闪点
 * @property time 时刻 (s)
 * @property velocity 速度 (m/s)
 * @property displacement 位移 (m)
 */
export interface FlashPoint {
  time: number
  velocity: number
  displacement: number
}

/**
 * v-t 图数据点
 * @property x 时间 (s)
 * @property y 速度 (m/s)
 */
export interface VtChartPoint {
  x: number
  y: number
}

/**
 * 匀变速直线运动物理计算结果
 * @property v0 初速度 (m/s)
 * @property a 加速度 (m/s²)
 * @property v 当前速度 (m/s)
 * @property s 当前位移 (m)
 * @property flashPoints 频闪点数组
 * @property vtChartData v-t 图数据点数组
 */
export interface UniformAccelerationPhysicsData {
  v0: number
  a: number
  v: number
  s: number
  flashPoints: FlashPoint[]
  vtChartData: VtChartPoint[]
}

/** 频闪点默认间隔 (s) */
const DEFAULT_FLASH_INTERVAL = 0.5
/** 频闪点最大数量 */
const MAX_FLASH_POINTS = 20

/**
 * 计算匀变速直线运动的完整物理数据（频闪点 + v-t 图）
 *
 * 纯计算函数，不依赖 React。可被 Hook 包装以实现 useMemo 缓存。
 *
 * @param v0 初速度 (m/s)
 * @param a 加速度 (m/s²)
 * @param time 当前时刻 (s)
 * @param flashInterval 频闪间隔 (s)，默认 0.5
 * @returns 匀变速运动物理数据
 */
export function computeUniformAccelerationData(
  v0: number,
  a: number,
  time: number,
  flashInterval: number = DEFAULT_FLASH_INTERVAL
): UniformAccelerationPhysicsData {
  const { v, s } = calculateAcceleratedMotion(v0, a, time)

  // 频闪点计算：按 flashInterval 采样到当前时间
  const flashPoints: FlashPoint[] = []
  if (flashInterval > 0) {
    const count = Math.min(Math.floor(time / flashInterval), MAX_FLASH_POINTS)
    for (let i = 0; i <= count; i++) {
      const t = i * flashInterval
      const result = calculateAcceleratedMotion(v0, a, t)
      flashPoints.push({ time: t, velocity: result.v, displacement: result.s })
    }
  }

  // v-t 图数据：固定绘制 0~8s，保证图表稳定
  const vtChartData: VtChartPoint[] = []
  const dt = 0.1
  const totalT = 8
  for (let t = 0; t <= totalT + dt; t += dt) {
    const { v: vel } = calculateAcceleratedMotion(v0, a, t)
    vtChartData.push({ x: parseFloat(t.toFixed(1)), y: vel })
  }

  return {
    v0,
    a,
    v,
    s,
    flashPoints,
    vtChartData,
  }
}