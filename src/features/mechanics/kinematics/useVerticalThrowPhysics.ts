import { useMemo, useCallback } from 'react'
import {
  precomputeVerticalThrowTrajectory,
  VerticalThrowResult,
  VerticalThrowTrajectoryPoint,
} from '@/physics/kinematics'

export type { VerticalThrowResult, VerticalThrowTrajectoryPoint }
export { precomputeVerticalThrowTrajectory }

/** 最高点定格检测阈值 (m/s) */
const PEAK_THRESHOLD = 0.3

/** 插值获取指定时刻的速度和位移 */
function interpolateFromPoints(
  t: number,
  pts: VerticalThrowTrajectoryPoint[],
  v0: number
): { v: number; y: number } {
  if (t <= 0) return { v: pts[0]?.v ?? v0, y: 0 }
  const lastPt = pts[pts.length - 1]
  if (t >= lastPt.t) return { v: 0, y: 0 }
  const dt = pts[1]?.t - pts[0]?.t || 0.02
  const idx = Math.floor(t / dt)
  const p1 = pts[Math.min(idx, pts.length - 1)]
  const p2 = pts[Math.min(idx + 1, pts.length - 1)]
  if (!p1 || !p2 || p1.t === p2.t) return { v: p1?.v ?? 0, y: p1?.y ?? 0 }
  const frac = (t - p1.t) / (p2.t - p1.t)
  return {
    v: p1.v + (p2.v - p1.v) * frac,
    y: p1.y + (p2.y - p1.y) * frac,
  }
}

export interface UseVerticalThrowPhysicsResult {
  /** 预计算轨迹（含阻力轨 + 真空轨） */
  trajectory: VerticalThrowResult
  /** 总飞行时间（有阻力） */
  totalTime: number
  /** 最大高度（有阻力） */
  maxHeight: number
  /** 最高点时刻（有阻力） */
  maxHeightTime: number
  /** 真空轨落地时间 */
  landTimeVac: number
  /** 真空轨最大高度 */
  maxHeightVac: number
  /** 当前时刻（已落地则钳制到 totalTime） */
  effectiveTime: number
  /** 当前速度（有阻力轨） */
  effectiveV: number
  /** 当前位移（有阻力轨） */
  effectiveY: number
  /** 当前速度（真空轨） */
  vacuumV: number
  /** 当前位移（真空轨） */
  vacuumY: number
  /** 是否已落地 */
  isLanded: boolean
  /** 是否处于最高点定格区间 */
  isAtPeak: boolean
  /** 插值函数（供图表布局 hook 使用） */
  interpolatePoints: (t: number, pts: VerticalThrowTrajectoryPoint[]) => { v: number; y: number }
  /** 高级模式：面积数值（正/负/净位移） */
  areaValues: { positive: number; negative: number; net: number } | null
  /** 高级模式：目标高度双解时刻 */
  targetHeightIntersections: { t1: number; t2: number } | null
  /** 高级模式：双解时刻对应速度 */
  vT1: number
  vT2: number
}

/**
 * 竖直上抛物理计算 Hook
 * 仅在物理参数变化时执行离线预计算，time 变化时仅做 O(1) 插值。
 */
export function useVerticalThrowPhysics(
  v0: number,
  g: number,
  airResistance: number,
  time: number,
  advancedMode: number,
  targetHeight: number
): UseVerticalThrowPhysicsResult {
  // ── 预计算完整轨迹（仅参数变化时重算） ──
  const trajectory = useMemo(
    () => precomputeVerticalThrowTrajectory(v0, g, airResistance),
    [v0, g, airResistance]
  )

  const { peakTime: maxHeightTime, landTime: totalTime, maxHeight, landTimeVac, maxHeightVac } = trajectory

  // ── 插值函数 ──
  const interpolatePoints = useCallback(
    (t: number, pts: VerticalThrowTrajectoryPoint[]) => interpolateFromPoints(t, pts, v0),
    [v0]
  )

  // ── 当前物理状态 ──
  const isLanded = time >= totalTime && totalTime > 0
  const effectiveTime = isLanded ? totalTime : Math.max(time, 0)

  const { effectiveV, effectiveY } = useMemo(() => {
    const { v, y } = interpolateFromPoints(effectiveTime, trajectory.points, v0)
    return { effectiveV: v, effectiveY: Math.max(y, 0) }
  }, [effectiveTime, trajectory.points, v0])

  const { vacuumV, vacuumY } = useMemo(() => {
    const { v, y } = interpolateFromPoints(effectiveTime, trajectory.vacuumPoints, v0)
    return { vacuumV: v, vacuumY: Math.max(y, 0) }
  }, [effectiveTime, trajectory.vacuumPoints, v0])

  const isAtPeak = !isLanded && Math.abs(effectiveV) < PEAK_THRESHOLD && effectiveTime > 0.05

  // ── 高级模式：面积数值 ──
  const areaValues = useMemo(() => {
    if (advancedMode !== 1) return null
    let positiveArea = 0
    let negativeArea = 0
    for (let i = 0; i < trajectory.points.length; i++) {
      const pt = trajectory.points[i]
      if (pt.t > effectiveTime) break
      const nextPt = trajectory.points[i + 1] || pt
      const dt = nextPt.t - pt.t
      if (dt <= 0) continue
      const area = pt.v * dt
      if (area > 0) positiveArea += area
      else negativeArea += Math.abs(area)
    }
    return {
      positive: positiveArea,
      negative: negativeArea,
      net: positiveArea - negativeArea,
    }
  }, [advancedMode, effectiveTime, trajectory.points])

  // ── 高级模式：目标高度双解 ──
  const targetHeightIntersections = useMemo(() => {
    if (advancedMode !== 1 || targetHeight <= 0 || targetHeight >= maxHeight) return null
    let t1 = 0
    let t2 = 0
    let foundFirst = false
    for (const pt of trajectory.points) {
      if (pt.y >= targetHeight && !foundFirst) {
        t1 = pt.t
        foundFirst = true
      }
      if (pt.y < targetHeight && foundFirst && pt.t > maxHeightTime) {
        t2 = pt.t
        break
      }
    }
    return foundFirst && t2 > 0 ? { t1, t2 } : null
  }, [advancedMode, targetHeight, maxHeight, trajectory.points, maxHeightTime])

  // ── 双解时刻对应速度 ──
  const { vT1, vT2 } = useMemo(() => {
    if (!targetHeightIntersections) return { vT1: 0, vT2: 0 }
    const vt1 = interpolateFromPoints(targetHeightIntersections.t1, trajectory.points, v0).v
    const vt2 = interpolateFromPoints(targetHeightIntersections.t2, trajectory.points, v0).v
    return { vT1: vt1, vT2: vt2 }
  }, [targetHeightIntersections, trajectory.points, v0])

  return {
    trajectory,
    totalTime,
    maxHeight,
    maxHeightTime,
    landTimeVac,
    maxHeightVac,
    effectiveTime,
    effectiveV,
    effectiveY,
    vacuumV,
    vacuumY,
    isLanded,
    isAtPeak,
    interpolatePoints,
    areaValues,
    targetHeightIntersections,
    vT1,
    vT2,
  }
}
