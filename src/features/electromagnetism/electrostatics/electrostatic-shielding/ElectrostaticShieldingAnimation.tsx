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
