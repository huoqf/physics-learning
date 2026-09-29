import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface SpringBalanceProps {
  /** 测力计挂环或挂钩基准点 X 坐标 */
  x: number
  /** 测力计挂环或挂钩基准点 Y 坐标 */
  y: number
  /** 当前受到并显示的拉力 (单位: N) */
  force: number
  /** 满量程拉力 (N, 默认 5N) */
  maxForce?: number
  /** 测力计方向: 'vertical' (竖直) | 'horizontal' (水平) */
  orientation?: 'vertical' | 'horizontal'
  /** 自定义旋转角度 (度数，顺时针)。若传入则优先于 orientation */
  angle?: number
  /** 定位锚点：'ring' (顶部挂环, 默认) | 'hook' (底部挂钩，便于多力共点实验) */
  anchor?: 'ring' | 'hook'
  /** 缩放比例 */
  scale?: number
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理高考实验 - 弹簧测力计组件 (SpringBalance)
 * 精密渲染刻度面板、高质感内部真实拉伸螺旋弹簧、指针与下端拉力挂钩。
 * 支持任意角度旋转以及以挂钩为锚点（用于力的平行四边形定则二力合成实验）。
 */
export const SpringBalance: React.FC<SpringBalanceProps> = ({
  x,
  y,
  force,
  maxForce = 5,
  orientation = 'vertical',
  angle,
  anchor = 'ring',
  scale = 1,
  fontFamily = 'monospace, sans-serif',
}) => {
  // 外壳尺寸
  const bodyW = 28
  const bodyH = 140

  // 内部弹簧拉伸位移比例 (0 ~ maxForce)
  const stretchRatio = Math.min(1, Math.max(0, force / maxForce))
  const pointerOffsetPx = stretchRatio * (bodyH - 40)

  // 真实拉伸螺旋弹簧路径生成
  const springStartY = 10
  const springEndY = 38 + pointerOffsetPx
  const springLength = springEndY - springStartY
  const springCoils = 9
  const springRadius = 5.5

  const springPath = React.useMemo(() => {
    const points: string[] = [`0,${springStartY}`]
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      let factor = 1
      if (t < 0.08) factor = t / 0.08
      else if (t > 0.92) factor = (1 - t) / 0.08
      const py = springStartY + t * springLength
      const px = Math.sin(2 * Math.PI * springCoils * t) * springRadius * factor
      points.push(`${px.toFixed(1)},${py.toFixed(1)}`)
    }
    return `M ${points.join(' L ')}`
  }, [springLength])

  // 计算旋转变换
  const rotDeg = angle != null ? angle : orientation === 'vertical' ? 0 : -90
  const hookOffsetY = bodyH + 36 + pointerOffsetPx * 0.2
  const anchorTranslate = anchor === 'hook' ? `translate(0, ${-hookOffsetY})` : ''

  const ringStroke = SCENE_COLORS.materials.structStrokeMid
  const frameFill = withAlpha(SCENE_COLORS.materials.structBgLight, 0.88)
  const hookStroke = SCENE_COLORS.materials.structStrokeDark
  const pointerColor = PHYSICS_COLORS.alertRed

  return (
    <g
      className="spring-balance"
      transform={`translate(${x}, ${y}) scale(${scale}) rotate(${rotDeg}) ${anchorTranslate}`}
    >
      {/* 顶部固定拉环 */}
      <circle cx={0} cy={-12} r={10} fill="none" stroke={ringStroke} strokeWidth={2.5} />
      <rect x={-4} y={-4} width={8} height={6} fill={hookStroke} />

      {/* 外壳主体阴影 */}
      <rect
        x={-bodyW / 2 + 2}
        y={2}
        width={bodyW}
        height={bodyH}
        rx={4}
        fill={withAlpha(CANVAS_COLORS.labelText, 0.12)}
      />

      {/* 测力计透明/半透明外壳 */}
      <rect
        x={-bodyW / 2}
        y={0}
        width={bodyW}
        height={bodyH}
        rx={4}
        fill={frameFill}
        stroke={ringStroke}
        strokeWidth={1.5}
      />

      {/* 内部真实拉伸螺旋弹簧 */}
      <path
        d={springPath}
        fill="none"
        stroke={SCENE_COLORS.spring.coilStroke}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={springPath}
        fill="none"
        stroke={SCENE_COLORS.spring.coilBase}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
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

      {/* 指针 (Pointer) */}
      <g transform={`translate(0, ${38 + pointerOffsetPx})`}>
        <polygon points="-12,0 -4,-4 -4,4" fill={pointerColor} />
        <line x1={-4} y1={0} x2={10} y2={0} stroke={pointerColor} strokeWidth={2} />
      </g>

      {/* 底部挂钩与连接拉杆 */}
      <g transform={`translate(0, ${bodyH})`}>
        <line x1={0} y1={0} x2={0} y2={12 + pointerOffsetPx * 0.2} stroke={hookStroke} strokeWidth={2} />
        <path
          d={`M 0 ${12 + pointerOffsetPx * 0.2} C 12 ${20 + pointerOffsetPx * 0.2}, 12 ${
            32 + pointerOffsetPx * 0.2
          }, 0 ${36 + pointerOffsetPx * 0.2}`}
          fill="none"
          stroke={hookStroke}
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
