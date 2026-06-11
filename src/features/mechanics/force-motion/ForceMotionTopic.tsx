import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import {
  calculateForceMotionState,
  sampleForceMotionChart,
  sampleForceMotionTrajectory,
} from '@/physics'
import ForceMotionTripleChart from './ForceMotionTripleChart'
import ForceMotionSandbox from './ForceMotionSandbox'
import { FORCE_MOTION_SAMPLE_COUNT } from './forceMotionLayout'

export default function ForceMotionTopic() {
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const viewData = useMemo(() => {
    const state = calculateForceMotionState(params, time)
    return {
      state,
      trajectory: sampleForceMotionTrajectory(params, time, FORCE_MOTION_SAMPLE_COUNT),
      chartPoints: sampleForceMotionChart(params, time, FORCE_MOTION_SAMPLE_COUNT),
    }
  }, [params, time])

  const { state, trajectory, chartPoints } = viewData

  return (
    <div className="w-full h-full p-2 bg-neutral-50">
      <div className="h-full flex flex-col gap-2">
        {/* 上半区：三图表并列 */}
        <div className="flex-1 min-h-0">
          <ForceMotionTripleChart
            points={chartPoints}
            currentTime={state.t}
            currentValueF={state.chartValueF}
            currentValueV={state.chartValueV}
            currentValueX={state.chartValueX}
            terminalVelocity={state.terminalVelocity}
            areaTextF={state.areaTextF}
            areaTextV={state.areaTextV}
            areaTextX={state.areaTextX}
          />
        </div>

        {/* 下半区：动画主视图 */}
        <div className="flex-[1.5] min-h-0">
          <ForceMotionSandbox state={state} trajectory={trajectory} />
        </div>
      </div>
    </div>
  )
}
