import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { computeSingleSlitIntensity } from '@/physics/wave'

function IntensityPath({ points }: { points: { y: number; I: number }[] }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.y).toFixed(1)},${toSvgY(p.I).toFixed(1)}`).join(' L ')
  return <path d={d} fill="none" stroke={PHYSICS_COLORS.waveform} strokeWidth={2.2} strokeLinecap="round" />
}

export default function WaveDiffractionCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    })),
  )

  const d_cm = params.d ?? 8
  const lambda_cm = params.lambda ?? 4
  const d = d_cm / 100
  const lambda = lambda_cm / 100
  const screenDistance = 1.0 // m

  const yMax = 0.6 // m
  const points = useMemo(() => {
    const pts: { y: number; I: number }[] = []
    const steps = 120
    for (let i = 0; i <= steps; i++) {
      const y = -yMax + (2 * yMax * i) / steps
      const I = computeSingleSlitIntensity(y, d, lambda, screenDistance, 1)
      pts.push({ y, I })
    }
    return pts
  }, [d, lambda])

  const ratio = d / Math.max(lambda, 1e-12)

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2 bg-neutral-50/50 min-h-0">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-neutral-500">衍射能流密度分布 I(y)</span>
        <span className="text-[10px] text-neutral-400">{`d/λ ≈ ${ratio.toFixed(2)}`}</span>
      </div>
      <div className="flex-1 min-h-0 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
        <BasePhysicsChart
          xDomain={[-yMax, yMax]}
          yDomain={[0, 1.05]}
          xLabel="屏上位置 y (m)"
          yLabel="相对强度 I/I₀"
          variant="mini"
        >
          <IntensityPath points={points} />
        </BasePhysicsChart>
      </div>
      <p className="text-[10px] text-neutral-500 px-1 leading-relaxed">
        缝宽 d 越大（或 λ 越小），能量越集中在中央；d 接近或小于 λ 时曲线展宽，对应衍射更明显。
      </p>
    </div>
  )
}
