import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useDoubleSlitInterferencePhysics } from './hooks/useDoubleSlitInterferencePhysics'
import { DoubleSlitTheoryScene } from './components/DoubleSlitTheoryScene'

export default function DoubleSlitInterferenceAnimation() {
  // ── 1. Store 精确订阅 ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport 视口设置 ──
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  // ── 3. 提取左侧调节参数 ──
  const wavelength = Number(params.wavelength ?? 650) // nm
  const slitDistance = Number(params.slitDistance ?? 0.2) // mm
  const screenDistance = Number(params.screenDistance ?? 1.0) // m

  // ── 4. 物理计算（纯物理量，不含视觉布局） ──
  const physics = useDoubleSlitInterferencePhysics({
    wavelength,
    slitDistance,
    screenDistance,
    mode: 0,
  })

  // ── 5. 场景坐标全部基于设计坐标系（preset.width × preset.height = 840×650）
  //    AnimationSvgCanvas 通过 vp.transform 自动缩放适配不同分辨率
  //    视觉映射在 Scene 内部完成

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <DoubleSlitTheoryScene
        physics={physics}
        canvasSize={canvasSize}
        preset={preset}
        wavelength={wavelength}
        slitDistance={slitDistance}
        screenDistance={screenDistance}
        time={time}
      />
    </AnimationSvgCanvas>
  )
}
