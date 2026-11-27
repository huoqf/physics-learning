import React from 'react'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'
import { TimeDilationScene } from './TimeDilationScene'
import { LengthSimultaneityScene } from './LengthSimultaneityScene'
import { NewtonLimitsScene } from './NewtonLimitsScene'
import { EnergyExtensionScene } from './EnergyExtensionScene'

export interface RelativitySceneProps {
  physics: RelativityPhysicsState
  vp: Pick<ViewportInfo, 'designLeft' | 'designVisibleW'>
  sceneScale: SceneScale
  font: (size: number) => number
  reducedMotion?: boolean
}

export const RelativityScene: React.FC<RelativitySceneProps> = ({
  physics,
  vp,
  sceneScale,
  font,
  reducedMotion = false,
}) => {
  if (physics.mode === 1) {
    return (
      <LengthSimultaneityScene
        physics={physics}
        vp={vp}
        sceneScale={sceneScale}
        font={font}
      />
    )
  }

  if (physics.mode === 2) {
    return (
      <NewtonLimitsScene
        physics={physics}
        sceneScale={sceneScale}
        font={font}
      />
    )
  }

  if (physics.mode === 3) {
    return <EnergyExtensionScene physics={physics} font={font} />
  }

  return (
    <TimeDilationScene
      physics={physics}
      vp={vp}
      sceneScale={sceneScale}
      font={font}
      reducedMotion={reducedMotion}
    />
  )
}
