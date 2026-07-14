import { VectorArrow } from '@/components/Physics'
import React from 'react'
import { colors } from '@/theme/colors'
import { CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'
import { computeScale } from '@/utils/coordinate'

import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface ForcePolygonProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  theta: number
  font?: (size: number) => number
}

export const ForcePolygon: React.FC<ForcePolygonProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  theta,
  font = (s) => s,
}) => {
  const thetaRad = (theta * Math.PI) / 180
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)

  // 1. 矢量合成坐标起点，先用初始比例定位，再动态居中并缩放防溢出
  const m = 0.5
  const g = GRAVITY
  const F_max = Math.max(
    m * g,
    Math.abs(physicsResult.F_ampere),
    Math.abs(physicsResult.f),
    Math.abs(physicsResult.N),
    5.0
  )
  const rawScale = computeScale(w, h, { xMin: -F_max, xMax: F_max, yMin: -F_max, yMax: F_max })

  // 以初始比例计算链条，用于定位起点
  const initCx = w * 0.4
  const initCy = h * 0.65
  const initGLen = m * g * rawScale
  const initP0 = { x: initCx, y: initCy }
  const initP1 = { x: initP0.x, y: initP0.y + initGLen }
  const initP2 = {
    x: initP1.x + physicsResult.F_ampere_x * rawScale,
    y: initP1.y - physicsResult.F_ampere_y * rawScale,
  }
  const initP3 = {
    x: initP2.x + physicsResult.f * rawScale * cosT,
    y: initP2.y - physicsResult.f * rawScale * sinT,
  }
  const initP4 = {
    x: initP3.x - physicsResult.N * rawScale * sinT,
    y: initP3.y - physicsResult.N * rawScale * cosT,
  }

  // 计算初始链条包围盒，将起点平移到使链条居中
  const allPts = [initP0, initP1, initP2, initP3, initP4]
  let minTX = Infinity, maxTX = -Infinity, minTY = Infinity, maxTY = -Infinity
  for (const pt of allPts) {
    if (pt.x < minTX) minTX = pt.x
    if (pt.x > maxTX) maxTX = pt.x
    if (pt.y < minTY) minTY = pt.y
    if (pt.y > maxTY) maxTY = pt.y
  }
  const cx = initCx + (w / 2 - (minTX + maxTX) / 2)
  const cy = initCy + (h / 2 - (minTY + maxTY) / 2)

  // 包围盒检测：计算各点相对起点的位移，缩小缩放比防止溢出
  const PAD = 12
  // 各段位移（物理坐标 × rawScale），用于检测可用空间
  const displacements = [
    { dx: 0, dy: 0 },
    { dx: 0, dy: m * g * rawScale },
    { dx: physicsResult.F_ampere_x * rawScale, dy: -physicsResult.F_ampere_y * rawScale },
    { dx: physicsResult.f * rawScale * cosT, dy: -physicsResult.f * rawScale * sinT },
    { dx: -physicsResult.N * rawScale * sinT, dy: -physicsResult.N * rawScale * cosT },
  ]
  // 累积位移
  let cumDx = 0, cumDy = 0
  let shrink = 1
  for (const d of displacements) {
    cumDx += d.dx
    cumDy += d.dy
    if (cumDx > 0) shrink = Math.min(shrink, (w - PAD - cx) / cumDx)
    else if (cumDx < 0) shrink = Math.min(shrink, (cx - PAD) / (-cumDx))
    if (cumDy > 0) shrink = Math.min(shrink, (h - PAD - cy) / cumDy)
    else if (cumDy < 0) shrink = Math.min(shrink, (cy - PAD) / (-cumDy))
  }
  const scale = rawScale * Math.min(shrink, 1)

  // 最终链条节点坐标
  const gLen = m * g * scale
  const p0 = { x: cx, y: cy }
  const p1 = { x: p0.x, y: p0.y + gLen }
  const p2 = {
    x: p1.x + physicsResult.F_ampere_x * scale,
    y: p1.y - physicsResult.F_ampere_y * scale,
  }
  const p3 = {
    x: p2.x + physicsResult.f * scale * cosT,
    y: p2.y - physicsResult.f * scale * sinT,
  }
  const p4 = {
    x: p3.x - physicsResult.N * scale * sinT,
    y: p3.y - physicsResult.N * scale * cosT,
  }

  // 计算真实合外力：从首尾相接多边形的起点 p0 指向终点 p4
  const resultantX = p4.x - p0.x
  const resultantY = p4.y - p0.y
  const hasGap = Math.hypot(resultantX, resultantY) > 0.8
  const isEquilibrium = !hasGap

  // 像素坐标 → VectorArrow 像素坐标：x 不变，y 不取反（originDesign 直接传像素坐标）
  const vecBetween = (ax: number, ay: number, bx: number, by: number) => ({
    originDesign: { x: ax, y: ay },
    vector: { x: bx - ax, y: -(by - ay) },
    pixelLength: Math.hypot(bx - ax, by - ay),
  })

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 多边形底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="none"
        stroke="none"
      />
      <text
        x="12"
        y="15"
        fontSize={font(7.5)}
        fill={CANVAS_COLORS.strokeDark}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        受力矢量多边形 (闭合)
      </text>

      {/* 状态指示文本 */}
      <text
        x={w - 12}
        y="15"
        fontSize={font(6.5)}
        fill={isEquilibrium ? colors.success[600] : colors.danger[600]}
        fontWeight="bold"
        textAnchor="end"
        style={{ userSelect: 'none' }}
      >
        {isEquilibrium ? '● 平衡 (合力为0)' : '▲ 失稳 (合力非0)'}
      </text>

      {/* 矢量 1: 重力 G */}
      {(() => { const v = vecBetween(p0.x, p0.y, p1.x, p1.y); return v.originDesign && (
        <VectorArrow originDesign={v.originDesign} vector={v.vector} type="gravity" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.gravity ?? CANVAS_COLORS.labelTextLight} label="G" strokeWidth={1.6} font={font} />
      ) })()}

      {/* 矢量 2: 安培力 F_安 */}
      {(() => { const v = vecBetween(p1.x, p1.y, p2.x, p2.y); return v.originDesign && (
        <VectorArrow originDesign={v.originDesign} vector={v.vector} type="lorentzForce" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.lorentzForce} label="F_安" strokeWidth={1.6} font={font} />
      ) })()}

      {/* 矢量 3: 摩擦力 f */}
      {(() => { const v = vecBetween(p2.x, p2.y, p3.x, p3.y); return v.originDesign && (
        <VectorArrow originDesign={v.originDesign} vector={v.vector} type="friction" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.friction} label="f" strokeWidth={1.6} font={font} />
      ) })()}

      {/* 矢量 4: 支持力 N */}
      {(() => { const v = vecBetween(p3.x, p3.y, p4.x, p4.y); return v.originDesign && (
        <VectorArrow originDesign={v.originDesign} vector={v.vector} type="normalForce" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.normalForce} label="N" strokeWidth={1.6} font={font} />
      ) })()}

      {/* 真实合外力：方案 B，箭头从多边形起点指向终点 */}
      {hasGap && (() => { const v = vecBetween(p0.x, p0.y, p4.x, p4.y); return v.originDesign && (
        <g>
          <VectorArrow originDesign={v.originDesign} vector={v.vector} type="force" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={v.pixelLength} color={PHYSICS_COLORS.forceNet} label="F_合" strokeWidth={1.5} dashed font={font} />
        </g>
      ) })()}

      {/* 原点小圆圈以标明起始 */}
      <circle cx={p0.x} cy={p0.y} r="1.5" fill={colors.success[600]} />
    </g>
  )
}

export default ForcePolygon
