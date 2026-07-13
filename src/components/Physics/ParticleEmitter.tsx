import React from 'react'
import { useUniqueSvgId } from '@/hooks'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface ParticleEmitterProps {
  /** 发射口中心 X 像素坐标 */
  x: number
  /** 发射口中心 Y 像素坐标 */
  y: number
  /** 是否正在工作（工作时指示灯会亮起） */
  active?: boolean
  /** 当前粒子电性，决定发射指示灯和前端线圈的指示色 */
  chargeSign?: number
  /** 发射器宽度，默认 65 */
  width?: number
  /** 发射器高度，默认 36 */
  height?: number
}

/**
 * 通用粒子发射源组件。
 * 
 * 绘制高质感的粒子物理发射筒，包含指示灯和带电极性指示环。
 */
export const ParticleEmitter: React.FC<ParticleEmitterProps> = ({
  x,
  y,
  active = false,
  chargeSign = 1,
  width = 65,
  height = 36,
}) => {
  const gradId = useUniqueSvgId()
  const indicatorColor = chargeSign > 0 
    ? PHYSICS_COLORS.positiveCharge 
    : (chargeSign < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[400])

  // 计算缩放比例（基于默认尺寸）
  const defaultWidth = 65
  const defaultHeight = 36
  const scaleX = width / defaultWidth
  const scaleY = height / defaultHeight
  const scale = Math.min(scaleX, scaleY)

  return (
    <g className="select-none" transform={`translate(${x}, ${y}) scale(${scale})`}>
      <defs>
        {/* 发射筒金属渐变 */}
        <linearGradient id={`emitter-body-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.neutral[600]} />
          <stop offset="20%" stopColor={colors.neutral[400]} />
          <stop offset="40%" stopColor={colors.neutral[200]} />
          <stop offset="60%" stopColor={colors.neutral[300]} />
          <stop offset="80%" stopColor={colors.neutral[500]} />
          <stop offset="100%" stopColor={colors.neutral[700]} />
        </linearGradient>

        {/* 呼吸发光滤镜 */}
        <filter id={`glow-${gradId}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 后端固定支架 */}
      <rect
        x={-65}
        y={-8}
        width={15}
        height={16}
        rx={1}
        fill={colors.neutral[700]}
        stroke={colors.neutral[800]}
        strokeWidth={1}
      />
      <line
        x1={-65}
        y1={0}
        x2={0}
        y2={0}
        stroke={colors.neutral[500]}
        strokeWidth={4}
        strokeDasharray="4,4"
        opacity="0.3"
      />

      {/* 发射主体外壳 */}
      <rect
        x={-55}
        y={-18}
        width={35}
        height={36}
        rx={4}
        fill={`url(#emitter-body-${gradId})`}
        stroke={colors.neutral[700]}
        strokeWidth={1.5}
      />

      {/* 喷嘴部分 */}
      <path
        d={`M -20 -10 
           L -5 -7 
           A 3 3 0 0 1 0 -4
           L 0 4
           A 3 3 0 0 1 -5 7
           L -20 10 Z`}
        fill={`url(#emitter-body-${gradId})`}
        stroke={colors.neutral[700]}
        strokeWidth={1.2}
      />

      {/* 前端电极指示圈（指示发射粒子的性质） */}
      <rect
        x={-4}
        y={-6}
        width={4}
        height={12}
        rx={1}
        fill={indicatorColor}
        opacity={active ? 1 : 0.65}
        filter={active ? `url(#glow-${gradId})` : undefined}
      />

      {/* 机身工作状态指示灯 */}
      <circle
        cx={-38}
        cy={0}
        r={active ? 3.5 : 2.5}
        fill={active ? colors.success[500] : colors.danger[500]}
        filter={active ? `url(#glow-${gradId})` : undefined}
      />

      {/* 发射口阴影内部 */}
      <ellipse
        cx={0}
        cy={0}
        rx={1}
        ry={5}
        fill={colors.neutral[900]}
      />
    </g>
  )
}
