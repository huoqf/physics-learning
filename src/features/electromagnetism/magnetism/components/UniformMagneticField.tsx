import React, { useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface UniformMagneticFieldProps {
  x: number
  y: number
  w: number
  h: number
  B: number
}

export const UniformMagneticField: React.FC<UniformMagneticFieldProps> = ({
  x,
  y,
  w,
  h,
  B,
}) => {
  const rows = 4
  const cols = 6

  const points = useMemo(() => {
    const arr: { id: string; px: number; py: number }[] = []
    if (Math.abs(B) < 1e-4) return arr

    const dx = w / (cols + 1)
    const dy = h / (rows + 1)

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        arr.push({
          id: `${r}-${c}`,
          px: x + c * dx,
          py: y + r * dy,
        })
      }
    }
    return arr
  }, [x, y, w, h, B])

  const hasField = Math.abs(B) > 1e-4

  // 背景层颜色与不透明度
  const bgFill = hasField
    ? PHYSICS_COLORS.magneticFieldLine
    : colors.neutral[100]
  const bgOpacity = hasField ? 0.15 : 0.02

  return (
    <g>
      {/* 磁场区域底色卡片 */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={bgFill}
        fillOpacity={bgOpacity}
        stroke={hasField ? PHYSICS_COLORS.magneticFieldLine : colors.neutral[300]}
        strokeWidth="1"
        strokeOpacity={hasField ? 0.5 : 0.15}
        rx="6"
      />

      {/* 磁场方向标志点阵 */}
      {hasField ? (
        <g>
          {points.map((pt) => (
            <text
              key={pt.id}
              x={pt.px}
              y={pt.py}
              fontSize="16"
              fill={PHYSICS_COLORS.magneticFieldLine}
              fillOpacity="0.8"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {B > 0 ? '⊗' : '⊙'}
            </text>
          ))}
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
              fontSize="16"
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
          fontSize="2.4"
          fill={colors.neutral[400]}
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
