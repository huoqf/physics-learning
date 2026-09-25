import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useExperimentResistivityPhysics } from './hooks/useExperimentResistivityPhysics'
import { ExperimentResistivityScene } from './components/ExperimentResistivityScene'

export default function ExperimentResistivityAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const L = params.L ?? 0.5
  const d_mm = params.d_mm ?? 0.6
  const wiring = params.wiring ?? 0
  const R_slider = params.R_slider ?? 20
  const showTheoretical = (params.showTheoretical ?? 1) === 1

  const physics = useExperimentResistivityPhysics({
    L,
    d_mm,
    wiring,
    R_slider,
    showTheoretical,
  })

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <ExperimentResistivityScene physics={physics} font={canvasSize.font} />
      </AnimationSvgCanvas>
    </div>
  )
}

export { ExperimentResistivityAnimation }
