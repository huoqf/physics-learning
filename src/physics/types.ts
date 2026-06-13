/**
 * 物理计算模块共享类型定义。
 *
 * 各计算模块（kinematics、dynamics 等）的函数返回值类型分散在各自文件中，
 * 本文件汇聚跨模块复用的公共类型，以及统一的计算结果包装类型。
 */

/** 物理计算结果包装 */
export interface PhysicsResult<T> {
  /** 计算值 */
  value: T
  /** 是否有效（参数超出物理意义范围时为 false） */
  valid: boolean
  /** 无效时的原因说明 */
  reason?: string
}

/** 带单位的物理量 */
export interface PhysicalQuantity {
  label: string
  value: number
  unit: string
}

/** 轨迹点（位置 + 时间） */
export interface TrajectoryPoint {
  t: number
  x: number
  y: number
  vx?: number
  vy?: number
}
