import React from 'react'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 灵敏电流计组件 Props
 */
export interface GalvanometerProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 指针偏转状态，取值范围 [-1, 1]：0 居中，正值向右偏，负值向左偏 */
  value?: number
  /** 表盘宽度 (px)，默认 120 */
  width?: number
  /** 表盘高度 (px)，默认 110 */
  height?: number
  /** 自定义 CSS 类名 */
  className?: string
}

/**
 * 灵敏电流计组件
 *
 * 用于电磁感应等场景，显示感应电流的方向与大小。
 * - 指针偏转角度与 value 成正比（最大 ±45°）
 * - 包含弧形刻度盘、正负标识、"G" 标识
 * - 红黑接线柱接口
 * - 支持自定义尺寸缩放
 */
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
  // 最大偏转角度为 30 度，对应 G 表两端对称 30 分度
  const maxAngle = 30
  const angle = clampedVal * maxAngle

  // 刻度盘圆心设在 (0, 70) - 基准坐标系
  const pivotX = 0
  const pivotY = 70

  // 刻度角度列表：-30 到 30 度，每 2 度一格，共 30 格分度
  const ticks = Array.from({ length: 31 }).map((_, i) => -30 + i * 2)

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
        stroke={colors.neutral[800]}
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
        stroke={colors.neutral[800]}
        strokeWidth="1.5"
      />

      {/* 刻度盘弧线 */}
      <path
        d="M -30 28 A 46 46 0 0 1 30 28"
        fill="none"
        stroke={c.meterScale}
        strokeWidth="1"
        opacity="0.8"
      />

      {/* 绘制刻度线与扇形刻度值 */}
      {ticks.map((tickAngle) => {
        // 角度转换为弧度，注意 0 度是垂直向上 (-90 deg)
        const rad = ((tickAngle - 90) * Math.PI) / 180
        const isMajor = tickAngle % 10 === 0
        const rStart = 42
        const rEnd = isMajor ? 48 : 45
        
        const x1 = pivotX + rStart * Math.cos(rad)
        const y1 = pivotY + rStart * Math.sin(rad)
        const x2 = pivotX + rEnd * Math.cos(rad)
        const y2 = pivotY + rEnd * Math.sin(rad)

        // 刻度数值标签坐标计算 (扇形排列)
        const labelR = 33
        const labelX = pivotX + labelR * Math.cos(rad)
        const labelY = pivotY + labelR * Math.sin(rad)
        const labelText = String(Math.abs(tickAngle))

        return (
          <g key={`tick-group-${tickAngle}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={c.meterScale}
              strokeWidth={isMajor ? '1.5' : '0.8'}
              opacity={isMajor ? '0.9' : '0.6'}
            />
            {isMajor && (
              <text
                x={labelX}
                y={labelY + 2.5}
                fill={c.meterScale}
                fontSize="6.5"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
                style={{ userSelect: 'none' }}
              >
                {labelText}
              </text>
            )}
          </g>
        )
      })}

      {/* 刻度左右两侧的正负提示 */}
      <text x="-48" y="28" fill={c.meterScale} fontSize="9" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        -
      </text>
      <text x="48" y="28" fill={c.meterScale} fontSize="9" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        +
      </text>

      {/* 电流计标识 "G" */}
      <text
        x="0"
        y="58"
        fill={c.meterScale}
        fontSize="16"
        fontWeight="extrabold"
        textAnchor="middle"
        opacity="0.8"
        style={{ fontFamily: 'Georgia, serif', userSelect: 'none' }}
      >
        G
      </text>

      {/* 灵敏电流计指针 (带顺滑阻尼偏转过渡) */}
      <g 
        transform={`translate(${pivotX}, ${pivotY}) rotate(${angle})`}
        style={{
          transition: 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transformOrigin: '0px 0px',
        }}
      >
        {/* 指针投影 */}
        <line
          x1="0.8"
          y1="0.8"
          x2="0.8"
          y2="-51.2"
          stroke="rgba(15, 23, 42, 0.15)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* 指针杆 */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-52"
          stroke={c.meterNeedle}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* 指针尖端小红圈 */}
        <circle cx="0" cy="-52" r="2.2" fill={c.meterNeedle} />
      </g>

      {/* 指针轴心圆盖 */}
      <circle cx={pivotX} cy={pivotY} r="6" fill={c.meterScale} />
      <circle cx={pivotX} cy={pivotY} r="2.5" fill={colors.neutral[400]} />

      {/* 接线柱接口 (红/黑) */}
      <circle cx={-30} cy="100" r="5" fill={SCENE_COLORS.circuit.batteryPos} stroke={SCENE_COLORS.circuit.meterFrame} strokeWidth="1" />
      <circle cx="30" cy="100" r="5" fill={colors.neutral[800]} stroke={colors.neutral[900]} strokeWidth="1" />
    </g>
  )
}

export default Galvanometer
