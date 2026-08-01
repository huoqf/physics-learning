import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useDoubleSlitInterferencePhysics } from './hooks/useDoubleSlitInterferencePhysics'
import { DoubleSlitInterferenceScene } from './components/DoubleSlitInterferenceScene'

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
  const wavelength = params.wavelength ?? 650     // nm
  const slitDistance = params.slitDistance ?? 0.2  // mm
  const screenDistance = params.screenDistance ?? 1.0  // m

  // ── 4. 物理计算 ──
  const physics = useDoubleSlitInterferencePhysics({
    wavelength,
    slitDistance,
    screenDistance,
    time,
  })

  // ── 5. 场景坐标全部基于设计坐标系（preset.width × preset.height = 840×650）
  //    AnimationSvgCanvas 通过 vp.transform 自动缩放适配不同分辨率

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <DoubleSlitInterferenceScene
        physics={physics}
        canvasSize={canvasSize}
        preset={preset}
        wavelength={wavelength}
        slitDistance={slitDistance}
        screenDistance={screenDistance}
      />
    </AnimationSvgCanvas>
  )
}
