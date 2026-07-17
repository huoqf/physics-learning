import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { SECOND_LAW_COLORS } from '@/theme/physics'
import { secondLawSharedState } from './sharedState'

export default function SecondLawCenterExtra() {
  const { time } = useAnimationStore(
    useShallow((s) => ({
      time: s.time,
    })),
  )

  const history = secondLawSharedState.entropyHistory

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl border border-neutral-100 shadow-sm p-3">
      {/* 标题说明 */}
      <div className="shrink-0 flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-neutral-800">
          物理演化：微观无序度 S 随时间变化
        </span>
        <span className="text-[9px] text-neutral-400">
          孤立系统自发过程的熵增趋势 (ΔS &gt; 0)
        </span>
      </div>

      {/* 撑满上层高度的通用 RelationChart */}
      <div className="flex-1 min-h-0">
        <RelationChart
          points={history}
          xLabel="时间 t (s)"
          yLabel="无序度 S"
          xDomain={[0, 30]}
          yDomain={[0, 1.05]}
          cursorX={time}
          cursorLabel={(x, y) => `t: ${x.toFixed(1)}s, S: ${y.toFixed(3)}`}
          color={SECOND_LAW_COLORS.entropyLine}
          strokeWidth={2}
          showGrid
          markers={[
            {
              axis: 'horizontal',
              y: 1.0,
              label: '最大无序度 (S=1.0)',
              color: '#94a3b8',
            },
          ]}
        />
      </div>
    </div>
  )
}
