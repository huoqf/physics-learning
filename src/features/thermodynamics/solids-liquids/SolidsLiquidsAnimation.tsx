import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSolidsLiquidsPhysics } from './hooks/useSolidsLiquidsPhysics'
import { SolidsLiquidsScene } from './components/SolidsLiquidsScene'

export default function SolidsLiquidsAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const mode = params.mode ?? 0
  const solidType = params.solidType ?? 0
  const gamma = params.gamma ?? 0.073
  const capillaryRadius = params.capillaryRadius ?? 0.5
  const isMercury = params.isMercury ?? 0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const physics = useSolidsLiquidsPhysics({
    solidType,
    gamma,
    capillaryRadius,
    isMercury,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 8,
    refMagnitudes: {
      force: 0.1,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <SolidsLiquidsScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        mode={mode}
        solidType={solidType}
        isMercury={isMercury}
        gamma={gamma}
      />
    </AnimationSvgCanvas>
  )
}
