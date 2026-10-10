import { useMemo } from 'react'
import { RelationChart, useChartContext } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'
import { SERIES_MAP, CHART_COLORS, CANVAS_COLORS, FONT } from '@/theme/physics'
import type { ChartSeriesVariant } from '@/theme/physics'
import {
  PHOTOELECTRIC_METALS,
  calculateCutoffFrequency,
  frequencyToPhotonEnergy,
  generateEkmNuCurve,
} from '@/physics/photoelectric'

interface EkNuCurveChartProps {
  cutoffFreq: number
  currentFreq: number
  currentEkm: number
  W0: number
  isPE: boolean
}

/**
 * 横轴上限 (×10¹⁴ Hz)。
 *
 * 必须覆盖全部金属预设的截止频率，其中最大者为钨 ν₀ = 4.5 eV / h ≈ 10.9，
 * 取 12 可保证「每种金属都有一段真实的实线段」——若上限取 9，钨的图线会
 * 全部落在 ν < ν₀ 区，看起来像"永远不发生光电效应"。
 */
const NU_MAX = 12

/** 图线采样段数 */
const NU_STEPS = 144

/**
 * 对比金属曲线配色序列，下标与 PHOTOELECTRIC_METALS 一一对应，
 * 保证同一金属在任何状态下颜色稳定。主曲线固定用 accent，故此处避开 accent。
 */
const FAMILY_SERIES: ChartSeriesVariant[] = ['secondary', 'warm', 'success', 'primary']

interface MetalEntry {
  name: string
  symbol: string
  workFunction: number
}

function toPathD(
  pts: { x: number; y: number }[],
  toSvgX: (v: number) => number,
  toSvgY: (v: number) => number,
): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
    .join(' ')
}

/**
 * Ekm-ν 多金属曲线族插件层。
 *
 * 【为什么不用 RelationChart 的 additionalSeries】
 * 该 prop 会为每条附加曲线自动生成一行图例，而本图表所在容器很矮
 * （中屏下方的图表页签区），四五条图例会吃掉大半个绘图区。故曲线族改由
 * 本插件直接绘在绘图区底层，金属名以「自身横轴交点上方的短标签」标出——
 * 既省空间，又把「横轴截距 = 截止频率 ν₀」这一考点直接画在交点处。
 *
 * 必须挂在 BasePhysicsChart 的子级（underlay）内，才能通过 ChartContext
 * 取得世界坐标 → SVG 坐标的变换函数。
 */
const EkmNuMetalFamilyLayer: React.FC<{
  metals: readonly MetalEntry[]
  activeW0: number
  activeColor: string
}> = ({ metals, activeW0, activeColor }) => {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  const labelSize = font(FONT.small)
  const zeroY = toSvgY(0)

  return (
    <g>
      {metals.map((m, idx) => {
        const isActive = Math.abs(m.workFunction - activeW0) < 1e-6
        const color = isActive
          ? activeColor
          : SERIES_MAP[FAMILY_SERIES[idx % FAMILY_SERIES.length]]
        const { solid, dashed } = generateEkmNuCurve(m.workFunction, NU_MAX, NU_STEPS)

        return (
          <g key={m.symbol}>
            {/* ν ≥ ν₀ 实线段：当前金属的实线由 RelationChart 主曲线绘制，此处只补对比金属 */}
            {!isActive && solid.length > 1 && (
              <path
                d={toPathD(solid, toSvgX, toSvgY)}
                fill="none"
                stroke={color}
                strokeWidth={1.3}
                opacity={0.75}
              />
            )}
            {/* ν < ν₀ 延长虚线段：该区间不产生光电子，虚线仅为读图的数学延伸 */}
            {dashed.length > 1 && (
              <path
                d={toPathD(dashed, toSvgX, toSvgY)}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? 1.6 : 1.1}
                strokeDasharray="5 4"
                opacity={isActive ? 0.9 : 0.45}
              />
            )}
            {/* 金属名：标在自身截止频率处略偏右上，避让该金属自己的上升段 */}
            {m.name && (
              <text
                x={toSvgX(calculateCutoffFrequency(m.workFunction)) + labelSize * 0.25}
                y={zeroY - labelSize}
                fontSize={labelSize}
                fill={color}
                stroke={CANVAS_COLORS.white}
                strokeWidth={2.5}
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fontWeight="bold"
              >
                {m.name}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * Ekm-ν 最大初动能—频率关系图（高考双图判读模型之图二）。
 *
 * 三条考点全部落在图上：
 * 1. 斜率恒为 h —— 所有金属图线彼此平行（由 generateEkmNuCurve 共用同一直线保证）；
 * 2. 横轴截距 = 截止频率 ν₀ = W₀/h —— 每条曲线在横轴上各有交点并标注金属名；
 * 3. 纵轴反向截距 = −W₀ —— ν < ν₀ 段以虚线延长线与纵轴相交，并画出水平参考线。
 *
 * 注意：ν < ν₀ 段恒以虚线绘制，绝不压成 Ekm = 0 的水平线（那会误导为
 * "产生了光电子但动能为零"）；也因此当 ν < ν₀ 时不给游标——Ekm 在该区间无定义。
 */
export default function EkNuCurveChart({
  cutoffFreq,
  currentFreq,
  currentEkm,
  W0,
  isPE,
}: EkNuCurveChartProps) {
  // 当前金属 + 全部预设金属（当前金属若不在预设表内，则额外补一条）
  const metals = useMemo<MetalEntry[]>(() => {
    const table = PHOTOELECTRIC_METALS.map((m) => ({ ...m }))
    const inTable = table.some((m) => Math.abs(m.workFunction - W0) < 1e-6)
    return inTable ? table : [...table, { name: '', symbol: 'current', workFunction: W0 }]
  }, [W0])

  // 主曲线：当前金属在 ν ≥ ν₀ 区的实线段（全部从横轴交点 (ν₀, 0) 出发）
  const points = useMemo(() => generateEkmNuCurve(W0, NU_MAX, NU_STEPS).solid, [W0])

  /*
   * 纵轴范围取整到 1 eV 网格：既让刻度落在整数附近，也保证拖动逸出功滑块时
   * 坐标轴不随 W₀ 频繁缩放抖动。上界需容纳最轻金属（铯）在 ν_max 处的 Ekm，
   * 下界需容纳最大逸出功（钨 −4.5 eV）的反向截距。
   */
  const yDomain = useMemo<[number, number]>(() => {
    const w0s = metals.map((m) => m.workFunction)
    const neededTop = frequencyToPhotonEnergy(NU_MAX) - Math.min(...w0s)
    const neededBottom = -Math.max(...w0s)
    return [Math.floor(neededBottom - 0.2), Math.ceil(neededTop + 0.2)]
  }, [metals])

  const markers = useMemo<RelationMarker[]>(() => {
    const list: RelationMarker[] = [
      {
        axis: 'vertical',
        x: cutoffFreq,
        label: `ν₀ = ${cutoffFreq.toFixed(2)}`,
        color: CHART_COLORS.criticalPt,
        position: 'top',
      },
      {
        axis: 'horizontal',
        y: -W0,
        label: `纵轴反向截距 −W₀ = −${W0.toFixed(2)} eV`,
        color: CHART_COLORS.criticalPt,
      },
    ]
    if (isPE) {
      list.push({
        axis: 'horizontal',
        y: currentEkm,
        label: `E_km = ${currentEkm.toFixed(2)} eV`,
        color: CHART_COLORS.primary,
      })
    }
    return list
  }, [cutoffFreq, W0, currentEkm, isPE])

  return (
    <RelationChart
      title="Ekm-ν 关系线：斜率恒为 h，各金属图线彼此平行"
      points={points}
      xLabel="入射光频率 ν (×10¹⁴ Hz)"
      yLabel="最大初动能 Ekm (eV)"
      xDomain={[0, NU_MAX]}
      yDomain={yDomain}
      cursorX={isPE ? currentFreq : undefined}
      cursorLabel={(_x, y) => `E_km = ${y.toFixed(2)} eV`}
      markers={markers}
      series="accent"
      showGrid
      variant="standard"
      className="w-full h-full"
      underlay={
        <EkmNuMetalFamilyLayer metals={metals} activeW0={W0} activeColor={SERIES_MAP.accent} />
      }
    />
  )
}
