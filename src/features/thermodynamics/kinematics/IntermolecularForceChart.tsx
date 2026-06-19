import {
  CHART_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
  molecularPotentialEnergy,
} from '@/physics/intermolecularForces'

interface ChartDataPoint {
  r: number
  fRepulsive: number
  fAttractive: number
  fNet: number
  ep: number
}

interface IntermolecularForceChartProps {
  /** 当前分子间距 r（以 r_0 为单位） */
  currentR: number
  /** 图表模式：'force' 显示 F-r 图，'energy' 显示 E_p-r 图 */
  mode: 'force' | 'energy'
  /** 图表宽度 */
  width: number
  /** 图表高度 */
  height: number
  /** 字体大小函数 */
  font: (size: number) => number
  /** 斥力系数 */
  A?: number
  /** 引力系数 */
  B?: number
}

const R_MIN = 0.3
const R_MAX = 5.0
const R_STEP = 0.05

/** 生成图表数据点 */
function generateChartData(A: number, B: number): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  for (let r = R_MIN; r <= R_MAX; r += R_STEP) {
    points.push({
      r,
      fRepulsive: repulsiveForce(r, A),
      fAttractive: -attractiveForce(r, B),
      fNet: netMolecularForce(r, A, B),
      ep: molecularPotentialEnergy(r, A, B),
    })
  }
  return points
}

/** 计算图表区域 */
function getChartBounds(width: number, height: number) {
  const padding = { top: 30, right: 20, bottom: 35, left: 50 }
  return {
    x: padding.left,
    y: padding.top,
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
    padding,
  }
}

/** 数据点 → 像素坐标 */
function toPixelX(r: number, chartW: number, chartX: number): number {
  return chartX + ((r - R_MIN) / (R_MAX - R_MIN)) * chartW
}

function toPixelYForce(f: number, maxF: number, chartH: number, chartY: number): number {
  const midY = chartY + chartH / 2
  const scale = (chartH / 2) * 0.85
  return midY - (f / maxF) * scale
}

function toPixelYEnergy(ep: number, minEp: number, maxEp: number, chartH: number, chartY: number): number {
  const range = maxEp - minEp || 1
  return chartY + chartH - ((ep - minEp) / range) * chartH
}

export default function IntermolecularForceChart({
  currentR,
  mode,
  width,
  height,
  font,
  A = 1.0,
  B = 1.0,
}: IntermolecularForceChartProps) {
  const data = generateChartData(A, B)
  const bounds = getChartBounds(width, height)

  if (mode === 'force') {
    return (
      <ForceChart
        data={data}
        currentR={currentR}
        bounds={bounds}
        width={width}
        height={height}
        font={font}
      />
    )
  }

  return (
    <EnergyChart
      data={data}
      currentR={currentR}
      bounds={bounds}
      width={width}
      height={height}
      font={font}
    />
  )
}

/** F-r 图：引力（蓝）、斥力（红）、合力（橙） */
function ForceChart({
  data,
  currentR,
  bounds,
  width,
  height,
  font,
}: {
  data: ChartDataPoint[]
  currentR: number
  bounds: ReturnType<typeof getChartBounds>
  width: number
  height: number
  font: (size: number) => number
}) {
  const { x, y, w, h } = bounds

  const maxF = Math.max(
    ...data.map((p) => Math.abs(p.fRepulsive)),
    ...data.map((p) => Math.abs(p.fAttractive)),
    1,
  ) * 1.1

  const toX = (r: number) => toPixelX(r, w, x)
  const toY = (f: number) => toPixelYForce(f, maxF, h, y)

  const repPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toY(p.fRepulsive).toFixed(1)}`)
    .join(' ')

  const attPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toY(p.fAttractive).toFixed(1)}`)
    .join(' ')

  const netPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toY(p.fNet).toFixed(1)}`)
    .join(' ')

  const currentF = netMolecularForce(currentR, 1.0, 1.0)
  const cursorX = toX(currentR)
  const cursorY = toY(currentF)

  return (
    <svg width={width} height={height}>
      {/* 背景 */}
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={4}
        fill="white" stroke={CHART_COLORS.gridLine} strokeWidth={CANVAS_STYLE.stroke.reference} />

      {/* 标题 */}
      <text x={x + w / 2} y={y - 10} fontSize={font(10)} fill={CHART_COLORS.titleText}
        textAnchor="middle" fontWeight="bold">F-r 图像</text>

      {/* 坐标轴 */}
      <line x1={x} y1={y} x2={x} y2={y + h}
        stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2}
        stroke={CHART_COLORS.zeroline} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      <line x1={x} y1={y + h} x2={x + w} y2={y + h}
        stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.chartMain} />

      {/* 轴标签 */}
      <text x={x + w / 2} y={y + h + 25} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.labelText}>r / r₀</text>
      <text x={x - 8} y={y + h / 2} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.labelText}
        transform={`rotate(-90, ${x - 8}, ${y + h / 2})`}>F</text>

      {/* 零线标签 */}
      <text x={x - 5} y={y + h / 2 - 5} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">0</text>

      {/* 曲线 */}
      <path d={repPath} fill="none" stroke={CHART_COLORS.criticalPt} strokeWidth={CANVAS_STYLE.stroke.chartSub} />
      <path d={attPath} fill="none" stroke={CHART_COLORS.primary} strokeWidth={CANVAS_STYLE.stroke.chartSub} />
      <path d={netPath} fill="none" stroke={CHART_COLORS.compareC} strokeWidth={CANVAS_STYLE.stroke.chartMain} />

      {/* 图例 */}
      <g transform={`translate(${x + w - 90}, ${y + 5})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke={CHART_COLORS.criticalPt} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={20} y={4} fontSize={font(7)} fill={CHART_COLORS.labelText}>F_斥</text>
        <line x1={0} y1={14} x2={16} y2={14} stroke={CHART_COLORS.primary} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={20} y={18} fontSize={font(7)} fill={CHART_COLORS.labelText}>F_引</text>
        <line x1={0} y1={28} x2={16} y2={28} stroke={CHART_COLORS.compareC} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
        <text x={20} y={32} fontSize={font(7)} fill={CHART_COLORS.labelText}>F_合</text>
      </g>

      {/* r_0 标注 */}
      <line x1={toX(1.0)} y1={y + h} x2={toX(1.0)} y2={y + h + 8}
        stroke={CHART_COLORS.equilibrium} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
      <text x={toX(1.0)} y={y + h + 18} fontSize={font(7)} fill={CHART_COLORS.equilibrium} textAnchor="middle">r₀</text>

      {/* 当前值十字光标 */}
      <line x1={cursorX} y1={y} x2={cursorX} y2={y + h}
        stroke={CHART_COLORS.highlight} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,3" opacity={0.6} />
      <line x1={x} y1={cursorY} x2={x + w} y2={cursorY}
        stroke={CHART_COLORS.highlight} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,3" opacity={0.6} />
      <circle cx={cursorX} cy={cursorY} r={4}
        fill={CHART_COLORS.compareC} stroke="white" strokeWidth={CANVAS_STYLE.stroke.objectLine} />
    </svg>
  )
}

/** E_p-r 图：势能曲线（紫色） */
function EnergyChart({
  data,
  currentR,
  bounds,
  width,
  height,
  font,
}: {
  data: ChartDataPoint[]
  currentR: number
  bounds: ReturnType<typeof getChartBounds>
  width: number
  height: number
  font: (size: number) => number
}) {
  const { x, y, w, h } = bounds

  const epValues = data.map((p) => p.ep)
  const minEp = Math.min(...epValues) * 1.1
  const maxEp = Math.max(...epValues.filter((v) => v < 10), 0.5)

  const toX = (r: number) => toPixelX(r, w, x)
  const toY = (ep: number) => toPixelYEnergy(ep, minEp, maxEp, h, y)

  const epPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toY(p.ep).toFixed(1)}`)
    .join(' ')

  const currentEp = molecularPotentialEnergy(currentR, 1.0, 1.0)
  const cursorX = toX(currentR)
  const cursorY = toY(currentEp)

  return (
    <svg width={width} height={height}>
      {/* 背景 */}
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={4}
        fill="white" stroke={CHART_COLORS.gridLine} strokeWidth={CANVAS_STYLE.stroke.reference} />

      {/* 标题 */}
      <text x={x + w / 2} y={y - 10} fontSize={font(10)} fill={CHART_COLORS.titleText}
        textAnchor="middle" fontWeight="bold">E_p-r 图像</text>

      {/* 坐标轴 */}
      <line x1={x} y1={y} x2={x} y2={y + h}
        stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
      <line x1={x} y1={y + h} x2={x + w} y2={y + h}
        stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.chartMain} />

      {/* E_p=0 参考线 */}
      {minEp < 0 && (
        <line x1={x} y1={toY(0)} x2={x + w} y2={toY(0)}
          stroke={CHART_COLORS.zeroline} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      )}

      {/* 轴标签 */}
      <text x={x + w / 2} y={y + h + 25} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.labelText}>r / r₀</text>
      <text x={x - 8} y={y + h / 2} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.labelText}
        transform={`rotate(-90, ${x - 8}, ${y + h / 2})`}>E_p</text>

      {/* 曲线 */}
      <path d={epPath} fill="none" stroke={CHART_COLORS.compareD} strokeWidth={CANVAS_STYLE.stroke.chartMain} />

      {/* 图例 */}
      <g transform={`translate(${x + w - 70}, ${y + 5})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke={CHART_COLORS.compareD} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
        <text x={20} y={4} fontSize={font(7)} fill={CHART_COLORS.labelText}>E_p</text>
      </g>

      {/* r_0 标注 */}
      <line x1={toX(1.0)} y1={y + h} x2={toX(1.0)} y2={y + h + 8}
        stroke={CHART_COLORS.equilibrium} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
      <text x={toX(1.0)} y={y + h + 18} fontSize={font(7)} fill={CHART_COLORS.equilibrium} textAnchor="middle">r₀</text>

      {/* 势阱最低点标注 */}
      <circle cx={toX(1.0)} cy={toY(molecularPotentialEnergy(1.0, 1.0, 1.0))} r={3}
        fill={CHART_COLORS.equilibrium} stroke="white" strokeWidth={CANVAS_STYLE.stroke.objectThin} />
      <text x={toX(1.0) + 8} y={toY(molecularPotentialEnergy(1.0, 1.0, 1.0)) - 8}
        fontSize={font(7)} fill={CHART_COLORS.equilibrium}>势阱最低点</text>

      {/* 当前值十字光标 */}
      <line x1={cursorX} y1={y} x2={cursorX} y2={y + h}
        stroke={CHART_COLORS.highlight} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,3" opacity={0.6} />
      <line x1={x} y1={cursorY} x2={x + w} y2={cursorY}
        stroke={CHART_COLORS.highlight} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,3" opacity={0.6} />
      <circle cx={cursorX} cy={cursorY} r={4}
        fill={CHART_COLORS.compareD} stroke="white" strokeWidth={CANVAS_STYLE.stroke.objectLine} />
    </svg>
  )
}
