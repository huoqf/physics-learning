import React from 'react'
import { SCENE_COLORS, CANVAS_COLORS, PHYSICS_COLORS, withAlpha } from '@/theme/physics'

export interface VernierCaliperProps {
  /** 游标卡尺外壳左上角 X 坐标 */
  x: number
  /** 游标卡尺外壳左上角 Y 坐标 */
  y: number
  /** 当前测量读数 (单位: mm, 例如 23.45) */
  measuredValue: number
  /** 游标卡尺分度数: 10分度 (0.1mm) | 20分度 (0.05mm) | 50分度 (0.02mm) */
  division?: 10 | 20 | 50
  /** 缩放比例 */
  scale?: number
  /** 是否开启游标对齐线特写 */
  showMagnifier?: boolean
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理高考实验 - 游标卡尺组件 (VernierCaliper)
 * 精密渲染主尺与滑动游标尺，支持 10/20/50 分度估读对齐显示
 */
export const VernierCaliper: React.FC<VernierCaliperProps> = ({
  x,
  y,
  measuredValue,
  division = 20,
  scale = 1,
  showMagnifier = false,
  fontFamily = 'monospace, sans-serif',
}) => {
  // 精度划分
  const precisionMap = { 10: 0.1, 20: 0.05, 50: 0.02 }
  const precision = precisionMap[division]

  // 主尺毫米数 (整数部分)
  const mainScaleMm = Math.floor(measuredValue)
  // 游标对齐格数 N
  const vernierIndex = Math.round((measuredValue - mainScaleMm) / precision)

  // 渲染尺寸计算 (1mm = 3.5px 渲染比例)
  const pxPerMm = 3.5
  const vernierOffsetPx = measuredValue * pxPerMm

  const caliperBody = SCENE_COLORS.materials.structStrokePale
  const caliperBorder = SCENE_COLORS.materials.structStrokeMid
  const caliperJaw = SCENE_COLORS.materials.structStrokeLight
  const caliperVernier = SCENE_COLORS.materials.structFillPale

  return (
    <g
      className="vernier-caliper"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 游标卡尺 - 主尺 (Main Scale) */}
      <g className="main-scale">
        <rect
          x={0}
          y={0}
          width={320}
          height={32}
          fill={caliperBody}
          stroke={caliperBorder}
          strokeWidth={1.2}
          rx={2}
        />
        {/* 内/外测量外爪静态部分 */}
        <path
          d="M 0 32 L 0 90 L 15 90 L 30 32 Z"
          fill={caliperJaw}
          stroke={caliperBorder}
          strokeWidth={1}
        />
        <path
          d="M 0 0 L 0 -40 L 12 -40 L 25 0 Z"
          fill={caliperJaw}
          stroke={caliperBorder}
          strokeWidth={1}
        />

        {/* 主尺毫米刻度线 (0 ~ 80 mm) */}
        {Array.from({ length: 81 }).map((_, mm) => {
          const posX = 30 + mm * pxPerMm
          const isCm = mm % 10 === 0
          const is5mm = mm % 5 === 0

          return (
            <g key={mm}>
              <line
                x1={posX}
                y1={32}
                x2={posX}
                y2={32 - (isCm ? 14 : is5mm ? 10 : 6)}
                stroke={CANVAS_COLORS.strokeDark}
                strokeWidth={isCm ? 1.2 : 0.8}
              />
              {isCm && (
                <text
                  x={posX}
                  y={12}
                  fill={CANVAS_COLORS.labelText}
                  fontSize={9}
                  fontFamily={fontFamily}
                  textAnchor="middle"
                >
                  {mm / 10}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* 游标卡尺 - 滑动游标尺 (Vernier Scale) */}
      <g className="vernier-scale" transform={`translate(${30 + vernierOffsetPx}, 0)`}>
        {/* 游标卡尺动爪 */}
        <path
          d="M 0 32 L 0 90 L -15 90 L -2 32 Z"
          fill={caliperJaw}
          stroke={caliperBorder}
          strokeWidth={1}
        />
        {/* 游标框 */}
        <rect
          x={-10}
          y={26}
          width={130}
          height={38}
          fill={caliperVernier}
          stroke={caliperBorder}
          strokeWidth={1.2}
          rx={3}
        />
        {/* 紧固螺钉 */}
        <circle cx={40} cy={18} r={5} fill={caliperBorder} stroke={CANVAS_COLORS.strokeDark} />

        {/* 游标刻度线 (根据 10/20/50 分度绘制) */}
        {Array.from({ length: division + 1 }).map((_, i) => {
          // 游标 20 分度总长为 19mm (每格 0.95mm)
          const vernierStepPx = ((division - 1) / division) * pxPerMm
          const lineX = i * vernierStepPx
          const isAligned = i === vernierIndex

          return (
            <g key={i}>
              <line
                x1={lineX}
                y1={32}
                x2={lineX}
                y2={32 + (i % 5 === 0 ? 12 : 7)}
                stroke={isAligned ? PHYSICS_COLORS.alertRed : CANVAS_COLORS.labelText}
                strokeWidth={isAligned ? 1.8 : 0.8}
              />
              {i % 5 === 0 && (
                <text
                  x={lineX}
                  y={54}
                  fill={isAligned ? PHYSICS_COLORS.alertRed : CANVAS_COLORS.labelTextLight}
                  fontSize={8}
                  fontWeight={isAligned ? 'bold' : 'normal'}
                  fontFamily={fontFamily}
                  textAnchor="middle"
                >
                  {i}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* 读数结果特写与对齐线 */}
      {showMagnifier && (
        <g className="vernier-alignment-highlight" transform="translate(160, -45)">
          <rect
            x={-45}
            y={-16}
            width={90}
            height={26}
            rx={4}
            fill={withAlpha(CANVAS_COLORS.labelText, 0.92)}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1}
          />
          <text x={0} y={1} fill={PHYSICS_COLORS.velocity} fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily={fontFamily}>
            {measuredValue.toFixed(2)} mm
          </text>
        </g>
      )}
    </g>
  )
}
