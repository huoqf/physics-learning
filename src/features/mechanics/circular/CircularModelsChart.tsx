import { useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import {
  calculateConicalPendulumState,
  calculateDiskRotationState,
} from '@/physics/circularModels'

const MASS_KG = 1
const OMEGA_DOMAIN: [number, number] = [0, 8]
const CURVE_SAMPLES = 96

interface Point {
  x: number
  y: number
}

function ChartPolyline({ points, stroke, dashed = false }: { points: Point[]; stroke: string; dashed?: boolean }) {
  const ctx = useChartContext()
  if (!ctx || points.length === 0) return null
  const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${ctx.toSvgX(p.x)} ${ctx.toSvgY(p.y)}`).join(' ')
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '7 6' : undefined}
    />
  )
}

function ChartPoint({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const sx = ctx.toSvgX(x)
  const sy = ctx.toSvgY(y)
  return (
    <g>
      <line
        x1={sx}
        y1={ctx.plotOrigin.y}
        x2={sx}
        y2={ctx.plotOrigin.y + ctx.plotSize.height}
        stroke={withAlpha(color, 0.42)}
        strokeWidth={2}
        strokeDasharray="4 5"
      />
      <circle cx={sx} cy={sy} r={5} fill={color} stroke={PHYSICS_COLORS.white} strokeWidth={2} />
      <text
        x={sx + ctx.px(8)}
        y={sy - ctx.px(8)}
        fontSize={ctx.font(11)}
        fill={color}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function HorizontalReference({ y, color, label }: { y: number; color: string; label: string }) {
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
        stroke={color}
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

export default function CircularModelsChart() {
  const params = useAnimationStore((s) => s.params)
  const mode = params.modelMode ?? 0
  const omega = params.omega ?? 3
  const length = params.L ?? 1
  const radius = params.r ?? 0.8
  const mu = params.mu ?? 0.4
  const isConical = mode === 0

  const conical = useMemo(
    () => calculateConicalPendulumState(omega, length, MASS_KG),
    [omega, length],
  )
  const disk = useMemo(
    () => calculateDiskRotationState(omega, radius, mu, MASS_KG),
    [omega, radius, mu],
  )

  if (isConical) {
    const points = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
      const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
      return { x, y: calculateConicalPendulumState(x, length, MASS_KG).thetaDeg }
    })

    return (
      <div className="w-full h-full p-3 flex flex-col gap-2">
        <div className="shrink-0">
          <h3 className="text-sm font-bold text-neutral-800">摆角—角速度关系</h3>
          <p className="text-xs text-neutral-500">ω 增大时，cosθ = g/(ω²L) 变小，摆角 θ 增大。</p>
        </div>
        <div className="flex-1 min-h-0">
          <BasePhysicsChart
            xDomain={OMEGA_DOMAIN}
            yDomain={[0, 90]}
            xLabel="ω (rad/s)"
            yLabel="θ (°)"
            title="圆锥摆：θ 随 ω 增大"
            gridCount={{ x: 4, y: 5 }}
            formatX={(v) => v.toFixed(0)}
            formatY={(v) => v.toFixed(0)}
          >
            <ChartPolyline points={points} stroke={PHYSICS_COLORS.forceNet} />
            <ChartPoint x={omega} y={conical.thetaDeg} color={PHYSICS_COLORS.forceNet} label="当前 θ" />
            <ChartPoint x={conical.minOmega} y={0} color={PHYSICS_COLORS.dangerDark} label="ω₀" />
          </BasePhysicsChart>
        </div>
      </div>
    )
  }

  const yMax = Math.max(disk.maxStaticFriction * 1.35, MASS_KG * OMEGA_DOMAIN[1] ** 2 * radius * 1.05)
  const points = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
    const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
    return { x, y: MASS_KG * x * x * radius }
  })

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2">
      <div className="shrink-0">
        <h3 className="text-sm font-bold text-neutral-800">所需向心力—角速度关系</h3>
        <p className="text-xs text-neutral-500">Fₙ = mω²r 按二次方增长；超过 μmg 后不能保持静止相对圆盘。</p>
      </div>
      <div className="flex-1 min-h-0">
        <BasePhysicsChart
          xDomain={OMEGA_DOMAIN}
          yDomain={[0, yMax]}
          xLabel="ω (rad/s)"
          yLabel="Fₙ (N)"
          title="水平圆盘：静摩擦临界"
          gridCount={{ x: 4, y: 5 }}
          formatX={(v) => v.toFixed(0)}
          formatY={(v) => v.toFixed(0)}
        >
          <ChartPolyline points={points} stroke={PHYSICS_COLORS.forceNet} />
          <HorizontalReference y={disk.maxStaticFriction} color={PHYSICS_COLORS.frictionStatic} label="fmax = μmg" />
          <ChartPoint x={omega} y={disk.requiredForce} color={disk.slipping ? PHYSICS_COLORS.dangerDark : PHYSICS_COLORS.forceNet} label="当前 Fₙ" />
          <ChartPoint x={disk.criticalOmega} y={disk.maxStaticFriction} color={PHYSICS_COLORS.dangerDark} label="ωcrit" />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
