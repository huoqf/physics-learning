import { BasePhysicsChart } from '@/components/Chart/BasePhysicsChart'
import { ChartCursor } from '@/components/Chart/ChartCursor'
import { useChartContext } from '@/components/Chart/ChartContext'
import { useBinaryStars } from './hooks/useBinaryStars'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'

// ─── 双星模式位置投影曲线 (x-t) ────────────────────────────────────
function BinaryCurvePaths({
  r1,
  r2,
  omega,
  T,
}: {
  r1: number
  r2: number
  omega: number
  T: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const pointsCount = 80
  const path1Arr: string[] = []
  const path2Arr: string[] = []

  for (let i = 0; i < pointsCount; i++) {
    const t = (T * i) / (pointsCount - 1)
    const x1 = r1 * Math.cos(omega * t)
    const x2 = -r2 * Math.cos(omega * t)
    path1Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(x1).toFixed(1)}`)
    path2Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(x2).toFixed(1)}`)
  }

  return (
    <>
      <path
        d={`M ${path1Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path2Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  )
}

// ─── 双星模式速度投影曲线 (vx-t) ───────────────────────────────────
function BinaryVelCurvePaths({
  v1,
  v2,
  omega,
  T,
}: {
  v1: number
  v2: number
  omega: number
  T: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const pointsCount = 80
  const path1Arr: string[] = []
  const path2Arr: string[] = []

  for (let i = 0; i < pointsCount; i++) {
    const t = (T * i) / (pointsCount - 1)
    const vx1 = -v1 * Math.sin(omega * t)
    const vx2 = v2 * Math.sin(omega * t)
    path1Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(vx1).toFixed(1)}`)
    path2Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(vx2).toFixed(1)}`)
  }

  return (
    <>
      <path
        d={`M ${path1Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path2Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  )
}

// ─── 三星模式位置投影曲线 (x-t) ────────────────────────────────────
function TripleCurvePaths({
  r,
  omega,
  T,
}: {
  r: number
  omega: number
  T: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const pointsCount = 80
  const path1Arr: string[] = []
  const path2Arr: string[] = []
  const path3Arr: string[] = []

  for (let i = 0; i < pointsCount; i++) {
    const t = (T * i) / (pointsCount - 1)
    const x1 = r * Math.cos(omega * t)
    const x2 = r * Math.cos(omega * t + (2 * Math.PI) / 3)
    const x3 = r * Math.cos(omega * t + (4 * Math.PI) / 3)
    path1Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(x1).toFixed(1)}`)
    path2Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(x2).toFixed(1)}`)
    path3Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(x3).toFixed(1)}`)
  }

  return (
    <>
      <path
        d={`M ${path1Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path2Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path3Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.magneticField}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  )
}

// ─── 三星模式速度投影曲线 (vx-t) ───────────────────────────────────
function TripleVelCurvePaths({
  v,
  omega,
  T,
}: {
  v: number
  omega: number
  T: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const pointsCount = 80
  const path1Arr: string[] = []
  const path2Arr: string[] = []
  const path3Arr: string[] = []

  for (let i = 0; i < pointsCount; i++) {
    const t = (T * i) / (pointsCount - 1)
    const vx1 = -v * Math.sin(omega * t)
    const vx2 = -v * Math.sin(omega * t + (2 * Math.PI) / 3)
    const vx3 = -v * Math.sin(omega * t + (4 * Math.PI) / 3)
    path1Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(vx1).toFixed(1)}`)
    path2Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(vx2).toFixed(1)}`)
    path3Arr.push(`${toSvgX(t).toFixed(1)},${toSvgY(vx3).toFixed(1)}`)
  }

  return (
    <>
      <path
        d={`M ${path1Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path2Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={`M ${path3Arr.join(' L ')}`}
        fill="none"
        stroke={PHYSICS_COLORS.magneticField}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  )
}

// ─── 主组件 ──────────────────────────────────────────────────────────
export default function BinaryStarsCenterExtra() {
  const state = useBinaryStars()
  const time = useAnimationStore((s) => s.time)

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
        数据计算中…
      </div>
    )
  }

  const T = 2 * Math.PI / state.omega
  const curT = time % T

  // 1. 双星模式下的图表与校验
  if (state.mode === 0) {
    const { r1, r2, v1, v2 } = state

    // 位置投影数据游标点
    const curX1 = r1 * Math.cos(state.omega * curT)
    const curX2 = -r2 * Math.cos(state.omega * curT)
    const dataPointsX = [
      { y: curX1, label: 'x₁', series: 'warm' as const },
      { y: curX2, label: 'x₂', series: 'primary' as const },
    ]

    // 速度投影数据游标点
    const curVx1 = -v1 * Math.sin(state.omega * curT)
    const curVx2 = v2 * Math.sin(state.omega * curT)
    const dataPointsV = [
      { y: curVx1, label: 'v₁ₓ', series: 'warm' as const },
      { y: curVx2, label: 'v₂ₓ', series: 'primary' as const },
    ]

    const yLimit = Math.max(r1, r2) * 1.25
    const vLimit = Math.max(v1, v2) * 1.25

    return (
      <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto select-none">
        {/* 上方图表区：位置投影 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
          <BasePhysicsChart
            xDomain={[0, T]}
            yDomain={[-yLimit, yLimit]}
            xLabel="时间 t (s)"
            yLabel="位置投影 x (m)"
            title="双星空间位置投影 (x-t)"
            yBaseline={0}
            variant="mini"
          >
            <BinaryCurvePaths r1={r1} r2={r2} omega={state.omega} T={T} />
            <ChartCursor x={curT} dataPoints={dataPointsX} />
          </BasePhysicsChart>
        </div>

        {/* 下方图表区：速度投影 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
          <BasePhysicsChart
            xDomain={[0, T]}
            yDomain={[-vLimit, vLimit]}
            xLabel="时间 t (s)"
            yLabel="速度投影 v_x (m/s)"
            title="双星速度投影 (v_x-t)"
            yBaseline={0}
            variant="mini"
          >
            <BinaryVelCurvePaths v1={v1} v2={v2} omega={state.omega} T={T} />
            <ChartCursor x={curT} dataPoints={dataPointsV} />
          </BasePhysicsChart>
        </div>
      </div>
    )
  }

  // 2. 三星模式下的图表与校验
  const { r, v } = state

  // 位置投影游标点
  const curX1 = r * Math.cos(state.omega * curT)
  const curX2 = r * Math.cos(state.omega * curT + (2 * Math.PI) / 3)
  const curX3 = r * Math.cos(state.omega * curT + (4 * Math.PI) / 3)
  const dataPointsX = [
    { y: curX1, label: 'x₁', series: 'primary' as const },
    { y: curX2, label: 'x₂', series: 'warm' as const },
    { y: curX3, label: 'x₃', series: 'success' as const },
  ]

  // 速度投影游标点
  const curVx1 = -v * Math.sin(state.omega * curT)
  const curVx2 = -v * Math.sin(state.omega * curT + (2 * Math.PI) / 3)
  const curVx3 = -v * Math.sin(state.omega * curT + (4 * Math.PI) / 3)
  const dataPointsV = [
    { y: curVx1, label: 'v₁ₓ', series: 'primary' as const },
    { y: curVx2, label: 'v₂ₓ', series: 'warm' as const },
    { y: curVx3, label: 'v₃ₓ', series: 'success' as const },
  ]

  const yLimit = r * 1.25
  const vLimit = v * 1.25

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto select-none">
      {/* 上方图表区：位置投影 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
        <BasePhysicsChart
          xDomain={[0, T]}
          yDomain={[-yLimit, yLimit]}
          xLabel="时间 t (s)"
          yLabel="位置投影 x (m)"
          title="三星空间位置投影 (x-t)"
          yBaseline={0}
          variant="mini"
        >
          <TripleCurvePaths r={r} omega={state.omega} T={T} />
          <ChartCursor x={curT} dataPoints={dataPointsX} />
        </BasePhysicsChart>
      </div>

      {/* 下方图表区：速度投影 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200/50 p-2 shadow-sm">
        <BasePhysicsChart
          xDomain={[0, T]}
          yDomain={[-vLimit, vLimit]}
          xLabel="时间 t (s)"
          yLabel="速度投影 v_x (m/s)"
          title="三星速度投影 (v_x-t)"
          yBaseline={0}
          variant="mini"
        >
          <TripleVelCurvePaths v={v} omega={state.omega} T={T} />
          <ChartCursor x={curT} dataPoints={dataPointsV} />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
