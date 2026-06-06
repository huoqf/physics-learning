import { useMemo } from 'react'
import { precomputeVariableMotion, VariableMotionTrajectoryPoint, VariableMotionModel, VariableMotionParams } from '@/physics'

export interface VariableMotionState {
  x: number
  v: number
  a: number
  s: number
}

/**
 * 根据时间从预计算离散轨迹点中计算出高精度物理状态
 * 时间复杂度为 O(1)
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
