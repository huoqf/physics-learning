import { useMemo } from 'react'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  VT_CHART_COLORS,
  CHART_COLORS,
} from '@/theme/physics'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { VelocityTimeChart, useChartContext } from '@/components/Chart'

/**
 * v-t 图 + 面积差平行四边形几何证明
 */
export function VtChartWithArea({
  v0, a, time, physics, T, hoveredFlashIdx,
}: {
  v0: number; a: number; time: number
  physics: ReturnType<typeof useUniformAccelerationPhysics>
  T: number
  hoveredFlashIdx: number | null
}) {
  const VT_X_MAX = 8
  const { vtYMin, vtYMax } = useMemo(() => {
    const vEnd = v0 + a * VT_X_MAX
    const vMax = Math.max(v0, vEnd, 0) + 2
    const vMin = Math.min(v0, vEnd, 0) - 2
    return { vtYMin: Math.floor(vMin), vtYMax: Math.ceil(vMax) }
  }, [v0, a])

  // VelocityTimeChart 数据
  const vtPoints = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= VT_X_MAX; t += 0.05) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      pts.push({ t, v: vel })
    }
    return pts
  }, [v0, a])

  const vtActivePoints = useMemo(
    () => vtPoints.filter(p => p.t <= time + 0.01),
    [vtPoints, time]
  )

  // 平行四边形差值面积 children
  const areaChildren = useMemo(() => {
    if (hoveredFlashIdx === null || hoveredFlashIdx <= 0 || hoveredFlashIdx >= physics.flashPoints.length) {
      return null
    }
    const idx = hoveredFlashIdx
    const t_prev = (idx - 1) * T
    const t_curr = idx * T
    const t_next = (idx + 1) * T
    if (t_next > VT_X_MAX) return null

    const v_prev = v0 + a * t_prev
    const v_curr = v0 + a * t_curr
    const v_next = v0 + a * t_next

    return { t_prev, t_curr, t_next, v_prev, v_curr, v_next }
  }, [hoveredFlashIdx, T, v0, a, physics.flashPoints.length, VT_X_MAX])

  return (
    <div className="w-full h-full relative">
      <VelocityTimeChart
        mode="animated"
        points={vtActivePoints}
        domainPoints={vtPoints}
        currentTime={time}
        tMax={VT_X_MAX}
        vRange={[vtYMin, vtYMax]}
        title="匀变速直线运动 v-t 图象"
        showArea
        showCursor={time > 0 && time <= VT_X_MAX}
        showGrid
      >
        {/* 频闪点 */}
        <FlashDotOverlay flashPoints={physics.flashPoints} />
        {/* 平行四边形差值面积叠加层 */}
        {areaChildren && (
          <AreaDifferenceOverlay {...areaChildren} />
        )}
      </VelocityTimeChart>
      {/* 分析窗口标注 */}
      <div className="absolute bottom-1 right-2 text-[10px] text-neutral-400 pointer-events-none select-none">
        分析窗口 0–{VT_X_MAX}s
      </div>
    </div>
  )
}

/** 频闪点插件层 */
function FlashDotOverlay({
  flashPoints,
}: {
  flashPoints: { time: number; velocity: number }[]
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      {flashPoints.map((pt, i) => (
        <circle
          key={i}
          cx={ctx.toSvgX(pt.time)}
          cy={ctx.toSvgY(pt.velocity)}
          r={3}
          fill={PHYSICS_COLORS.referencePoint}
        />
      ))}
    </g>
  )
}

/** 平行四边形差值面积插件层（使用 ChartContext 坐标） */
function AreaDifferenceOverlay({
  t_prev, t_curr, t_next, v_prev, v_curr, v_next,
}: {
  t_prev: number; t_curr: number; t_next: number
  v_prev: number; v_curr: number; v_next: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  // 梯形 1
  const trap1D = `M ${toSvgX(t_prev)},${toSvgY(0)} L ${toSvgX(t_prev)},${toSvgY(v_prev)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_curr)},${toSvgY(0)} Z`
  // 梯形 2
  const trap2D = `M ${toSvgX(t_curr)},${toSvgY(0)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_next)},${toSvgY(v_next)} L ${toSvgX(t_next)},${toSvgY(0)} Z`
  // 差值平行四边形
  const diffD = `M ${toSvgX(t_curr)},${toSvgY(v_prev)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_next)},${toSvgY(v_next)} L ${toSvgX(t_next)},${toSvgY(v_curr)} Z`

  return (
    <g>
      <path d={trap1D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
      <path d={trap2D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
      <path d={diffD} fill={CHART_COLORS.areaFillWarm} opacity={0.45} stroke={PHYSICS_COLORS.acceleration} strokeWidth={1.5} />
      <text
        x={toSvgX((t_curr + t_next) / 2)}
        y={(toSvgY(v_curr) + toSvgY(v_prev)) / 2 + 3}
        fontSize={font(8)}
        fill={PHYSICS_COLORS.acceleration}
        textAnchor="middle"
        fontWeight="bold"
      >
        面积差 ΔS = aT²
      </text>
    </g>
  )
}