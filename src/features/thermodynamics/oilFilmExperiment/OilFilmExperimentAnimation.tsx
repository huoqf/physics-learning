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

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <OilFilmScene
        step={step}
        calcResult={calcResult}
        /* 必须传**设计稿尺寸**：场景内所有坐标都在 `<g transform={vp.transform}>` 里，
           量的是设计单位；`vp.visibleW/H` 是容器像素（设计尺寸 × 缩放）。面板略高于
           设计稿时（缩放 1.07），底部那行测量结果会掉到面板下方 39px。 */
        width={preset.width}
        height={preset.height}
        font={canvasSize.font}
      />
    </AnimationSvgCanvas>
  )
}
