import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'

interface VectorArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  label?: string
  labelOffset?: { x: number; y: number }
  strokeWidth?: number
  markerSize?: number
  scale?: number
}

export const VectorArrow: React.FC<VectorArrowProps> = ({
  x1,
  y1,
  x2,
  y2,
  color = PHYSICS_COLORS.acceleration,
  label = '',
  labelOffset = { x: 10, y: -10 },
  strokeWidth = 3,
  markerSize = 10,
  scale = 1,
}) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)

  const scaledDx = dx * scale
  const scaledDy = dy * scale
  const scaledX2 = x1 + scaledDx
  const scaledY2 = y1 + scaledDy

  const arrowheadId = `arrowhead-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 9)}`

  if (length === 0) return null

  return (
    <g>
      <defs>
        <marker
          id={arrowheadId}
          markerWidth={markerSize}
          markerHeight={markerSize}
          refX={markerSize - 1}
          refY={markerSize / 2}
          orient="auto"
        >
          <polygon
            points={`0 0, ${markerSize} ${markerSize / 2}, 0 ${markerSize}`}
            fill={color}
          />
        </marker>
      </defs>

      <line
        x1={x1}
        y1={y1}
        x2={scaledX2}
        y2={scaledY2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        markerEnd={`url(#${arrowheadId})`}
      />

      {label && (
        <text
          x={scaledX2 + labelOffset.x}
          y={scaledY2 + labelOffset.y}
          fontSize="14"
          fill={color}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

export const VectorArrowWithAngle: React.FC<{
  originX: number
  originY: number
  magnitude: number
  angle: number
  color?: string
  label?: string
  scale?: number
}> = ({
  originX,
  originY,
  magnitude,
  angle,
  color = PHYSICS_COLORS.velocity,
  label = '',
  scale = 1,
}) => {
  const angleRad = (angle * Math.PI) / 180
  const x2 = originX + magnitude * Math.cos(angleRad) * scale
  const y2 = originY - magnitude * Math.sin(angleRad) * scale

  return (
    <VectorArrow
      x1={originX}
      y1={originY}
      x2={x2}
      y2={y2}
      color={color}
      label={label}
      labelOffset={{ x: 10, y: -10 }}
    />
  )
}

export default VectorArrow
