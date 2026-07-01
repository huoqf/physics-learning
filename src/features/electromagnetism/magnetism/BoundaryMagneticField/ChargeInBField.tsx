import { useAnimationStore } from '@/stores'
import { SimulationView } from './SimulationView'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { VelocityTimeChart } from '@/components/Chart'
import { calculateDoubleBoundaryExit, calculateCircularBoundaryExit, calcParticlePeriod } from '@/physics'

export default function ChargeInBField() {
  const params = useAnimationStore((s) => s.params)
  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const [sizeRef, size] = useCanvasSize(CANVAS_PRESETS.standard)

  const isWide = size.width > size.height * 1.1

  if (mode === 0) {
    return (
      <div ref={sizeRef} className={`w-full h-full flex overflow-hidden ${isWide ? 'flex-row' : 'flex-col'}`}>
        <div className="flex-1 relative min-w-0 min-h-0 border-neutral-200" style={{ borderRightWidth: isWide ? 1 : 0, borderBottomWidth: isWide ? 0 : 1 }}>
          <SimulationView />
        </div>
        <div className={`relative bg-white flex flex-col p-4 shrink-0 min-w-0 min-h-0 ${isWide ? 'w-80 h-full' : 'w-full h-64'}`}>
          <h3 className="text-sm font-bold text-neutral-700 mb-2">时间-速度 (t-v) 图像</h3>
          <div className="flex-1 min-h-0 relative">
            <VelocityChart />
          </div>
          <div className="mt-4 text-xs text-neutral-500">
            粒子在匀强磁场中受到的洛伦兹力始终与速度方向垂直，洛伦兹力不做功，只改变速度方向，不改变速度大小。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={sizeRef} className="w-full h-full relative min-w-0 min-h-0">
      <SimulationView />
    </div>
  )
}

function VelocityChart() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const theta = params.theta ?? 60
  const boundaryType = params.boundaryType ?? 0
  const d = params.magneticWidth ?? 5.0
  const Rb = params.magneticRadius ?? 4.0

  // 计算磁场中偏转的时间 tOut
  let tOut = 0
  if (boundaryType === 0) {
    const thetaRad = (theta * Math.PI) / 180
    const sign = (q * B) >= 0 ? -1 : 1
    const deltaPhi = sign === -1 ? 2 * thetaRad : 2 * (Math.PI - thetaRad)
    const T = calcParticlePeriod(m, q, B)
    tOut = T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0
  } else if (boundaryType === 1) {
    const res = calculateDoubleBoundaryExit(q, m, v, B, theta, d)
    tOut = res.t
  } else {
    const res = calculateCircularBoundaryExit(q, m, v, B, Rb)
    tOut = res.t
  }

  const tSlideIn = 0.5 * tOut
  const tSlideOut = 1.0 * tOut
  const tCycle = tSlideIn + tOut + tSlideOut

  const progressTime = time > 0 ? (time % tCycle) - tSlideIn : -tSlideIn

  const domainPoints = [
    { t: -tSlideIn, v },
    { t: tOut + tSlideOut, v }
  ]

  const points = [
    { t: -tSlideIn, v },
    { t: progressTime, v }
  ]

  const stages = [
    {
      from: 0,
      to: tOut,
      label: '磁场偏转',
      opacity: 0.1,
      showDividers: true
    }
  ]

  return (
    <div className="w-full h-full min-h-0 min-w-0 relative bg-neutral-50 rounded-lg p-2">
      <VelocityTimeChart
        mode="animated"
        points={points}
        domainPoints={domainPoints}
        currentTime={progressTime}
        tMax={tOut + tSlideOut}
        tDomain={[-tSlideIn, tOut + tSlideOut]}
        vRange={[0, v * 1.4]}
        showArea={false}
        title=""
        xLabel="时间 t (s)"
        yLabel="速度 v (m/s)"
        stages={stages}
      />
    </div>
  )
}
