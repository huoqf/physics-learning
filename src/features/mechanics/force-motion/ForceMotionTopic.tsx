import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import {
  calculateForceMotionState,
  sampleForceMotionChart,
  sampleForceMotionTrajectory,
} from '@/physics'
import ForceMotionTripleChart from './ForceMotionTripleChart'
import ForceMotionSandbox from './ForceMotionSandbox'
import {
  FORCE_MOTION_SAMPLE_COUNT,
  getForceMotionObservationTime,
} from './forceMotionLayout'

export default function ForceMotionTopic() {
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  // 实时数据（每帧随 time 变化）
  const viewData = useMemo(() => {
    const state = calculateForceMotionState(params, time)
    return {
      state,
      trajectory: sampleForceMotionTrajectory(params, time, FORCE_MOTION_SAMPLE_COUNT),
      chartPoints: sampleForceMotionChart(params, time, FORCE_MOTION_SAMPLE_COUNT),
    }
  }, [params, time])

  // 按模式推断「典型观察时长」（周期型取 5T，收尾型取 5τ，单调型取 maxTime…）
  // 同时供图表 domainPoints 与动画沙盒 scale 使用，确保两者比例一致。
  const observationTime = useMemo(
    () => getForceMotionObservationTime(params),
    [params],
  )

  // 图表定标用的完整窗口轨迹（仅随 params/observationTime 变化）
  // 解决 SingleChart 早期 bug：points 既绘制又定标导致 Y 轴随 time 扩张。
  // 与 VelocityTimeChart 治本（commit bbd1108）同思路。
  const domainPoints = useMemo(
    () => sampleForceMotionChart(params, observationTime, FORCE_MOTION_SAMPLE_COUNT),
    [params, observationTime],
  )

  // 动画沙盒 scale 定标用的完整窗口轨迹（与图表共用 observationTime）
  // 避免长时模式（如匀加速 60s 跑 9300m）让物体超出动画区域；
  // 周期型（圆周/简谐）也按 5T 内的极值定标，scale 稳定不飘。
  const domainTrajectory = useMemo(
    () => sampleForceMotionTrajectory(params, observationTime, FORCE_MOTION_SAMPLE_COUNT),
    [params, observationTime],
  )

  const { state, trajectory, chartPoints } = viewData

  return (
    <div className="w-full h-full p-2 bg-neutral-50">
      <div className="h-full flex flex-col gap-2">
        {/* 上半区：三图表并列 */}
        <div className="flex-1 min-h-0">
          <ForceMotionTripleChart
            points={chartPoints}
            domainPoints={domainPoints}
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
          <ForceMotionSandbox
            state={state}
            trajectory={trajectory}
            domainTrajectory={domainTrajectory}
          />
        </div>
      </div>
    </div>
  )
}
