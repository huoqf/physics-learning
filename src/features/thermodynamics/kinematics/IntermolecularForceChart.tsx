/**
 * 分子间作用力图表 — 已迁移到通用 RelationChart 预设。
 *
 * 历史背景：早期手写 SVG 直接画轴/曲线/光标/图例，约 310 行重复代码。
 * 现作为 `RelationChart` 的薄封装：
 *   - F-r 模式 ⇒ 三曲线 (F_斥 / F_引 / F_合) + r₀ 标记 + 当前 r 游标
 *   - Ep-r 模式 ⇒ 单曲线势能 + r₀ 标记 + 势阱最低点标记 + 当前 r 游标
 *
 * 对外 props 保持向后兼容（width/height/font 仍接收，但渲染由
 * BasePhysicsChart 内部 useCanvasSize 自动测量；外层只需 width/height
 * 决定容器尺寸即可）。
 */
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

interface IntermolecularForceChartProps {
  /** 当前分子间距 r（以 r_0 为单位） */
  currentR: number
  /** 图表模式：'force' 显示 F-r 图，'energy' 显示 E_p-r 图 */
  mode: 'force' | 'energy'
  /** 图表宽度（影响外层容器） */
  width: number
  /** 图表高度（影响外层容器） */
  height: number
  /** 字体函数（保留以兼容旧 API，新实现内部由 BasePhysicsChart 接管） */
  font?: (size: number) => number
  /** 斥力系数 */
  A?: number
  /** 引力系数 */
  B?: number
}

const R_MIN = 0.3
const R_MAX = 5.0
const R_STEP = 0.05
const R_EQUILIBRIUM = 1.0 // r₀

/** 生成 [R_MIN, R_MAX] 范围内的采样点 */
function sampleR(): number[] {
  const out: number[] = []
  for (let r = R_MIN; r <= R_MAX + 1e-9; r += R_STEP) out.push(r)
  return out
}

export default function IntermolecularForceChart({
  currentR,
  mode,
  width,
  height,
  A = 1.0,
  B = 1.0,
}: IntermolecularForceChartProps) {
  const rs = useMemo(() => sampleR(), [])

  // ── F-r 模式 ────────────────────────────────────────────
  const forceData = useMemo(() => {
    if (mode !== 'force') return null
    const fNet = rs.map((r) => ({ x: r, y: netMolecularForce(r, A, B) }))
    const fRep: RelationDataSeries = {
      points: rs.map((r) => ({ x: r, y: repulsiveForce(r, A) })),
      label: 'F_斥',
      color: CHART_COLORS.criticalPt,
      strokeWidth: 1.5,
    }
    const fAtt: RelationDataSeries = {
      // 引力以负值显示在 0 线下方，与原实现一致
      points: rs.map((r) => ({ x: r, y: -attractiveForce(r, B) })),
      label: 'F_引',
      color: CHART_COLORS.primary,
      strokeWidth: 1.5,
    }
    return { mainPoints: fNet, additional: [fRep, fAtt] }
  }, [mode, rs, A, B])

  // ── Ep-r 模式 ───────────────────────────────────────────
  const energyData = useMemo(() => {
    if (mode !== 'energy') return null
    const pts = rs.map((r) => ({ x: r, y: molecularPotentialEnergy(r, A, B) }))
    // 势能在 r 极小时趋于 +∞，需要截断 yDomain 以避免曲线把图压扁
    const epValues = pts.map((p) => p.y)
    const minEp = Math.min(...epValues) * 1.1
    // 上界取实际值在 10 以内的最大值（与原实现一致），底兜 0.5
    const maxEp = Math.max(...epValues.filter((v) => v < 10), 0.5)
    // 势阱最低点：在 r=r₀ 取值
    const wellY = molecularPotentialEnergy(R_EQUILIBRIUM, A, B)
    return {
      points: pts,
      yDomain: [minEp, maxEp] as [number, number],
      wellY,
    }
  }, [mode, rs, A, B])

  // ── 公共 markers ────────────────────────────────────────
  const baseMarkers: RelationMarker[] = useMemo(
    () => [{ x: R_EQUILIBRIUM, label: 'r₀', color: CHART_COLORS.equilibrium }],
    [],
  )

  if (mode === 'force' && forceData) {
    return (
      <div style={{ width, height }}>
        <RelationChart
          points={forceData.mainPoints}
          additionalSeries={forceData.additional}
          xLabel="r / r₀"
          yLabel="F"
          title="F-r 图像"
          xDomain={[R_MIN, R_MAX]}
          showZeroLine
          markers={baseMarkers}
          cursorX={currentR}
          cursorLabel={(_x, y) => `F=${y.toFixed(2)}`}
          color={CHART_COLORS.compareC}
          strokeWidth={2}
          series="primary"
        />
      </div>
    )
  }

  if (mode === 'energy' && energyData) {
    const markers: RelationMarker[] = [
      ...baseMarkers,
      {
        x: R_EQUILIBRIUM,
        y: energyData.wellY,
        label: '势阱最低点',
        color: CHART_COLORS.equilibrium,
      },
    ]
    return (
      <div style={{ width, height }}>
        <RelationChart
          points={energyData.points}
          xLabel="r / r₀"
          yLabel="E_p"
          title="E_p-r 图像"
          xDomain={[R_MIN, R_MAX]}
          yDomain={energyData.yDomain}
          showZeroLine={energyData.yDomain[0] < 0}
          markers={markers}
          cursorX={currentR}
          cursorLabel={(_x, y) => `Eₚ=${y.toFixed(2)}`}
          color={CHART_COLORS.compareD}
          strokeWidth={2}
        />
      </div>
    )
  }

  return null
}
