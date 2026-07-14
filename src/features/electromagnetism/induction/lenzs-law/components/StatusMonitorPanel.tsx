import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'

interface StatusMonitorPanelProps {
  resolvedMonitorPos: Array<{ x: number; y: number }>
  isDragging: boolean
  velocity: number
  magnetPole: number
  currentAction: string
  fluxChange: string
  font: (size: number) => number
  getOpacity: (steps: number[]) => number
}

export const StatusMonitorPanel: React.FC<StatusMonitorPanelProps> = ({
  resolvedMonitorPos,
  isDragging,
  velocity,
  magnetPole,
  currentAction,
  fluxChange,
  font,
  getOpacity,
}) => {
  return (
    <g transform="translate(500, 40)">
      {/* 第一步：当前动作 */}
      <text
        x={resolvedMonitorPos[0].x}
        y={resolvedMonitorPos[0].y}
        textAnchor="middle"
        fill={PHYSICS_COLORS.labelText}
        fontSize={font(12)}
        fontWeight="bold"
        opacity={getOpacity([1])}
        className="transition-opacity duration-300"
      >
        {isDragging
          ? velocity < 0
            ? magnetPole > 0 ? 'N极靠近 (拖拽)' : 'S极靠近 (拖拽)'
            : magnetPole > 0 ? 'N极远离 (拖拽)' : 'S极远离 (拖拽)'
          : currentAction}
      </text>

      {/* 第二步：磁通量状态 */}
      <text
        x={resolvedMonitorPos[1].x}
        y={resolvedMonitorPos[1].y}
        textAnchor="middle"
        fill={PHYSICS_COLORS.labelText}
        fontSize={font(11)}
        opacity={getOpacity([2])}
        className="transition-opacity duration-300"
      >
        磁通量：{fluxChange === 'increasing' ? '正在增加' : (fluxChange === 'decreasing' ? '正在减少' : '保持不变')}
      </text>

      {/* 第三步：原/感磁场阻碍关系 */}
      <text
        x={resolvedMonitorPos[2].x}
        y={resolvedMonitorPos[2].y}
        textAnchor="middle"
        fill={fluxChange !== 'stable' ? PHYSICS_COLORS.magneticField : PHYSICS_COLORS.trackHistory}
        fontSize={font(11)}
        fontWeight="bold"
        opacity={getOpacity([3])}
        className="transition-opacity duration-300"
      >
        原/感磁场：{fluxChange === 'stable' ? '无' : (fluxChange === 'increasing' ? '反向阻碍' : '同向阻碍')}
      </text>
    </g>
  )
}
