import React from 'react'
import { CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface LabStandProps {
  /** 铁架台底座中心 X 坐标 */
  x: number
  /** 铁架台底座底部 Y 坐标 */
  y: number
  /** 铁杆总高度 (px, 默认 240) */
  height?: number
  /** 底座宽度 (px, 默认 120) */
  baseWidth?: number
  /** 铁夹/支架在铁杆上的相对挂载高度 (从底座算起的 px, 默认 160) */
  clampY?: number
  /** 支架类型: 'clamp' (铁夹) | 'ring' (铁圈) | 'none' (纯底座杆) */
  attachment?: 'clamp' | 'ring' | 'none'
  /** 缩放比例 */
  scale?: number
}

/**
 * 高中物理力学/热学实验 - 铁架台组件 (LabStand)
 * 经典铸铁底座、竖直金属支杆、万向紧固螺母与铁夹/铁圈挂载位
 */
export const LabStand: React.FC<LabStandProps> = ({
  x,
  y,
  height = 240,
  baseWidth = 120,
  clampY = 160,
  attachment = 'clamp',
  scale = 1,
}) => {
  const rodWidth = 8
  const baseHeight = 16

  return (
    <g
      className="lab-stand"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 底座阴影 */}
      <ellipse
        cx={0}
        cy={3}
        rx={baseWidth / 2 + 4}
        ry={6}
        fill={withAlpha(CANVAS_COLORS.labelText, 0.15)}
      />

      {/* 重型铸铁底座 */}
      <path
        d={`
          M ${-baseWidth / 2} 0
          L ${-baseWidth / 2 + 10} ${-baseHeight}
          L ${baseWidth / 2 - 10} ${-baseHeight}
          L ${baseWidth / 2} 0
          Z
        `}
        fill="#334155"
        stroke="#1E293B"
        strokeWidth={1.5}
      />

      {/* 竖直金属固定杆 */}
      <rect
        x={-rodWidth / 2}
        y={-height}
        width={rodWidth}
        height={height - baseHeight}
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth={1}
      />
      {/* 金属高光 */}
      <line
        x1={-rodWidth / 2 + 2}
        y1={-height + 4}
        x2={-rodWidth / 2 + 2}
        y2={-baseHeight - 2}
        stroke="#F1F5F9"
        strokeWidth={1}
        opacity={0.8}
      />

      {/* 铁夹 / 铁圈挂载组件 (Attachment) */}
      {attachment !== 'none' && (
        <g transform={`translate(0, ${-clampY})`}>
          {/* 万向紧固螺母双顶丝 */}
          <rect x={-10} y={-10} width={20} height={20} rx={3} fill="#475569" stroke="#1E293B" strokeWidth={1} />
          <circle cx={-12} cy={0} r={4} fill="#64748B" />
          <circle cx={0} cy={-12} r={4} fill="#64748B" />

          {attachment === 'clamp' ? (
            /* 铁夹伸出臂与双爪 */
            <g className="stand-clamp">
              <rect x={10} y={-4} width={40} height={8} fill="#64748B" stroke="#334155" />
              {/* 上夹爪 */}
              <path d="M 50 -4 Q 65 -16 80 -12" fill="none" stroke="#475569" strokeWidth={3} strokeLinecap="round" />
              {/* 下夹爪 */}
              <path d="M 50 4 Q 65 16 80 12" fill="none" stroke="#475569" strokeWidth={3} strokeLinecap="round" />
            </g>
          ) : (
            /* 铁圈 (用于托举烧杯/网) */
            <g className="stand-ring">
              <rect x={10} y={-3} width={30} height={6} fill="#64748B" />
              <ellipse cx={60} cy={0} rx={25} ry={8} fill="none" stroke="#334155" strokeWidth={3} />
            </g>
          )}
        </g>
      )}
    </g>
  )
}
