import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useCanvasViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { type Scenario } from '@/physics/secondLaw'
import { useSecondLawPhysics } from './hooks/useSecondLawPhysics'
import { SecondLawScene } from './components/SecondLawScene'

export default function SecondLawAnimation() {
  const { params, isPlaying, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const sceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.splitV, anchor: 'viewport', physicsWidth: 10, physicsHeight: 3.87 })

  const scene = params.scene ?? 0
  const scenario: Scenario = scene === 0 ? 'heat-conduction' : 'gas-diffusion'

  const { particlesRef, partitionProgressRef, entropy, isEquilibrium } = useSecondLawPhysics({
    scenario,
    partitionOpened: params.partitionOpened ?? 0,
    time,
    isPlaying,
  })

  const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  return (
    <div className="relative w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} canvasRef={canvasRef}>
        <SecondLawScene
          scenario={scenario}
          particlesRef={particlesRef}
          partitionProgressRef={partitionProgressRef}
          entropy={entropy}
          isEquilibrium={isEquilibrium}
          sceneScale={sceneScale}
          vp={vp}
          canvasSize={canvasSize}
          setupFrame={setupFrame}
          designToPixel={designToPixel}
          time={time}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
