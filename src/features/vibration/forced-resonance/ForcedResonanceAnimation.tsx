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

  // 锚点用 'design' 而非 'viewport'：本页物理舞台按 420×650（splitH）设计，
  // 物理层注释即写明「1 m = 100 design units」—— 4.2 m / 6.5 m 正是除以 100 得来的。
  // 用 'viewport' 时容器比 preset 高（实测可视区 420×736），scaleY 会变成 113 而非 100，
  // 于是「轮盘半径 / 阻尼槽宽度」按 sceneScale.scale（=100）画的圆与矩形，
  // 与曲柄销、槽高等 worldToDesign 的双轴换算脱节：销钉轨道被拉成 1.132 的椭圆、
  // 槽的宽高用了两把尺。锚在 preset 上使 scaleX === scaleY === 100，全部回到作者设定的尺度。
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'design',
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
