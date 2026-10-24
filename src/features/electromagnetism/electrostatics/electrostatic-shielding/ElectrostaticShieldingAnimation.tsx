import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useElectrostaticShieldingPhysics } from './hooks/useElectrostaticShieldingPhysics'
import { ElectrostaticShieldingScene } from './components/ElectrostaticShieldingScene'

export default function ElectrostaticShieldingAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const E0 = params.E0 ?? 200
  const mode = params.mode ?? 0
  const isGrounded = params.isGrounded ?? 0
  const showFieldLines = params.showFieldLines ?? 1
  const tipRadius = params.tipRadius ?? 1.0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const physics = useElectrostaticShieldingPhysics({
    E0,
    mode,
    isGrounded,
    tipRadius,
    showFieldLines,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 8,
    // 有意非等比（实测 84/81.25 ≈ 3%）：10 m × 8 m 量程用于让导体与场线铺满 full 画布，
    // 场强箭头只有水平方向，导体与电荷标记用像素半径绘制（实测渲染圆 1.000），非等比无可见变形。
    intentionalNonUniformScale: true,
    refMagnitudes: {
      // 参考量级取参数上限 E0 = 500 V/m，使箭头长度随外加场强线性变化
      electricField: 500,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <ElectrostaticShieldingScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        mode={mode}
        isGrounded={isGrounded}
        showFieldLines={showFieldLines}
        tipRadius={tipRadius}
      />
    </AnimationSvgCanvas>
  )
}
