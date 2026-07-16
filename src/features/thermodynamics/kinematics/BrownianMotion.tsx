import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useBrownianPhysics, WORLD_WIDTH, WORLD_HEIGHT } from './hooks/useBrownianPhysics'
import { BrownianScene } from './components/BrownianScene'

export default function BrownianMotion() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  const { font } = canvasSize

  const mode = params.mode ?? 0
  const temperature = params.temperature ?? 300
  const particleD = params.particleD ?? 5
  const showTrajectory = params.showTrajectory ?? 1
  const showMolecules = params.showMolecules ?? 1

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'viewport',
    physicsWidth: WORLD_WIDTH,
    physicsHeight: WORLD_HEIGHT,
    originSource: 'bottomLeft',
    refMagnitudes: { force: 2.5 },
  })

  const {
    particleWorld, force, trajectory, molecules, collisions,
    pollenRadius, molRadius, vTarget,
  } = useBrownianPhysics({
    mode, temperature, particleD, isPlaying, sceneScale,
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <BrownianScene
          particleWorld={particleWorld}
          force={force}
          trajectory={trajectory}
          molecules={molecules}
          collisions={collisions}
          pollenRadius={pollenRadius}
          molRadius={molRadius}
          vTarget={vTarget}
          temperature={temperature}
          mode={mode}
          showTrajectory={showTrajectory}
          showMolecules={showMolecules}
          sceneScale={sceneScale}
          font={font}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
