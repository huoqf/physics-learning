/**
 * src/physics/experimentMomentum.ts
 * 高考实验：验证动量守恒定律（气垫导轨双滑块光电门碰撞测速）纯物理计算模块
 *
 * 包含：
 * 1. 挡光片宽度与光电门测速原理 (v = Δx / Δt)
 * 2. 气垫导轨 1D 碰撞动量守恒分析 (p_前 = p_后)
 * 3. 弹性碰撞 (e = 1) 与完全非弹性碰撞 (e = 0，粘合)
 * 4. 滑块反弹 (m1 < m2) 负速度与负动量矢量性处理
 * 5. 机械能损失与动量相对误差分析
 * 6. 纯函数设计，无 DOM/React 依赖，全量单测覆盖
 */

export interface MomentumExperimentInput {
  /** 滑块 1（运动碰车）质量 m₁ (kg)，默认 0.400 */
  m1?: number
  /** 滑块 2（目标被碰车）质量 m₂ (kg)，默认 0.200 */
  m2?: number
  /** 滑块 1 碰前速度 v₁ (m/s)，默认 0.80 */
  v1?: number
  /** 滑块 2 碰前速度 v₂ (m/s)，默认 0.00 */
  v2?: number
  /** 挡光片宽度 Δx (mm)，默认 20.0 */
  plateWidth_mm?: number
  /** 碰撞类型：0: 弹性碰撞 (弹簧片), 1: 完全非弹性碰撞 (橡皮泥粘合) */
  collisionType?: number
}

export interface MomentumExperimentPoint {
  label: string
  p_before: number
  p_after: number
}

export interface MomentumExperimentResult {
  /** 滑块 1 质量 m₁ (kg) */
  m1: number
  /** 滑块 2 质量 m₂ (kg) */
  m2: number
  /** 挡光片宽度 Δx (m) */
  plateWidth_m: number
  /** 挡光片宽度 Δx (mm) */
  plateWidth_mm: number
  /** 碰撞类型：0 为弹性碰撞，1 为完全非弹性碰撞 */
  collisionType: number
  /** 恢复系数 e */
  e: number
  /** 碰撞类型中文名称 */
  collisionTypeName: string

  // ─── 碰前状态与光电门 1 测量 ───
  /** 滑块 1 碰前速度 v₁ (m/s) */
  v1: number
  /** 滑块 2 碰前速度 v₂ (m/s) */
  v2: number
  /** 光电门 1 碰前挡光时间 Δt₁ = Δx / |v₁| (s) */
  dt1_before: number
  /** 滑块 1 碰前动量 p₁ = m₁v₁ (kg·m/s) */
  p1_before: number
  /** 滑块 2 碰前动量 p₂ = m₂v₂ (kg·m/s) */
  p2_before: number
  /** 碰前系统总动量 p_前 = p₁ + p₂ (kg·m/s) */
  p_total_before: number
  /** 碰前总动能 E_k,前 (J) */
  Ek_before: number

  // ─── 碰后理论与光电门测量 ───
  /** 滑块 1 碰后速度 v₁' (m/s) */
  v1_after: number
  /** 滑块 2 碰后速度 v₂' (m/s) */
  v2_after: number
  /** 滑块 1 是否发生反弹向左运动 (v₁' < 0) */
  isRebounded: number
  /** 碰后光电门 1 挡光时间 Δt₁' (s，若反弹穿过门 1；若不反弹且停下则为 0) */
  dt1_after: number
  /** 碰后光电门 2 挡光时间 Δt₂' = Δx / |v₂'| (s) */
  dt2_after: number
  /** 滑块 1 碰后动量 p₁' = m₁v₁' (kg·m/s) */
  p1_after: number
  /** 滑块 2 碰后动量 p₂' = m₂v₂' (kg·m/s) */
  p2_after: number
  /** 碰后系统总动量 p_后 = p₁' + p₂' (kg·m/s) */
  p_total_after: number
  /** 碰后总动能 E_k,后 (J) */
  Ek_after: number
  /** 机械能/动能损失 ΔE_k = E_k,前 - E_k,后 (J) */
  Ek_loss: number
  /** 动能损失百分比 (%) */
  Ek_lossPercent: number
  /** 动量守恒相对误差 η = (p_后 - p_前) / p_前 * 100 (%) */
  momentumErrorPercent: number

  // ─── 时空节点（SI 单位，m 与 s） ───
  /** 导轨总长 (m) */
  trackLength: number
  /** 滑块车身长度 (m) */
  sliderLength: number
  /** 光电门 1 坐标位置 (m) */
  gate1Pos: number
  /** 光电门 2 坐标位置 (m) */
  gate2Pos: number
  /** 滑块 1 初始位置 (m) */
  slider1InitPos: number
  /** 滑块 2 初始位置 (m) */
  slider2InitPos: number
  /** 碰撞发生时接触位置 (m) */
  collisionPos: number
  /** 碰前滑块 1 经过光电门 1 的时间区间 [进入时刻, 离开时刻] (s) */
  t_gate1_enter: number
  t_gate1_leave: number
  /** 碰撞发生时刻 (s) */
  t_collision: number
  /** 碰后滑块 2 经过光电门 2 的时间区间 (s) */
  t_gate2_enter: number
  t_gate2_leave: number
  /** 碰后滑块 1 若反弹经过光电门 1 的时间区间 (s) */
  t_gate1_rebound_enter: number
  t_gate1_rebound_leave: number
}

/** 默认参数常量 (SSOT) */
export const MOMENTUM_EXP_DEFAULTS = {
  m1: 0.4,
  m2: 0.2,
  v1: 0.8,
  v2: 0.0,
  plateWidth_mm: 20.0,
  collisionType: 0,
} as const

/** 气轨几何与时空布局基准常量 (m) */
export const MOMENTUM_TRACK_GEOMETRY = {
  trackLength: 1.2,
  sliderLength: 0.12,
  gate1Pos: 0.35,
  gate2Pos: 0.85,
  slider1InitPos: 0.08,
  slider2InitPos: 0.58,
} as const

/**
 * 纯物理计算函数：高考实验·验证动量守恒定律
 *
 * @param input 实验输入参数
 * @returns 完整的动量守恒实验分析结果
 */
export function computeMomentumExperiment(
  input: MomentumExperimentInput = {},
): MomentumExperimentResult {
  const m1 = Math.max(0.05, input.m1 ?? MOMENTUM_EXP_DEFAULTS.m1)
  const m2 = Math.max(0.05, input.m2 ?? MOMENTUM_EXP_DEFAULTS.m2)
  const v1 = Math.max(0.1, input.v1 ?? MOMENTUM_EXP_DEFAULTS.v1)
  const v2 = input.v2 ?? MOMENTUM_EXP_DEFAULTS.v2
  const plateWidth_mm = Math.max(5.0, input.plateWidth_mm ?? MOMENTUM_EXP_DEFAULTS.plateWidth_mm)
  const collisionType = input.collisionType === 1 ? 1 : 0

  const plateWidth_m = plateWidth_mm / 1000
  const e = collisionType === 1 ? 0 : 1
  const collisionTypeName = collisionType === 1 ? '完全非弹性碰撞 (粘合)' : '弹性碰撞 (弹簧片缓冲)'

  // 1. 碰前状态
  const p1_before = m1 * v1
  const p2_before = m2 * v2
  const p_total_before = p1_before + p2_before
  const Ek_before = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
  const dt1_before = plateWidth_m / Math.abs(v1)

  // 2. 碰后状态（基于动量守恒与恢复系数公式）
  // v₁' = ((m₁ - e·m₂)·v₁ + m₂·(1+e)·v₂) / (m₁ + m₂)
  // v₂' = (m₁·(1+e)·v₁ + (m₂ - e·m₁)·v₂) / (m₁ + m₂)
  const v1_after = ((m1 - e * m2) * v1 + m2 * (1 + e) * v2) / (m1 + m2)
  const v2_after = (m1 * (1 + e) * v1 + (m2 - e * m1) * v2) / (m1 + m2)

  const p1_after = m1 * v1_after
  const p2_after = m2 * v2_after
  const p_total_after = p1_after + p2_after
  const Ek_after = 0.5 * m1 * v1_after * v1_after + 0.5 * m2 * v2_after * v2_after
  const Ek_loss = Math.max(0, Ek_before - Ek_after)
  const Ek_lossPercent = Ek_before > 0 ? (Ek_loss / Ek_before) * 100 : 0
  const rawMomentumError =
    p_total_before !== 0
      ? ((p_total_after - p_total_before) / Math.abs(p_total_before)) * 100
      : 0
  const momentumErrorPercent = Math.abs(rawMomentumError) < 1e-4 ? 0 : rawMomentumError

  const isRebounded = v1_after < -1e-5 ? 1 : 0
  const dt1_after = Math.abs(v1_after) > 1e-4 ? plateWidth_m / Math.abs(v1_after) : 0
  const dt2_after = Math.abs(v2_after) > 1e-4 ? plateWidth_m / Math.abs(v2_after) : 0

  // 3. 时空运动学区间计算
  const { trackLength, sliderLength, gate1Pos, gate2Pos, slider1InitPos, slider2InitPos } =
    MOMENTUM_TRACK_GEOMETRY

  // 滑块 1 挡光片位于滑块中央
  const s1PlateInit = slider1InitPos + sliderLength / 2

  // 碰前滑块 1 穿过光电门 1 的时间区间
  const t_gate1_enter = (gate1Pos - plateWidth_m / 2 - s1PlateInit) / v1
  const t_gate1_leave = t_gate1_enter + dt1_before

  // 碰撞发生时刻：滑块 1 前端接触滑块 2 后端
  // 接触条件：x1_front = x2_back -> (x1 + sliderLength) = x2 -> dist = slider2InitPos - slider1InitPos - sliderLength
  const colDistance = slider2InitPos - slider1InitPos - sliderLength
  const t_collision = colDistance / v1
  const collisionPos = slider2InitPos

  // 碰后滑块 2 穿过光电门 2 的时间区间
  let t_gate2_enter = Infinity
  let t_gate2_leave = Infinity
  if (v2_after > 1e-4) {
    const s2PlateAtCol = collisionPos + sliderLength / 2
    t_gate2_enter = t_collision + (gate2Pos - plateWidth_m / 2 - s2PlateAtCol) / v2_after
    t_gate2_leave = t_gate2_enter + dt2_after
  }

  // 碰后滑块 1 若反弹穿过光电门 1 的时间区间
  let t_gate1_rebound_enter = Infinity
  let t_gate1_rebound_leave = Infinity
  if (v1_after < -1e-4) {
    const s1PlateAtCol = collisionPos - sliderLength / 2
    t_gate1_rebound_enter =
      t_collision + (s1PlateAtCol - (gate1Pos + plateWidth_m / 2)) / Math.abs(v1_after)
    t_gate1_rebound_leave = t_gate1_rebound_enter + dt1_after
  }

  return {
    m1,
    m2,
    plateWidth_m,
    plateWidth_mm,
    collisionType,
    e,
    collisionTypeName,
    v1,
    v2,
    dt1_before,
    p1_before,
    p2_before,
    p_total_before,
    Ek_before,
    v1_after,
    v2_after,
    isRebounded,
    dt1_after,
    dt2_after,
    p1_after,
    p2_after,
    p_total_after,
    Ek_after,
    Ek_loss,
    Ek_lossPercent,
    momentumErrorPercent,
    trackLength,
    sliderLength,
    gate1Pos,
    gate2Pos,
    slider1InitPos,
    slider2InitPos,
    collisionPos,
    t_gate1_enter,
    t_gate1_leave,
    t_collision,
    t_gate2_enter,
    t_gate2_leave,
    t_gate1_rebound_enter,
    t_gate1_rebound_leave,
  }
}

/**
 * 计算任意时刻 t 下两滑块的位置与光电门状态（用于中屏动态渲染）
 */
export function computeTrackSlidersAtTime(
  time: number,
  res: MomentumExperimentResult,
): {
  x1: number
  x2: number
  v1: number
  v2: number
  gate1Active: boolean
  gate2Active: boolean
  gate1DisplayTime: number
  gate1BeforeTime: number
  gate1ReboundTime: number
  gate2DisplayTime: number
} {
  const {
    v1,
    v1_after,
    v2_after,
    slider1InitPos,
    slider2InitPos,
    t_collision,
    dt1_before,
    dt1_after,
    dt2_after,
    t_gate1_enter,
    t_gate1_leave,
    t_gate2_enter,
    t_gate2_leave,
    t_gate1_rebound_enter,
    t_gate1_rebound_leave,
  } = res

  let x1: number
  let x2: number
  let currentV1: number
  let currentV2: number

  if (time <= t_collision) {
    x1 = slider1InitPos + v1 * time
    x2 = slider2InitPos
    currentV1 = v1
    currentV2 = 0
  } else {
    const dtAfter = time - t_collision
    x1 = slider2InitPos - res.sliderLength + v1_after * dtAfter
    x2 = slider2InitPos + v2_after * dtAfter
    currentV1 = v1_after
    currentV2 = v2_after
  }

  // 光电门遮光检测
  const gate1BeforeActive = time >= t_gate1_enter && time <= t_gate1_leave
  const gate1ReboundActive = time >= t_gate1_rebound_enter && time <= t_gate1_rebound_leave
  const gate1Active = gate1BeforeActive || gate1ReboundActive
  const gate2Active = time >= t_gate2_enter && time <= t_gate2_leave

  // 液晶数字表显示数值（挡光中显示当前计时，挡光完毕锁定读数，未到时显示 0）
  let gate1BeforeTime = 0
  if (time >= t_gate1_leave) {
    gate1BeforeTime = dt1_before
  } else if (time >= t_gate1_enter) {
    gate1BeforeTime = Math.min(dt1_before, time - t_gate1_enter)
  }

  let gate1ReboundTime = 0
  if (time >= t_gate1_rebound_leave) {
    gate1ReboundTime = dt1_after
  } else if (time >= t_gate1_rebound_enter) {
    gate1ReboundTime = Math.min(dt1_after, time - t_gate1_rebound_enter)
  }

  const gate1DisplayTime = gate1ReboundTime > 0 ? gate1ReboundTime : gate1BeforeTime

  let gate2DisplayTime = 0
  if (time >= t_gate2_leave) {
    gate2DisplayTime = dt2_after
  } else if (time >= t_gate2_enter) {
    gate2DisplayTime = Math.min(dt2_after, time - t_gate2_enter)
  }

  // 气垫导轨两端物理限位（防脱缓冲挡块）
  const leftStopPos = 0.0
  const rightStopPos = res.trackLength - res.sliderLength
  if (x1 < leftStopPos) {
    x1 = leftStopPos
    currentV1 = 0
  }
  if (x2 > rightStopPos) {
    x2 = rightStopPos
    currentV2 = 0
  }

  return {
    x1,
    x2,
    v1: currentV1,
    v2: currentV2,
    gate1Active,
    gate2Active,
    gate1DisplayTime,
    gate1BeforeTime,
    gate1ReboundTime,
    gate2DisplayTime,
  }
}

