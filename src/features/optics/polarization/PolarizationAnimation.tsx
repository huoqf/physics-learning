import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { usePolarizationPhysics } from './hooks/usePolarizationPhysics'
import { PolarizationScene } from './components/PolarizationScene'

export default function PolarizationAnimation() {
  // ── 1. Store 精确订阅 ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport 视口设置 (使用 full 预设以确保空间大画幅) ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  // ── 3. 提取各个模式的调节参数 ──
  const mode = params.mode ?? 0
  const polarizerAngle = params.polarizerAngle ?? 45   // 起偏角度数
  const analyzerAngle = params.analyzerAngle ?? 135     // 检偏角度数
  const glassesAngle = params.glassesAngle ?? 0       // 立体眼镜倾角度数
  const filterAngle = params.filterAngle ?? 0         // 消除反光滤镜角度度数

  // ── 4. 物理计算 ──
  const physics = usePolarizationPhysics({
    mode,
    polarizerAngle,
    analyzerAngle,
    glassesAngle,
    filterAngle,
    time,
  })

  // ── 5. 比例尺设置 (符合规范) ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    physicsWidth: 8.4,
    physicsHeight: 6.5,
  })

  // ── 6. 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <PolarizationScene
          physics={physics}
          canvasSize={canvasSize}
          mode={mode}
          polarizerAngle={polarizerAngle}
          analyzerAngle={analyzerAngle}
          glassesAngle={glassesAngle}
          filterAngle={filterAngle}
          sceneScale={sceneScale}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
