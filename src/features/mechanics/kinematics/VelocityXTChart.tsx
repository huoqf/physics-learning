import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'
import { getVariablePhysicsAtTime } from '@/physics'
import { VectorDefs } from '@/components/Physics/VectorDefs'

interface VelocityXTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

export const VelocityXTChart: FC<VelocityXTChartProps> = ({
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
    const vals = fullCurvePoints.map((p) => p.x)
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

  // ── P 点 & 割线 & 切线（全部使用 $O(1)$ 快速插值器） ──
  const stateP = getVariablePhysicsAtTime(points, t0, tMax)
  const px = toSvgX(t0)
  const py = toSvgY(stateP.x)

  // 割线端点：仅当 t0+deltaT 在预计算范围内时才有效
  const isSecantValid = t0 + deltaT <= tMax
  const secantState = getVariablePhysicsAtTime(points, t0 + deltaT, tMax)
  const sx = toSvgX(t0 + deltaT)
  const sy = toSvgY(secantState.x)

  // 切线斜率即为当前瞬时速度
  const tangentSlope = stateP.v
  // 切线时间延伸长度自适应：限制 y 方向偏移不超过值域的 25%，避免高速时切线爆炸
  const maxDy = (vMax - vMin) * 0.25
  const tanLen = Math.min(windowSize * 0.3, maxDy / (Math.abs(tangentSlope) + 1e-9))
  const tanX1 = toSvgX(Math.max(tWindowStart, t0 - tanLen))
  const tanY1 = toSvgY(stateP.x - tangentSlope * tanLen)
  const tanX2 = toSvgX(Math.min(tWindowEnd, t0 + tanLen))
  const tanY2 = toSvgY(stateP.x + tangentSlope * tanLen)

  // ── 直角三角形 ──
  const triBaseX = toSvgX(t0 + deltaT)

  // ── 刻度与排版 ──
  const fs = 4.2
  const sfs = 3.2
  const tickCount = 5

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 定义渐变与滤光片 */}
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.secantLine]} />
      </defs>

      {/* 标题 */}
      <text x={margin.left} y={margin.top - 6} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">x-t 图像</text>

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

      {/* 2. 位移运动曲线 */}
      {curvePoints.length >= 2 && (
        <polyline
          points={curvePoints.map((p) => `${toSvgX(p.t)},${toSvgY(p.x)}`).join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={0.9}
        />
      )}

      {/* 3. 割线直角三角形指示器 */}
      {deltaT > 0.005 && isSecantValid && (
        <g>
          <line x1={px} y1={py} x2={triBaseX} y2={py} stroke={PHYSICS_COLORS.deltaHighlight} strokeWidth={0.5} opacity={0.6} />
          <line x1={triBaseX} y1={py} x2={triBaseX} y2={sy} stroke={PHYSICS_COLORS.deltaHighlight} strokeWidth={0.5} opacity={0.6} />
          <polygon
            points={`${px},${py} ${triBaseX},${py} ${triBaseX},${sy}`}
            fill={PHYSICS_COLORS.deltaHighlight}
            opacity={0.12}
          />
        </g>
      )}

      {/* 4. 动态割线 */}
      {deltaT > 0.001 && isSecantValid && (
        <line
          x1={px} y1={py} x2={sx} y2={sy}
          stroke={PHYSICS_COLORS.secantLine}
          strokeWidth={0.8}
          strokeDasharray="1.5,0.8"
          markerEnd="url(#arrow-secant-xt)"
        />
      )}

      {/* 5. 瞬时切线 */}
      <line
        x1={tanX1} y1={tanY1} x2={tanX2} y2={tanY2}
        stroke={PHYSICS_COLORS.tangentLine}
        strokeWidth={0.65}
        opacity={0.7}
      />

      {/* 6. 当前观测点 P (多重曝光光晕) */}
      <g>
        <circle cx={px} cy={py} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.2} />
        <circle cx={px} cy={py} r={1.6} fill={PHYSICS_COLORS.displacement} stroke={colors.neutral[0]} strokeWidth={0.5} />
      </g>

      {/* 标注 */}
      <text x={margin.left + plotW + 1} y={margin.top + plotH + fs + 1} fontSize={fs} fill={PHYSICS_COLORS.labelText}>t</text>
      <text x={margin.left - 3.5} y={margin.top - 2.5} fontSize={fs} fill={PHYSICS_COLORS.labelText} textAnchor="end">x</text>
      {deltaT > 0.02 && (
        <text x={(px + sx) / 2 + 2} y={(py + sy) / 2 - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.secantLine} fontWeight="bold">k_割</text>
      )}
      <text x={tanX2 - 3.5} y={tanY2 - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.tangentLine} fontWeight="bold">k_切</text>
      {deltaT < 0.1 && (
        <text x={margin.left + plotW - 8} y={margin.top + fs} fontSize={sfs} fill={PHYSICS_COLORS.tangentLine} fontWeight="bold">Δt→0</text>
      )}
    </svg>
  )
}
