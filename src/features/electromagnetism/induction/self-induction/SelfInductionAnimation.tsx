import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSelfInductionPhysics } from './hooks/useSelfInductionPhysics'
import { SelfInductionScene } from './components/SelfInductionScene'

export default function SelfInductionAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const mode = params.mode ?? 0
  const E = params.E ?? 12
  const L = params.L ?? 2.0
  const RL = params.RL ?? 2.0
  const RA = params.RA ?? 6.0
  const B = params.B ?? 1.5
  const isSlotted = params.isSlotted ?? 0
  const switchState = params.switchState ?? 1

  // Viewport 驱动
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const physics = useSelfInductionPhysics({
    mode,
    E,
    L,
    RL,
    RA,
    B,
    isSlotted,
    switchState,
    time,
  })

  // SceneScale
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    refMagnitudes: {
      velocity: 2.0,
      force: 2.0,
      currentDirection: 4.0,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <SelfInductionScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        time={time}
      />
    </AnimationSvgCanvas>
  )
}
