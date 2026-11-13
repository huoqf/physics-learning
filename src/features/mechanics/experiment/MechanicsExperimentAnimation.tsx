import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { TRACK_MAX_M, timeToReach, velocityAt } from '@/physics/experimentMechanics'
import { useMechanicsExperimentPhysics } from './hooks/useMechanicsExperimentPhysics'
import { MechanicsExperimentScene } from './components/MechanicsExperimentScene'
import { TRACK_PROFILE } from './mechanicsExperimentLayout'

/** v-t 图采样点数 */
const CHART_SAMPLES = 40

/**
 * 力学实验基础：纸带与光电门 - 主编排动画组件
 */
export default function MechanicsExperimentAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const modeNum = Number.isFinite(Number(params?.mode)) ? Number(params.mode) : 0
  const v0Num = Number.isFinite(Number(params?.v0)) ? Number(params.v0) : 1.0
  const aNum = Number.isFinite(Number(params?.a)) ? Number(params.a) : 1.5
  const freqNum = Number.isFinite(Number(params?.freq)) ? Number(params.freq) : 50
  const dNum = Number.isFinite(Number(params?.d)) ? Number(params.d) : 0.01
  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0

  const profile = TRACK_PROFILE

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: profile.preset,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: profile.preset,
    anchor: 'custom',
    customScaleX: profile.pxPerMeter,
    customScaleY: profile.pxPerMeter,
    customOriginX: profile.originX,
    customOriginY: profile.originY,
    refMagnitudes: { velocity: Math.max(v0Num, 5) },
  })

  const physics = useMechanicsExperimentPhysics({
    mode: modeNum,
    v0: v0Num,
    a: aNum,
    freq: freqNum,
    d: dNum,
    time: timeNum,
  })

  const travelTime = timeToReach(v0Num, aNum, TRACK_MAX_M)
  const chartTimeMax = Number.isFinite(travelTime) && travelTime > 0.3 ? travelTime : 3

  const vtPoints = Array.from({ length: CHART_SAMPLES + 1 }).map((_, i) => {
    const tStep = (i / CHART_SAMPLES) * chartTimeMax
    return { t: tStep, v: velocityAt(v0Num, aNum, tStep) }
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      <div className="order-1 flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        <VelocityTimeChart
          mode="static"
          points={vtPoints}
          currentTime={Math.min(timeNum, chartTimeMax)}
          tMax={chartTimeMax}
          title="匀变速直线运动 v-t 图"
        />
      </div>

      <div
        className="order-2 flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <MechanicsExperimentScene
            mode={modeNum}
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            d={dNum}
            time={timeNum}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
