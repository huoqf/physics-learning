import { FC, useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'
import { getVariablePhysicsAtTime } from '@/physics'

interface VelocityVTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

export const VelocityVTChart: FC<VelocityVTChartProps> = ({
  model, modelParams, t0, deltaT, tMax = 6,
}) => {
  // ── 物理引擎 Hook 应用 (数据源唯一化) ──
  const { points } = useVelocityPhysics(model, modelParams, tMax, t0)

  // ── 滑动窗口：当 t0 超出可见范围时自动平移，数据结束时锁定 ──
  const windowSize = tMax
  const dataEnded = t0 >= tMax
  const tWindowEnd = dataEnded ? tMax : Math.max(tMax, t0 + deltaT + tMax * 0.1)
  const tWindowStart = tWindowEnd - windowSize

  // ── 值范围（直接从预计算离散轨迹中截取，消除每帧循环物理公式） ──
  const fullCurvePoints = useMemo(() => {
    return points.filter((p) => p.t >= tWindowStart && p.t <= tWindowEnd)
  }, [points, tWindowStart, tWindowEnd])

  const { vMin, vMax } = useMemo(() => {
    if (fullCurvePoints.length === 0) return { vMin: -5, vMax: 5 }
    const vals = fullCurvePoints.map((p) => p.v)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = (hi - lo) * 0.1 || 1
    lo -= pad
    hi += pad
    return { vMin: lo, vMax: hi }
  }, [fullCurvePoints])

  // ── 可见曲线（只展示到当前时刻 t0） ──
  const curvePoints = useMemo(() => {
    return points.filter((p) => p.t >= tWindowStart && p.t <= t0 + 1e-9)
  }, [points, tWindowStart, t0])

  // ── 布局 ──
  const margin = { left: 15, right: 6, top: 12, bottom: 12 }
  const plotW = 100 - margin.left - margin.right
  const plotH = 100 - margin.top - margin.bottom

  const toSvgX = (t: number) => margin.left + ((t - tWindowStart) / windowSize) * plotW
  const toSvgY = (val: number) => margin.top + plotH - ((val - vMin) / (vMax - vMin)) * plotH

  // ── 当前点（全部使用 $O(1)$ 快速插值器） ──
  const stateT0 = getVariablePhysicsAtTime(points, t0, tMax)
  const stateT1 = getVariablePhysicsAtTime(points, t0 + deltaT, tMax)
  const px = toSvgX(t0)
  const py = toSvgY(stateT0.v)

  // 割线端点：仅当 t0+deltaT 在预计算范围内时才有效
  const isSecantValid = t0 + deltaT <= tMax

  // ── 平均速度 v̄ ──
  const x0 = stateT0.x
  const x1 = stateT1.x
  const vBar = deltaT !== 0 ? (x1 - x0) / deltaT : 0
  const vBarY = toSvgY(vBar)

  // ── Δt 区间位移积分面积路径（从 points 快速过滤转换） ──
  const areaPathD = useMemo(() => {
    if (deltaT <= 0.001) return ''
    const slicePoints = points.filter(p => p.t >= t0 - 1e-9 && p.t <= t0 + deltaT + 1e-9)
    if (slicePoints.length === 0) return ''
    let d = `M ${toSvgX(t0)},${toSvgY(0)}`
    for (const p of slicePoints) {
      d += ` L ${toSvgX(p.t)},${toSvgY(p.v)}`
    }
    // 补齐末端焦点
    const lastP = slicePoints[slicePoints.length - 1]
    if (lastP.t < t0 + deltaT) {
      const edge = getVariablePhysicsAtTime(points, t0 + deltaT, tMax)
      d += ` L ${toSvgX(t0 + deltaT)},${toSvgY(edge.v)}`
    }
    d += ` L ${toSvgX(t0 + deltaT)},${toSvgY(0)} Z`
    return d
  }, [points, t0, deltaT, toSvgX, toSvgY, tMax])

  // ── 刻度与排版 ──
  const fs = 4.2
  const sfs = 3.2
  const tickCount = 5

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 定义面积着色渐变 */}
      <defs>
        <linearGradient id="area-grad-vt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.effects.auroraBlueGrad[0]} stopOpacity="0.22" />
          <stop offset="100%" stopColor={SCENE_COLORS.effects.auroraBlueGrad[1]} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* 标题 */}
      <text x={margin.left} y={margin.top - 6} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">v-t 图像</text>

      {/* 精密细坐标轴网格底图 */}
      {Array.from({ length: 6 }).map((_, idx) => {
        const gridY = margin.top + (plotH * idx) / 5
        return (
          <line
            key={`grid-y-${idx}`}
            x1={margin.left} y1={gridY} x2={margin.left + plotW} y2={gridY}
            stroke="rgba(148, 163, 184, 0.05)"
            strokeWidth={0.3}
          />
        )
      })}
      {Array.from({ length: 6 }).map((_, idx) => {
        const gridX = margin.left + (plotW * idx) / 5
        return (
          <line
            key={`grid-x-${idx}`}
            x1={gridX} y1={margin.top} x2={gridX} y2={margin.top + plotH}
            stroke="rgba(148, 163, 184, 0.05)"
            strokeWidth={0.3}
          />
        )
      })}

      {/* 1. 坐标轴 */}
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      
      {/* y=0 零速穿轴虚线 */}
      {vMin < 0 && (
        <line x1={margin.left} y1={toSvgY(0)} x2={margin.left + plotW} y2={toSvgY(0)} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.35} strokeDasharray="1,1" opacity={0.4} />
      )}

      {/* x 轴刻度 */}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const t = tWindowStart + (windowSize * i) / tickCount
        const x = toSvgX(t)
        return (
          <g key={`xt-${i}`}>
            <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 1.5} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={x} y={margin.top + plotH + fs + 1.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
              {t.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* y 轴刻度 */}
      {Array.from({ length: 4 }, (_, i) => {
        const val = vMin + ((vMax - vMin) * i) / 3
        const y = toSvgY(val)
        return (
          <g key={`yt-${i}`}>
            <line x1={margin.left - 1.5} y1={y} x2={margin.left} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={margin.left - 2.5} y={y + sfs * 0.35} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
              {val.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* 2. Δt 位移积分面积填充 (平均速度展示) */}
      {deltaT > 0.001 && areaPathD && isSecantValid && (
        <path
          d={areaPathD}
          fill="url(#area-grad-vt)"
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={0.5}
          opacity={0.8}
        />
      )}

      {/* 3. 速度 v(t) 曲线 */}
      {curvePoints.length >= 2 && (
        <polyline
          points={curvePoints.map((p) => `${toSvgX(p.t)},${toSvgY(p.v)}`).join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={0.9}
        />
      )}

      {/* 4. 平均速度 v̄ 水平虚线段 */}
      {deltaT > 0.001 && isSecantValid && (
        <line
          x1={toSvgX(t0)} y1={vBarY}
          x2={toSvgX(t0 + deltaT)} y2={vBarY}
          stroke={PHYSICS_COLORS.averageVelocity}
          strokeWidth={0.75}
          strokeDasharray="1.5,0.8"
        />
      )}

      {/* 5. 瞬时速度水平读数线 */}
      <line
        x1={margin.left} y1={py} x2={px} y2={py}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={0.35}
        strokeDasharray="1,1"
        opacity={0.4}
      />

      {/* 6. 当前时刻点 P (多重曝光光晕) */}
      <g>
        <circle cx={px} cy={py} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.2} />
        <circle cx={px} cy={py} r={1.6} fill={PHYSICS_COLORS.velocity} stroke={colors.neutral[0]} strokeWidth={0.5} />
      </g>

      {/* 7. 垂直时间轴游标虚线 */}
      {t0 > 0 && (
        <line
          x1={px} y1={margin.top}
          x2={px} y2={margin.top + plotH}
          stroke="rgba(75, 85, 99, 0.3)"
          strokeWidth={0.4}
          strokeDasharray="1.5,1.5"
        />
      )}

      {/* 标注 */}
      <text x={margin.left + plotW + 1} y={margin.top + plotH + fs + 1} fontSize={fs} fill={PHYSICS_COLORS.labelText}>t</text>
      <text x={margin.left - 3.5} y={margin.top - 2.5} fontSize={fs} fill={PHYSICS_COLORS.labelText} textAnchor="end">v</text>
      {deltaT > 0.02 && (
        <text x={toSvgX(t0 + deltaT / 2)} y={vBarY - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold" textAnchor="middle">v̄</text>
      )}
      <text x={px + 2} y={py - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
    </svg>
  )
}
