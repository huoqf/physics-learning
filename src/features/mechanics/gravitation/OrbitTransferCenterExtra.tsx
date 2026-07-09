import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext, ChartCursor } from '@/components/Chart'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import {
  computeHohmannElements,
  sampleTransferSpeedHistory,
  megaMetersToMeters,
  type OrbitTransferPhase,
} from '@/physics/orbitTransfer'

function SpeedPath({ points }: { points: { t: number; v: number }[] }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.v).toFixed(1)}`).join(' L ')
  return (
    <path
      d={d}
      fill="none"
      stroke={PHYSICS_COLORS.velocity}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  )
}

function RefLine({ y, color, label }: { y: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgY, plotOrigin, plotSize } = ctx
  const yy = toSvgY(y)
  return (
    <g opacity={0.55}>
      <line
        x1={plotOrigin.x}
        y1={yy}
        x2={plotOrigin.x + plotSize.width}
        y2={yy}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text x={plotOrigin.x + plotSize.width - 4} y={yy - 3} textAnchor="end" fill={color} fontSize={9}>
        {label}
      </text>
    </g>
  )
}

export default function OrbitTransferCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const r1 = megaMetersToMeters(params.r1 ?? 7)
  const r3 = megaMetersToMeters(Math.max(params.r3 ?? 14, (params.r1 ?? 7) + 0.2))
  const phase = (params.phase ?? 0) as OrbitTransferPhase
  const tBurn1 = params.tBurn1 ?? 0
  const tBurn2 = params.tBurn2 ?? -1
  const tBurn2Eff = tBurn2 >= 0 ? tBurn2 : null

  const el = useMemo(() => computeHohmannElements({ r1, r3 }), [r1, r3])

  const points = useMemo(
    () =>
      sampleTransferSpeedHistory(
        { r1, r3 },
        phase,
        Math.max(time, 1),
        tBurn1,
        tBurn2Eff,
        100,
      ),
    [r1, r3, phase, time, tBurn1, tBurn2Eff],
  )

  const vNow = points.length ? points[points.length - 1].v : el.v1 / 1000
  const tMax = Math.max(time, el.halfTransferTime * 1.2, 50)
  const v1k = el.v1 / 1000
  const v3k = el.v3 / 1000
  const yMax = Math.max(v1k, el.vp / 1000, 1) * 1.15

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2 bg-neutral-50/50 min-h-0">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-neutral-500">线速度–时间 v–t（霍曼变轨）</span>
        <span className="text-[10px] text-neutral-400">
          {phase === 0 ? '低轨' : phase === 1 ? '椭圆转移' : '高轨'}
        </span>
      </div>
      <div className="flex-1 min-h-0 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
        <BasePhysicsChart
          xDomain={[0, tMax]}
          yDomain={[0, yMax]}
          xLabel="时间 t (s，教学缩放)"
          yLabel="v (km/s)"
          variant="mini"
        >
          <RefLine y={v1k} color={CANVAS_COLORS.labelTextLight} label="v₁" />
          <RefLine y={v3k} color={PHYSICS_COLORS.wavelength} label="v₃" />
          <SpeedPath points={points} />
          <ChartCursor
            x={time}
            dataPoints={[{ y: vNow, label: 'v', series: 'primary' as const }]}
          />
        </BasePhysicsChart>
      </div>
      <p className="text-[10px] text-neutral-500 px-1 leading-relaxed">
        近地点点火后速度突增，椭圆爬升段速度连续下降；远地点再点火进入高轨。稳态 v₃ &lt; v₁（高轨更慢）。
      </p>
    </div>
  )
}