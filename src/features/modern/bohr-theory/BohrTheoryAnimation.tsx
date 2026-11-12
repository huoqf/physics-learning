import { useAnimationStore } from '@/stores'
import BohrOrbits from './components/BohrOrbits'
import ExcitationSim from './components/ExcitationSim'

export default function BohrTheoryAnimation() {
  const mode = useAnimationStore((s) => s.params.mode ?? 0)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)

  switch (mode) {
    case 0:
      return (
        <BohrOrbits
          isPlaying={isPlaying}
          time={time}
          targetLevel={params.targetLevel ?? 2}
          realScale={params.realScale === 1}
        />
      )
    case 1:
      return (
        <ExcitationSim
          isPlaying={isPlaying}
          time={time}
          atomQuantity={params.atomQuantity ?? 0}
          excitationType={params.excitationType ?? 0}
          incidentEnergy={params.incidentEnergy ?? 10.2}
          launchTrigger={params.launchTrigger ?? 0}
          clearTrigger={params.clearTrigger ?? 0}
          updateParam={updateParam}
        />
      )
    default:
      return (
        <BohrOrbits
          isPlaying={isPlaying}
          time={time}
          targetLevel={params.targetLevel ?? 2}
          realScale={params.realScale === 1}
        />
      )
  }
}
