/**
 * 胡克定律演示 — 物理状态 Hook
 *
 * 职责：从动画 Store 读取参数与时间，调用纯物理函数计算状态。
 * 约束：零 JSX，仅返回纯数据。
 */

import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateHookeLawState } from '@/physics/dynamics/spring-force'
import { HOOKE_DESIGN } from './useSpringForceCutRope'

export function useSpringForceHookeLaw() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    })),
  )

  const k = params.k ?? 100
  const m = params.m ?? 1

  const state = calculateHookeLawState(k, m, time, 0.5, HOOKE_DESIGN.eqX)

  return {
    k,
    m,
    showVectors,
    ...state,
  }
}
