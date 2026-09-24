import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSaturatedVaporPhysics } from './hooks/useSaturatedVaporPhysics'
import { SaturatedVaporScene } from './components/SaturatedVaporScene'

export default function SaturatedVaporAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const tempCelsius = params.tempCelsius ?? 25
  const referencePressure = params.referencePressure ?? 1580
  const pistonVolume = params.pistonVolume ?? 1.0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const physics = useSaturatedVaporPhysics({
    tempCelsius,
    referencePressure,
    pistonVolume,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    refMagnitudes: {
      force: 2.0,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <SaturatedVaporScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        tempCelsius={tempCelsius}
      />
    </AnimationSvgCanvas>
  )
}
