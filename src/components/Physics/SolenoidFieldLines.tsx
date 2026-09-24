import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { bezierAt, bezierTangent, FieldArrow } from './magneticFieldUtils'

export interface SolenoidFieldLinesProps {
  /** 螺线管中心 x 坐标 (px) */
  x: number
  /** 螺线管中心 y 坐标 (px) */
  y: number
  /** 螺线管主体宽度 (px) */
  width: number
  /** 螺线管高度/管径 (px) */
  height: number
  /**
   * 回路电流（含正负符号，安培右手螺旋定则决定 N/S 极向与箭头流向）
   * current > 0: 左端为 N 极，右端为 S 极，内部磁场向左，外部磁场向右
   * current < 0: 右端为 N 极，左端为 S 极，内部磁场向右，外部磁场向左
   */
  current: number
  /** 归一化强度 [0, 1]，控制线条透明度与渐隐，默认跟随 |current| */
  intensity?: number
  /** 磁感线基准色，默认 PHYSICS_COLORS.magneticField ('#10B981') */
  lineColor?: string
  /** 自定义类名 */
  className?: string
}

/**
 * 通电螺线管/电感磁感应线组件 (符合高中物理教学规范)
 *
 * 核心物理特征：
 * 1. 内部为匀强密集平行磁感线，方向由 S 极指向 N 极；
 * 2. 外部为由 N 极发散、环绕绕回 S 极的平滑闭合磁感线；
 * 3. 内部中心轴线及外部回路上均标有矢量方向箭头；
 * 4. 电流为零时完全隐曜，电流反向时矢量箭头自洽反向。
 */
export const SolenoidFieldLines: React.FC<SolenoidFieldLinesProps> = ({
  x,
  y,
  width,
  height,
  current,
  intensity,
  lineColor = PHYSICS_COLORS.magneticField,
  className = '',
}) => {
  const level = intensity !== undefined ? intensity : Math.min(1, Math.abs(current))
  if (level < 0.03 || Math.abs(current) < 1e-4) return null

  const isLeftNorth = current > 0
  const ry = height / 2
  const xLeft = x - width / 2
  const xRight = x + width / 2
  const opacity = Math.min(1, Math.max(0.2, level * 0.95))

  // 内部平行磁感线配置（y 偏置比例）
  const internalYOffsets = [0, ry * 0.4, -ry * 0.4, ry * 0.75, -ry * 0.75]

  // 外部闭合磁感线层级配置（膨胀跨度与外扩距离）
  const externalLayers = [
    { yRatio: 0.5, dx: 36, dy: 24, strokeW: 1.2, arrow: true },
    { yRatio: 0.75, dx: 58, dy: 46, strokeW: 1.0, arrow: true },
    { yRatio: 0.9, dx: 86, dy: 72, strokeW: 0.8, arrow: false },
  ]

  const arrowSize = 4.2
  // 内部箭头角度：左N则内部向左(180°)，右N则内部向右(0°)
  const internalArrowAngle = isLeftNorth ? 180 : 0

  return (
    <g className={`solenoid-field-lines ${className}`} pointerEvents="none" opacity={opacity}>
      {/* ── 1. 螺线管内部匀强磁感线（实线、平行贯通）── */}
      {internalYOffsets.map((dy, idx) => (
        <line
          key={`internal-line-${idx}`}
          x1={xLeft}
          y1={y + dy}
          x2={xRight}
          y2={y + dy}
          stroke={lineColor}
          strokeWidth={idx === 0 ? 1.5 : 1.1}
          opacity={idx === 0 ? 0.95 : 0.75}
        />
      ))}

      {/* 内部中心轴线方向箭头 */}
      <FieldArrow
        cx={x}
        cy={y}
        angle={internalArrowAngle}
        size={arrowSize * 1.1}
        color={lineColor}
        opacity={0.95}
      />

      {/* ── 2. 外部发散闭合磁感线（三次贝塞尔闭合环）── */}
      {externalLayers.map((layer, idx) => {
        const yOff = ry * layer.yRatio

        // 上半部回路与下半部回路
        return [-1, 1].map((dir) => {
          const cyBase = y + dir * yOff
          const dyOut = dir * (ry + layer.dy)

          // 贝塞尔曲线端点与控制点：
          // 若左端为 N 极：曲线从左端出发 (p0)，向左向外拱出 (p1, p2)，回到右端 S 极 (p3)
          // 若右端为 N 极：曲线从右端出发 (p0)，向右向外拱出 (p1, p2)，回到左端 S 极 (p3)
          const p0x = isLeftNorth ? xLeft : xRight
          const p0y = cyBase
          const p1x = isLeftNorth ? xLeft - layer.dx : xRight + layer.dx
          const p1y = y + dyOut
          const p2x = isLeftNorth ? xRight + layer.dx : xLeft - layer.dx
          const p2y = y + dyOut
          const p3x = isLeftNorth ? xRight : xLeft
          const p3y = cyBase

          const pathD = `M ${p0x} ${p0y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`

          // 外部顶弧箭头（t = 0.5 处）
          let arrowElem: React.ReactNode = null
          if (layer.arrow) {
            const ax = bezierAt(0.5, p0x, p1x, p2x, p3x)
            const ay = bezierAt(0.5, p0y, p1y, p2y, p3y)
            const tdx = bezierTangent(0.5, p0x, p1x, p2x, p3x)
            const tdy = bezierTangent(0.5, p0y, p1y, p2y, p3y)
            const angleDeg = (Math.atan2(tdy, tdx) * 180) / Math.PI

            arrowElem = (
              <FieldArrow
                key={`ext-arrow-${idx}-${dir}`}
                cx={ax}
                cy={ay}
                angle={angleDeg}
                size={arrowSize}
                color={lineColor}
                opacity={0.88}
              />
            )
          }

          return (
            <React.Fragment key={`ext-group-${idx}-${dir}`}>
              <path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth={layer.strokeW}
                strokeDasharray="5 3"
                opacity={0.65}
              />
              {arrowElem}
            </React.Fragment>
          )
        })
      })}
    </g>
  )
}
