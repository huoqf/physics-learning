import { useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { getConveyorFrame, type ConveyorMode } from '@/physics/conveyor'

const THETA_RAD = Math.PI / 12
const MASS_KG = 1
const T_MAX = 12
const SAMPLE_COUNT = 160

interface Point {
  x: number
  y: number
}

function ChartPolyline({ points, color }: { points: Point[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length === 0) return null
  const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${ctx.toSvgX(p.x)} ${ctx.toSvgY(p.y)}`).join(' ')
  return <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
}

function HorizontalLine({ y, color, label }: { y: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const sy = ctx.toSvgY(y)
  return (
    <g>
      <line
        x1={ctx.plotOrigin.x}
        y1={sy}
        x2={ctx.plotOrigin.x + ctx.plotSize.width}
        y2={sy}
        stroke={withAlpha(color, 0.68)}
        strokeWidth={2}
        strokeDasharray="7 6"
      />
      <text
        x={ctx.plotOrigin.x + ctx.plotSize.width - ctx.px(4)}
        y={sy - ctx.px(6)}
        fontSize={ctx.font(10)}
        fill={color}
        textAnchor="end"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function VerticalMarker({ x, color, label }: { x: number; color: string; label: string }) {
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
        stroke={withAlpha(color, 0.5)}
        strokeWidth={2}
        strokeDasharray="4 5"
      />
      <text
        x={sx + ctx.px(6)}
        y={ctx.plotOrigin.y + ctx.px(14)}
        fontSize={ctx.font(10)}
        fill={color}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function CurrentPoint({ x, y }: { x: number; y: number }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <circle
      cx={ctx.toSvgX(x)}
      cy={ctx.toSvgY(y)}
      r={5}
      fill={PHYSICS_COLORS.velocity}
      stroke={PHYSICS_COLORS.white}
      strokeWidth={2}
    />
  )
}

export default function ConveyorChart() {
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: ConveyorMode = (params.conveyorMode ?? 0) === 0 ? 'horizontal' : 'inclined'
  const vBelt = params.vBelt ?? 3
  const v0 = params.v0 ?? 0
  const mu = params.mu ?? 0.2
  const length = params.L ?? 6
  const showSyncLine = (params.showSyncLine ?? 1) === 1

  const data = useMemo(() => {
    const points: Point[] = []
    let syncTime: number | null = null
    let exitTime: number | null = null
    for (let idx = 0; idx <= SAMPLE_COUNT; idx += 1) {
      const t = T_MAX * idx / SAMPLE_COUNT
      const frame = getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, t, MASS_KG)
      points.push({ x: t, y: frame.vObj })
      syncTime = syncTime ?? frame.tSync
      exitTime = exitTime ?? frame.tExit
      if (frame.tExit != null) break
    }
    return { points, syncTime, exitTime }
  }, [vBelt, v0, mu, length, mode])

  const current = useMemo(
    () => getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, time, MASS_KG),
    [vBelt, v0, mu, length, mode, time],
  )

  const velocities = [...data.points.map((p) => p.y), vBelt, v0, current.vObj]
  const yMin = Math.min(-1, ...velocities) - 0.6
  const yMax = Math.max(1, ...velocities) + 0.6

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2">
      <div className="shrink-0">
        <h3 className="text-sm font-bold text-neutral-800">速度-时间图：共速点就是分段点</h3>
        <p className="text-xs text-neutral-500">虚线为传送带速度；物块速度曲线是否先到达虚线，决定后续摩擦性质。</p>
      </div>
      <div className="flex-1 min-h-0">
        <BasePhysicsChart
          xDomain={[0, T_MAX]}
          yDomain={[yMin, yMax]}
          xLabel="t (s)"
          yLabel="v (m/s)"
          title="v物-t 与 v带 对比"
          gridCount={{ x: 6, y: 5 }}
          yBaseline={0}
          formatX={(v) => v.toFixed(0)}
          formatY={(v) => v.toFixed(1)}
        >
          <HorizontalLine y={vBelt} color={PHYSICS_COLORS.frictionStatic} label="v带" />
          <ChartPolyline points={data.points} color={PHYSICS_COLORS.velocity} />
          {showSyncLine && data.syncTime != null && <VerticalMarker x={data.syncTime} color={PHYSICS_COLORS.annotation} label="共速" />}
          {data.exitTime != null && <VerticalMarker x={data.exitTime} color={PHYSICS_COLORS.dangerDark} label="离开" />}
          <CurrentPoint x={Math.min(time, T_MAX)} y={current.vObj} />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
