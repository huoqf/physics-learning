import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart/CharacteristicCurve'
import {
  calculateSteadyStateResonance,
  generateResonanceCurvePoints,
} from '@/physics/vibration/forcedResonance'

export default function ForcedResonanceCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.5
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const steady = useMemo(() => {
    return calculateSteadyStateResonance({ m, k, gamma, F0, f })
  }, [m, k, gamma, F0, f])

  const curvePoints = useMemo(() => {
    return generateResonanceCurvePoints(m, k, gamma, F0, 2.5, 70)
  }, [m, k, gamma, F0])

  const additionalSeries = useMemo(() => {
    if (mode === 2) {
      const weakPoints = generateResonanceCurvePoints(m, k, 0.2, F0, 2.5, 70)
      const strongPoints = generateResonanceCurvePoints(m, k, 1.2, F0, 2.5, 70)
      return [
        {
          points: weakPoints,
          label: '弱阻尼 (γ=0.2)',
          color: '#10B981',
          strokeWidth: 2,
        },
        {
          points: strongPoints,
          label: '强阻尼 (γ=1.2)',
          color: '#F59E0B',
          strokeWidth: 2,
          strokeDasharray: [4, 4],
        },
      ]
    }
    return []
  }, [mode, m, k, F0])

  const thresholds = useMemo(() => {
    return [
      {
        y: steady.maxAmplitude,
        label: `共振峰 (${steady.f0.toFixed(2)} Hz)`,
        color: '#EF4444',
        dasharray: '4 4',
      },
    ]
  }, [steady.maxAmplitude, steady.f0])

  return (
    <div className="w-full h-full flex flex-col p-2 bg-white rounded-xl shadow-sm border border-neutral-100 min-h-0">
      <div className="flex-1 min-h-0">
        <CharacteristicCurve
          points={curvePoints}
          title="共振响应特性曲线 (A - f)"
          xLabel="驱动力频率 f / Hz"
          yLabel="稳态受迫振幅 A / m"
          xDomain={[0, 2.5]}
          currentX={f}
          thresholds={thresholds}
          additionalSeries={additionalSeries}
          series="primary"
        />
      </div>
    </div>
  )
}
