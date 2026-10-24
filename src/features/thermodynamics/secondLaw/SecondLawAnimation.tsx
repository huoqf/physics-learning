import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useCanvasViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { type Scenario } from '@/physics/secondLaw'
import { useSecondLawPhysics } from './hooks/useSecondLawPhysics'
import { SecondLawScene } from './components/SecondLawScene'

export default function SecondLawAnimation() {
  const { params, isPlaying, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  // 竖直量程必须由「可视区宽高比」实时推出来，不能写常量。
  // anchor='viewport' 下 scaleX = 可视宽/physicsWidth、scaleY = 可视高/physicsHeight，
  // 两者之比一旦与可视区宽高比不等就是非等比缩放（拉变形 + 控制台告警）。
  // 原值 3.87 是作者手算 10 × 325 / 840 = 3.869047… 的四舍五入结果，既差 0.025%，
  // 又只在容器恰好等于 preset 宽高比时成立 —— 容器一变就重新失衡。
  const physicsHeight = 10 * (vp.designVisibleH / Math.max(vp.designVisibleW, 1))
  const sceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.splitV, anchor: 'viewport', physicsWidth: 10, physicsHeight })

  const scene = params.scene ?? 0
  const scenario: Scenario = scene === 0 ? 'heat-conduction' : 'gas-diffusion'
  const workInput = params.workInput ?? 0

  const { particlesRef, partitionProgressRef, entropy, isEquilibrium } = useSecondLawPhysics({
    scenario,
    partitionOpened: params.partitionOpened ?? 0,
    workInput,
    time,
    isPlaying,
  })

  const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  return (
    <div className="relative w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} canvasRef={canvasRef}>
        <SecondLawScene
          scenario={scenario}
          workInput={workInput}
          particlesRef={particlesRef}
          partitionProgressRef={partitionProgressRef}
          entropy={entropy}
          isEquilibrium={isEquilibrium}
          sceneScale={sceneScale}
          vp={vp}
          canvasSize={canvasSize}
          setupFrame={setupFrame}
          designToPixel={designToPixel}
          time={time}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
