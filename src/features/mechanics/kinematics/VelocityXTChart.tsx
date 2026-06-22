import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'
import { getVariablePhysicsAtTime } from '@/physics'
import {
  ChartCursor,
  ChartSecant,
  ChartTangent,
  DisplacementTimeChart,
  useChartContext,
} from '@/components/Chart'

interface VelocityXTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

interface VelocityXTOverlayProps {
  t0: number
  deltaT: number
  stateP: { x: number; v: number }
  secantState: { x: number }
  isSecantValid: boolean
  tangentExtent: number
}

function VelocityXTOverlay({
  t0,
  deltaT,
  stateP,
  secantState,
  isSecantValid,
  tangentExtent,
}: VelocityXTOverlayProps) {
  const ctx = useChartContext()
  if (!ctx) return null

  const { plotOrigin, plotSize, font } = ctx

  return (
    <g>
      {deltaT > 0.001 && isSecantValid && (
        <ChartSecant
          point={{ x: t0, y: stateP.x }}
          secantPoint={{ x: t0 + deltaT, y: secantState.x }}
          label={deltaT > 0.02 ? 'k_割' : undefined}
          dxLabel={deltaT > 0.12 ? 'Δt' : undefined}
          dyLabel={deltaT > 0.12 ? 'Δx' : undefined}
          color={PHYSICS_COLORS.secantLine}
          showTriangle={deltaT > 0.005}
          strokeWidth={1.2}
          strokeDasharray="4,2"
        />
      )}

      <ChartTangent
        point={{ x: t0, y: stateP.x }}
        slope={stateP.v}
        extent={tangentExtent}
        label="k_切"
        color={PHYSICS_COLORS.tangentLine}
        strokeWidth={1.2}
        lineOpacity={0.72}
        showPoint={false}
      />

      <ChartCursor
        x={t0}
        dataPoints={[{ y: stateP.x, label: 'x', series: 'success' }]}
        formatValue={(v) => `${v.toFixed(2)} m`}
        showLabels={false}
      />

      {deltaT < 0.1 && (
        <text
          x={plotOrigin.x + plotSize.width - font(42)}
          y={plotOrigin.y + font(11)}
          fontSize={font(10)}
          fill={PHYSICS_COLORS.tangentLine}
          fontWeight="bold"
        >
          Δt→0
        </text>
      )}
    </g>
  )
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
  const tDomain: [number, number] = [tWindowStart, tWindowEnd]

  // ── 值范围（直接从预计算离散轨迹中截取，消除每帧循环物理公式） ──
  const fullCurvePoints = useMemo(() => {
    return points.filter((p) => p.t >= tWindowStart && p.t <= tWindowEnd)
  }, [points, tWindowStart, tWindowEnd])

  const { xMin, xMax } = useMemo(() => {
    if (fullCurvePoints.length === 0) return { xMin: -5, xMax: 5 }
    const vals = fullCurvePoints.map((p) => p.x)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = (hi - lo) * 0.1 || 1
    lo -= pad
    hi += pad
    return { xMin: lo, xMax: hi }
  }, [fullCurvePoints])

  // ── P 点 & 割线 & 切线（全部使用 $O(1)$ 快速插值器） ──
  const stateP = getVariablePhysicsAtTime(points, t0, tMax)
  const isSecantValid = t0 + deltaT <= tMax
  const secantState = getVariablePhysicsAtTime(points, t0 + deltaT, tMax)

  // 切线时间延伸长度自适应：限制 y 方向偏移不超过值域的 25%，避免高速时切线爆炸
  const maxDy = (xMax - xMin) * 0.25
  const tangentExtent = Math.min(windowSize * 0.3, maxDy / (Math.abs(stateP.v) + 1e-9))

  const chartPoints = fullCurvePoints.map((p) => ({ t: p.t, x: p.x }))

  return (
    <DisplacementTimeChart
      points={chartPoints}
      domainPoints={chartPoints}
      currentTime={t0}
      tMax={tWindowEnd}
      tDomain={tDomain}
      xRange={[xMin, xMax]}
      title="x-t 图像"
      showCursor={false}
      className="w-full h-full"
    >
      <VelocityXTOverlay
        t0={t0}
        deltaT={deltaT}
        stateP={stateP}
        secantState={secantState}
        isSecantValid={isSecantValid}
        tangentExtent={tangentExtent}
      />
    </DisplacementTimeChart>
  )
}
