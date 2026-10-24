import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSaturatedVaporPhysics } from './hooks/useSaturatedVaporPhysics'
import { SaturatedVaporScene } from './components/SaturatedVaporScene'

export default function SaturatedVaporAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const tempCelsius = params.tempCelsius ?? 25
  const referencePressure = params.referencePressure ?? 1580
  const pistonVolume = params.pistonVolume ?? 1.0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const physics = useSaturatedVaporPhysics({
    tempCelsius,
    referencePressure,
    pistonVolume,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    // 有意非等比（实测 84/81.25 ≈ 3%）：10 m × 4 m 量程用于让容器铺满 splitV 分区，
    // 体积读数来自物理量面板；受力箭头为竖直方向，分子用像素半径绘制（实测渲染圆 1.000）。
    intentionalNonUniformScale: true,
    refMagnitudes: {
      force: 2.0,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <SaturatedVaporScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        tempCelsius={tempCelsius}
      />
    </AnimationSvgCanvas>
  )
}
