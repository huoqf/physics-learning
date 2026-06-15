import React from 'react'
import { SCENE_COLORS } from '@/theme/physics'

export interface GalvanometerProps {
  x?: number // 中心 x
  y?: number // 中心 y
  value?: number // 指针偏转状态，在 [-1, 1] 之间，0 为居中，正向右偏，负向左偏
  width?: number // 表盘宽度，默认 120
  height?: number // 表盘高度，默认 110
  className?: string
}

export const Galvanometer: React.FC<GalvanometerProps> = ({
  x = 0,
  y = 0,
  value = 0,
  width = 120,
  height = 110,
  className = '',
}) => {
  const c = SCENE_COLORS.circuit

  // 缩放比例（基于默认尺寸 120×110）
  const scaleX = width / 120
  const scaleY = height / 110
  const scale = Math.min(scaleX, scaleY)

  // 限制指针取值范围 [-1, 1]
  const clampedVal = Math.max(-1, Math.min(1, value))
  // 最大偏转角度为 45 度
  const maxAngle = 45
  const angle = clampedVal * maxAngle

  // 刻度盘圆心设在 (0, 70) - 基准坐标系
  const pivotX = 0
  const pivotY = 70

  // 刻度角度列表：-40, -20, 0, 20, 40
  const ticks = [-40, -30, -20, -10, 0, 10, 20, 30, 40]

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} className={className}>
      {/* 3D 投影阴影 */}
      <rect
        x={-60 + 3}
        y={4}
        width={120}
        height={110}
        rx="8"
        fill="rgba(0, 0, 0, 0.15)"
        filter="blur(3px)"
      />

      {/* 外壳 (meterFrame) */}
      <rect
        x={-60}
        y="0"
        width={120}
        height={110}
        rx="8"
        fill={c.meterFrame}
        stroke="#1E293B"
        strokeWidth="2"
      />

      {/* 内表盘 (ammeterFace) */}
      <path
        d={`M ${-60 + 8} 8 
            L ${60 - 8} 8 
            A 8 8 0 0 1 ${60 - 8} 16
            L ${60 - 8} 85 
            Q 0 100 ${-60 + 8} 85 
            L ${-60 + 8} 16
            A 8 8 0 0 1 ${-60 + 8} 8`}
        fill={c.ammeterFace}
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* 刻度盘弧线 */}
      <path
        d="M -35 30 A 45 45 0 0 1 35 30"
        fill="none"
        stroke={c.meterScale}
        strokeWidth="1.5"
      />

      {/* 绘制刻度线 */}
      {ticks.map((tickAngle) => {
        // 角度转换为弧度，注意 0 度是垂直向上 (-90 deg)
        const rad = ((tickAngle - 90) * Math.PI) / 180
        const rStart = 42
        const rEnd = tickAngle % 20 === 0 ? 48 : 45 // 逢双十刻度画长一些
        const x1 = pivotX + rStart * Math.cos(rad)
        const y1 = pivotY + rStart * Math.sin(rad)
        const x2 = pivotX + rEnd * Math.cos(rad)
        const y2 = pivotY + rEnd * Math.sin(rad)

        return (
          <line
            key={`tick-${tickAngle}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={c.meterScale}
            strokeWidth={tickAngle === 0 ? '2' : '1'}
          />
        )
      })}

      {/* 刻度左右两侧的正负提示 */}
      <text x="-42" y="28" fill={c.meterScale} fontSize="9" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        -
      </text>
      <text x="42" y="28" fill={c.meterScale} fontSize="9" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        +
      </text>

      {/* 电流计标识 "G" */}
      <text
        x="0"
        y="58"
        fill={c.meterScale}
        fontSize="18"
        fontWeight="extrabold"
        textAnchor="middle"
        opacity="0.75"
        style={{ fontFamily: 'Georgia, serif', userSelect: 'none' }}
      >
        G
      </text>

      {/* 灵敏电流计指针 (指向 pivotY 向上) */}
      <g transform={`translate(${pivotX}, ${pivotY}) rotate(${angle})`}>
        {/* 指针杆 */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-50"
          stroke={c.meterNeedle}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* 指针尖端小红圈 */}
        <circle cx="0" cy="-50" r="2.5" fill={c.meterNeedle} />
      </g>

      {/* 指针轴心圆盖 */}
      <circle cx={pivotX} cy={pivotY} r="7" fill={c.meterScale} />
      <circle cx={pivotX} cy={pivotY} r="3" fill="#9CA3AF" />

      {/* 接线柱接口 (红/黑) */}
      <circle cx={-30} cy="100" r="5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1" />
      <circle cx="30" cy="100" r="5" fill="#1F2937" stroke="#111827" strokeWidth="1" />
    </g>
  )
}

export default Galvanometer
