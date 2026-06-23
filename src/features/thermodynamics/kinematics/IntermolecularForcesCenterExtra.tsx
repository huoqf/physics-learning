import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import IntermolecularForceChart from './IntermolecularForceChart'

export default function IntermolecularForcesCenterExtra() {
  const params = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const r = params.params.r ?? 2.0
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font } = canvasSize

  const chartWidth = (canvasSize.width - 32) / 2
  const chartHeight = canvasSize.height - 16

  return (
    <div ref={containerRef} className="w-full flex gap-4 p-2">
      <IntermolecularForceChart
        currentR={r}
        mode="force"
        width={chartWidth}
        height={chartHeight}
        font={font}
      />
      <IntermolecularForceChart
        currentR={r}
        mode="energy"
        width={chartWidth}
        height={chartHeight}
        font={font}
      />
    </div>
  )
}
