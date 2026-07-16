import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { SCENE_COLORS, ENERGY_COLORS, THERMO_COLORS, STROKE, withAlpha } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'
import { calculateSandboxState, calculateCycleState } from '@/physics/firstLaw'
import { Card } from '@/components/UI'

// 物理参考量：
// nR = 1/3, T0 = 300 K
// 状态点 A: V = 1.0 L, P = 100 kPa
// 状态点 B: V = 2.0 L, P = 100 kPa
// 状态点 C: V = 2.0 L, P = 200 kPa
// 状态点 D: V = 1.0 L, P = 200 kPa

export default function FirstLawCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const mode = params.mode ?? 0
  const W_input = params.W ?? 0
  const Q_input = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0

  // 1. 根据当前模式和时间计算状态量
  const state = mode === 1
    ? calculateCycleState(time)
    : calculateSandboxState(W_input, Q_input, adiabatic === 1)

  const { P, V, T, W, Q, deltaU, currentStepIndex } = state

  const V_L = V * 1000      // 转为 L 方便图表坐标轴展示
  const P_kPa = P / 1000    // 转为 kPa 展示

  // ─── 上半部分：能量收支柱状图数据 ──────────────────────────────────────────
  const maxAbsVal = 500
  const zeroY = 90
  const maxBarHeight = 65

  const qColor = Q >= 0 ? THERMO_COLORS.heatAbsorb : THERMO_COLORS.heatRelease
  const barData = [
    { label: '外界功 W', val: W, color: ENERGY_COLORS.work },
    { label: Q >= 0 ? '吸热量 Q' : '放热量 Q', val: Q, color: qColor },
    { label: '内能增量 ΔU', val: deltaU, color: ENERGY_COLORS.internalEnergy },
  ]

  // ─── 下半部分：P-V 坐标系曲线点计算 ─────────────────────────────────────────
  // 生成等温线上的点序列
  const generateIsotherm = (temp: number) => {
    const points = []
    // 体积范围 0.4 L 到 2.4 L
    for (let v = 0.4; v <= 2.4; v += 0.05) {
      // P = nRT/V = (temp / 3) / V
      const p = (temp / 3) / v
      points.push({ x: v, y: p })
    }
    return points
  }

  // 300K 初始等温线
  const isothermBasePoints = useMemo(() => generateIsotherm(300), [])
  // 当前温度等温线 (随 T 变化)
  const isothermCurrentPoints = useMemo(() => generateIsotherm(T), [T])

  // P-V 图主线段
  const cyclePoints = useMemo(() => {
    if (mode === 1) {
      // 封闭的热机循环 A -> B -> C -> D -> A
      return [
        { x: 1.0, y: 100 },
        { x: 2.0, y: 100 },
        { x: 2.0, y: 200 },
        { x: 1.0, y: 200 },
        { x: 1.0, y: 100 },
      ]
    }
    // 沙箱模式不需要闭合主线，只用点和等温虚线
    return []
  }, [mode])

  // 图表分段线与高亮
  const additionalSeries: RelationDataSeries[] = useMemo(() => {
    const series: RelationDataSeries[] = []

    if (mode === 1) {
      // 循环模式：绘制四条边界线，高亮当前活跃边
      const corners = [
        { x: 1.0, y: 100 }, // A
        { x: 2.0, y: 100 }, // B
        { x: 2.0, y: 200 }, // C
        { x: 1.0, y: 200 }, // D
      ]

      const stepColors = [
        THERMO_COLORS.heatAbsorb,        // A->B 等压膨胀 (吸热做负功)
        ENERGY_COLORS.internalEnergy,    // B->C 等容加热 (吸热升压)
        ENERGY_COLORS.work,              // C->D 等压压缩 (放热做正功)
        THERMO_COLORS.heatRelease        // D->A 等容冷却 (放热降压)
      ]

      for (let i = 0; i < 4; i++) {
        const from = corners[i]
        const to = corners[(i + 1) % 4]
        const isActive = i === currentStepIndex

        series.push({
          points: [from, to],
          color: stepColors[i],
          strokeWidth: isActive ? 4 : 1.5,
          strokeDasharray: isActive ? undefined : [4, 4],
        })
      }
    } else {
      // 沙箱模式：加入初始温度等温线 (灰色) 和当前温度等温线 (彩色)
      series.push({
        points: isothermBasePoints,
        color: SCENE_COLORS.charts.gridLine,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
      })

      // 仅当温度与 300K 偏离较大时展示当前温度等温线
      if (Math.abs(T - 300) > 5) {
        series.push({
          points: isothermCurrentPoints,
          color: T > 300 ? THERMO_COLORS.heatAbsorb : THERMO_COLORS.heatRelease,
          strokeWidth: 2,
        })
      }
    }

    return series
  }, [mode, currentStepIndex, T, isothermCurrentPoints, isothermBasePoints])

  // 坐标标记点 (Markers)
  const markers: RelationMarker[] = useMemo(() => {
    const list: RelationMarker[] = []

    if (mode === 1) {
      // 循环热机：标注 A, B, C, D 四个角点
      const corners = [
        { x: 1.0, y: 100, label: 'A (300K)' },
        { x: 2.0, y: 100, label: 'B (600K)' },
        { x: 2.0, y: 200, label: 'C (1200K)' },
        { x: 1.0, y: 200, label: 'D (600K)' },
      ]
      corners.forEach((c) => {
        list.push({
          axis: 'point',
          x: c.x,
          y: c.y,
          label: c.label,
          color: SCENE_COLORS.charts.labelText,
        })
      })
    } else {
      // 沙箱模式：标出参考 A 点 (初始状态)
      list.push({
        axis: 'point',
        x: 1.0,
        y: 100,
        label: '初态 A (300K)',
        color: SCENE_COLORS.charts.tickLabel,
      })
    }

    // 无论什么模式，均标出实时气体状态点
    list.push({
      axis: 'point',
      x: V_L,
      y: P_kPa,
      label: `(${V_L.toFixed(2)}L, ${P_kPa.toFixed(0)}kPa)`,
      color: deltaU > 0 
        ? THERMO_COLORS.heatAbsorb 
        : deltaU < 0 
          ? THERMO_COLORS.heatRelease 
          : SCENE_COLORS.charts.highlightPt,
    })

    return list
  }, [mode, V_L, P_kPa, deltaU])

  return (
    <Card className="w-full h-full flex flex-col p-3 overflow-hidden select-none">

      {/* 1. 顶部：能量守恒柱状收支天平 */}
      <div className="shrink-0 h-[215px] pb-2 flex flex-col w-full">
        <div className="flex flex-col p-2 bg-white rounded-lg border border-neutral-200/50 select-none w-full h-full">
          {/* 头部标题与数值对齐 */}
          <div className="font-bold text-neutral-700 mb-1.5 flex justify-between items-center px-0.5 shrink-0 text-xs">
            <span className="tracking-wide">能量收支天平 (守恒等式: ΔU = W + Q)</span>
            <span className="text-neutral-400 font-medium font-mono text-[10px] bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
              {deltaU.toFixed(0)} = {W.toFixed(0)} + {Q.toFixed(0)} J
            </span>
          </div>

          {/* 柱状天平画布 */}
          <div className="flex-1 relative overflow-hidden border-t border-neutral-200/80 pt-2">
            <svg className="w-full h-full" viewBox="0 0 380 160">
              {/* 零刻度虚线 */}
              <line
                x1="20" y1={zeroY} x2="360" y2={zeroY}
                stroke={SCENE_COLORS.charts.gridLine} strokeWidth={STROKE.grid} strokeDasharray="3 2"
              />
              <text x="15" y={zeroY + 3} fontSize={8} fill={SCENE_COLORS.charts.tickLabel} textAnchor="end">0</text>
              <text x="15" y={zeroY - maxBarHeight + 3} fontSize={8} fill={SCENE_COLORS.charts.tickLabel} textAnchor="end">+500J</text>
              <text x="15" y={zeroY + maxBarHeight + 3} fontSize={8} fill={SCENE_COLORS.charts.tickLabel} textAnchor="end">-500J</text>

              {/* 渲染能量柱 */}
              {barData.map((bar, i) => {
                const x = 70 + i * 115
                const valRatio = Math.max(-1, Math.min(1, bar.val / maxAbsVal))
                const barH = valRatio * maxBarHeight // 正值向上（在 SVG 中是负高）
                const textY = barH <= 0 ? zeroY - barH + 12 : zeroY - barH - 4

                return (
                  <g key={bar.label}>
                    {/* 柱子底座轨道 */}
                    <rect
                      x={x - 14}
                      y={zeroY - maxBarHeight}
                      width={28}
                      height={maxBarHeight * 2}
                      fill={withAlpha(SCENE_COLORS.charts.gridLine, 0.15)}
                      rx={2}
                    />

                    {/* 能量真实柱体 */}
                    <rect
                      x={x - 12}
                      y={barH >= 0 ? zeroY - barH : zeroY}
                      width={24}
                      height={Math.max(2, Math.abs(barH))}
                      fill={bar.color}
                      rx={3}
                      style={{ filter: `drop-shadow(0 2px 4px ${withAlpha(bar.color, 0.25)})` }}
                    />

                    {/* 数值标签 */}
                    <text
                      x={x}
                      y={textY}
                      fontSize={10}
                      fontWeight="bold"
                      fill={bar.color}
                      textAnchor="middle"
                    >
                      {bar.val.toFixed(0)} J
                    </text>

                    {/* 物理量名称 */}
                    <text
                      x={x}
                      y={142}
                      fontSize={9.5}
                      fill={SCENE_COLORS.charts.labelText}
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {bar.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 2. 下部：P-V 状态特性曲线图 */}
      <div className="flex-1 min-h-0 pt-2 flex flex-col">
        <div className="shrink-0 flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-neutral-800">
            热力学过程 P-V 图
          </span>
          {mode === 0 && (
            <span className="text-[9px] text-neutral-400">
              虚线为 300K 等温参考线
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <RelationChart
            points={cyclePoints}
            additionalSeries={additionalSeries}
            xLabel="体积 V (L)"
            yLabel="压强 p (kPa)"
            title=""
            xDomain={[0.4, 2.4]}
            yDomain={[30, 310]}
            markers={markers}
            color={mode === 1 ? SCENE_COLORS.charts.gridLine : 'transparent'} // 循环背景主线灰度
            strokeWidth={1}
            showGrid
          />
        </div>
      </div>

    </Card>
  )
}
