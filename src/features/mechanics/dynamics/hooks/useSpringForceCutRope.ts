/**
 * 绳与弹簧瞬时切断 — 物理状态 Hook
 *
 * 职责：
 *   - 管理剪断时间戳
 *   - 调用纯物理函数计算四球位置、受力、加速度
 * 约束：零 JSX，仅返回纯数据。自动播放逻辑由场景组件自行处理。
 */

import { useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCutRopeState } from '@/physics/dynamics/spring-force'

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
  const isCut = params.isCut ?? 0

  // 剪绳时间戳
  const tCutStartRef = useRef<number | null>(null)
  if (isCut === 1) {
    if (tCutStartRef.current === null || time < tCutStartRef.current) {
      tCutStartRef.current = time
    }
  } else {
    tCutStartRef.current = null
  }

  const state = calculateCutRopeState(
    k,
    m,
    time,
    isCut,
    tCutStartRef.current,
    CUT_ROPE_DESIGN.ceilY,
    CUT_ROPE_DESIGN.groundY,
  )

  return {
    k,
    m,
    isCut,
    showVectors,
    tCutStart: tCutStartRef.current,
    ...state,
  }
}
