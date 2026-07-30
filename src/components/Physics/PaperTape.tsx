import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface PaperTapeProps {
  /** 纸带左上角 X 坐标 */
  x: number
  /** 纸带左上角 Y 坐标 */
  y: number
  /** 纸带长度 (px) */
  width: number
  /** 纸带高度 (px，默认 24) */
  height?: number
  /** 打点相对 X 坐标点集 (px) */
  dots: number[]
  /** 是否显示点集序号标签 (0, 1, 2, ...) */
  showLabels?: boolean
  /** 高亮区段 [startIndex, endIndex]，用于逐差法或位移片段标注 */
  highlightInterval?: [number, number]
  /** 区段标注文本 (如 "x₁") */
  highlightLabel?: string
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理力学实验 - 打点纸带组件 (PaperTape)
 * 渲染带打点墨迹、序号标注及逐差法位移高亮片段的 SVG 纸带
 */
export const PaperTape: React.FC<PaperTapeProps> = ({
  x,
  y,
  width,
  height = 24,
  dots,
  showLabels = true,
  highlightInterval,
  highlightLabel,
  fontFamily = 'sans-serif',
}) => {
  const { tapeBg, tapeBorder, tapeDotActive, tapeDotHistory } = SCENE_COLORS.mechanicsApparatus

  // 获取高亮区段起止 X 坐标
  let hlStartX: number | undefined
  let hlEndX: number | undefined
  if (highlightInterval && dots.length > highlightInterval[1]) {
    const rawStart = dots[highlightInterval[0]]
    const rawEnd = dots[highlightInterval[1]]
    hlStartX = Math.min(rawStart, rawEnd)
    hlEndX = Math.max(rawStart, rawEnd)
  }

  return (
    <g className="paper-tape" transform={`translate(${x}, ${y})`}>
      {/* 纸带主片底色 */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={tapeBg}
        stroke={tapeBorder}
        strokeWidth={1}
        rx={2}
      />

      {/* 逐差法/位移段高亮区域 (包含防压盖背景 Tag 标签) */}
      {hlStartX !== undefined && hlEndX !== undefined && (
        <g className="highlight-interval">
          <rect
            x={hlStartX}
            y={2}
            width={Math.max(0, hlEndX - hlStartX)}
            height={height - 4}
            fill={withAlpha(PHYSICS_COLORS.displacement, 0.15)}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            rx={2}
          />
          {/* 逐差法高亮 Label 胶囊标签 (显示在纸带上方，避免与点序号及直尺重叠) */}
          {highlightLabel && (
            <g transform={`translate(${(hlStartX + hlEndX) / 2}, -16)`}>
              <rect
                x={-70}
                y={-11}
                width={140}
                height={16}
                rx={4}
                fill="#0F172A"
                opacity={0.88}
                stroke={PHYSICS_COLORS.displacement}
                strokeWidth={1}
              />
              <text
                x={0}
                y={1}
                fill="#38BDF8"
                fontSize={10}
                fontWeight="bold"
                fontFamily={fontFamily}
                textAnchor="middle"
              >
                {highlightLabel}
              </text>
            </g>
          )}
        </g>
      )}

      {/* 纸带打点 */}
      {dots.map((dotX, index) => {
        // 限制在纸带区域内渲染
        if (dotX < 0 || dotX > width) return null

        const isLatest = index === dots.length - 1
        const dotColor = isLatest ? tapeDotActive : tapeDotHistory
        const dotRadius = isLatest ? 2.5 : 2.0

        return (
          <g key={index}>
            {/* 打点墨迹 */}
            <circle
              cx={dotX}
              cy={height / 2}
              r={dotRadius}
              fill={dotColor}
            />
            {/* 打点细微散墨圈，提升拟真度 */}
            <circle
              cx={dotX}
              cy={height / 2}
              r={dotRadius + 1.2}
              fill="none"
              stroke={withAlpha(dotColor, 0.3)}
              strokeWidth={0.6}
            />
            {/* 点序号标注 */}
            {showLabels && (
              <text
                x={dotX}
                y={-4}
                fill={CANVAS_COLORS.labelTextLight}
                fontSize={9}
                fontFamily={fontFamily}
                textAnchor="middle"
              >
                {index}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
