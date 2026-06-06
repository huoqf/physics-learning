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

export function calculateProjectileMotion(v0x: number, g: number, t: number): { x: number; y: number; vx: number; vy: number; v: number; angle: number } {
  const x = v0x * t;
  const y = 0.5 * g * t * t;
  const vx = v0x;
  const vy = g * t;
  const v = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(vy, vx);
  return { x, y, vx, vy, v, angle };
}

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

export function calculateObliqueThrowRange(v0: number, angleDeg: number, g: number): { range: number; maxHeight: number; totalTime: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const totalTime = (2 * v0 * Math.sin(angleRad)) / g;
  const range = (v0 * v0 * Math.sin(2 * angleRad)) / g;
  const maxHeight = (v0 * v0 * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * g);
  return { range, maxHeight, totalTime };
}

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
export function precomputeVerticalThrowTrajectory(
  v0: number,
  g: number,
  k: number,
  dt: number = 0.02
): { points: { t: number; v: number; y: number }[]; peakTime: number; landTime: number; maxHeight: number } {
  if (k === 0) {
    const peakTime = v0 / g
    const maxHeight = (v0 * v0) / (2 * g)
    const landTime = (2 * v0) / g
    const points: { t: number; v: number; y: number }[] = []
    for (let t = 0; t <= landTime + dt; t += dt) {
      const v = v0 - g * t
      const y = v0 * t - 0.5 * g * t * t
      points.push({ t, v, y: Math.max(y, 0) })
    }
    return { points, peakTime, landTime, maxHeight }
  }
  // 欧拉法
  let currentV = v0
  let currentY = 0
  let currentTime = 0
  let peakTime = 0
  let maxHeight = 0
  let landTime = 0
  const points: { t: number; v: number; y: number }[] = [{ t: 0, v: v0, y: 0 }]
  const maxIter = 50000
  for (let i = 0; i < maxIter; i++) {
    const a = -g - k * currentV
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
  return { points, peakTime, landTime, maxHeight }
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