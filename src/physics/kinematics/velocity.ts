import { calculateVariableAcceleration, type VariableMotionModel, type VariableMotionParams } from './base'

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
