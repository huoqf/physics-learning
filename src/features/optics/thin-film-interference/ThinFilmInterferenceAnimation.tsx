import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useThinFilmInterferencePhysics } from './hooks/useThinFilmInterferencePhysics'
import { ThinFilmInterferenceScene } from './components/ThinFilmInterferenceScene'

export default function ThinFilmInterferenceAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const mode = params.mode ?? 0
  const wavelength = params.wavelength ?? 550
  const filmThickness = params.filmThickness ?? 100
  const n_film = params.n_film ?? 1.38
  const wedgeAngle_mrad = params.wedgeAngle_mrad ?? 0.3
  const defect = params.defect ?? 1

  const physics = useThinFilmInterferencePhysics({
    mode,
    wavelength,
    filmThickness,
    n_film,
    wedgeAngle_mrad,
    defect,
    time,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <ThinFilmInterferenceScene
        physics={physics}
        canvasSize={canvasSize}
        preset={preset}
        vp={vp}
        mode={mode}
        wavelength={wavelength}
        filmThickness={filmThickness}
        n_film={n_film}
        wedgeAngle_mrad={wedgeAngle_mrad}
        defect={defect}
      />
    </AnimationSvgCanvas>
  )
}
