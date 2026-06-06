import { useMemo } from 'react'
import {
  precomputeVariableMotion,
  VariableMotionTrajectoryPoint,
  VariableMotionModel,
  VariableMotionParams,
  VariableMotionState,
  getVariablePhysicsAtTime
} from '@/physics'

export type { VariableMotionState } from '@/physics'
export { getVariablePhysicsAtTime } from '@/physics'

export interface UseVelocityPhysicsResult {
  points: VariableMotionTrajectoryPoint[]
  currentState: VariableMotionState
}

/**
 * 进阶版速度演示轨迹计算与插值 Hook
 */
export function useVelocityPhysics(
  model: VariableMotionModel,
  modelParams: VariableMotionParams,
  tMax: number,
  time: number
): UseVelocityPhysicsResult {
  // 仅在模型或物理参数变化时运行一次预计算，不依赖 time
  const points = useMemo(() => {
    return precomputeVariableMotion(model, modelParams, tMax)
  }, [model, modelParams, tMax])

  // 根据当前 time 进行 O(1) 插值
  const currentState = useMemo(() => {
    return getVariablePhysicsAtTime(points, time, tMax)
  }, [points, time, tMax])

  return {
    points,
    currentState
  }
}
