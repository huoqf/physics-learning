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

  // ── 所有 Hook 必须在任何条件 return 之前调用，避免 mode 切换时 Hook 数量不一致 ──
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

  const epVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.Ep })),
    [visiblePoints]
  )

  const frictionWorkVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.x, y: p.W - p.Ep })),
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

  const atYDomain = useMemo((): [number, number] => {
    const vals = trajectory.map(p => Math.abs(p.a))
    if (vals.length === 0) return [0, 10]
    const hi = Math.max(...vals)
    return [0, hi * 1.2]
  }, [trajectory])

  // ── 派生量与共享元素 ──
  const criticalX = mode === 0 ? s_target : R
  const criticalLabel = mode === 0 ? 's' : 'R'
  const xDomain: [number, number] = [0, xMax * 1.05]
  const lastX = visiblePoints.at(-1)?.x
  const atRange: [number, number] = [atYDomain[0], atYDomain[1]]

  // Ek 曲线：两种模式结构一致，仅临界标记 label 不同
  const ekChart = (
    <RelationChart
      xLabel="x (m)"
      yLabel="Ek (J)"
      points={ekVisible}
      xDomain={xDomain}
      yDomain={ekYDomain}
      series="primary"
      cursorX={lastX}
      cursorLabel={(_x, y) => `Eₖ=${y.toFixed(1)}J`}
      markers={[{ axis: 'vertical', x: criticalX, label: criticalLabel, color: CHART_COLORS.criticalPt }]}
    />
  )

  // a-t 曲线：两种模式完全一致
  const atChart = (
    <AccelerationTimeChart
      points={atVisible}
      currentTime={currentTime}
      tMax={tMax}
      aRange={atRange}
      showCursor
    />
  )

  if (mode === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 h-full">
        {ekChart}
        <RelationChart
          xLabel="x (m)"
          yLabel="W (J)"
          points={workVisible}
          xDomain={xDomain}
          yDomain={workYDomain}
          series="success"
          cursorX={lastX}
          cursorLabel={(_x, y) => `W=${y.toFixed(1)}J`}
          markers={[{ axis: 'vertical', x: criticalX, label: 's', color: CHART_COLORS.criticalPt }]}
        />
        {atChart}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1 h-full">
      {ekChart}
      <RelationChart
        xLabel="x (m)"
        yLabel="W (J)"
        points={workVisible}
        xDomain={xDomain}
        yDomain={workYDomain}
        showZeroLine
        series="primary"
        additionalSeries={[
          { points: epVisible, label: 'W重', series: 'success', strokeWidth: 1.5 },
          { points: frictionWorkVisible, label: 'W摩', series: 'warm', strokeWidth: 1.5 },
        ]}
        cursorX={lastX}
        cursorLabel={(_x, y) => `W=${y.toFixed(1)}J`}
        markers={[{ axis: 'vertical', x: criticalX, label: 'R', color: CHART_COLORS.criticalPt }]}
      />
      {atChart}
    </div>
  )
}
