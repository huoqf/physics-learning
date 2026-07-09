import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { PHYSICS_COLORS, WAVE_COLORS } from '@/theme/physics'
import { computeTwoSourceScreenIntensity } from '@/physics/wave'

function IntensityPath({ points, color }: { points: { y: number; I: number }[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.y).toFixed(1)},${toSvgY(p.I).toFixed(1)}`).join(' L ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
}

export default function WaveInterferenceCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    })),
  )

  const a_cm = params.a ?? 12
  const lambda_cm = params.lambda ?? 5
  const a = a_cm / 100
  const lambda = lambda_cm / 100
  const screenDistance = 1.0
  const yMax = 0.5

  const points = useMemo(() => {
    const pts: { y: number; I: number }[] = []
    const steps = 140
    for (let i = 0; i <= steps; i++) {
      const y = -yMax + (2 * yMax * i) / steps
      const I = computeTwoSourceScreenIntensity(y, a, lambda, screenDistance, 1)
      pts.push({ y, I })
    }
    return pts
  }, [a, lambda])

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2 bg-neutral-50/50 min-h-0">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-neutral-500">双源干涉屏强 I(y)</span>
        <span className="text-[10px]" style={{ color: WAVE_COLORS.antinodePoint }}>
          加强: δ = nλ
        </span>
      </div>
      <div className="flex-1 min-h-0 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
        <BasePhysicsChart
          xDomain={[-yMax, yMax]}
          yDomain={[0, 1.05]}
          xLabel="屏上位置 y (m)"
          yLabel="相对强度 I/I₀"
          variant="mini"
        >
          <IntensityPath points={points} color={PHYSICS_COLORS.waveform} />
        </BasePhysicsChart>
      </div>
      <p className="text-[10px] text-neutral-500 px-1 leading-relaxed">
        相干双源：程差 δ = nλ 加强，δ = (n+1/2)λ 减弱。调节间距 a 或波长 λ 可改变条纹疏密。
      </p>
    </div>
  )
}
