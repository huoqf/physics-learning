import { useAnimationViewport } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useWeightlessnessLayout } from './hooks/useWeightlessnessLayout'
import { ElevatorShaft } from './components/ElevatorShaft'
import { WeightlessnessChart } from './components/WeightlessnessChart'
import { WeightlessnessDefs } from './components/WeightlessnessDefs'

export default function WeightlessnessAnimation() {
  const { params, time, showVectors, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const { containerRef, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { g = 9.8, m = 50 } = params

  const layout = useWeightlessnessLayout(vp, params, time, isPlaying, setIsPlaying)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={vp.visibleW}
        height={vp.visibleH}
        className="bg-white rounded-lg shadow-inner"
      >
        <ElevatorShaft layout={layout} m={m} showVectors={showVectors} />
        <WeightlessnessChart layout={layout} m={m} g={g} />
        <WeightlessnessDefs />
      </svg>
    </div>
  )
}
