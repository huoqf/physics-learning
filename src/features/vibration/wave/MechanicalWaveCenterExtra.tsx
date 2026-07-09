import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext, ChartCursor } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  computeWaveDisplacement,
  computeWavelength,
  computeWavePeriod,
  DEFAULT_WAVE_CHAIN_LENGTH,
  DEFAULT_TRACKED_PARTICLE_INDEX,
  type MechanicalWaveMode,
} from '@/physics/wave'

function WaveformPath({ points, color }: { points: { x: number; y: number }[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' L ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
}

function VibrationPath({ points, color }: { points: { t: number; y: number }[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' L ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
}

export default function MechanicalWaveCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const A_cm = params.A ?? 2
  const A = A_cm / 100 // m
  const f = params.f ?? 1
  const v = params.v ?? 2
  const mode = (params.mode ?? 0) as MechanicalWaveMode
  const phase0 = ((params.phi0 ?? 0) * Math.PI) / 180

  const waveParams = useMemo(
    () => ({ amplitude: A, frequency: f, waveSpeed: v, phase0, mode }),
    [A, f, v, phase0, mode],
  )

  const lambda = computeWavelength(f, v)
  const T = computeWavePeriod(f)
  const L = DEFAULT_WAVE_CHAIN_LENGTH
  const xP = (DEFAULT_TRACKED_PARTICLE_INDEX / (25 - 1)) * L

  // y–x 空间快照（位移以 cm 显示）
  const yxPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const steps = 80
    for (let i = 0; i <= steps; i++) {
      const x = (L * i) / steps
      const y_m = computeWaveDisplacement(x, time, waveParams)
      pts.push({ x, y: y_m * 100 })
    }
    return pts
  }, [L, time, waveParams])

  // y–t 质点 P（显示最近 2 个周期或 0..2T）
  const tWindow = Math.max(2 * (T || 1), 2)
  const ytPoints = useMemo(() => {
    const pts: { t: number; y: number }[] = []
    const steps = 100
    const t0 = Math.max(0, time - tWindow)
    const t1 = Math.max(tWindow, time)
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps
      const y_m = computeWaveDisplacement(xP, t, waveParams)
      pts.push({ t, y: y_m * 100 })
    }
    return pts
  }, [time, tWindow, xP, waveParams])

  const yP_cm = computeWaveDisplacement(xP, time, waveParams) * 100
  const yDomain: [number, number] = [-A_cm * 1.2, A_cm * 1.2]
  const tMin = Math.max(0, time - tWindow)
  const tMax = Math.max(tWindow, time)

  return (
    <div className="w-full h-full p-2 flex gap-2 bg-neutral-50/50 min-h-0">
      <div className="flex-1 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-neutral-500">y–x 波形图（空间快照）</span>
          <span className="text-[10px] text-neutral-400">
            {lambda > 0 ? `λ ≈ ${lambda.toFixed(2)} m` : '—'}
          </span>
        </div>
        <div className="flex-1 min-h-0 relative">
          <BasePhysicsChart
            xDomain={[0, L]}
            yDomain={yDomain}
            xLabel="位置 x (m)"
            yLabel="位移 y (cm)"
            yBaseline={0}
            variant="mini"
          >
            <WaveformPath points={yxPoints} color={PHYSICS_COLORS.waveform} />
            <ChartCursor
              x={xP}
              dataPoints={[{ y: yP_cm, label: 'P', series: 'success' as const }]}
            />
          </BasePhysicsChart>
        </div>
      </div>

      <div className="flex-1 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-xs font-bold text-neutral-500">y–t 振动图（质点 P）</span>
          <span className="text-[10px] text-neutral-400">x_P 固定</span>
        </div>
        <div className="flex-1 min-h-0 relative">
          <BasePhysicsChart
            xDomain={[tMin, tMax]}
            yDomain={yDomain}
            xLabel="时间 t (s)"
            yLabel="位移 y (cm)"
            yBaseline={0}
            variant="mini"
          >
            <VibrationPath points={ytPoints} color={PHYSICS_COLORS.amplitude} />
            <ChartCursor
              x={time}
              dataPoints={[{ y: yP_cm, label: 'P', series: 'success' as const }]}
            />
          </BasePhysicsChart>
        </div>
      </div>
    </div>
  )
}
