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
