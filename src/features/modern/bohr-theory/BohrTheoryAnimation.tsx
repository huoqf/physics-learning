import { useAnimationStore } from '@/stores'
import ScatterSim from './components/ScatterSim'
import BohrOrbits from './components/BohrOrbits'
import ExcitationSim from './components/ExcitationSim'
import PhotoelectricSim from './components/PhotoelectricSim'

export default function BohrTheoryAnimation() {
  const mode = useAnimationStore((s) => s.params.mode ?? 0)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)

  switch (mode) {
    case 0:
      return (
        <ScatterSim
          isPlaying={isPlaying}
          time={time}
          modelType={params.modelType ?? 1}
          impactParameter={params.impactParameter ?? 15}
          autoEmit={params.autoEmit !== 0}
          keepTrails={params.keepTrails === 1}
          launchTrigger={params.launchTrigger ?? 0}
          clearTrigger={params.clearTrigger ?? 0}
          updateParam={updateParam}
        />
      )
    case 1:
      return (
        <BohrOrbits
          isPlaying={isPlaying}
          time={time}
          targetLevel={params.targetLevel ?? 2}
          realScale={params.realScale === 1}
        />
      )
    case 2:
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
    case 3:
      return (
        <PhotoelectricSim
          isPlaying={isPlaying}
          time={time}
          radiationPhotonIndex={params.radiationPhotonIndex ?? 1}
          workFunction={params.workFunction ?? 2.29}
          stoppingVoltage={params.stoppingVoltage ?? 0.0}
        />
      )
    default:
      return (
        <ScatterSim
          isPlaying={isPlaying}
          time={time}
          modelType={params.modelType ?? 1}
          impactParameter={params.impactParameter ?? 15}
          autoEmit={params.autoEmit !== 0}
          keepTrails={params.keepTrails === 1}
          launchTrigger={params.launchTrigger ?? 0}
          clearTrigger={params.clearTrigger ?? 0}
          updateParam={updateParam}
        />
      )
  }
}
