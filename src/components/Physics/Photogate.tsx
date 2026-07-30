import React from 'react'
import { SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface PhotogateProps {
  /** 光电门安装底座中心 X 坐标 */
  x: number
  /** 光电门底座底部 Y 坐标 */
  y: number
  /** U 型感应槽宽度 (px, 默认 40) */
  gap?: number
  /** 光电门立臂高度 (px, 默认 75) */
  height?: number
  /** 是否处于遮光感应触发状态 */
  isBlocked?: boolean
  /** 是否绘制虚线红外感应光束 */
  beamVisible?: boolean
  /** 缩放比例 */
  scale?: number
  /** 标签 (如 "光电门 A") */
  label?: string
}

/**
 * 高中物理力学实验 - 光电门传感器组件 (Photogate)
 * 渲染经典 U 型光电感应门，支持红外感应线、遮光 LED 指示灯与固定锁紧螺母
 */
export const Photogate: React.FC<PhotogateProps> = ({
  x,
  y,
  gap = 40,
  height = 75,
  isBlocked = false,
  beamVisible = true,
  scale = 1,
  label,
}) => {
  const armWidth = 14
  const baseThickness = 16
  const totalWidth = gap + armWidth * 2

  // 光束感应线 Y 坐标
  const beamY = -height + 25

  return (
    <g
      className="photogate"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 底部固定柱与锁紧旋钮 */}
      <rect
        x={-8}
        y={-baseThickness}
        width={16}
        height={baseThickness}
        fill="#334155"
        stroke="#1E293B"
      />
      <circle cx={0} cy={-baseThickness / 2} r={3} fill="#94A3B8" />

      {/* U 型光电门主体外壳 */}
      <path
        d={`
          M ${-totalWidth / 2} ${-baseThickness}
          L ${-totalWidth / 2} ${-height}
          L ${-totalWidth / 2 + armWidth} ${-height}
          L ${-totalWidth / 2 + armWidth} ${-baseThickness - 10}
          L ${totalWidth / 2 - armWidth} ${-baseThickness - 10}
          L ${totalWidth / 2 - armWidth} ${-height}
          L ${totalWidth / 2} ${-height}
          L ${totalWidth / 2} ${-baseThickness}
          Z
        `}
        fill={SCENE_COLORS.mechanicsApparatus.timerBody}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />

      {/* 左臂红外发射头 */}
      <rect
        x={-totalWidth / 2 + armWidth - 2}
        y={beamY - 4}
        width={4}
        height={8}
        fill="#EF4444"
        rx={1}
      />
      {/* 右臂红外接收头 */}
      <rect
        x={totalWidth / 2 - armWidth - 2}
        y={beamY - 4}
        width={4}
        height={8}
        fill="#22C55E"
        rx={1}
      />

      {/* 红外感应光束 */}
      {beamVisible && (
        <line
          x1={-totalWidth / 2 + armWidth}
          y1={beamY}
          x2={totalWidth / 2 - armWidth}
          y2={beamY}
          stroke={isBlocked ? '#EF4444' : '#DC2626'}
          strokeWidth={isBlocked ? 2 : 1}
          strokeDasharray={isBlocked ? 'none' : '3 2'}
          opacity={isBlocked ? 0.9 : 0.6}
        />
      )}

      {/* 顶端 LED 触发指示灯 */}
      <circle
        cx={-totalWidth / 2 + armWidth / 2}
        cy={-height + 8}
        r={3}
        fill={isBlocked ? '#EF4444' : '#64748B'}
      />
      <circle
        cx={-totalWidth / 2 + armWidth / 2}
        cy={-height + 8}
        r={4.5}
        fill="none"
        stroke={isBlocked ? withAlpha('#EF4444', 0.5) : 'none'}
        strokeWidth={1}
      />

      {/* 光电门标签名称 */}
      {label && (
        <text
          x={0}
          y={-baseThickness - 14}
          fill={CANVAS_COLORS.white}
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  )
}
