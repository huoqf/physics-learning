import { useMemo } from 'react'
import { NUCLIDES, CURVE_POINTS } from '../model/constants'
import { useBindingEnergyPhysics } from './useBindingEnergyPhysics'
import { useReactionPhysics } from './useReactionPhysics'

export type { NuclearParticle } from '../model/constants'
export type { BindingEnergyPhysicsResult } from './useBindingEnergyPhysics'
export type {
  ReactionParticleResult,
  ChainReactionPhysicsResult,
  ChainReactorState,
  SubNucleon,
  Shockwave,
  ChainNeutron,
} from './useReactionPhysics'

interface UseNuclearReactionPhysicsParams {
  mode: number
  nuclide: number
  showMassDefectWeight: number
  reactionType: number
  time: number
}

export function useNuclearReactionPhysics({
  mode,
  nuclide,
  showMassDefectWeight,
  reactionType,
  time,
}: UseNuclearReactionPhysicsParams) {
  // 1. 生成平滑的比结合能曲线数据点
  const smoothPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i < CURVE_POINTS.length - 1; i++) {
      const p1 = CURVE_POINTS[i]
      const p2 = CURVE_POINTS[i + 1]
      const steps = Math.max(2, Math.floor((p2.x - p1.x) / 1.5))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        pts.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        })
      }
    }
    pts.push(CURVE_POINTS[CURVE_POINTS.length - 1])
    return pts
  }, [])

  // 当前选择核种在曲线上的坐标
  const currentNuclide = NUCLIDES[nuclide] ?? NUCLIDES[3]
  const currentPointOnCurve = useMemo(() => {
    const found = CURVE_POINTS.find((pt) => pt.x === currentNuclide.A)
    if (found) return found
    return { x: currentNuclide.A, y: currentNuclide.eBinding / currentNuclide.A }
  }, [currentNuclide])

  // 2. 结合能模式的物理粒子动画计算 (mode === 0)
  const bindingPhysics = useBindingEnergyPhysics(currentNuclide, showMassDefectWeight, time)

  // 3. 核反应模式的物理粒子动画计算 (mode === 1)
  const reactionPhysics = useReactionPhysics(reactionType, time)

  return {
    smoothPoints,
    currentPointOnCurve,
    bindingPhysics: mode === 0 ? bindingPhysics : null,
    reactionPhysics: mode === 1 ? reactionPhysics : null,
  }
}
