import { FC, useMemo } from 'react'
import {
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
} from '@/theme/physics'

interface VTChartDataPoint {
  /** 时间坐标 (s) */
  x: number
  /** 速度坐标 (m/s) */
  y: number
}

/**
 * v-t 速度-时间图像组件 Props
 */
interface VTChartProps {
  /** 物理数据：包含 v-t 曲线数据点数组 */
  physics: { vtChartData: VTChartDataPoint[] }
  /** 物理参数：初速度 v0 与加速度 a（预留，当前未使用） */
  params: {
    v0: number
    a: number
  }
  /** 当前动画时间 (s)，用于控制曲线绘制进度 */
  time: number
}

/**
 * 速度-时间图像 (v-t 图) 组件
 *
 * 用于运动学场景，实时绘制速度随时间变化的曲线。
 * - 自动计算 Y 轴范围（支持负速度）
 * - 根据动画时间轴动态绘制曲线路径
 * - 包含坐标轴、刻度、标签等完整图表元素
 */

const VT_X_MAX = 8
const chartAreaW = 300 
const chartAreaH = 240
const chartAreaX = 0
const chartAreaY = 0

export const VTChart: FC<VTChartProps> = ({ physics, params: _params, time }) => { // 接收 time
  // _params kept for future use; current implementation uses physics.vtChartData
  
  // 计算动态 Y 轴范围，确保包含负速度
  const { yMin, yMax } = useMemo(() => {
    const vValues = physics.vtChartData.map((p: VTChartDataPoint) => p.y)
    const min = Math.min(...vValues, 0)
    const max = Math.max(...vValues, 0)
    const padding = (max - min) * 0.1 || 1
    return { 
      yMin: min - padding, 
      yMax: max + padding 
    }
  }, [physics.vtChartData])

  const xticks = [0, 2, 4, 6, 8]
  const vtInnerTop = chartAreaY + 35
  const vtInnerLeft = chartAreaX + 40
  const vtInnerW = chartAreaW - 60
  const vtInnerH = chartAreaH - 55

  const vtToChartX = (t: number) => vtInnerLeft + (t / VT_X_MAX) * vtInnerW
  const vtToChartY = (v: number) => vtInnerTop + vtInnerH - ((v - yMin) / (yMax - yMin)) * vtInnerH

  // 根据当前 time 过滤路径数据
  const vtVtPathD = useMemo(() => {
    const activeData = physics.vtChartData.filter((p: VTChartDataPoint) => p.x <= time)
    return activeData.length >= 2
      ? 'M ' + activeData.map((p: VTChartDataPoint) => `${vtToChartX(p.x)},${vtToChartY(p.y)}`).join(' L ')
      : ''
  }, [physics.vtChartData, time])

  return (
    <svg width={chartAreaW} height={chartAreaH} className="bg-white rounded-lg shadow-inner w-full h-full" viewBox={`0 0 ${chartAreaW} ${chartAreaH}`}>
      <rect x={chartAreaX} y={chartAreaY} width={chartAreaW} height={chartAreaH} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
      <text x={chartAreaX + chartAreaW / 2} y={chartAreaY + 20} fontSize={12} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
        速度－时间图像 (v-t 图)
      </text>

      {/* 坐标轴 */}
      <line x1={vtInnerLeft} y1={vtInnerTop} x2={vtInnerLeft} y2={vtInnerTop + vtInnerH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
      <line x1={vtInnerLeft} y1={vtToChartY(0)} x2={vtInnerLeft + vtInnerW} y2={vtToChartY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

      {/* X 轴刻度 */}
      {xticks.map(t => (
        <g key={`xt-${t}`}>
          <line x1={vtToChartX(t)} y1={vtToChartY(0) - 5} x2={vtToChartX(t)} y2={vtToChartY(0) + 5} stroke={CHART_COLORS.tickMark} />
          <text x={vtToChartX(t)} y={vtToChartY(0) + 18} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
        </g>
      ))}

      {/* Y 轴刻度 */}
      {(() => {
        const yticks = []
        const step = yMax - yMin > 50 ? 20 : (yMax - yMin > 20 ? 10 : 5)
        for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
          yticks.push(v)
        }
        return yticks.map(v => (
          <g key={`yt-${v}`}>
            <line x1={vtInnerLeft - 5} y1={vtToChartY(v)} x2={vtInnerLeft} y2={vtToChartY(v)} stroke={CHART_COLORS.tickMark} />
            <text x={vtInnerLeft - 10} y={vtToChartY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
          </g>
        ))
      })()}

      {/* 坐标轴标签 */}
      <text x={vtInnerLeft + vtInnerW / 2} y={vtInnerTop + vtInnerH + 30} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
      <text x={vtInnerLeft - 30} y={vtInnerTop + vtInnerH / 2} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText} transform={`rotate(-90, ${vtInnerLeft - 30}, ${vtInnerTop + vtInnerH / 2})`}>v/(m·s⁻¹)</text>

      {/* v-t 曲线 */}
      {vtVtPathD && (
        <path d={vtVtPathD} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
      )}
    </svg>
  )
}

