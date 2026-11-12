import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks/useSceneScale'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { SCENE_COLORS } from '@/theme/physics'
import { MC_LAYOUT } from './hooks/useMomentumConservationPhysics'
import { useExperimentMomentumPhysics } from './hooks/useExperimentMomentumPhysics'
import MomentumConservationCharts from './MomentumConservationCharts'
import { AirTrackExperimentScene } from './components/AirTrackExperimentScene'

const DESIGN_WIDTH = CANVAS_PRESETS.splitV.width

/**
 * 验证动量守恒定律实验动画（气垫导轨双滑块光电门测速）
 */
export default function ExperimentMomentumAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const groundY = Math.round(preset.height * 0.55)
  const { experiment, trackSliders, chartData, p1, p2, pTotal, tMax } =
    useExperimentMomentumPhysics(params, time)

  const vectorSceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: 1,
    customScaleY: 1,
    customOriginX: 0,
    customOriginY: groundY,
    maxVectorLength: MC_LAYOUT.vectorMaxLength,
    refMagnitudes: { velocity: 2 },
  })

  // 气垫导轨像素映射函数 (1.2m 对应 760px，起点 40)
  const toTrackPx = (m: number) => 40 + (m / 1.2) * 760

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <MomentumConservationCharts
        chartData={chartData}
        currentTime={time}
        isAdvanced={false}
        isExperiment={true}
        tMax={tMax}
      />

      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden"
      >
        <defs>
          {/* 气垫导轨铝合金拉丝金属渐变 */}
          <linearGradient id="air-track-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[0]} />
            <stop offset="35%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[3]} />
          </linearGradient>
          {/* 光电门黑色磨砂工程塑料渐变 */}
          <linearGradient id="photogate-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.insulationBakelite[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.insulationBakelite[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.insulationBakelite[2]} />
          </linearGradient>
        </defs>

        <AirTrackExperimentScene
          time={time}
          groundY={groundY}
          designWidth={DESIGN_WIDTH}
          canvasSize={canvasSize}
          showVectors={showVectors}
          vectorSceneScale={vectorSceneScale}
          experiment={experiment}
          trackSliders={trackSliders}
          p1={p1}
          p2={p2}
          pTotal={pTotal}
          toTrackPx={toTrackPx}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
