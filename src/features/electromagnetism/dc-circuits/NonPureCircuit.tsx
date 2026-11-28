import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useMotorCircuitPhysics } from './motorCircuit/useMotorCircuitPhysics'
import { MotorCircuitScene } from './motorCircuit/MotorCircuitScene'

/** 非纯电阻电路与电动机演示页面编排组件 */
export default function NonPureCircuit() {
  const state = useMotorCircuitPhysics()
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    maxVectorLength: 52,
    refMagnitudes: {
      gravity: 9.8,
      tension: 9.8 * (0.65 / 0.7),
      velocity: 2.2,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <MotorCircuitScene state={state} font={canvasSize.font} sceneScale={sceneScale} />
    </AnimationSvgCanvas>
  )
}
