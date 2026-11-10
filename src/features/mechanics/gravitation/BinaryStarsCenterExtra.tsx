import { useMemo } from 'react'
import { BasePhysicsChart, ChartCursor, ChartLine } from '@/components/Chart'
import { useBinaryStars } from './hooks/useBinaryStars'
import { SERIES_MAP, type ChartSeriesVariant } from '@/theme/physics'
import {
  MULTI_STAR_CHART_BOUNDS,
  MULTI_STAR_DISTANCE_UNIT_M,
  sampleBinaryStarsCurves,
  sampleTripleStarsCurves,
} from '@/physics/celestial'

interface LegendEntry {
  label: string
  series: ChartSeriesVariant
}

function SeriesLegend({ items }: { items: LegendEntry[] }) {
  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-1 pb-1 text-[11px] text-neutral-600">
      <span className="font-medium text-neutral-500">质心系惯性坐标轴投影</span>
      <div className="flex items-center gap-3">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1 font-medium text-neutral-700">
            <span
              className="inline-block w-3 h-0.5 rounded-full"
              style={{ backgroundColor: SERIES_MAP[item.series] }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const formatIntTick = (v: number) => String(Math.round(v))

export default function BinaryStarsCenterExtra() {
  const state = useBinaryStars()

  const massRatio = state.mode === 0 ? state.massRatio : 1

  const binarySamples = useMemo(
    () => (state.mode === 0 ? sampleBinaryStarsCurves(state.LMeters, massRatio, 80) : []),
    [state.mode, state.LMeters, massRatio],
  )

  const tripleSamples = useMemo(
    () => (state.mode === 1 ? sampleTripleStarsCurves(state.LMeters, 80) : []),
    [state.mode, state.LMeters],
  )

  const yLimit = MULTI_STAR_CHART_BOUNDS.rMax
  const vLimit = MULTI_STAR_CHART_BOUNDS.vMax
  const xLimit = MULTI_STAR_CHART_BOUNDS.TMax

  if (state.mode === 0) {
    const x1Points = binarySamples.map((s) => ({ x: s.tDays, y: s.x1 }))
    const x2Points = binarySamples.map((s) => ({ x: s.tDays, y: s.x2 }))
    const vx1Points = binarySamples.map((s) => ({ x: s.tDays, y: s.vx1 }))
    const vx2Points = binarySamples.map((s) => ({ x: s.tDays, y: s.vx2 }))

    const dataPointsX = [
      { y: state.pos1.x / MULTI_STAR_DISTANCE_UNIT_M, label: 'x₁', series: 'warm' as const },
      { y: state.pos2.x / MULTI_STAR_DISTANCE_UNIT_M, label: 'x₂', series: 'primary' as const },
    ]
    const dataPointsV = [
      { y: state.vel1.x / 1000, label: 'v₁ₓ', series: 'warm' as const },
      { y: state.vel2.x / 1000, label: 'v₂ₓ', series: 'primary' as const },
    ]

    const legendItems: LegendEntry[] = [
      { label: '星1 (m₁)', series: 'warm' },
      { label: '星2 (m₂)', series: 'primary' },
    ]

    return (
      <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto select-none">
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
          <SeriesLegend items={legendItems} />
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={[0, xLimit]}
              yDomain={[-yLimit, yLimit]}
              xLabel="时间 t (d)"
              yLabel="x 投影 (×10¹⁰ m)"
              title="质心系惯性轴位置投影 (x–t)"
              yBaseline={0}
              gridCount={{ x: 4, y: 4 }}
              formatX={formatIntTick}
              formatY={formatIntTick}
              variant="mini"
            >
              <ChartLine points={x1Points} series="warm" />
              <ChartLine points={x2Points} series="primary" />
              <ChartCursor x={state.curTDays} dataPoints={dataPointsX} />
            </BasePhysicsChart>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
          <SeriesLegend items={legendItems} />
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={[0, xLimit]}
              yDomain={[-vLimit, vLimit]}
              xLabel="时间 t (d)"
              yLabel="vₓ 投影 (km/s)"
              title="质心系惯性轴速度投影 (vₓ–t)"
              yBaseline={0}
              gridCount={{ x: 4, y: 4 }}
              formatX={formatIntTick}
              formatY={formatIntTick}
              variant="mini"
            >
              <ChartLine points={vx1Points} series="warm" />
              <ChartLine points={vx2Points} series="primary" />
              <ChartCursor x={state.curTDays} dataPoints={dataPointsV} />
            </BasePhysicsChart>
          </div>
        </div>
      </div>
    )
  }

  // 三星系统模式
  const x1Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.x1 }))
  const x2Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.x2 }))
  const x3Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.x3 ?? 0 }))
  const vx1Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.vx1 }))
  const vx2Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.vx2 }))
  const vx3Points = tripleSamples.map((s) => ({ x: s.tDays, y: s.vx3 ?? 0 }))

  const dataPointsX = [
    { y: state.pos1.x / MULTI_STAR_DISTANCE_UNIT_M, label: 'x₁', series: 'primary' as const },
    { y: state.pos2.x / MULTI_STAR_DISTANCE_UNIT_M, label: 'x₂', series: 'warm' as const },
    { y: state.pos3.x / MULTI_STAR_DISTANCE_UNIT_M, label: 'x₃', series: 'success' as const },
  ]
  const dataPointsV = [
    { y: state.vel1.x / 1000, label: 'v₁ₓ', series: 'primary' as const },
    { y: state.vel2.x / 1000, label: 'v₂ₓ', series: 'warm' as const },
    { y: state.vel3.x / 1000, label: 'v₃ₓ', series: 'success' as const },
  ]

  const legendItems: LegendEntry[] = [
    { label: '星1', series: 'primary' },
    { label: '星2', series: 'warm' },
    { label: '星3', series: 'success' },
  ]

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto select-none">
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
        <SeriesLegend items={legendItems} />
        <div className="flex-1 min-h-0">
          <BasePhysicsChart
            xDomain={[0, xLimit]}
            yDomain={[-yLimit, yLimit]}
            xLabel="时间 t (d)"
            yLabel="x 投影 (×10¹⁰ m)"
            title="质心系惯性轴位置投影 (x–t)"
            yBaseline={0}
            gridCount={{ x: 4, y: 4 }}
            formatX={formatIntTick}
            formatY={formatIntTick}
            variant="mini"
          >
            <ChartLine points={x1Points} series="primary" />
            <ChartLine points={x2Points} series="warm" />
            <ChartLine points={x3Points} series="success" />
            <ChartCursor x={state.curTDays} dataPoints={dataPointsX} />
          </BasePhysicsChart>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
        <SeriesLegend items={legendItems} />
        <div className="flex-1 min-h-0">
          <BasePhysicsChart
            xDomain={[0, xLimit]}
            yDomain={[-vLimit, vLimit]}
            xLabel="时间 t (d)"
            yLabel="vₓ 投影 (km/s)"
            title="质心系惯性轴速度投影 (vₓ–t)"
            yBaseline={0}
            gridCount={{ x: 4, y: 4 }}
            formatX={formatIntTick}
            formatY={formatIntTick}
            variant="mini"
          >
            <ChartLine points={vx1Points} series="primary" />
            <ChartLine points={vx2Points} series="warm" />
            <ChartLine points={vx3Points} series="success" />
            <ChartCursor x={state.curTDays} dataPoints={dataPointsV} />
          </BasePhysicsChart>
        </div>
      </div>
    </div>
  )
}
