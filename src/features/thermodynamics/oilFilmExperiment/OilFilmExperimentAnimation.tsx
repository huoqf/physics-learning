import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateOilFilm } from '@/physics/oilFilmExperiment'
import { OilFilmScene } from './components/OilFilmScene'

export default function OilFilmExperimentAnimation() {
  const params = useAnimationStore(
    useShallow((s) => s.params),
  )

  const step = params.step ?? 3
  const ratio = params.ratio ?? 500
  const dropsPerMl = params.dropsPerMl ?? 80
  const powderDensity = params.powderDensity ?? 0 // 0: normal, 1: thick, 2: thin

  const powderThickness =
    powderDensity === 1 ? 'thick' : powderDensity === 2 ? 'thin' : 'normal'

  const calcResult = calculateOilFilm({
    ratio,
    dropsPerMl,
    gridSideCm: 1.0,
    powderThickness,
  })

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <OilFilmScene
        step={step}
        calcResult={calcResult}
        width={vp.visibleW}
        height={vp.visibleH}
        font={canvasSize.font}
      />
    </AnimationSvgCanvas>
  )
}
