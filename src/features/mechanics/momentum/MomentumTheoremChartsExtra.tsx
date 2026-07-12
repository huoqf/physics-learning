/**
 * MomentumTheoremChartsExtra — 动量定理图表面板（CenterExtra）
 *
 * splitH 布局下右侧图表面板，独立于动画组件。
 * 从 MomentumTheoremAnimation 中提取的 F-t / v-t / p-t 图表。
 */
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMomentumTheoremLayout } from './hooks/useMomentumTheoremLayout'
import { MomentumTheoremCharts } from './components/MomentumTheoremCharts'

export default function MomentumTheoremChartsExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const { vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })

  const layout = useMomentumTheoremLayout({ params, time, vp })

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      <MomentumTheoremCharts layout={layout} />
    </div>
  )
}
