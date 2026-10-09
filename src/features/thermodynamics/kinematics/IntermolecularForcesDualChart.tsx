import { useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'
import { CHART_COLORS } from '@/theme/physics'
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
  molecularPotentialEnergy,
} from '@/physics/intermolecularForces'

interface IntermolecularForcesDualChartProps {
  currentR: number
  A?: number
  B?: number
}

const R_MIN = 0.5
const R_MAX = 4.0
const R_STEP = 0.05
const R_EQUILIBRIUM = 1.0 // r₀

function sampleR(): number[] {
  const out: number[] = []
  for (let r = R_MIN; r <= R_MAX + 1e-9; r += R_STEP) out.push(r)
  return out
}

export default function IntermolecularForcesDualChart({
  currentR,
  A = 1.0,
  B = 1.0,
}: IntermolecularForcesDualChartProps) {
  const rs = useMemo(() => sampleR(), [])

  // 1. F-r 曲线数据 (F_斥, F_引, F_合)
  const forceData = useMemo(() => {
    const fNet = rs.map((r) => ({ x: r, y: netMolecularForce(r, A, B) }))
    const fRep: RelationDataSeries = {
      points: rs.map((r) => ({ x: r, y: repulsiveForce(r, A) })),
      label: 'F_斥 (正方向)',
      color: CHART_COLORS.criticalPt,
      strokeWidth: 1.5,
      strokeDasharray: [4, 2],
    }
    const fAtt: RelationDataSeries = {
      points: rs.map((r) => ({ x: r, y: -attractiveForce(r, B) })),
      label: 'F_引 (负方向)',
      color: CHART_COLORS.primary,
      strokeWidth: 1.5,
      strokeDasharray: [4, 2],
    }
    return { mainPoints: fNet, additional: [fRep, fAtt] }
  }, [rs, A, B])

  // 2. Ep-r 曲线数据
  const energyData = useMemo(() => {
    const pts = rs.map((r) => ({ x: r, y: molecularPotentialEnergy(r, A, B) }))
    const epValues = pts.map((p) => p.y)
    const minEp = Math.min(...epValues) * 1.15
    const maxEp = Math.max(...epValues.filter((v) => v < 6), 0.5)
    const wellY = molecularPotentialEnergy(R_EQUILIBRIUM, A, B)
    return {
      points: pts,
      yDomain: [minEp, maxEp] as [number, number],
      wellY,
    }
  }, [rs, A, B])

  const baseMarkers: RelationMarker[] = useMemo(
    () => [{ x: R_EQUILIBRIUM, label: 'r₀ (平衡位置)', color: CHART_COLORS.equilibrium }],
    [],
  )

  const energyMarkers: RelationMarker[] = useMemo(
    () => [
      ...baseMarkers,
      {
        x: R_EQUILIBRIUM,
        y: energyData.wellY,
        label: '势阱最低点 (Eₚ最小)',
        color: CHART_COLORS.equilibrium,
      },
    ],
    [baseMarkers, energyData.wellY],
  )

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-2">
      {/* 左图：F - r 曲线 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200/80 shadow-xs flex flex-col">
        <RelationChart
          points={forceData.mainPoints}
          additionalSeries={forceData.additional}
          xLabel="分子间距 r / r₀"
          yLabel="分子力 F"
          title="F - r 曲线（合力与分力）"
          xDomain={[R_MIN, R_MAX]}
          yDomain={[-1.2, 3.5]}
          showZeroLine
          markers={baseMarkers}
          cursorX={currentR}
          cursorLabel={(_x, y) => `F_合=${y.toFixed(2)}`}
          color={CHART_COLORS.compareC}
          strokeWidth={2}
          series="primary"
        />
      </div>

      {/* 右图：Ep - r 曲线 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200/80 shadow-xs flex flex-col">
        <RelationChart
          points={energyData.points}
          xLabel="分子间距 r / r₀"
          yLabel="分子势能 E_p"
          title="E_p - r 曲线（势阱特征）"
          xDomain={[R_MIN, R_MAX]}
          yDomain={energyData.yDomain}
          showZeroLine
          markers={energyMarkers}
          cursorX={currentR}
          cursorLabel={(_x, y) => `Eₚ=${y.toFixed(2)}`}
          color={CHART_COLORS.compareD}
          strokeWidth={2}
        />
      </div>
    </div>
  )
}
