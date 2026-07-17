import type { SceneScale } from '@/scene'
import type { BindingEnergyPhysicsResult } from '../hooks/useBindingEnergyPhysics'
import type { ReactionParticleResult, ChainReactionPhysicsResult } from '../hooks/useReactionPhysics'
import { BindingEnergyScene } from './BindingEnergyScene'
import { FusionFissionScene } from './FusionFissionScene'
import { ChainReactionScene } from './ChainReactionScene'

interface NuclearReactionSceneProps {
  mode: number
  showMassDefectWeight: number
  reactionType: number
  time: number
  physics: {
    bindingPhysics: BindingEnergyPhysicsResult | null
    reactionPhysics: ReactionParticleResult | ChainReactionPhysicsResult | null
  }
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
}

export function NuclearReactionScene({
  mode,
  showMassDefectWeight,
  reactionType,
  time,
  physics,
  canvasSize,
  sceneScale,
}: NuclearReactionSceneProps) {
  if (mode === 0) {
    const bp = physics.bindingPhysics
    if (!bp) return null
    return <BindingEnergyScene bp={bp} showMassDefectWeight={showMassDefectWeight} canvasSize={canvasSize} sceneScale={sceneScale} />
  }

  const rp = physics.reactionPhysics
  if (!rp) return null

  if (reactionType === 0 || reactionType === 1) {
    return <FusionFissionScene rp={rp as ReactionParticleResult} reactionType={reactionType} canvasSize={canvasSize} sceneScale={sceneScale} />
  }

  return <ChainReactionScene rp={rp as ChainReactionPhysicsResult} time={time} canvasSize={canvasSize} sceneScale={sceneScale} />
}
