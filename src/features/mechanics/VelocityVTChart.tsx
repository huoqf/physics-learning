import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  calculateVariableAcceleration,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'

interface VelocityVTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

/**
 * v-t 图象 — 速度曲线/面积/平均速度（进阶版右图）
 */
export const VelocityVTChart: FC<VelocityVTChartProps> = ({
  model, modelParams, t0, deltaT, tMax = 6,
}) => {
  // ── 滑动窗口：当 t0 超出可见范围时自动平移 ──
  const windowSize = tMax
  const tWindowEnd = Math.max(tMax, t0 + deltaT + tMax * 0.1)
  const tWindowStart = tWindowEnd - windowSize

  // ── 值范围（用全范围计算，避免 y 轴跳动） ──
  const fullCurvePoints = useMemo(() => {
    const pts: { t: number; val: number }[] = []
    const steps = 200
    for (let i = 0; i <= steps; i++) {
      const t = tWindowStart + (windowSize * i) / steps
      const state = calculateVariableAcceleration(model, modelParams, t)
      pts.push({ t, val: state.v })
    }
    return pts
  }, [model, modelParams, tWindowStart, windowSize])

  const { vMin, vMax } = useMemo(() => {
    const vals = fullCurvePoints.map((p) => p.val)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = (hi - lo) * 0.1 || 1
    lo -= pad
    hi += pad
    return { vMin: lo, vMax: hi }
  }, [fullCurvePoints])

  // ── 可见曲线（只绘制到当前动画时间 t0） ──
  const curvePoints = useMemo(() => {
    const pts: { t: number; val: number }[] = []
    const steps = 200
    const tEnd = Math.min(t0, tWindowEnd)
    if (tEnd <= tWindowStart) return pts
    for (let i = 0; i <= steps; i++) {
      const t = tWindowStart + ((tEnd - tWindowStart) * i) / steps
      const state = calculateVariableAcceleration(model, modelParams, t)
      pts.push({ t, val: state.v })
    }
    return pts
  }, [model, modelParams, tWindowStart, tWindowEnd, t0])

  // ─ 布局 ──
  const margin = { left: 15, right: 5, top: 10, bottom: 12 }
  const plotW = 100 - margin.left - margin.right
  const plotH = 100 - margin.top - margin.bottom

  const toSvgX = (t: number) => margin.left + ((t - tWindowStart) / windowSize) * plotW
  const toSvgY = (val: number) => margin.top + plotH - ((val - vMin) / (vMax - vMin)) * plotH

  // ── 当前点 ──
  const stateT0 = calculateVariableAcceleration(model, modelParams, t0)
  const stateT1 = calculateVariableAcceleration(model, modelParams, t0 + deltaT)
  const px = toSvgX(t0)
  const py = toSvgY(stateT0.v)

  // ── 平均速度 v̄ ──
  const x0 = stateT0.x
  const x1 = stateT1.x
  const vBar = deltaT !== 0 ? (x1 - x0) / deltaT : 0
  const vBarY = toSvgY(vBar)

  // ── Δt 区间面积路径 ──
  const areaPathD = useMemo(() => {
    const steps = 40
    let d = `M ${toSvgX(t0)},${toSvgY(0)}`
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (deltaT * i) / steps
      d += ` L ${toSvgX(t)},${toSvgY(calculateVariableAcceleration(model, modelParams, t).v)}`
    }
    d += ` L ${toSvgX(t0 + deltaT)},${toSvgY(0)} Z`
    return d
  }, [model, modelParams, t0, deltaT, toSvgX, toSvgY])

  // ── 字体 ──
  const fs = 4
  const sfs = 3.2

  // ─ 刻度 ──
  const tickCount = 5

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 标题 */}
      <text x={margin.left} y={margin.top - 6} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">v-t 图象</text>

      {/* 1. 坐标系 */}
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      {/* y=0 轴 */}
      {vMin < 0 && (
        <line x1={margin.left} y1={toSvgY(0)} x2={margin.left + plotW} y2={toSvgY(0)} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} strokeDasharray="1,1" opacity={0.4} />
      )}

      {/* x 刻度 */}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const t = tWindowStart + (windowSize * i) / tickCount
        const x = toSvgX(t)
        return (
          <g key={`xt-${i}`}>
            <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 1.5} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={x} y={margin.top + plotH + fs + 1.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {t.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* y 刻度 */}
      {Array.from({ length: 4 }, (_, i) => {
        const val = vMin + ((vMax - vMin) * i) / 3
        const y = toSvgY(val)
        return (
          <g key={`yt-${i}`}>
            <line x1={margin.left - 1.5} y1={y} x2={margin.left} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={margin.left - 2.5} y={y + sfs * 0.35} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
              {val.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* 2. v(t) 曲线 */}
      <polyline
        points={curvePoints.map((p) => `${toSvgX(p.t)},${toSvgY(p.val)}`).join(' ')}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={0.8}
      />

      {/* 3. 当前点 */}
      <circle cx={px} cy={py} r={1.8} fill={PHYSICS_COLORS.velocity} stroke="white" strokeWidth={0.6} />

      {/* 4. 当前速度水平线 */}
      <line
        x1={margin.left} y1={py} x2={px} y2={py}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={0.4}
        strokeDasharray="1,0.8"
        opacity={0.5}
      />

      {/* 5. Δt 区间面积 */}
      {deltaT > 0.001 && (
        <path
          d={areaPathD}
          fill={PHYSICS_COLORS.displacement}
          opacity={0.15}
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={0.5}
        />
      )}

      {/* 6. 平均速度 v̄ 水平线 */}
      {deltaT > 0.001 && (
        <line
          x1={toSvgX(t0)} y1={vBarY}
          x2={toSvgX(t0 + deltaT)} y2={vBarY}
          stroke={PHYSICS_COLORS.averageVelocity}
          strokeWidth={0.7}
          strokeDasharray="1.5,0.8"
        />
      )}

      {/* 标注 */}
      <text x={margin.left + plotW + 1} y={margin.top + plotH + fs + 1.5} fontSize={fs} fill={PHYSICS_COLORS.labelText}>t</text>
      <text x={margin.left - 3} y={margin.top - 3} fontSize={fs} fill={PHYSICS_COLORS.labelText} textAnchor="end">v</text>
      {deltaT > 0.01 && (
        <text x={toSvgX(t0 + deltaT / 2)} y={vBarY - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold">v̄</text>
      )}
      <text x={px + 2} y={py - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
    </svg>
  )
}
