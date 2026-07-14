import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { normalize, type Point } from './inclineSceneUtils'

interface InclinedBFieldLinesProps {
  B: number
  bFieldLines: Point[]
  bPositiveUnit: Point
  font: (size: number) => number
  scale: number
}

export const InclinedBFieldLines: React.FC<InclinedBFieldLinesProps> = ({
  B,
  bFieldLines,
  bPositiveUnit,
  font,
  scale,
}) => {
  return (
    <g>
      {bFieldLines.map((line, idx) => {
        const isBPositive = B > 0
        const dir = normalize({
          x: bPositiveUnit.x * (isBPositive ? 1 : -1),
          y: bPositiveUnit.y * (isBPositive ? 1 : -1),
        })
        const lineStart = { x: line.x - dir.x * 25, y: line.y - dir.y * 25 }
        const lineEnd = { x: line.x + dir.x * 45, y: line.y + dir.y * 45 }
        const angleDeg = (Math.atan2(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x) * 180) / Math.PI

        return (
          <g key={idx}>
            {/* 白色半透明发光底衬线 */}
            <line
              x1={lineStart.x}
              y1={lineStart.y}
              x2={lineEnd.x - dir.x * 5}
              y2={lineEnd.y - dir.y * 5}
              stroke="white"
              strokeWidth="3.2"
              opacity="0.85"
            />
            {/* 磁感线主体 */}
            <line
              x1={lineStart.x}
              y1={lineStart.y}
              x2={lineEnd.x - dir.x * 5}
              y2={lineEnd.y - dir.y * 5}
              stroke={PHYSICS_COLORS.magneticFieldLine}
              strokeWidth="1.8"
              opacity="1"
            />
            {/* 磁感线箭头白色底衬 */}
            <g transform={`translate(${lineEnd.x}, ${lineEnd.y}) rotate(${angleDeg})`}>
              <polygon points="0,0 -7,-3 -7,3" fill="white" opacity="0.85" />
              <polygon points="0,0 -7,-3 -7,3" fill={PHYSICS_COLORS.magneticField} opacity="1" />
            </g>
            {/* 只在中间那根磁感线旁加 B 标号 */}
            {idx === Math.floor(bFieldLines.length / 2) && (
              <g>
                <text
                  x={lineEnd.x + dir.x * 12}
                  y={lineEnd.y + dir.y * 12 + 1}
                  fontSize={font(8.5) / scale}
                  fill="white"
                  fontWeight="extrabold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  opacity="0.9"
                >
                  B
                </text>
                <text
                  x={lineEnd.x + dir.x * 12}
                  y={lineEnd.y + dir.y * 12 + 1}
                  fontSize={font(8.5) / scale}
                  fill={PHYSICS_COLORS.magneticField}
                  fontWeight="extrabold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ userSelect: 'none' }}
                >
                  B
                </text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
