import { useMemo } from 'react'
import { precomputeFreeFallWithDrag, FreeFallTrajectoryPoint } from '@/physics'

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
 * 线性插值器：根据时间从预计算离散轨迹点中计算出高精度物理状态
 * 时间复杂度为 O(1)，因为可以直接通过 samplingInterval 计算数组索引
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
