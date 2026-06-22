import { useMemo, useState } from 'react'
import { VelocityTimeChart, RelationChart, AccelerationTimeChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PowerModelState } from '@/physics/power'

type ChartTab = 'vt-pt' | 'fv-at'

interface PowerChartsProps {
  trajectory: PowerModelState[]
  currentTime: number
  tMax: number
  params: {
    P?: number
    m?: number
    f?: number
    a?: number
  }
  mode: 0 | 1
  criticalInfo?: {
    t_c: number
    v_c: number
    F_const: number
    v_max: number
  } | null
}

function buildFVHyperbola(P_rated: number, f: number, vMax: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const F_max = 3 * f
  const v_limit = P_rated / F_max
  const steps = 50

  for (let i = 0; i <= steps; i++) {
    const v = (vMax * i) / steps
    let F: number
    if (v < v_limit) {
      F = F_max
    } else {
      F = P_rated / v
    }
    points.push({ x: v, y: F })
  }
  return points
}

export function PowerCharts({
  trajectory,
  currentTime,
  tMax,
  params,
  mode,
}: PowerChartsProps) {
  const [tab, setTab] = useState<ChartTab>('vt-pt')

  const P_rated = params.P ?? 60000
  const f = params.f ?? 2000

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= currentTime + 0.02),
    [trajectory, currentTime]
  )

  const vtVisible = useMemo(
    () => visiblePoints.map(p => ({ t: p.t, v: p.v })),
    [visiblePoints]
  )

  const vtDomain = useMemo(
    () => trajectory.map(p => ({ t: p.t, v: p.v })),
    [trajectory]
  )

  const ptVisible = useMemo(
    () => visiblePoints.map(p => ({ x: p.t, y: p.P })),
    [visiblePoints]
  )

  const atVisible = useMemo(
    () => visiblePoints.map(p => ({ t: p.t, a: p.a })),
    [visiblePoints]
  )

  const ptYDomain = useMemo((): [number, number] => {
    return [0, P_rated * 1.2]
  }, [P_rated])

  const vMax = trajectory.at(-1)?.v ?? 0
  const fvDomain = useMemo(
    () => buildFVHyperbola(P_rated, f, vMax * 1.15),
    [P_rated, f, vMax]
  )

  if (mode === 0) {
    return (
      <div className="grid grid-cols-2 gap-1 h-full">
        <VelocityTimeChart
          points={vtVisible}
          domainPoints={vtDomain}
          currentTime={currentTime}
          tMax={tMax}
          series="primary"
          showCursor
          title="v-t"
        />
        <RelationChart
          xLabel="t (s)"
          yLabel="P (W)"
          points={ptVisible}
          xDomain={[0, tMax]}
          yDomain={ptYDomain}
          series="warm"
          cursorX={visiblePoints.at(-1)?.t}
          cursorLabel={(_x, y) => `P=${(y / 1000).toFixed(1)}kW`}
          markers={[{ axis: 'horizontal', y: P_rated, label: 'P额', color: PHYSICS_COLORS.power }]}
          title="P-t"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-2 pt-1">
        {(['vt-pt', 'fv-at'] as ChartTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded ${tab === t ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
          >
            {t === 'vt-pt' ? 'v-t / P-t' : 'F-v / a-t'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 flex-1 p-1">
        {tab === 'vt-pt' ? (
          <>
            <VelocityTimeChart
              points={vtVisible}
              domainPoints={vtDomain}
              currentTime={currentTime}
              tMax={tMax}
              series="primary"
              showCursor
              title="v-t"
            />
            <RelationChart
              xLabel="t (s)"
              yLabel="P (W)"
              points={ptVisible}
              xDomain={[0, tMax]}
              yDomain={ptYDomain}
              series="warm"
              cursorX={visiblePoints.at(-1)?.t}
              cursorLabel={(_x, y) => `P=${(y / 1000).toFixed(1)}kW`}
              markers={[{ axis: 'horizontal', y: P_rated, label: 'P额', color: PHYSICS_COLORS.power }]}
              title="P-t"
            />
          </>
        ) : (
          <>
            <RelationChart
              xLabel="v (m/s)"
              yLabel="F (N)"
              points={fvDomain}
              series="primary"
              title="F-v"
              markers={[
                { axis: 'horizontal', y: f, label: '阻力 f', color: PHYSICS_COLORS.friction },
              ]}
            />
            <AccelerationTimeChart
              points={atVisible}
              currentTime={currentTime}
              tMax={tMax}
              showCursor
              title="a-t"
            />
          </>
        )}
      </div>
    </div>
  )
}
