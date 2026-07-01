import React, { useMemo } from 'react'
import { SCENE_COLORS } from '@/theme/physics'

interface SpringProps {
  x1: number
  y1: number
  x2: number
  y2: number
  coils?: number          // 圈数，默认 12
  radius?: number         // 螺圈半径，默认 12px
  isLightWeight?: boolean // 是否为轻质弹簧 (若是，线宽减细，配色减淡)
  color?: string          // 可选颜色覆盖，为特定能量/力分析提供可能
  className?: string
}

export const Spring: React.FC<SpringProps> = ({
  x1,
  y1,
  x2,
  y2,
  coils = 12,
  radius = 12,
  isLightWeight = false,
  color,
  className = '',
}) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)

  const pathD = useMemo(() => {
    if (length <= 1) return ''

    const ux = dx / length
    const uy = dy / length
    const nx = -uy
    const ny = ux

    const points: string[] = []
    const steps = 200
    const rHelix = radius

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      
      // 两端平滑收口包络函数，使其平滑连接到端点
      let factor = 1
      if (t < 0.06) {
        factor = t / 0.06
      } else if (t > 0.94) {
        factor = (1 - t) / 0.06
      }

      const angle = 2 * Math.PI * coils * t
      // 三维螺旋线投影到 2D 平面
      // 沿轴向的螺旋位移 + 沿轴向的波动微扰（利用 sin 做透视收缩）
      const longDist = t * length + rHelix * Math.sin(angle) * 0.35 * factor
      // 垂直于轴向的螺圈高度波动
      const perpDist = rHelix * Math.cos(angle) * factor

      const px = x1 + longDist * ux + perpDist * nx
      const py = y1 + longDist * uy + perpDist * ny
      points.push(`${px.toFixed(1)},${py.toFixed(1)}`)
    }

    return `M ${points.join(' L ')}`
  }, [x1, y1, dx, dy, length, coils, radius])

  if (length <= 1) return null

  // 颜色定义
  const colorsToken = SCENE_COLORS.spring

  const strokeWidth = isLightWeight ? 1.4 : 2.4

  const strokeBorder = color 
    ? colorsToken.coilStroke 
    : (isLightWeight ? colorsToken.lightCoilStroke : colorsToken.coilStroke)

  const strokeBody = color 
    ? color 
    : (isLightWeight ? colorsToken.lightCoilBase : colorsToken.coilBase)

  const strokeHighlight = colorsToken.coilLight

  return (
    <g className={className}>
      {/* 1. 底层描边/暗部阴影 (Depth shadow) */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeBorder}
        strokeWidth={strokeWidth + 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2. 中层金属主体 (Core wire body) */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeBody}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3. 顶层高光亮线 (Specular highlight, 拟物精髓) */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeHighlight}
        strokeWidth={strokeWidth * 0.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </g>
  )
}

