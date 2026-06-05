import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  calculateVariableAcceleration,
  calculateTangentSlope,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'

interface VelocityXTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

/**
 * x-t 图象 — 割线/切线逼近（进阶版左图）
 */
export const VelocityXTChart: FC<VelocityXTChartProps> = ({
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
      pts.push({ t, val: state.x })
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
      pts.push({ t, val: state.x })
    }
    return pts
  }, [model, modelParams, tWindowStart, tWindowEnd, t0])

  // ── 布局 ──
  const margin = { left: 15, right: 5, top: 10, bottom: 12 }
  const plotW = 100 - margin.left - margin.right
  const plotH = 100 - margin.top - margin.bottom

  const toSvgX = (t: number) => margin.left + ((t - tWindowStart) / windowSize) * plotW
  const toSvgY = (val: number) => margin.top + plotH - ((val - vMin) / (vMax - vMin)) * plotH

  // ── P 点 & 割线 & 切线 ──
  const stateP = calculateVariableAcceleration(model, modelParams, t0)
  const px = toSvgX(t0)
  const py = toSvgY(stateP.x)

  const secantState = calculateVariableAcceleration(model, modelParams, t0 + deltaT)
  const sx = toSvgX(t0 + deltaT)
  const sy = toSvgY(secantState.x)

  const tangentSlope = calculateTangentSlope(model, modelParams, t0)
  const tanLen = windowSize * 0.3
  const tanX1 = toSvgX(Math.max(tWindowStart, t0 - tanLen))
  const tanY1 = toSvgY(stateP.x - tangentSlope * tanLen)
  const tanX2 = toSvgX(Math.min(tWindowEnd, t0 + tanLen))
  const tanY2 = toSvgY(stateP.x + tangentSlope * tanLen)

  // ── 直角三角形 ──
  const triBaseX = toSvgX(t0 + deltaT)

  // ── 放大镜 ──
  const showMagnifier = deltaT < 0.2
  const magR = 14
  const magCx = (px + sx) / 2
  const magCy = (py + sy) / 2

  // ── 字体 ──
  const fs = 4
  const sfs = 3.2

  // ── 刻度 ──
  const tickCount = 5

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 标题 */}
      <text x={margin.left} y={margin.top - 6} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">x-t 图象</text>

      {/* 1. 坐标系 */}
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />

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

      {/* 2. 运动曲线 */}
      <polyline
        points={curvePoints.map((p) => `${toSvgX(p.t)},${toSvgY(p.val)}`).join(' ')}
        fill="none"
        stroke={PHYSICS_COLORS.displacement}
        strokeWidth={0.8}
      />

      {/* 3. 目标点 P */}
      <circle cx={px} cy={py} r={1.8} fill={PHYSICS_COLORS.displacement} stroke="white" strokeWidth={0.6} />

      {/* 4. 动态割线 */}
      {deltaT > 0.001 && (
        <line
          x1={px} y1={py} x2={sx} y2={sy}
          stroke={PHYSICS_COLORS.secantLine}
          strokeWidth={0.8}
          strokeDasharray="1.5,0.8"
          markerEnd="url(#arrow-secant-xt)"
        />
      )}

      {/* 5. 固定切线 */}
      <line
        x1={tanX1} y1={tanY1} x2={tanX2} y2={tanY2}
        stroke={PHYSICS_COLORS.tangentLine}
        strokeWidth={0.6}
        opacity={0.6}
      />

      {/* 6. 直角示性三角形 */}
      {deltaT > 0.005 && (
        <g>
          <line x1={px} y1={py} x2={triBaseX} y2={py} stroke={PHYSICS_COLORS.deltaHighlight} strokeWidth={0.6} />
          <line x1={triBaseX} y1={py} x2={triBaseX} y2={sy} stroke={PHYSICS_COLORS.deltaHighlight} strokeWidth={0.6} />
          <polygon
            points={`${px},${py} ${triBaseX},${py} ${triBaseX},${sy}`}
            fill={PHYSICS_COLORS.deltaHighlight}
            opacity={0.15}
          />
        </g>
      )}

      {/* 7. 放大镜 */}
      {showMagnifier && deltaT > 0.001 && (
        <g>
          <circle cx={magCx} cy={magCy} r={magR} fill="none" stroke={PHYSICS_COLORS.magnifier} strokeWidth={0.5} strokeDasharray="1,0.5" />
          <clipPath id="mag-clip-xt">
            <circle cx={magCx} cy={magCy} r={magR - 0.5} />
          </clipPath>
          <g clipPath="url(#mag-clip-xt)">
            <line x1={px} y1={py} x2={sx} y2={sy} stroke={PHYSICS_COLORS.secantLine} strokeWidth={1} />
            <line x1={tanX1} y1={tanY1} x2={tanX2} y2={tanY2} stroke={PHYSICS_COLORS.tangentLine} strokeWidth={1} />
          </g>
        </g>
      )}

      {/* 标注 */}
      <text x={margin.left + plotW + 1} y={margin.top + plotH + fs + 1.5} fontSize={fs} fill={PHYSICS_COLORS.labelText}>t</text>
      <text x={margin.left - 3} y={margin.top - 3} fontSize={fs} fill={PHYSICS_COLORS.labelText} textAnchor="end">x</text>
      {deltaT > 0.01 && (
        <text x={(px + sx) / 2 + 1.5} y={(py + sy) / 2 - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.secantLine} fontWeight="bold">k_割</text>
      )}
      <text x={tanX2 - 3} y={tanY2 - 1.5} fontSize={sfs} fill={PHYSICS_COLORS.tangentLine} fontWeight="bold">k_切</text>
      {deltaT < 0.1 && (
        <text x={margin.left + plotW - 8} y={margin.top + fs} fontSize={sfs} fill={PHYSICS_COLORS.tangentLine} fontWeight="bold">Δt→0</text>
      )}

      {/* 箭头标记 */}
      <defs>
        <marker id="arrow-secant-xt" markerWidth="3" markerHeight="2.5" refX="2.5" refY="1.25" orient="auto">
          <polygon points="0 0, 3 1.25, 0 2.5" fill={PHYSICS_COLORS.secantLine} />
        </marker>
      </defs>
    </svg>
  )
}
