import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { SUBSTANCE_PRESETS, estimateMicroQuantities } from '@/physics/brownianMotion'
import { MicroScene } from './components/MicroScene'

export default function MicroQuantitiesAnimation() {
  const params = useAnimationStore(
    useShallow((s) => s.params),
  )

  const substanceIdx = params.substanceIdx ?? 0
  const inputMode = params.inputMode ?? 0
  const inputValue = params.inputValue ?? 18

  const substance = SUBSTANCE_PRESETS[substanceIdx] || SUBSTANCE_PRESETS[0]
  const inputModeStr = inputMode === 0 ? 'mass' : 'volume'
  const estimation = estimateMicroQuantities(substance, inputModeStr, inputValue)

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <MicroScene
        substance={substance}
        estimation={estimation}
        inputMode={inputMode}
        inputValue={inputValue}
        width={vp.visibleW}
        height={vp.visibleH}
        font={canvasSize.font}
      />
    </AnimationSvgCanvas>
  )
}
