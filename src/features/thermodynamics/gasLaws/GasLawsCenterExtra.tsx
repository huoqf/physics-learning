import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PV_CHART_COLORS } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'
import { Card } from '@/components/UI'
import {
  computeBoylePressure,
  computeGayLussacVolume,
  computeCharlesPressure,
  generateIsothermPoints,
  generateIsobarPoints,
  generateIsochorPoints,
} from '@/physics/gasLaws'

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const N_DEFAULT = 1
const T_MIN = 200
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2

export default function GasLawsCenterExtra() {
  const params = useAnimationStore((s) => s.params)

  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  // 计算当前的状态参量
  const P = mode === 0
    ? computeBoylePressure(V, T, N_DEFAULT)
    : mode === 1
      ? (params.P ?? computeBoylePressure(V, T, N_DEFAULT))
      : computeCharlesPressure(T, V, N_DEFAULT)

  const displayP = mode === 1
    ? P
    : mode === 0
      ? computeBoylePressure(V, T, N_DEFAULT)
      : computeCharlesPressure(T, V, N_DEFAULT)

  // 根据当前实验模式生成图表配置
  const chartConfig = useMemo(() => {
    if (mode === 0) {
      // 等温变化：P-V 图（反比例曲线）
      const data = generateIsothermPoints(T, N_DEFAULT, V_MIN, V_MAX, 50)
      return {
        title: 'P-V 图 (等温线)',
        xLabel: '体积 V (m³)',
        yLabel: '压强 P (Pa)',
        xDomain: [V_MIN, V_MAX] as [number, number],
        yDomain: [0, data[0]?.p ?? 1e5] as [number, number],
        color: PV_CHART_COLORS.isotherm,
        points: data.map((d) => ({ x: d.v, y: d.p })),
        currentX: V,
        currentY: displayP,
        constantLabel: `PV = ${(displayP * V).toFixed(2)} J`,
      }
    } else if (mode === 1) {
      // 等压变化：V-T 图（正比例直线，过外推原点）
      const data = generateIsobarPoints(displayP, N_DEFAULT, T_MIN, T_MAX, 50)
      const vMax = computeGayLussacVolume(T_MAX, displayP, N_DEFAULT)
      return {
        title: 'V-T 图 (等压线)',
        xLabel: '温度 T (K)',
        yLabel: '体积 V (m³)',
        xDomain: [T_MIN, T_MAX] as [number, number],
        yDomain: [0, vMax * 1.1] as [number, number],
        color: PV_CHART_COLORS.isobar,
        points: data.map((d) => ({ x: d.t, y: d.v })),
        currentX: T,
        currentY: computeGayLussacVolume(T, displayP, N_DEFAULT),
        constantLabel: `V/T = ${(V / T).toExponential(3)} m³/K`,
      }
    } else {
      // 等容变化：P-T 图（正比例直线，过外推原点）
      const data = generateIsochorPoints(V, N_DEFAULT, T_MIN, T_MAX, 50)
      const pMax = computeCharlesPressure(T_MAX, V, N_DEFAULT)
      return {
        title: 'P-T 图 (等容线)',
        xLabel: '温度 T (K)',
        yLabel: '压强 P (Pa)',
        xDomain: [T_MIN, T_MAX] as [number, number],
        yDomain: [0, pMax * 1.1] as [number, number],
        color: PV_CHART_COLORS.isochor,
        points: data.map((d) => ({ x: d.t, y: d.p })),
        currentX: T,
        currentY: displayP,
        constantLabel: `P/T = ${(displayP / T).toFixed(1)} Pa/K`,
      }
    }
  }, [mode, T, V, displayP])

  // 当前状态点标记
  const markers: RelationMarker[] = useMemo(() => [
    {
      axis: 'point',
      x: chartConfig.currentX,
      y: chartConfig.currentY,
      color: PV_CHART_COLORS.statePoint,
    },
  ], [chartConfig.currentX, chartConfig.currentY])

  return (
    <Card className="w-full h-full flex flex-col p-3 overflow-hidden select-none relative">
      <div className="flex-1 min-h-0 relative">
        <RelationChart
          points={chartConfig.points}
          xLabel={chartConfig.xLabel}
          yLabel={chartConfig.yLabel}
          title={chartConfig.title}
          xDomain={chartConfig.xDomain}
          yDomain={chartConfig.yDomain}
          markers={markers}
          color={chartConfig.color}
          strokeWidth={2}
          showGrid
        />

        {/* 物理常量/等式实时输出 */}
        <span
          className="absolute top-1 right-2 text-[10px] font-bold font-mono bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 shadow-sm"
        >
          {chartConfig.constantLabel}
        </span>
      </div>
    </Card>
  )
}
