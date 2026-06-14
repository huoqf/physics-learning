import React, { useId } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface RailsProps {
  type: 'horizontal' | 'inclined' | 'side-view'
  theta?: number // 倾角，度（进阶模式使用）
  length?: number // 导轨长度
  spacing?: number // 导轨间距
  width?: number // 画布宽
  height?: number // 画布高
  cx?: number
  cy?: number
  L?: number // 物理有效长度 L
}

export const Rails: React.FC<RailsProps> = ({
  type,
  theta = 30,
  length = 400,
  spacing = 100,
  width = 500,
  height = 300,
  cx,
  cy,
  L = 4.0,
}) => {
  const uniqueId = useId().replace(/:/g, '-')
  const gradientId = `rails-grad-${uniqueId}`

  if (type === 'side-view') {
    // 2D 侧视斜劈：展示倾角 theta 的三角形
    const pad = 40
    // 斜面底角在左下方，斜坡向右上方倾斜
    const x0 = pad
    const y0 = height - pad
    const maxW = width - 2 * pad
    const maxH = height - 2 * pad
    
    const thetaRad = (theta * Math.PI) / 180
    const d = maxW
    let h = d * Math.tan(thetaRad)
    if (h > maxH) {
      h = maxH
    }
    const rightX = x0 + d
    const topY = y0 - h
    
    return (
      <g>
        <defs>
          {/* 侧视斜劈金属/塑料质感渐变 */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.neutral[50]} />
            <stop offset="100%" stopColor={colors.neutral[300]} />
          </linearGradient>
        </defs>
        {/* 斜劈填充 */}
        <polygon
          points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
          fill={`url(#${gradientId})`}
          stroke={colors.neutral[400]} // slate-400
          strokeWidth="2"
        />
        {/* 斜面顶部高光边 */}
        <line
          x1={x0}
          y1={y0}
          x2={rightX}
          y2={topY}
          stroke={colors.neutral[0]}
          strokeWidth="1.5"
          opacity="0.8"
          pointerEvents="none"
        />
        {/* 倾角弧线与标注 */}
        {theta > 0 && (
          <g transform={`translate(${x0}, ${y0})`}>
            <path
              d={`M 50 0 A 50 50 0 0 0 ${50 * Math.cos(thetaRad)} ${-50 * Math.sin(thetaRad)}`}
              fill="none"
              stroke={PHYSICS_COLORS.axis}
              strokeWidth="2"
            />
            <text
              x={60}
              y={-12}
              fontSize="12"
              fill={PHYSICS_COLORS.labelTextLight}
              fontWeight="bold"
            >
              θ = {theta.toFixed(0)}°
            </text>
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图
    const scaleL = 0.5 + L * 0.125
    const dx = 60 * scaleL
    const dy = 40 * scaleL
    const shadowGradId = `rails-shadow-grad-${uniqueId}`

    return (
      <g>
        <defs>
          {/* 斜面半透明渐变阴影 */}
          <linearGradient id={shadowGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary[500]} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colors.primary[500]} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* 支撑架和地面 */}
        <line x1="80" y1="280" x2="520" y2="280" stroke={colors.neutral[300]} strokeWidth="2" strokeDasharray="4,4" />
        
        {/* 斜面阴影/填充（半透明，增加立体感） */}
        <polygon
          points={`120,230 420,130 ${420 + dx},${130 + dy} ${120 + dx},${230 + dy}`}
          fill={`url(#${shadowGradId})`}
        />

        {/* 导轨1（后侧）- 3层线宽叠加实现圆柱质感 */}
        <line x1="120" y1="230" x2="420" y2="130" stroke={colors.neutral[800]} strokeWidth="8" strokeLinecap="round" />
        <line x1="120" y1="230" x2="420" y2="130" stroke={colors.neutral[600]} strokeWidth="6" strokeLinecap="round" />
        <line x1="120" y1="229.2" x2="420" y2="129.2" stroke={colors.neutral[0]} strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
        {/* 导轨1透视切面端盖 */}
        <ellipse cx="120" cy="230" rx="3.5" ry="2" transform="rotate(-18, 120, 230)" fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth="1" />
        <ellipse cx="420" cy="130" rx="3.5" ry="2" transform="rotate(-18, 420, 130)" fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
        
        {/* 导轨1支撑架 */}
        <rect x="417" y="278" width="6" height="3" fill={colors.neutral[600]} rx="0.5" />
        <line x1="420" y1="130" x2="420" y2="280" stroke={colors.neutral[600]} strokeWidth="4" />
        <line x1="421.2" y1="130" x2="421.2" y2="280" stroke={colors.neutral[400]} strokeWidth="1.5" opacity="0.6" />

        {/* 导轨2（前侧）- 3层线宽叠加实现圆柱质感 */}
        <line x1={120 + dx} y1={230 + dy} x2={420 + dx} y2={130 + dy} stroke={colors.neutral[800]} strokeWidth="8" strokeLinecap="round" />
        <line x1={120 + dx} y1={230 + dy} x2={420 + dx} y2={130 + dy} stroke={colors.neutral[600]} strokeWidth="6" strokeLinecap="round" />
        <line x1={120 + dx} y1={229.2 + dy} x2={420 + dx} y2={129.2 + dy} stroke={colors.neutral[0]} strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
        {/* 导轨2透视切面端盖 */}
        <ellipse cx={120 + dx} cy={230 + dy} rx="3.5" ry="2" transform={`rotate(-18, ${120 + dx}, ${230 + dy})`} fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth="1" />
        <ellipse cx={420 + dx} cy={130 + dy} rx="3.5" ry="2" transform={`rotate(-18, ${420 + dx}, ${130 + dy})`} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
        
        {/* 导轨2支撑架 */}
        <rect x={420 + dx - 3} y="278" width="6" height="3" fill={colors.neutral[600]} rx="0.5" />
        <line x1={420 + dx} y1={130 + dy} x2={420 + dx} y2={280} stroke={colors.neutral[600]} strokeWidth="4" />
        <line x1={420 + dx + 1.2} y1={130 + dy} x2={420 + dx + 1.2} y2={280} stroke={colors.neutral[400]} strokeWidth="1.5" opacity="0.6" />
      </g>
    )
  }

  // 默认：horizontal 平面导轨
  const baseCx = cx ?? width / 2
  const baseCy = cy ?? height / 2
  const y1 = baseCy - spacing / 2
  const y2 = baseCy + spacing / 2
  const x1 = baseCx - length / 2
  const x2 = x1 + length

  const railGradId = `horizontal-rail-grad-${uniqueId}`
  const bgGradId = `horizontal-bg-grad-${uniqueId}`

  return (
    <g>
      <defs>
        {/* 底座微渐变 */}
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.neutral[50]} />
          <stop offset="100%" stopColor={colors.neutral[100]} />
        </linearGradient>
        {/* 轨道圆柱体 3D 渐变 */}
        <linearGradient id={railGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.neutral[700]} />
          <stop offset="25%" stopColor={colors.neutral[500]} />
          <stop offset="50%" stopColor={colors.neutral[200]} />
          <stop offset="75%" stopColor={colors.neutral[600]} />
          <stop offset="100%" stopColor={colors.neutral[800]} />
        </linearGradient>
      </defs>
      
      {/* 导轨架背景 */}
      <rect
        x={x1 - 20}
        y={y1 - 30}
        width={length + 40}
        height={spacing + 60}
        fill={`url(#${bgGradId})`}
        rx="10"
        stroke={colors.neutral[200]}
        strokeWidth="1.5"
      />
      <rect
        x={x1 - 19}
        y={y1 - 29}
        width={length + 38}
        height={spacing + 58}
        fill="none"
        stroke={colors.neutral[0]}
        strokeWidth="1.5"
        rx="9"
      />

      {/* 导轨 1 */}
      <rect x={x1} y={y1 - 3.5} width={length} height={8} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity="0.1" rx="4" />
      <rect x={x1} y={y1 - 4} width={length} height={8} fill={`url(#${railGradId})`} rx="4" />
      <line x1={x1 + 1} y1={y1 - 2} x2={x2 - 1} y2={y1 - 2} stroke={colors.neutral[0]} strokeWidth="0.8" opacity="0.75" />
      <circle cx={x1} cy={y1} r="4" fill={colors.neutral[500]} stroke={colors.neutral[800]} strokeWidth="1" />
      <circle cx={x2} cy={y1} r="4" fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />

      {/* 导轨 2 */}
      <rect x={x1} y={y2 - 3.5} width={length} height={8} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity="0.1" rx="4" />
      <rect x={x1} y={y2 - 4} width={length} height={8} fill={`url(#${railGradId})`} rx="4" />
      <line x1={x1 + 1} y1={y2 - 2} x2={x2 - 1} y2={y2 - 2} stroke={colors.neutral[0]} strokeWidth="0.8" opacity="0.75" />
      <circle cx={x1} cy={y2} r="4" fill={colors.neutral[500]} stroke={colors.neutral[800]} strokeWidth="1" />
      <circle cx={x2} cy={y2} r="4" fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
    </g>
  )
}

export default Rails
