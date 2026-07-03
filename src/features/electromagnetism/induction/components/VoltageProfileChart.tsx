/**
 * VoltageProfileChart.tsx — 电压剖面图（上半区 40%）
 *
 * 纯 SVG 渲染组件，零物理计算。
 */
import { PHYSICS_COLORS, TRANSMISSION_COLORS } from '@/theme/physics'
import type { VoltagePoint } from '../hooks/usePowerTransmissionPhysics'

interface VoltageProfileChartProps {
  voltagePoints: VoltagePoint[]
  idealPoints: VoltagePoint[]
  ratedY: number
  deltaU: number
  u3Y: number
  showIdeal: boolean
  chartTop: number
  chartBottom: number
  plantX: number
  stepUpX: number
  lineEndX: number
  stepDownX: number
  userX: number
  W: number
  px: (v: number) => number
  font: (v: number) => number
}

export function VoltageProfileChart({
  voltagePoints,
  idealPoints,
  ratedY,
  deltaU,
  showIdeal,
  chartTop,
  chartBottom,
  plantX,
  stepUpX,
  lineEndX,
  stepDownX,
  userX,
  W,
  px,
  font,
}: VoltageProfileChartProps) {
  return (
    <g>
      {/* 标题 */}
      <text x={W / 2} y={chartTop - px(8)} fontSize={font(14)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        电压剖面图
      </text>

      {/* Y 轴参考线 */}
      <line x1={plantX} y1={chartTop} x2={plantX} y2={chartBottom}
        stroke={PHYSICS_COLORS.grid} strokeWidth={px(1)} strokeDasharray="4 2" />
      <line x1={plantX} y1={chartBottom} x2={userX + px(20)} y2={chartBottom}
        stroke={PHYSICS_COLORS.grid} strokeWidth={px(1)} />

      {/* 实际电压折线下方面积渐变填充 */}
      <path
        d={`M ${plantX} ${chartBottom} L ${plantX} ${chartBottom} L ${stepUpX} ${chartTop} L ${lineEndX} ${voltagePoints[2].y} L ${userX} ${voltagePoints[3].y} L ${userX} ${chartBottom} Z`}
        fill="url(#chartAreaGrad)"
      />

      {/* 输电线损耗高亮三角形区域 */}
      {deltaU > 5 && (
        <path
          d={`M ${stepUpX} ${chartTop} L ${lineEndX} ${chartTop} L ${lineEndX} ${voltagePoints[2].y} Z`}
          fill={TRANSMISSION_COLORS.powerLoss}
          opacity="0.1"
        />
      )}

      {/* 理想无损耗对比线 */}
      {showIdeal && idealPoints.length > 0 && (
        <polyline
          points={idealPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={TRANSMISSION_COLORS.idealOverlay}
          strokeWidth={px(2)}
          strokeDasharray="6 3"
          opacity={0.7}
        />
      )}

      {/* 实际电压折线 */}
      <polyline
        points={voltagePoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={TRANSMISSION_COLORS.voltageHigh}
        strokeWidth={px(2.5)}
      />

      {/* 电压节点标注卡片 */}
      {voltagePoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={px(6)}
            fill={TRANSMISSION_COLORS.voltageHigh} opacity="0.3" filter="url(#glowFilter)" />
          <circle cx={p.x} cy={p.y} r={px(4)}
            fill={TRANSMISSION_COLORS.voltageHigh} />

          <rect
            x={p.x - px(24)}
            y={p.y + px(8)}
            width={px(48)}
            height={px(15)}
            rx={px(4)}
            fill="rgba(255, 255, 255, 0.85)"
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={px(0.8)}
          />
          <text x={p.x} y={p.y - px(10)} fontSize={font(11)}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            {p.label}
          </text>
          <text x={p.x} y={p.y + px(19)} fontSize={font(8.5)}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}kV` : `${p.value.toFixed(0)}V`}
          </text>
        </g>
      ))}

      {/* 220V 标准电压基准线 */}
      <line
        x1={stepDownX} y1={ratedY} x2={userX + px(20)} y2={ratedY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={px(1)} strokeDasharray="4 3" opacity={0.6} />
      <text x={userX + px(22)} y={ratedY + px(3)} fontSize={font(9)}
        fill={PHYSICS_COLORS.axis} textAnchor="start">
        标准 220V
      </text>

      {/* ΔU 标注 */}
      <line x1={stepUpX + px(10)} y1={chartTop} x2={stepUpX + px(10)} y2={voltagePoints[2].y}
        stroke={TRANSMISSION_COLORS.powerLoss} strokeWidth={px(1.5)} strokeDasharray="3 2" />
      <text x={stepUpX + px(18)} y={(chartTop + voltagePoints[2].y) / 2} fontSize={font(10)}
        fill={TRANSMISSION_COLORS.powerLoss} textAnchor="start">
        ΔU={deltaU.toFixed(0)}V
      </text>
    </g>
  )
}
