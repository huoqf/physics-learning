import React from 'react'
import { CANVAS_COLORS } from '@/theme/physics'
import { createRulerTicks, calculateNiceStep } from '@/utils/ruler'

export interface LabRulerProps {
  /** 刻度尺左上角 X 坐标 */
  x: number
  /** 刻度尺左上角 Y 坐标 */
  y: number
  /** 刻度尺渲染长度 (px) */
  length: number
  /** 刻度尺宽度 (px, 默认 30) */
  height?: number
  /** 物理刻度范围 [cmStart, cmEnd] (单位: cm, 默认 [0, 10]) */
  domain?: [number, number]
  /** 刻度尺方向: 'horizontal' | 'vertical' */
  orientation?: 'horizontal' | 'vertical'
  /** 是否开启局部放大镜读数特写 */
  showMagnifier?: boolean
  /** 放大镜聚焦的相对物理位置或 px 位置 (px) */
  magnifierPos?: number
  /** 放大镜倍率 (默认 2.2) */
  magnifierZoom?: number
  /** 材质风格: 'transparent' (亚克力透明) | 'wood' (木质) | 'steel' (钢尺) */
  styleType?: 'transparent' | 'wood' | 'steel'
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理力学实验 - 毫米刻度尺组件 (LabRuler)
 * 渲染标准毫米/厘米刻度直尺，包含 Nice-Step 自适应刻度与局部放大镜读数特写
 */
export const LabRuler: React.FC<LabRulerProps> = ({
  x,
  y,
  length,
  height = 30,
  domain = [0, 10],
  orientation = 'horizontal',
  showMagnifier = false,
  magnifierPos,
  magnifierZoom = 2.2,
  styleType = 'transparent',
  fontFamily = 'monospace, sans-serif',
}) => {
  const isHoriz = orientation === 'horizontal'
  const [cmStart, cmEnd] = domain
  const totalCm = cmEnd - cmStart

  // 计算 Nice-step 刻度
  const { tickInterval, minorTicks } = calculateNiceStep([cmStart, cmEnd], length, 12)
  const ticks = createRulerTicks([cmStart, cmEnd], tickInterval, minorTicks)

  // 材质颜色
  const bgFill =
    styleType === 'transparent'
      ? 'rgba(241, 245, 249, 0.75)'
      : styleType === 'wood'
      ? '#FDE68A'
      : '#E2E8F0'

  const borderStroke =
    styleType === 'wood' ? '#D97706' : styleType === 'steel' ? '#64748B' : '#94A3B8'

  return (
    <g
      className="lab-ruler"
      transform={`translate(${x}, ${y})`}
    >
      {/* 尺身主体 */}
      <rect
        x={0}
        y={0}
        width={isHoriz ? length : height}
        height={isHoriz ? height : length}
        fill={bgFill}
        stroke={borderStroke}
        strokeWidth={1}
        rx={2}
      />

      {/* 毫米/厘米刻度线 */}
      {ticks.map((tick, i) => {
        const ratio = (tick.value - cmStart) / (totalCm || 1)
        const pos = ratio * length

        if (pos < 0 || pos > length) return null

        const isCmMajor = !tick.isMinor
        const markLen = isCmMajor ? 12 : 6

        return (
          <g key={i}>
            {isHoriz ? (
              <>
                <line
                  x1={pos}
                  y1={0}
                  x2={pos}
                  y2={markLen}
                  stroke={CANVAS_COLORS.labelText}
                  strokeWidth={isCmMajor ? 1.2 : 0.8}
                />
                {isCmMajor && (
                  <text
                    x={pos}
                    y={height - 6}
                    fill={CANVAS_COLORS.labelText}
                    fontSize={10}
                    fontFamily={fontFamily}
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                )}
              </>
            ) : (
              <>
                <line
                  x1={0}
                  y1={pos}
                  x2={markLen}
                  y2={pos}
                  stroke={CANVAS_COLORS.labelText}
                  strokeWidth={isCmMajor ? 1.2 : 0.8}
                />
                {isCmMajor && (
                  <text
                    x={height - 6}
                    y={pos + 3}
                    fill={CANVAS_COLORS.labelText}
                    fontSize={10}
                    fontFamily={fontFamily}
                    textAnchor="end"
                  >
                    {tick.label}
                  </text>
                )}
              </>
            )}
          </g>
        )
      })}

      {/* 单位标注 "cm" */}
      <text
        x={isHoriz ? length - 14 : height / 2}
        y={isHoriz ? height / 2 + 3 : length - 8}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={9}
        fontWeight="bold"
        fontFamily={fontFamily}
        textAnchor="middle"
      >
        cm
      </text>

      {/* 局部放大镜特写 (Magnifier) */}
      {showMagnifier && magnifierPos !== undefined && (
        <g
          className="ruler-magnifier"
          transform={`translate(${isHoriz ? magnifierPos : height / 2}, ${
            isHoriz ? height / 2 : magnifierPos
          })`}
        >
          {/* 放大镜光晕与透镜 */}
          <circle
            cx={0}
            cy={0}
            r={24 * magnifierZoom * 0.5}
            fill="rgba(255, 255, 255, 0.95)"
            stroke="#374151"
            strokeWidth={2}
          />
          {/* 光效反射斜纹 */}
          <path
            d={`M -15 -10 A 20 20 0 0 1 10 -15`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={2.5}
          />
          {/* 对齐中心游标准线 */}
          <line
            x1={0}
            y1={-20}
            x2={0}
            y2={20}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="2 1"
          />
        </g>
      )}
    </g>
  )
}
