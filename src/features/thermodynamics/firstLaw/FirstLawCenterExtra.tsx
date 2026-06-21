import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'

const N_DEFAULT = 1
const R = 8.314
const T_LOW = 300
const T_HIGH = 600
const P_LOW = 1e5
const P_HIGH = 2e5
const V_LOW = N_DEFAULT * R * T_LOW / P_HIGH  // 等容线左
const V_HIGH = N_DEFAULT * R * T_HIGH / P_LOW  // 等容线右

// 四步循环的四个角点 (P, V)
const CORNERS = [
  { P: P_LOW,  V: V_LOW,  label: 'A' },
  { P: P_LOW,  V: V_HIGH, label: 'B' },
  { P: P_HIGH, V: V_HIGH, label: 'C' },
  { P: P_HIGH, V: V_LOW,  label: 'D' },
]

const STEP_LABELS = [
  '① 等压膨胀 → 吸热做功',
  '② 等容升压 → 吸热',
  '③ 等压压缩 → 放热',
  '④ 等容降压 → 放热',
]

const STEP_COLORS = [
  PV_CHART_COLORS.isobar,
  PV_CHART_COLORS.isochor,
  PV_CHART_COLORS.isobar,
  PV_CHART_COLORS.isochor,
]

// Y/X 域留 40% 内边距，让循环图整体居中
const vMin = V_LOW * 0.6
const vMax = V_HIGH * 1.4
const pMin = P_LOW * 0.6
const pMax = P_HIGH * 1.4

export default function FirstLawCenterExtra() {
  const { time } = useAnimationStore(
    useShallow((s) => ({ time: s.time })),
  )

  // 当前步骤（周期 30s，每步 7.5s）
  const cycleTime = time % 30
  const stepIndex = Math.min(3, Math.floor(cycleTime / 7.5))
  const stepProgress = (cycleTime % 7.5) / 7.5

  // 在当前步骤内插值状态点
  const currentState = useMemo(() => {
    const from = CORNERS[stepIndex]
    const to = CORNERS[(stepIndex + 1) % 4]
    return {
      P: from.P + (to.P - from.P) * stepProgress,
      V: from.V + (to.V - from.V) * stepProgress,
    }
  }, [stepIndex, stepProgress])

  // 主曲线：闭合循环（A→B→C→D→A）
  const cyclePoints = useMemo(
    () => [
      ...CORNERS.map((c) => ({ x: c.V, y: c.P })),
      { x: CORNERS[0].V, y: CORNERS[0].P }, // 闭合回 A
    ],
    [],
  )

  // 四段分色高亮：每段作为独立 series，当前阶段加粗/不透明
  const segmentSeries: RelationDataSeries[] = useMemo(() => {
    return CORNERS.map((from, i) => {
      const to = CORNERS[(i + 1) % 4]
      const isActive = i === stepIndex
      return {
        points: [{ x: from.V, y: from.P }, { x: to.V, y: to.P }],
        color: STEP_COLORS[i],
        strokeWidth: isActive ? 4 : 1.5,
      } satisfies RelationDataSeries
    })
  }, [stepIndex])

  // markers：四个角点（带 A/B/C/D 标签）+ 当前状态点
  const markers: RelationMarker[] = useMemo(() => [
    ...CORNERS.map((c) => ({
      axis: 'point' as const,
      x: c.V,
      y: c.P,
      label: c.label,
      color: PV_CHART_COLORS.statePoint,
    })),
    {
      axis: 'point' as const,
      x: currentState.V,
      y: currentState.P,
      color: STEP_COLORS[stepIndex],
    },
  ], [currentState, stepIndex])

  return (
    <div className="w-full h-full bg-white p-2 flex flex-col">
      {/* 当前步骤标注（在图表上方） */}
      <div className="shrink-0 px-2 pb-1 flex justify-end">
        <span
          className="text-sm font-bold"
          style={{ color: STEP_COLORS[stepIndex] }}
        >
          {STEP_LABELS[stepIndex]}
        </span>
      </div>

      {/* P-V 循环图：迁移到 RelationChart */}
      <div className="flex-1 min-h-0">
        <RelationChart
          points={cyclePoints}
          additionalSeries={segmentSeries}
          xLabel="V (m³)"
          yLabel="P (Pa)"
          title="热机循环 P-V 图（进阶模式）"
          xDomain={[vMin, vMax]}
          yDomain={[pMin, pMax]}
          markers={markers}
          color={CHART_COLORS.primary}
          strokeWidth={1}
          showGrid
        />
      </div>
    </div>
  )
}
