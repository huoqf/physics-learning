import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'
import { getVariablePhysicsAtTime } from '@/physics'
import {
  ChartArea,
  ChartCursor,
  ChartSecant,
  ChartTangent,
  VelocityTimeChart,
  useChartContext,
} from '@/components/Chart'

interface VelocityVTChartProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  t0: number
  deltaT: number
  tMax?: number
}

interface VelocityVTUnderlayProps {
  points: { t: number; v: number }[]
  t0: number
  deltaT: number
  isSecantValid: boolean
}

function VelocityVTUnderlay({ points, t0, deltaT, isSecantValid }: VelocityVTUnderlayProps) {
  if (deltaT <= 0.001 || !isSecantValid) return null

  return (
    <ChartArea
      points={points.map((p) => ({ x: p.t, y: p.v }))}
      xRange={[t0, t0 + deltaT]}
      baseline={0}
      variant="default"
      intensity="normal"
      stroke={PHYSICS_COLORS.displacement}
      strokeWidth={0.8}
    />
  )
}

interface VelocityVTOverlayProps {
  t0: number
  deltaT: number
  stateT0: { v: number; a: number }
  stateT1: { v: number }
  vBar: number
  isSecantValid: boolean
  tangentExtent: number
}

function VelocityVTOverlay({
  t0,
  deltaT,
  stateT0,
  stateT1,
  vBar,
  isSecantValid,
  tangentExtent,
}: VelocityVTOverlayProps) {
  const ctx = useChartContext()
  if (!ctx) return null

  const { toSvgX, toSvgY, font } = ctx
  const vBarY = toSvgY(vBar)

  return (
    <g>
      {deltaT > 0.001 && isSecantValid && (
        <ChartSecant
          point={{ x: t0, y: stateT0.v }}
          secantPoint={{ x: t0 + deltaT, y: stateT1.v }}
          label={deltaT > 0.02 ? 'ā' : undefined}
          dxLabel={deltaT > 0.12 ? 'Δt' : undefined}
          dyLabel={deltaT > 0.12 ? 'Δv' : undefined}
          color={PHYSICS_COLORS.secantLine}
          showTriangle={deltaT > 0.005}
          strokeWidth={1.1}
          strokeDasharray="4,2"
          lineOpacity={0.72}
          triangleOpacity={0.08}
        />
      )}

      <ChartTangent
        point={{ x: t0, y: stateT0.v }}
        slope={stateT0.a}
        extent={tangentExtent}
        label="a"
        color={PHYSICS_COLORS.tangentLine}
        strokeWidth={1.1}
        lineOpacity={0.68}
        showPoint={false}
      />

      {deltaT > 0.001 && isSecantValid && (
        <g>
          <line
            x1={toSvgX(t0)} y1={vBarY}
            x2={toSvgX(t0 + deltaT)} y2={vBarY}
            stroke={PHYSICS_COLORS.averageVelocity}
            strokeWidth={1.1}
            strokeDasharray="4,2"
          />
          {deltaT > 0.02 && (
            <text
              x={toSvgX(t0 + deltaT / 2)}
              y={vBarY - font(5)}
              fontSize={font(10)}
              fill={PHYSICS_COLORS.averageVelocity}
              fontWeight="bold"
              textAnchor="middle"
            >
              v̄
            </text>
          )}
        </g>
      )}

      <ChartCursor
        x={t0}
        dataPoints={[{ y: stateT0.v, label: 'v', series: 'primary' }]}
        formatValue={(v) => `${v.toFixed(2)} m/s`}
        showLabels={false}
      />
    </g>
  )
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
  const tDomain: [number, number] = [tWindowStart, tWindowEnd]

  // ── 值范围（直接从预计算离散轨迹中截取，消除每帧循环物理公式） ──
  const fullCurvePoints = useMemo(() => {
    return points.filter((p) => p.t >= tWindowStart && p.t <= tWindowEnd)
  }, [points, tWindowStart, tWindowEnd])

  const { vMin, vMax } = useMemo(() => {
    if (fullCurvePoints.length === 0) return { vMin: -5, vMax: 5 }
    const vals = fullCurvePoints.map((p) => p.v)
    let lo = Math.min(0, ...vals)
    let hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.1 || 1
    lo -= pad
    hi += pad
    return { vMin: lo, vMax: hi }
  }, [fullCurvePoints])

  // ── 当前点（全部使用 $O(1)$ 快速插值器） ──
  const stateT0 = getVariablePhysicsAtTime(points, t0, tMax)
  const stateT1 = getVariablePhysicsAtTime(points, t0 + deltaT, tMax)

  // 割线端点：仅当 t0+deltaT 在预计算范围内时才有效
  const isSecantValid = t0 + deltaT <= tMax

  // ── 平均速度 v̄ ──
  const vBar = deltaT !== 0 ? (stateT1.x - stateT0.x) / deltaT : 0

  // v-t 图上的斜率语义：割线斜率为平均加速度，切线斜率为瞬时加速度
  const maxDy = (vMax - vMin) * 0.25
  const tangentExtent = Math.min(windowSize * 0.25, maxDy / (Math.abs(stateT0.a) + 1e-9))

  const chartPoints = fullCurvePoints.map((p) => ({ t: p.t, v: p.v }))

  return (
    <VelocityTimeChart
      points={chartPoints}
      domainPoints={chartPoints}
      currentTime={t0}
      tMax={tWindowEnd}
      tDomain={tDomain}
      vRange={[vMin, vMax]}
      title="v-t 图像"
      showArea={false}
      showCursor={false}
      className="w-full h-full"
      underlay={
        <VelocityVTUnderlay
          points={chartPoints}
          t0={t0}
          deltaT={deltaT}
          isSecantValid={isSecantValid}
        />
      }
    >
      <VelocityVTOverlay
        t0={t0}
        deltaT={deltaT}
        stateT0={stateT0}
        stateT1={stateT1}
        vBar={vBar}
        isSecantValid={isSecantValid}
        tangentExtent={tangentExtent}
      />
    </VelocityTimeChart>
  )
}
