import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import MaxwellBoltzmannChart from './MaxwellBoltzmannChart'
import BrownianForceNetChart from './BrownianForceNetChart'

export default function BrownianMotionCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const temperature = params.temperature ?? 300
  const particleD = params.particleD ?? 5

  return (
    <div className="w-full h-full p-2 bg-white rounded-xl border border-neutral-100 shadow-sm flex flex-col justify-between gap-4">
      {/* 上半部：麦克斯韦分子速率分布 */}
      <div className="flex-1 min-h-0">
        <MaxwellBoltzmannChart temperature={temperature} particleD={particleD} />
      </div>
      {/* 下半部：瞬间碰撞合力涨落 */}
      <div className="flex-1 min-h-0 border-t border-neutral-100/70 pt-2">
        <BrownianForceNetChart temperature={temperature} particleD={particleD} time={time} />
      </div>
    </div>
  )
}
