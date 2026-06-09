import { useMemo } from 'react'
import { computeUniformAccelerationData, UniformAccelerationPhysicsData, FlashPoint, VtChartPoint } from '@/physics'

/** @deprecated 从 @/physics 导入 */
export type { FlashPoint }
/** @deprecated 从 @/physics 导入 */
export type { VtChartPoint }
/** @deprecated 从 @/physics 导入 */
export type { UniformAccelerationPhysicsData }

/**
 * 匀变速直线运动物理计算 Hook
 *
 * 纯物理计算，不截断。v = v₀ + at 对所有 t 成立，
 * 物体减速过零后反向运动是匀变速的正常行为。
 * "刹车死区"仅作为高考审题陷阱提示，不影响物理计算。
 */
export function useUniformAccelerationPhysics(
  v0: number,
  a: number,
  time: number,
  flashInterval: number = 0.5
): UniformAccelerationPhysicsData {
  return useMemo(
    () => computeUniformAccelerationData(v0, a, time, flashInterval),
    [v0, a, time, flashInterval]
  )
}
