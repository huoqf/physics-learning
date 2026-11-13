import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { DOUBLE_SLIT_DEFAULT_PARAMS } from '@/physics/optics'
import { useDoubleSlitInterferencePhysics } from './hooks/useDoubleSlitInterferencePhysics'
import { DoubleSlitApparatusTrack } from './components/DoubleSlitApparatusTrack'
import { DoubleSlitEyepieceScene } from './components/DoubleSlitEyepieceScene'

/**
 * 用双缝干涉测光的波长实验（光具座装配与测微目镜读数）
 */
export default function ExperimentDoubleSlitAnimation() {
  const params = useAnimationStore(useShallow((s) => s.params))

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })
  const { font } = canvasSize

  const wavelength = Number(params.wavelength ?? DOUBLE_SLIT_DEFAULT_PARAMS.wavelength)
  const slitDistance = Number(params.slitDistance ?? DOUBLE_SLIT_DEFAULT_PARAMS.slitDistance)
  const screenDistance = Number(params.screenDistance ?? DOUBLE_SLIT_DEFAULT_PARAMS.screenDistance)
  const targetFringe = Number(params.targetFringe ?? DOUBLE_SLIT_DEFAULT_PARAMS.targetFringe)
  const currentFringe = Number(params.currentFringe ?? DOUBLE_SLIT_DEFAULT_PARAMS.currentFringe)
  const handwheelOffset = Number(
    params.handwheelOffset ?? DOUBLE_SLIT_DEFAULT_PARAMS.handwheelOffset,
  )

  const physics = useDoubleSlitInterferencePhysics({
    wavelength,
    slitDistance,
    screenDistance,
    mode: 1,
    targetFringe,
    currentFringe,
    handwheelOffset,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <DoubleSlitApparatusTrack
        wavelengthColor={physics.wavelengthColor}
        wavelength={wavelength}
        slitDistance={slitDistance}
        screenDistance={screenDistance}
        font={font}
      />
      <DoubleSlitEyepieceScene physics={physics} wavelength={wavelength} font={font} />
    </AnimationSvgCanvas>
  )
}
