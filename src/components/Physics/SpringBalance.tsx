import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface SpringBalanceProps {
  /** 测力计顶部挂环 X 坐标 */
  x: number
  /** 测力计顶部挂环 Y 坐标 */
  y: number
  /** 当前受到并显示的拉力 (单位: N) */
  force: number
  /** 满量程拉力 (N, 默认 5N) */
  maxForce?: number
  /** 测力计方向: 'vertical' (竖直) | 'horizontal' (水平) */
  orientation?: 'vertical' | 'horizontal'
  /** 缩放比例 */
  scale?: number
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理高考实验 - 弹簧测力计组件 (SpringBalance)
 * 精密渲染刻度面板、内部拉伸弹簧、指针与下端拉力挂钩
 */
export const SpringBalance: React.FC<SpringBalanceProps> = ({
  x,
  y,
  force,
  maxForce = 5,
  orientation = 'vertical',
  scale = 1,
  fontFamily = 'monospace, sans-serif',
}) => {
  const isVert = orientation === 'vertical'

  // 外壳尺寸
  const bodyW = 28
  const bodyH = 140

  // 内部弹簧拉伸位移比例 (0.2N ~ maxForce)
  const stretchRatio = Math.min(1, Math.max(0, force / maxForce))
  const pointerOffsetPx = stretchRatio * (bodyH - 40)

  return (
    <g
      className="spring-balance"
      transform={`translate(${x}, ${y}) scale(${scale}) ${isVert ? '' : 'rotate(-90)'}`}
    >
      {/* 顶部固定拉环 */}
      <circle cx={0} cy={-12} r={10} fill="none" stroke="#64748B" strokeWidth={2.5} />
      <rect x={-4} y={-4} width={8} height={6} fill="#475569" />

      {/* 外壳主体阴影 */}
      <rect
        x={-bodyW / 2 + 2}
        y={2}
        width={bodyW}
        height={bodyH}
        rx={4}
        fill={withAlpha(CANVAS_COLORS.labelText, 0.15)}
      />

      {/* 测力计透明/半透明外壳 */}
      <rect
        x={-bodyW / 2}
        y={0}
        width={bodyW}
        height={bodyH}
        rx={4}
        fill="rgba(241, 245, 249, 0.85)"
        stroke="#64748B"
        strokeWidth={1.5}
      />

      {/* 内部拉伸弹簧 */}
      <path
        d={`
          M 0 10
          L 4 14 L -4 18 L 4 22 L -4 26 L 4 30 L -4 34
          L 0 ${38 + pointerOffsetPx}
        `}
        fill="none"
        stroke={SCENE_COLORS.spring.coilBase}
        strokeWidth={1.8}
      />

      {/* 面板刻度线与数字 (0 ~ maxForce N) */}
      {Array.from({ length: maxForce * 5 + 1 }).map((_, i) => {
        const val = i * 0.2
        const posY = 38 + (val / maxForce) * (bodyH - 40)
        const isMajor = i % 5 === 0

        return (
          <g key={i}>
            <line
              x1={-bodyW / 2 + 2}
              y1={posY}
              x2={-bodyW / 2 + (isMajor ? 10 : 5)}
              y2={posY}
              stroke={CANVAS_COLORS.labelText}
              strokeWidth={isMajor ? 1 : 0.6}
            />
            {isMajor && (
              <text
                x={-bodyW / 2 + 12}
                y={posY + 3}
                fill={CANVAS_COLORS.labelText}
                fontSize={8}
                fontFamily={fontFamily}
              >
                {val}
              </text>
            )}
          </g>
        )
      })}

      {/* 红色指针 (Pointer) */}
      <g transform={`translate(0, ${38 + pointerOffsetPx})`}>
        <polygon points="-12,0 -4,-4 -4,4" fill="#DC2626" />
        <line x1={-4} y1={0} x2={10} y2={0} stroke="#DC2626" strokeWidth={2} />
      </g>

      {/* 底部挂钩与连接拉杆 */}
      <g transform={`translate(0, ${bodyH})`}>
        <line x1={0} y1={0} x2={0} y2={12 + pointerOffsetPx * 0.2} stroke="#475569" strokeWidth={2} />
        <path
          d={`M 0 ${12 + pointerOffsetPx * 0.2} C 12 ${20 + pointerOffsetPx * 0.2}, 12 ${
            32 + pointerOffsetPx * 0.2
          }, 0 ${36 + pointerOffsetPx * 0.2}`}
          fill="none"
          stroke="#475569"
          strokeWidth={2.5}
        />
      </g>

      {/* 单位标注 "N" */}
      <text
        x={bodyW / 2 - 8}
        y={18}
        fill={PHYSICS_COLORS.elasticForce}
        fontSize={10}
        fontWeight="bold"
        fontFamily={fontFamily}
      >
        N
      </text>
    </g>
  )
}
