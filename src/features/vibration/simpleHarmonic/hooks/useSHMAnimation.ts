import { useMemo, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { computeAngularFrequency, computeSHMState, computeSHMEnergy } from '@/physics/oscillation'

export interface SHMAnimationResult {
  // Store 原始状态
  isPlaying: boolean
  time: number
  speed: number
  showVectors: boolean
  showFormulas: boolean
  // 模式与参数
  mode: number
  A: number
  mass: number
  k: number
  phiDeg: number
  phi: number
  showGraph: number
  showHelper: number
  isVertical: boolean
  showEnergy: boolean
  // 物理计算结果
  T: number
  omega: number
  phase: number
  x: number
  v: number
  a: number
  energy: { kinetic: number; potential: number; total: number }
}

/** 简谐运动核心物理计算 + 动画时钟 */
export function useSHMAnimation(): SHMAnimationResult {
  const { params, isPlaying, time, speed, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    })),
  )

  const mode = params.mode ?? 0
  const A = params.A ?? 0.06
  const mass = params.mass ?? 0.5
  const k = params.k ?? 20
  const phiDeg = params.phiDeg ?? 0
  const phi = (phiDeg * Math.PI) / 180
  const showGraph = params.showGraph ?? 1
  const showHelper = params.showHelper ?? 1

  const isVertical = mode === 1
  const showEnergy = mode === 2

  // 科学探究：周期 T 由质量 m 与劲度系数 k 物理计算得出
  const T = useMemo(() => 2 * Math.PI * Math.sqrt(mass / k), [mass, k])
  const omega = computeAngularFrequency(T)
  const phase = omega * time + phi

  const { displacement: x, velocity: v, acceleration: a } = computeSHMState(A, omega, phase)
  const energy = computeSHMEnergy(mass, A, omega, x)

  // 动画时钟：以 store.time 为规范时钟
  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    store.setTime(store.time + dt * store.direction)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  return {
    isPlaying, time, speed, showVectors, showFormulas,
    mode, A, mass, k, phiDeg, phi, showGraph, showHelper,
    isVertical, showEnergy,
    T, omega, phase, x, v, a, energy,
  }
}
