import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { refFromPeak } from '@/utils/vectorRefs'
import { useForcedResonancePhysics } from './hooks/useForcedResonancePhysics'
import { ForcedResonanceScene } from './components/ForcedResonanceScene'

export default function ForcedResonanceAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.85
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const showForces = params.showForces ?? 1

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })

  const physics = useForcedResonancePhysics({
    m,
    k,
    gamma,
    F0,
    f,
    mode,
    time,
    showForces,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'viewport',
    physicsWidth: 4.2,
    physicsHeight: 6.5,
    // 四个矢量（v / 驱动力 / 弹性力 / 阻尼力）的基准全部由稳态峰值反推：
    // 原实现漏掉 tension、friction（退化为恒定 minLength），velocity/force 的
    // 常数基准又与量程差 3~8 倍（峰值箭头只剩 8~12% 长度）。
    refMagnitudes: {
      velocity: refFromPeak(physics.vectorPeaks.velocity),
      force: refFromPeak(physics.vectorPeaks.force),
      tension: refFromPeak(physics.vectorPeaks.tension),
      friction: refFromPeak(physics.vectorPeaks.friction),
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <ForcedResonanceScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        time={time}
        showForces={showForces}
      />
    </AnimationSvgCanvas>
  )
}
