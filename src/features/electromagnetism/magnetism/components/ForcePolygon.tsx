import React, { useMemo } from 'react'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'
import { computeScale } from '@/utils/coordinate'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface ForcePolygonProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
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
  const g = GRAVITY

  // 构造适配局部像素空间的 sceneScale（originX/Y=0, scale=1，y 轴翻转由 VectorArrow 内部处理）
  const maxForce = Math.max(m * g, physicsResult.F_ampere, physicsResult.f, physicsResult.N, 1)
  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: w, height: h },
    originX: 0,
    originY: 0,
    worldWidth: w,
    worldHeight: h,
    refMagnitudes: {
      gravity: maxForce,
      lorentzForce: maxForce,
      friction: maxForce,
      normalForce: maxForce,
      force: maxForce,
    },
  }), [w, h, maxForce])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

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

  // 像素坐标 → VectorArrow 物理坐标：x 不变，y 取反（VectorArrow 内部 y↑）
  const toPhys = (px: number, py: number) => ({ x: px, y: -py })
  const vecBetween = (ax: number, ay: number, bx: number, by: number) => ({
    origin: toPhys(ax, ay),
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
      {(() => { const v = vecBetween(p0.x, p0.y, p1.x, p1.y); return v.origin && (
        <VectorArrow origin={v.origin} vector={v.vector} type="gravity" sceneScale={sceneScale}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.gravity ?? colors.neutral[600]} label="G" strokeWidth={1.6} />
      ) })()}

      {/* 矢量 2: 安培力 F_安 */}
      {(() => { const v = vecBetween(p1.x, p1.y, p2.x, p2.y); return v.origin && (
        <VectorArrow origin={v.origin} vector={v.vector} type="lorentzForce" sceneScale={sceneScale}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.lorentzForce} label="F_安" strokeWidth={1.6} />
      ) })()}

      {/* 矢量 3: 摩擦力 f */}
      {(() => { const v = vecBetween(p2.x, p2.y, p3.x, p3.y); return v.origin && (
        <VectorArrow origin={v.origin} vector={v.vector} type="friction" sceneScale={sceneScale}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.friction} label="f" strokeWidth={1.6} />
      ) })()}

      {/* 矢量 4: 支持力 N */}
      {(() => { const v = vecBetween(p3.x, p3.y, p4.x, p4.y); return v.origin && (
        <VectorArrow origin={v.origin} vector={v.vector} type="normalForce" sceneScale={sceneScale}
          pixelLength={v.pixelLength} color={PHYSICS_COLORS.normalForce} label="N" strokeWidth={1.6} />
      ) })()}

      {/* 合力缺口 (如果不平衡，展示红色虚线闪烁矢量) */}
      {hasGap && (() => { const v = vecBetween(p4.x, p4.y, p0.x, p0.y); return v.origin && (
        <g>
          <VectorArrow origin={v.origin} vector={v.vector} type="force" sceneScale={sceneScale}
            pixelLength={v.pixelLength} color={PHYSICS_COLORS.forceNet} label="F_合" strokeWidth={1.5} dashed />
        </g>
      ) })()}

      {/* 原点小圆圈以标明起始 */}
      <circle cx={p0.x} cy={p0.y} r="1.5" fill={colors.success[600]} />
    </g>
  )
}

export default ForcePolygon
