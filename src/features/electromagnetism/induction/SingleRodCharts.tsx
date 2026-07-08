import { useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { getSingleRodState, type SingleRodMode } from '@/physics/singleRod'

const T_MAX = 12
const SAMPLE_COUNT = 120

interface Point {
  x: number
  y: number
}

function Line({ points, color }: { points: Point[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length === 0) return null
  const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${ctx.toSvgX(p.x)} ${ctx.toSvgY(p.y)}`).join(' ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
}

function Area({ points, color }: { points: Point[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length === 0) return null
  const baseline = ctx.toSvgY(0)
  const d = [
    `M ${ctx.toSvgX(points[0].x)} ${baseline}`,
    ...points.map((p) => `L ${ctx.toSvgX(p.x)} ${ctx.toSvgY(p.y)}`),
    `L ${ctx.toSvgX(points[points.length - 1].x)} ${baseline}`,
    'Z',
  ].join(' ')
  return <path d={d} fill={withAlpha(color, 0.18)} stroke="none" />
}

function Cursor({ x, label }: { x: number; label?: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const sx = ctx.toSvgX(x)
  return (
    <g>
      <line
        x1={sx}
        y1={ctx.plotOrigin.y}
        x2={sx}
        y2={ctx.plotOrigin.y + ctx.plotSize.height}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={2}
        strokeDasharray="4 5"
      />
      {label && (
        <text x={sx + ctx.px(4)} y={ctx.plotOrigin.y + ctx.px(12)} fontSize={ctx.font(9)} fill={PHYSICS_COLORS.labelTextLight}>
          {label}
        </text>
      )}
    </g>
  )
}

function PointMarker({ x, y, color }: { x: number; y: number; color: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return <circle cx={ctx.toSvgX(x)} cy={ctx.toSvgY(y)} r={4} fill={color} stroke={PHYSICS_COLORS.white} strokeWidth={1.5} />
}

function Legend({ x, y, color, text }: { x: number; y: number; color: string; text: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      <line x1={x} y1={y} x2={x + 14} y2={y} stroke={color} strokeWidth={2.5} />
      <text x={x + 18} y={y + 3} fontSize={ctx.font(9)} fill={PHYSICS_COLORS.labelTextLight}>{text}</text>
    </g>
  )
}

export default function SingleRodCharts() {
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: SingleRodMode = (params.startMechanism ?? 0) === 0 ? 'constantForce' : 'initialVelocity'
  const modelParams = useMemo(() => ({
    mode,
    driveForce: params.driveForce ?? 1.2,
    initialVelocity: params.initialVelocity ?? 5,
    magneticB: params.magneticB ?? 1.2,
    railSpacing: params.railSpacing ?? 0.8,
    resistance: params.resistance ?? 1.5,
    rodMass: params.rodMass ?? 0.2,
  }), [mode, params.driveForce, params.initialVelocity, params.magneticB, params.railSpacing, params.resistance, params.rodMass])

  const series = useMemo(() => {
    const v: Point[] = []
    const i: Point[] = []
    const work: Point[] = []
    const heat: Point[] = []
    const kinetic: Point[] = []
    for (let idx = 0; idx <= SAMPLE_COUNT; idx += 1) {
      const t = T_MAX * idx / SAMPLE_COUNT
      const state = getSingleRodState(modelParams, t)
      v.push({ x: t, y: state.v })
      i.push({ x: t, y: state.current })
      work.push({ x: t, y: state.workExternal })
      heat.push({ x: t, y: state.jouleHeat })
      kinetic.push({ x: t, y: state.kineticEnergy })
    }
    return { v, i, work, heat, kinetic }
  }, [modelParams])

  const current = useMemo(() => getSingleRodState(modelParams, Math.min(time, T_MAX)), [modelParams, time])
  const maxV = Math.max(0.5, ...series.v.map((p) => p.y), current.terminalVelocity) * 1.18
  const maxI = Math.max(0.2, ...series.i.map((p) => p.y)) * 1.18
  const maxEnergy = Math.max(0.5, ...series.work.map((p) => p.y), ...series.heat.map((p) => p.y), ...series.kinetic.map((p) => p.y)) * 1.18
  const cursorT = Math.min(time, T_MAX)

  return (
    <div className="w-full h-full p-2 flex gap-2">
      <div className="flex-1 min-w-0">
        <BasePhysicsChart
          xDomain={[0, T_MAX]}
          yDomain={[0, maxV]}
          xLabel="t/s"
          yLabel="v"
          title="v-t"
          gridCount={{ x: 4, y: 4 }}
          formatX={(v) => v.toFixed(0)}
          formatY={(v) => v.toFixed(1)}
        >
          <Line points={series.v} color={PHYSICS_COLORS.velocity} />
          {mode === 'constantForce' && <Line points={[{ x: 0, y: current.terminalVelocity }, { x: T_MAX, y: current.terminalVelocity }]} color={PHYSICS_COLORS.axis} />}
          <Cursor x={cursorT} label="t" />
          <PointMarker x={cursorT} y={current.v} color={PHYSICS_COLORS.velocity} />
        </BasePhysicsChart>
      </div>
      <div className="flex-1 min-w-0">
        <BasePhysicsChart
          xDomain={[0, T_MAX]}
          yDomain={[0, maxI]}
          xLabel="t/s"
          yLabel="I"
          title="I-t 面积=q"
          gridCount={{ x: 4, y: 4 }}
          formatX={(v) => v.toFixed(0)}
          formatY={(v) => v.toFixed(1)}
        >
          <Area points={series.i.filter((p) => p.x <= cursorT)} color={PHYSICS_COLORS.electricCurrent} />
          <Line points={series.i} color={PHYSICS_COLORS.electricCurrent} />
          <Cursor x={cursorT} />
          <PointMarker x={cursorT} y={current.current} color={PHYSICS_COLORS.electricCurrent} />
        </BasePhysicsChart>
      </div>
      <div className="flex-1 min-w-0">
        <BasePhysicsChart
          xDomain={[0, T_MAX]}
          yDomain={[0, maxEnergy]}
          xLabel="t/s"
          yLabel="E/J"
          title="能量转化"
          gridCount={{ x: 4, y: 4 }}
          formatX={(v) => v.toFixed(0)}
          formatY={(v) => v.toFixed(1)}
        >
          {mode === 'constantForce' && <Line points={series.work} color={PHYSICS_COLORS.appliedForce} />}
          <Line points={series.heat} color={PHYSICS_COLORS.heatLoss} />
          <Line points={series.kinetic} color={PHYSICS_COLORS.kineticEnergy} />
          <Cursor x={cursorT} />
          <Legend x={74} y={22} color={PHYSICS_COLORS.heatLoss} text="Q" />
          <Legend x={74} y={36} color={PHYSICS_COLORS.kineticEnergy} text="Ek" />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
