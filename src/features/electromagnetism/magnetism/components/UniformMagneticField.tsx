import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { MagneticFieldGrid } from '@/components/Physics'

interface UniformMagneticFieldProps {
  x: number
  y: number
  w: number
  h: number
  B: number
  font?: (size: number) => number
}

export const UniformMagneticField: React.FC<UniformMagneticFieldProps> = ({
  x,
  y,
  w,
  h,
  B,
  font = (s) => s,
}) => {
  const hasField = Math.abs(B) > 1e-4

  return (
    <g>
      {/* 磁场区域底色卡片 */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="none"
      />

      {/* 磁场方向标志点阵 */}
      {hasField ? (
        <g>
          <MagneticFieldGrid
            x={x}
            y={y}
            w={w}
            h={h}
            direction={B > 0 ? 'in' : 'out'}
            rows={4}
            cols={6}
            color={PHYSICS_COLORS.magneticFieldLine}
            opacity={0.8}
          />
          {/* 在右上角渲染大大的带矢量箭头的 B 磁力线标识 */}
          <g transform={`translate(${x + w - 16}, ${y + 14})`}>
            {/* 上方的矢量箭头 */}
            <path
              d="M -5,-9 L 3,-9 M 0,-11.5 L 3,-9 L 0,-6.5"
              fill="none"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {/* 字母 B */}
            <text
              x="0"
              y="2.5"
              fontSize={font(16)}
              fill={PHYSICS_COLORS.magneticField}
              fillOpacity="0.9"
              fontWeight="black"
              fontStyle="italic"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              B
            </text>
          </g>
        </g>
      ) : (
        /* 无磁场提示文本 */
        <text
          x={x + w / 2}
          y={y + h / 2}
          fontSize={font(12)}
          fill={CANVAS_COLORS.textMuted}
          fontWeight="medium"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          无磁场 (B = 0)
        </text>
      )}
    </g>
  )
}

export default UniformMagneticField
