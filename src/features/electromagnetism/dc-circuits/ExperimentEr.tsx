import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useExperimentErPhysics } from './hooks/useExperimentErPhysics'
import { ExperimentErScene } from './components/ExperimentErScene'

/**
 * 高考实验：测定电源电动势与内阻
 * 顶层编排组件（严格遵循 AGENTS.md 三层架构标准）
 */
export default function ExperimentEr() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  // 物理与状态逻辑解耦抽离
  const physics = useExperimentErPhysics()

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <ExperimentErScene physics={physics} font={font} />
    </AnimationSvgCanvas>
  )
}
