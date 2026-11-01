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

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <MicroScene
        substance={substance}
        estimation={estimation}
        inputMode={inputMode}
        inputValue={inputValue}
        /* ⚠️ 这里必须是**设计稿尺寸**，不能传 `vp.visibleW/H`：
           MicroScene 里的坐标全部落在 `<g transform={vp.transform}>` 内，量的是设计单位；
           而 vp.visible* 是容器像素（= 设计尺寸 × 缩放比）。面板比设计稿高一点时
           （缩放 1.07），场景被按 1.07 倍的"设计高度"排版，底部那行桥梁公式
           直接掉到面板下方 29px。 */
        width={preset.width}
        height={preset.height}
        font={canvasSize.font}
      />
    </AnimationSvgCanvas>
  )
}
