import { useAnimationStore } from '@/stores'
import ScatterSim from './components/ScatterSim'
import BohrOrbits from './components/BohrOrbits'
import ExcitationSim from './components/ExcitationSim'
import PhotoelectricSim from './components/PhotoelectricSim'

export default function BohrTheoryAnimation() {
  const mode = useAnimationStore((s) => s.params.mode ?? 0)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const time = useAnimationStore((s) => s.time)

  // 根据当前选择的学习阶段，分发到具体的子交互组件中
  switch (mode) {
    case 0:
      return <ScatterSim isPlaying={isPlaying} time={time} />
    case 1:
      return <BohrOrbits isPlaying={isPlaying} time={time} />
    case 2:
      return <ExcitationSim isPlaying={isPlaying} time={time} />
    case 3:
      return <PhotoelectricSim isPlaying={isPlaying} time={time} />
    default:
      return <ScatterSim isPlaying={isPlaying} time={time} />
  }
}
