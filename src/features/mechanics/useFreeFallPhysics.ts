import { useMemo } from 'react'
import { precomputeFreeFallWithDrag, FreeFallTrajectoryPoint, FreeFallState, getPhysicsAtTime } from '@/physics'

export type { FreeFallState } from '@/physics'
export { getPhysicsAtTime } from '@/physics'

export interface UseFreeFallPhysicsResult {
  points: FreeFallTrajectoryPoint[]
  groundTime: number
  currentState: FreeFallState
}

/**
 * 自由落体自定义物理计算 Hook
 * 仅在物理参数变化时执行离线预计算，而在 time 变化时仅做 O(1) 插值，彻底消除帧渲染卡顿。
 */
export function useFreeFallPhysics(
  v0: number,
  g: number,
  dragK: number,
  mass: number,
  maxFallHeight: number,
  time: number
): UseFreeFallPhysicsResult {
  // 仅在物理参数变化时预计算，不包含 time 依赖
  const { points, groundTime } = useMemo(() => {
    return precomputeFreeFallWithDrag(v0, g, dragK, mass, maxFallHeight)
  }, [v0, g, dragK, mass, maxFallHeight])

  // 根据 time 进行 O(1) 线性插值
  const currentState = useMemo(() => {
    return getPhysicsAtTime(points, time, groundTime)
  }, [points, time, groundTime])

  return {
    points,
    groundTime,
    currentState
  }
}
