import { useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'
import { CHART_COLORS, THERMO_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import {
  generateMaxwellCurves,
  calcMostProbableSpeed,
  calcAverageSpeed,
} from '@/physics/maxwellDistribution'

interface MaxwellDistributionChartProps {
  temperature1: number
  temperature2: number
  showCompare: boolean
}

export default function MaxwellDistributionChart({
  temperature1,
  temperature2,
  showCompare,
}: MaxwellDistributionChartProps) {
  const vMax = 1600

  // 1. 生成双温度分布曲线
  const { curvePoints, additionalSeries, vp1, vAvg1, maxPdf } = useMemo(() => {
    const raw = generateMaxwellCurves(temperature1, temperature2, vMax, 90)
    const pts1 = raw.map((p) => ({ x: p.v, y: p.f1 * 1e3 })) // 乘以 1000 放大为 10⁻³ (s/m)
    const pts2 = raw.map((p) => ({ x: p.v, y: (p.f2 ?? 0) * 1e3 }))

    const vp = calcMostProbableSpeed(temperature1)
    const vAvg = calcAverageSpeed(temperature1)

    const extraSeries: RelationDataSeries[] = []
    if (showCompare && temperature1 !== temperature2) {
      extraSeries.push({
        points: pts2,
        label: `T₂ = ${temperature2}K 对比曲线`,
        color: CHART_COLORS.reference,
        strokeWidth: 1.8,
        strokeDasharray: [4, 3],
      })
    }

    const maxVal = Math.max(...pts1.map((p) => p.y), ...pts2.map((p) => p.y))

    return {
      curvePoints: pts1,
      additionalSeries: extraSeries,
      vp1: vp,
      vAvg1: vAvg,
      maxPdf: maxVal,
    }
  }, [temperature1, temperature2, showCompare])

  // 2. 特征速率标记线 (最概然速率与平均速率)
  const markers: RelationMarker[] = useMemo(
    () => [
      {
        x: vp1,
        label: `v_p (${vp1.toFixed(0)})`,
        color: THERMO_COLORS.heatAbsorb,
      },
      {
        x: vAvg1,
        label: `v̄ (${vAvg1.toFixed(0)})`,
        color: PHYSICS_COLORS.velocity,
      },
    ],
    [vp1, vAvg1],
  )

  return (
    <div className="w-full h-full bg-white rounded-xl border border-slate-200/80 p-2 flex flex-col justify-between shadow-xs">
      <div className="flex-1 min-h-0">
        <RelationChart
          points={curvePoints}
          additionalSeries={additionalSeries}
          xLabel="分子速率 v (m/s)"
          yLabel="分布概率密度 f(v) [10⁻³ s/m]"
          title={`麦克斯韦速率分布律：T₁ = ${temperature1} K${showCompare ? ` 与 T₂ = ${temperature2} K 对照` : ''}`}
          xDomain={[0, vMax]}
          yDomain={[0, maxPdf * 1.15]}
          markers={markers}
          color={THERMO_COLORS.heatAbsorb}
          strokeWidth={2.4}
          cursorX={vp1}
          cursorLabel={(_x, y) => `f(v)=${y.toFixed(3)}`}
        />
      </div>
      <div className="text-xs text-slate-500 flex justify-between px-2 pt-1 border-t border-slate-100">
        <span>规律特征：中间多、两头少</span>
        <span>比例关系：v_p : v̄ : v_rms ≈ 1 : 1.128 : 1.225</span>
        <span>定则：曲线下面积严格等于 1 (总分子数恒定)</span>
      </div>
    </div>
  )
}
