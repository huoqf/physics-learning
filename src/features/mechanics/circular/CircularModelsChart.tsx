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
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '5 4' : undefined}
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
        stroke={withAlpha(color, 0.35)}
        strokeWidth={1.5}
        strokeDasharray="3 4"
      />
      <circle cx={sx} cy={sy} r={4.5} fill={color} stroke={PHYSICS_COLORS.white} strokeWidth={1.8} />
      <text
        x={sx + ctx.px(6)}
        y={sy - ctx.px(6)}
        fontSize={ctx.font(10)}
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
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />
      <text
        x={ctx.plotOrigin.x + ctx.plotSize.width - ctx.px(4)}
        y={sy - ctx.px(5)}
        fontSize={ctx.font(9)}
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

  // ─── 圆锥摆双图表 ───
  const conicalCharts = useMemo(() => {
    if (!isConical) return null

    // 1. 摆角 theta 随角速度变化曲线
    const thetaPoints = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
      const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
      return { x, y: calculateConicalPendulumState(x, length, MASS_KG).thetaDeg }
    })

    // 2. 绳子拉力 FT 随角速度变化曲线
    const tensionMax = Math.max(20, MASS_KG * OMEGA_DOMAIN[1] * OMEGA_DOMAIN[1] * length * 0.8)
    const tensionPoints = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
      const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
      return { x, y: calculateConicalPendulumState(x, length, MASS_KG).tension }
    })

    return { thetaPoints, tensionPoints, tensionMax }
  }, [isConical, length])

  // ─── 水平圆盘双图表 ───
  const diskCharts = useMemo(() => {
    if (isConical) return null

    // 1. 理论所需向心力 Fn 随角速度变化曲线
    const fnMax = Math.max(10, MASS_KG * OMEGA_DOMAIN[1] * OMEGA_DOMAIN[1] * radius * 1.05)
    const fnPoints = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
      const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
      return { x, y: MASS_KG * x * x * radius }
    })

    // 2. 实际摩擦力 f 随角速度变化曲线 (打滑前二次曲线上升，打滑后恒为 mu*m*g)
    const fMax = Math.max(10, mu * MASS_KG * 9.8 * 1.5)
    const critOmega = Math.sqrt((mu * 9.8) / radius)
    const frictionPoints = Array.from({ length: CURVE_SAMPLES + 1 }, (_, idx) => {
      const x = OMEGA_DOMAIN[0] + (OMEGA_DOMAIN[1] - OMEGA_DOMAIN[0]) * idx / CURVE_SAMPLES
      const y = x <= critOmega ? MASS_KG * x * x * radius : mu * MASS_KG * 9.8
      return { x, y }
    })

    return { fnPoints, frictionPoints, fnMax, fMax, critOmega }
  }, [isConical, radius, mu])

  if (isConical && conicalCharts) {
    return (
      <div className="w-full h-full p-3 flex flex-col gap-4 overflow-y-auto">
        {/* 图表一：摆角 */}
        <div className="flex-1 min-h-[270px] flex flex-col gap-1.5">
          <div className="shrink-0">
            <h3 className="text-xs font-bold text-neutral-800">摆角 — 角速度关系 (几何模型)</h3>
            <p className="text-[10px] text-neutral-500">
              当 ω &gt; ω₀ 时，摆球离心飞高，满足 cosθ = g/(ω²L)。
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={OMEGA_DOMAIN}
              yDomain={[0, 90]}
              xLabel="ω (rad/s)"
              yLabel="θ (°)"
              title="圆锥摆：摆角 θ 随角速度"
              gridCount={{ x: 4, y: 3 }}
              formatX={(v) => v.toFixed(0)}
              formatY={(v) => v.toFixed(0)}
            >
              <ChartPolyline points={conicalCharts.thetaPoints} stroke={PHYSICS_COLORS.annotation} />
              <ChartPoint x={omega} y={conical.thetaDeg} color={PHYSICS_COLORS.annotation} label={`当前: ${conical.thetaDeg.toFixed(0)}°`} />
              <ChartPoint x={conical.minOmega} y={0} color={PHYSICS_COLORS.dangerDark} label="临界 ω₀" />
            </BasePhysicsChart>
          </div>
        </div>

        {/* 图表二：拉力 */}
        <div className="flex-1 min-h-[270px] flex flex-col gap-1.5">
          <div className="shrink-0">
            <h3 className="text-xs font-bold text-neutral-800">绳子拉力 — 角速度关系 (受力模型)</h3>
            <p className="text-[10px] text-neutral-500">
              未起摆时拉力为 mg；起摆后拉力 FT = mω²L 呈二次方增长，极易拉断。
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={OMEGA_DOMAIN}
              yDomain={[0, conicalCharts.tensionMax]}
              xLabel="ω (rad/s)"
              yLabel="FT (N)"
              title="圆锥摆：拉力 FT 随角速度"
              gridCount={{ x: 4, y: 3 }}
              formatX={(v) => v.toFixed(0)}
              formatY={(v) => v.toFixed(0)}
            >
              <ChartPolyline points={conicalCharts.tensionPoints} stroke={PHYSICS_COLORS.tension} />
              <HorizontalReference y={MASS_KG * 9.8} color={PHYSICS_COLORS.gravity} label="mg = 9.8N" />
              <ChartPoint x={omega} y={conical.tension} color={PHYSICS_COLORS.tension} label={`当前: ${conical.tension.toFixed(1)}N`} />
              <ChartPoint x={conical.minOmega} y={MASS_KG * 9.8} color={PHYSICS_COLORS.dangerDark} label="起摆" />
            </BasePhysicsChart>
          </div>
        </div>
      </div>
    )
  }

  if (!isConical && diskCharts) {
    const isSlippingNow = disk.slipping
    const curFriction = omega <= diskCharts.critOmega ? disk.requiredForce : mu * MASS_KG * 9.8

    return (
      <div className="w-full h-full p-3 flex flex-col gap-4 overflow-y-auto">
        {/* 图表一：理论所需向心力 */}
        <div className="flex-1 min-h-[270px] flex flex-col gap-1.5">
          <div className="shrink-0">
            <h3 className="text-xs font-bold text-neutral-800">理论所需向心力 (圆周运动要求)</h3>
            <p className="text-[10px] text-neutral-500">
              向心力需求 Fn = mω²r 随转速呈二次方无限增长。
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={OMEGA_DOMAIN}
              yDomain={[0, diskCharts.fnMax]}
              xLabel="ω (rad/s)"
              yLabel="Fn (N)"
              title="理论所需向心力 Fn"
              gridCount={{ x: 4, y: 3 }}
              formatX={(v) => v.toFixed(0)}
              formatY={(v) => v.toFixed(0)}
            >
              <ChartPolyline points={diskCharts.fnPoints} stroke={PHYSICS_COLORS.forceNet} />
              <ChartPoint
                x={omega}
                y={disk.requiredForce}
                color={isSlippingNow ? PHYSICS_COLORS.dangerDark : PHYSICS_COLORS.forceNet}
                label={`需求: ${disk.requiredForce.toFixed(1)}N`}
              />
              <ChartPoint x={diskCharts.critOmega} y={disk.maxStaticFriction} color={PHYSICS_COLORS.dangerDark} label="临界 ωcrit" />
            </BasePhysicsChart>
          </div>
        </div>

        {/* 图表二：实际静摩擦力 */}
        <div className="flex-1 min-h-[270px] flex flex-col gap-1.5">
          <div className="shrink-0">
            <h3 className="text-xs font-bold text-neutral-800">实际静摩擦力 (接触面所能提供)</h3>
            <p className="text-[10px] text-neutral-500">
              打滑前静摩擦力提供向心力；打滑后突变为滑动摩擦力，限制在最大值 μmg。
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <BasePhysicsChart
              xDomain={OMEGA_DOMAIN}
              yDomain={[0, diskCharts.fMax]}
              xLabel="ω (rad/s)"
              yLabel="f (N)"
              title="实际静摩擦力 f"
              gridCount={{ x: 4, y: 3 }}
              formatX={(v) => v.toFixed(0)}
              formatY={(v) => v.toFixed(0)}
            >
              <ChartPolyline points={diskCharts.frictionPoints} stroke={PHYSICS_COLORS.frictionStatic} />
              <HorizontalReference y={disk.maxStaticFriction} color={PHYSICS_COLORS.friction} label="fmax = μmg" />
              <ChartPoint
                x={omega}
                y={curFriction}
                color={isSlippingNow ? PHYSICS_COLORS.dangerDark : PHYSICS_COLORS.frictionStatic}
                label={isSlippingNow ? `打滑: ${curFriction.toFixed(1)}N` : `当前: ${curFriction.toFixed(1)}N`}
              />
            </BasePhysicsChart>
          </div>
        </div>
      </div>
    )
  }

  return null
}
