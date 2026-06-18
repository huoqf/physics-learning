import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import MaxwellBoltzmannChart from './MaxwellBoltzmannChart'

export default function BrownianMotionCenterExtra() {
  const params = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const temperature = params.params.temperature ?? 300
  const particleD = params.params.particleD ?? 5

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      <MaxwellBoltzmannChart temperature={temperature} particleD={particleD} />
    </div>
  )
}
