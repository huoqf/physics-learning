import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, ChartArea, ChartCursor, ChartLine, useChartContext } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SERIES_MAP, withAlpha } from '@/theme/physics'
import { getSingleRodState, type SingleRodMode } from '@/physics/singleRod'

const T_MAX = 12
const SAMPLE_COUNT = 120

interface Point {
  x: number
  y: number
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
  const { time, params, ghostSnapshot } = useAnimationStore(
    useShallow((s) => ({
      time: s.time,
      params: s.params,
      ghostSnapshot: s.ghostSnapshot,
    }))
  )

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

  const ghostSeries = useMemo(() => {
    if (!ghostSnapshot) return null
    const gp = ghostSnapshot.params
    const ghostMode: SingleRodMode = (gp.startMechanism ?? 0) === 0 ? 'constantForce' : 'initialVelocity'
    const ghostModelParams = {
      mode: ghostMode,
      driveForce: gp.driveForce ?? 1.2,
      initialVelocity: gp.initialVelocity ?? 5,
      magneticB: gp.magneticB ?? 1.2,
      railSpacing: gp.railSpacing ?? 0.8,
      resistance: gp.resistance ?? 1.5,
      rodMass: gp.rodMass ?? 0.2,
    }
    const v: Point[] = []
    const i: Point[] = []
    for (let idx = 0; idx <= SAMPLE_COUNT; idx += 1) {
      const t = T_MAX * idx / SAMPLE_COUNT
      const state = getSingleRodState(ghostModelParams, t)
      v.push({ x: t, y: state.v })
      i.push({ x: t, y: state.current })
    }
    const terminalV = getSingleRodState(ghostModelParams, 0).terminalVelocity
    return { v, i, mode: ghostMode, terminalV }
  }, [ghostSnapshot])

  const current = useMemo(() => getSingleRodState(modelParams, Math.min(time, T_MAX)), [modelParams, time])
  const ghostMaxV = ghostSeries
    ? Math.max(...ghostSeries.v.map((p) => p.y), ghostSeries.mode === 'constantForce' ? ghostSeries.terminalV : 0)
    : 0
  const ghostMaxI = ghostSeries ? Math.max(...ghostSeries.i.map((p) => p.y)) : 0
  const maxV = Math.max(0.5, ...series.v.map((p) => p.y), current.terminalVelocity, ghostMaxV) * 1.18
  const maxI = Math.max(0.2, ...series.i.map((p) => p.y), ghostMaxI) * 1.18
  const maxEnergy = Math.max(0.5, ...series.work.map((p) => p.y), ...series.heat.map((p) => p.y), ...series.kinetic.map((p) => p.y)) * 1.18
  const cursorT = Math.min(time, T_MAX)

  return (
    <div className="w-full h-full p-2 flex gap-2">
      {/* v-t 图表 */}
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
          {ghostSeries && (
            <ChartLine
              points={ghostSeries.v}
              color={withAlpha(SERIES_MAP.primary, 0.45)}
              strokeWidth={1.6}
              dash={[4, 3]}
            />
          )}
          <ChartLine points={series.v} series="primary" />
          {mode === 'constantForce' && (
            <ChartLine
              points={[{ x: 0, y: current.terminalVelocity }, { x: T_MAX, y: current.terminalVelocity }]}
              color={PHYSICS_COLORS.axis}
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}
          <ChartCursor
            x={cursorT}
            dataPoints={[{ y: current.v, label: 'v', series: 'primary' }]}
            formatValue={(v) => `${v.toFixed(2)} m/s`}
          />
        </BasePhysicsChart>
      </div>

      {/* I-t 图表 */}
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
          <ChartArea
            points={series.i}
            xRange={[0, cursorT]}
            variant="default"
            intensity="normal"
          />
          {ghostSeries && (
            <ChartLine
              points={ghostSeries.i}
              color={withAlpha(SERIES_MAP.warm, 0.45)}
              strokeWidth={1.6}
              dash={[4, 3]}
            />
          )}
          <ChartLine points={series.i} series="warm" />
          <ChartCursor
            x={cursorT}
            dataPoints={[{ y: current.current, label: 'I', series: 'warm' }]}
            formatValue={(v) => `${v.toFixed(3)} A`}
          />
        </BasePhysicsChart>
      </div>

      {/* 能量转化图表 */}
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
          {mode === 'constantForce' && (
            <ChartLine points={series.work} color={SERIES_MAP.accent} />
          )}
          <ChartLine points={series.heat} series="warm" />
          <ChartLine points={series.kinetic} series="success" />
          <ChartCursor
            x={cursorT}
            dataPoints={[
              { y: current.jouleHeat, label: 'Q', series: 'warm' },
              { y: current.kineticEnergy, label: 'Ek', series: 'success' },
            ]}
            formatValue={(v) => `${v.toFixed(2)} J`}
          />
          <Legend x={74} y={22} color={SERIES_MAP.warm} text="Q" />
          <Legend x={74} y={36} color={SERIES_MAP.success} text="Ek" />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
