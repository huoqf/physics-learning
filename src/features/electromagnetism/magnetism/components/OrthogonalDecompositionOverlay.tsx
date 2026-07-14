import React from 'react'
import { CANVAS_COLORS } from '@/theme/physics'
import type { ProjectionResult } from '../hooks/useInclineForceLayout'

interface OrthogonalDecompositionOverlayProps {
  px: number
  py: number
  thetaRad: number
  showForceComponents: boolean
  G_projection: ProjectionResult
  Fa_projection: ProjectionResult
  font: (size: number) => number
}

export const OrthogonalDecompositionOverlay: React.FC<OrthogonalDecompositionOverlayProps> = ({
  px,
  py,
  thetaRad,
  showForceComponents,
  G_projection,
  Fa_projection,
  font,
}) => {
  if (!showForceComponents) return null

  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)
  const axisLen = 45

  return (
    <>
      {/* 正交分解辅助坐标轴 */}
      <g opacity="0.45">
        {/* 沿斜面坐标轴 (x') */}
        <line
          x1={px - axisLen * cosT}
          y1={py + axisLen * sinT}
          x2={px + axisLen * cosT}
          y2={py - axisLen * sinT}
          stroke={CANVAS_COLORS.axis}
          strokeWidth="0.8"
          strokeDasharray="3,3"
        />
        <text
          x={px + axisLen * cosT + 3}
          y={py - axisLen * sinT}
          fontSize={font(5)}
          fill={CANVAS_COLORS.labelTextLight}
          fontWeight="bold"
        >
          x'
        </text>

        {/* 垂直斜面坐标轴 (y') */}
        <line
          x1={px + axisLen * sinT}
          y1={py + axisLen * cosT}
          x2={px - axisLen * sinT}
          y2={py - axisLen * cosT}
          stroke={CANVAS_COLORS.axis}
          strokeWidth="0.8"
          strokeDasharray="3,3"
        />
        <text
          x={px - axisLen * sinT - 6}
          y={py - axisLen * cosT}
          fontSize={font(5)}
          fill={CANVAS_COLORS.labelTextLight}
          fontWeight="bold"
        >
          y'
        </text>
      </g>

      {/* 投影辅助虚线 (重力与安培力分解) */}
      <g stroke={CANVAS_COLORS.trackHistory} strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.8">
        {/* 重力投影到 y' 轴 (垂直斜面) */}
        <line
          x1={px + G_projection.end.x}
          y1={py + G_projection.end.y}
          x2={px + G_projection.normal.x}
          y2={py + G_projection.normal.y}
        />
        {/* 重力投影到 x' 轴 (平行斜面) */}
        <line
          x1={px + G_projection.end.x}
          y1={py + G_projection.end.y}
          x2={px + G_projection.slope.x}
          y2={py + G_projection.slope.y}
        />

        {/* 安培力投影到 y' 轴 (垂直斜面) */}
        <line
          x1={px + Fa_projection.end.x}
          y1={py + Fa_projection.end.y}
          x2={px + Fa_projection.normal.x}
          y2={py + Fa_projection.normal.y}
        />
        {/* 安培力投影到 x' 轴 (平行斜面) */}
        <line
          x1={px + Fa_projection.end.x}
          y1={py + Fa_projection.end.y}
          x2={px + Fa_projection.slope.x}
          y2={py + Fa_projection.slope.y}
        />
      </g>
    </>
  )
}
