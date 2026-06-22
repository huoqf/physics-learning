import { useMemo } from 'react'
import { RelationChart, AccelerationTimeChart } from '@/components/Chart'
import { CHART_COLORS } from '@/theme/physics'
import type { KEModelState } from '@/physics/kineticEnergy'

interface KineticEnergyChartsProps {
  trajectory: KEModelState[]
  currentTime: number
  tMax: number
  xMax: number
  mode: 0 | 1
  params: {
    m: number
    F?: number
    s?: number
    R?: number
  }
}

export function KineticEnergyCharts({
  trajectory,
  currentTime,
  tMax,
  xMax,
  mode,
  params,
}: KineticEnergyChartsProps) {
  const s_target = params.s ?? 6
  const R = params.R ?? 5

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= currentTime + 0.02),
    [trajectory, currentTime]
  )

  const ekVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.Ek })),
    [visiblePoints]
  )

  const workVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.W })),
    [visiblePoints]
  )

  const atVisible = useMemo(
    () => visiblePoints.map(p => ({ t: p.t, a: Math.abs(p.a) })),
    [visiblePoints]
  )

  const ekYDomain = useMemo((): [number, number] => {
    const vals = trajectory.map(p => p.Ek)
    if (vals.length === 0) return [0, 10]
    const hi = Math.max(...vals)
    return [0, hi * 1.15]
  }, [trajectory])

  const workYDomain = useMemo((): [number, number] => {
    const vals = trajectory.map(p => p.W)
    if (vals.length === 0) return [0, 10]
    const lo = Math.min(0, ...vals)
    const hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [trajectory])

  const epYDomain = useMemo((): [number, number] => {
    const vals = trajectory.map(p => p.Ep)
    if (vals.length === 0) return [0, 10]
    const hi = Math.max(...vals)
    return [0, hi * 1.15]
  }, [trajectory])

  const atYDomain = useMemo((): [number, number] => {
    const vals = trajectory.map(p => Math.abs(p.a))
    if (vals.length === 0) return [0, 10]
    const hi = Math.max(...vals)
    return [0, hi * 1.2]
  }, [trajectory])

  const criticalX = mode === 0 ? s_target : R

  if (mode === 0) {
    return (
      <div className="grid grid-cols-2 gap-1 h-full">
        <RelationChart
          xLabel="x (m)"
          yLabel="Ek (J)"
          points={ekVisible}
          xDomain={[0, xMax * 1.05]}
          yDomain={ekYDomain}
          series="primary"
          cursorX={visiblePoints.at(-1)?.x}
          cursorLabel={(_x, y) => `Eₖ=${y.toFixed(1)}J`}
          markers={[{ axis: 'vertical', x: criticalX, label: 's', color: CHART_COLORS.criticalPt }]}
        />
        <RelationChart
          xLabel="x (m)"
          yLabel="W (J)"
          points={workVisible}
          xDomain={[0, xMax * 1.05]}
          yDomain={workYDomain}
          series="success"
          cursorX={visiblePoints.at(-1)?.x}
          cursorLabel={(_x, y) => `W=${y.toFixed(1)}J`}
          markers={[{ axis: 'vertical', x: criticalX, label: 's', color: CHART_COLORS.criticalPt }]}
        />
        <div className="col-span-2">
          <AccelerationTimeChart
            points={atVisible}
            currentTime={currentTime}
            tMax={tMax}
            aRange={[atYDomain[0], atYDomain[1]]}
            showCursor
          />
        </div>
      </div>
    )
  }

  const epVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.Ep })),
    [visiblePoints]
  )

  const frictionWorkVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.W - p.Ep })),
    [visiblePoints]
  )

  return (
    <div className="grid grid-cols-2 gap-1 h-full">
      <RelationChart
        xLabel="x (m)"
        yLabel="Ek (J)"
        points={ekVisible}
        xDomain={[0, xMax * 1.05]}
        yDomain={ekYDomain}
        series="primary"
        cursorX={visiblePoints.at(-1)?.x}
        cursorLabel={(_x, y) => `Eₖ=${y.toFixed(1)}J`}
        markers={[{ axis: 'vertical', x: criticalX, label: 'R', color: CHART_COLORS.criticalPt }]}
      />
      <RelationChart
        xLabel="x (m)"
        yLabel="W (J)"
        points={workVisible}
        xDomain={[0, xMax * 1.05]}
        yDomain={workYDomain}
        showZeroLine
        series="primary"
        additionalSeries={[
          {
            points: epVisible,
            label: 'W重',
            series: 'success',
            strokeWidth: 1.5,
          },
          {
            points: frictionWorkVisible,
            label: 'W摩',
            series: 'warm',
            strokeWidth: 1.5,
          },
        ]}
        cursorX={visiblePoints.at(-1)?.x}
        cursorLabel={(_x, y) => `W=${y.toFixed(1)}J`}
        markers={[{ axis: 'vertical', x: criticalX, label: 'R', color: CHART_COLORS.criticalPt }]}
      />
      <RelationChart
        xLabel="x (m)"
        yLabel="Ep (J)"
        points={epVisible}
        xDomain={[0, xMax * 1.05]}
        yDomain={epYDomain}
        series="secondary"
        cursorX={visiblePoints.at(-1)?.x}
        cursorLabel={(_x, y) => `Ep=${y.toFixed(1)}J`}
        markers={[{ axis: 'vertical', x: criticalX, label: 'R', color: CHART_COLORS.criticalPt }]}
      />
      <AccelerationTimeChart
        points={atVisible}
        currentTime={currentTime}
        tMax={tMax}
        aRange={[atYDomain[0], atYDomain[1]]}
        showCursor
      />
    </div>
  )
}
