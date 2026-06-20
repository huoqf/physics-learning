import React from 'react'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'
import { computeScale } from '@/utils/coordinate'

interface ForcePolygonProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: any
  theta: number
}

export const ForcePolygon: React.FC<ForcePolygonProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  theta,
}) => {
  const thetaRad = (theta * Math.PI) / 180
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)

  // 1. 矢量合成坐标起点 (大约在区域中心偏左下方，预留各矢量伸展空间)
  const cx = w * 0.4
  const cy = h * 0.65

  // 物理量到像素缩放
  const scale = computeScale(w, h, { xMin: -5, xMax: 5, yMin: -5, yMax: 5 })

  const m = 0.5
  const g = 9.8

  // 依次生成受力矢量的首尾节点坐标 (像素级)
  // 矢量 1: 重力 G (竖直向下，像素 y 变大)
  const gLen = m * g * scale
  const p0 = { x: cx, y: cy }
  const p1 = { x: p0.x, y: p0.y + gLen }

  // 矢量 2: 安培力 F_安 (水平向右为正，像素 x 变大)
  const faLen = physicsResult.F_ampere * scale
  const p2 = { x: p1.x + faLen, y: p1.y }

  // 矢量 3: 摩擦力 f (沿斜面向上为正，方向是 (cosθ, -sinθ) 像素坐标)
  const fLen = physicsResult.f * scale
  const p3 = {
    x: p2.x + fLen * cosT,
    y: p2.y - fLen * sinT,
  }

  // 矢量 4: 支持力 N (垂直斜面向左上方，方向是 (-sinθ, -cosθ) 像素坐标)
  const nLen = physicsResult.N * scale
  const p4 = {
    x: p3.x - nLen * sinT,
    y: p3.y - nLen * cosT,
  }

  // 计算闭合差 (合外力)
  const gapX = p0.x - p4.x
  const gapY = p0.y - p4.y
  const hasGap = Math.hypot(gapX, gapY) > 0.8
  const isEquilibrium = !hasGap

  // 自定义绘制箭头函数 (带颜色和线宽)
  const renderVectorLine = (
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label: string,
    labelPos: 'left' | 'right' | 'top' | 'bottom'
  ) => {
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < 1.5) return null

    const dx = (x2 - x1) / len
    const dy = (y2 - y1) / len

    // 箭头帽
    const headLen = 4
    const headW = 3
    const arrowX = x2
    const arrowY = y2

    const px = -dy
    const py = dx

    const capL = { x: x2 - dx * headLen + px * (headW / 2), y: y2 - dy * headLen + py * (headW / 2) }
    const capR = { x: x2 - dx * headLen - px * (headW / 2), y: y2 - dy * headLen - py * (headW / 2) }

    // 文本偏移
    let tx = x1 + (x2 - x1) / 2
    let ty = y1 + (y2 - y1) / 2
    if (labelPos === 'left') tx -= 8
    else if (labelPos === 'right') tx += 8
    else if (labelPos === 'top') ty -= 5
    else if (labelPos === 'bottom') ty += 7

    return (
      <g key={id}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <polygon points={`${arrowX},${arrowY} ${capL.x},${capL.y} ${capR.x},${capR.y}`} fill={color} />
        <text
          x={tx}
          y={ty}
          fontSize="6"
          fill={color}
          fontWeight="extrabold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      </g>
    )
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 多边形底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill={colors.neutral[50]}
        stroke={colors.neutral[200]}
        strokeWidth="1.2"
        rx="6"
      />
      <text
        x="12"
        y="15"
        fontSize="7.5"
        fill={colors.neutral[700]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        受力矢量多边形 (闭合)
      </text>

      {/* 状态指示文本 */}
      <text
        x={w - 12}
        y="15"
        fontSize="6.5"
        fill={isEquilibrium ? colors.success[600] : colors.danger[600]}
        fontWeight="bold"
        textAnchor="end"
        style={{ userSelect: 'none' }}
      >
        {isEquilibrium ? '● 平衡 (合力为0)' : '▲ 失稳 (合力非0)'}
      </text>

      {/* 矢量 1: 重力 G */}
      {renderVectorLine('g', p0.x, p0.y, p1.x, p1.y, PHYSICS_COLORS.gravity ?? colors.neutral[600], 'G', 'left')}

      {/* 矢量 2: 安培力 F_安 */}
      {renderVectorLine('fa', p1.x, p1.y, p2.x, p2.y, PHYSICS_COLORS.lorentzForce, 'F_安', 'bottom')}

      {/* 矢量 3: 摩擦力 f */}
      {renderVectorLine('f', p2.x, p2.y, p3.x, p3.y, PHYSICS_COLORS.friction, 'f', 'right')}

      {/* 矢量 4: 支持力 N */}
      {renderVectorLine('n', p3.x, p3.y, p4.x, p4.y, PHYSICS_COLORS.normalForce, 'N', 'top')}

      {/* 合力缺口 (如果不平衡，展示红色虚线闪烁矢量) */}
      {hasGap && (
        <g>
          {/* 带呼吸闪烁的红色虚线箭头 */}
          <line
            x1={p4.x}
            y1={p4.y}
            x2={p0.x}
            y2={p0.y}
            stroke={PHYSICS_COLORS.forceNet}
            strokeWidth="1.5"
            strokeDasharray="2,2"
            className="animate-pulse"
          />
          {renderVectorLine('f_net', p4.x, p4.y, p0.x, p0.y, PHYSICS_COLORS.forceNet, 'F_合', 'left')}
        </g>
      )}

      {/* 原点小圆圈以标明起始 */}
      <circle cx={p0.x} cy={p0.y} r="1.5" fill={colors.success[600]} />
    </g>
  )
}

export default ForcePolygon
