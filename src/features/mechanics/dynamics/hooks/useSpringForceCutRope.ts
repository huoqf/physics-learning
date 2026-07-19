/**
 * 绳与弹簧瞬时切断 — 物理状态 Hook
 *
 * 职责：
 *   - 预计算剪断后轨迹（用于拖拽扫查）
 *   - 调用纯物理函数计算四球位置、受力、加速度
 * 约束：零 JSX，仅返回纯数据。
 */

import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  precomputeCutRopeTrajectory,
  getCutRopeStateAtTime,
} from '@/physics/dynamics/spring-force'

/** 胡克定律模式布局常量（splitV 840×325） */
export const HOOKE_DESIGN = {
  width: 840,
  height: 325,
  groundY: 305,
  wallY: 153,
  eqX: 420,
  springLeftX: 60,
  displaceLabelOffset: 16,
} as const

/** 绳与弹簧模式布局常量（splitH 420×650） */
export const CUT_ROPE_DESIGN = {
  width: 420,
  height: 650,
  ceilY: 39,
  groundY: 610,
  xLeft: 118,
  xRight: 344,
  dividerX: 210,
  bracketWidth: 100,
} as const

/** 轨迹最大模拟时间 [s] */
const TRAJECTORY_MAX_TIME = 3
/** 轨迹时间步长 [s] */
const TRAJECTORY_DT = 0.01

export function useSpringForceCutRope() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    })),
  )

  const k = params.k ?? 100
  const m = params.m ?? 1

  // 预计算剪断后轨迹（用于拖拽扫查与插值）
  const trajectory = useMemo(() => {
    return precomputeCutRopeTrajectory(
      k,
      m,
      TRAJECTORY_MAX_TIME,
      TRAJECTORY_DT,
      CUT_ROPE_DESIGN.ceilY,
      CUT_ROPE_DESIGN.groundY,
    )
  }, [k, m])

  // 线性插值取得当前时刻状态
  const state = useMemo(() => {
    return getCutRopeStateAtTime(trajectory, time)
  }, [trajectory, time])

  return {
    k,
    m,
    showVectors,
    trajectory,
    tCut: state.t,
    positions: state.positions,
    forces: state.forces,
    isLanded: state.isLanded,
  }
}
