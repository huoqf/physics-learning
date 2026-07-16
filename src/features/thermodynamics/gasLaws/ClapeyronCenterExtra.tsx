import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PV_CHART_COLORS } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'
import { Card } from '@/components/UI'
import { solveClapeyron, generateIsothermFamily } from '@/physics/clapeyron'

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const N_DEFAULT = 1
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2

const ISOTHERM_FAMILY_TEMPS = [250, 300, 350, 400, 450, 500]

export default function ClapeyronCenterExtra() {
  const params = useAnimationStore((s) => s.params)

  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  // 计算当前的理想气体宏观压强 P
  const P = solveClapeyron({ key: 'V', value: V }, { key: 'T', value: T }, 'P', N_DEFAULT)

  // 1. 等温线族数据 (等温线族由 mode=1 进阶模式背景展示)
  const isothermFamily = useMemo(
    () => generateIsothermFamily(ISOTHERM_FAMILY_TEMPS, N_DEFAULT, V_MIN, V_MAX, 80),
    [],
  )

  // 2. 将等温线族转换为图表附加系列 (RelationDataSeries)
  const additionalSeries: RelationDataSeries[] = useMemo(() => {
    if (mode !== 1) return []
    return isothermFamily.map((iso, idx) => ({
      points: iso.points.map((p) => ({ x: p.v, y: p.p })),
      label: `${iso.T}K`,
      color: PV_CHART_COLORS.isothermsGroup[idx % PV_CHART_COLORS.isothermsGroup.length],
      strokeWidth: 1,
    }))
  }, [mode, isothermFamily])

  // 3. 当前温度下的高亮等温线主数据点
  const currentIsothermXY = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 80; i++) {
      const v = V_MIN + ((V_MAX - V_MIN) * i) / 80
      const p = solveClapeyron({ key: 'V', value: v }, { key: 'T', value: T }, 'P', N_DEFAULT)
      pts.push({ x: v, y: p })
    }
    return pts
  }, [T])

  // 4. 当前状态的高亮点标记 (RelationMarker)
  const markers: RelationMarker[] = useMemo(() => [
    {
      axis: 'point',
      x: V,
      y: P,
      color: PV_CHART_COLORS.statePoint,
    },
  ], [V, P])

  // 5. Y 轴的显示极限 (温度为 T_MAX 时的极限压强 P)
  const yMax = useMemo(
    () => solveClapeyron({ key: 'V', value: V_MIN }, { key: 'T', value: T_MAX }, 'P', N_DEFAULT),
    [],
  )

  return (
    <Card className="w-full h-full flex flex-col p-3 overflow-hidden select-none relative">
      <div className="flex-1 min-h-0 relative">
        <RelationChart
          points={currentIsothermXY}
          additionalSeries={additionalSeries}
          xLabel="体积 V (m³)"
          yLabel="压强 P (Pa)"
          title="P-V 图 (等温线族)"
          xDomain={[V_MIN, V_MAX]}
          yDomain={[0, yMax]}
          markers={markers}
          color={PV_CHART_COLORS.isotherm}
          strokeWidth={2}
          showGrid
        />

        {/* 状态方程比值常数实时HUD输出 */}
        <span
          className="absolute top-1 right-2 text-[10px] font-bold font-mono bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 shadow-sm"
        >
          PV/T = ${(P * V / T).toFixed(2)} J/K = const
        </span>
      </div>
    </Card>
  )
}
