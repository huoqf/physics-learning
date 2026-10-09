import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { MaxwellScene } from './components/MaxwellScene'
import MaxwellDistributionChart from './components/MaxwellDistributionChart'

export default function MaxwellDistributionAnimation() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    }))
  )

  const temperature1 = params.temperature1 ?? 300
  const temperature2 = params.temperature2 ?? 500
  const showCompare = (params.showCompare ?? 1) === 1

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50/70 rounded-xl">
      {/* 上半部：微观气体分子热运动系综场景 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <MaxwellScene
            temperature={temperature1}
            isPlaying={isPlaying}
            width={vp.visibleW}
            height={vp.visibleH}
            font={canvasSize.font}
          />
        </AnimationSvgCanvas>
      </div>

      {/* 下半部：麦克斯韦速率分布定律对比图表 */}
      <div className="flex-1 min-h-0">
        <MaxwellDistributionChart
          temperature1={temperature1}
          temperature2={temperature2}
          showCompare={showCompare}
        />
      </div>
    </div>
  )
}
