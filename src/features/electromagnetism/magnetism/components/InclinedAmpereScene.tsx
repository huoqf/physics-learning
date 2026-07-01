import React, { useMemo } from 'react'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { Rails } from '@/components/Physics/Rails'
import { ConductingRod } from '@/components/Physics/ConductingRod'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface InclinedAmpereSceneProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  bFieldDir?: number
  font?: (size: number) => number
}

type Point = { x: number; y: number }

const VIEW_W = 500
const VIEW_H = 300
const EFFECTIVE_L = 4.0

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const normalize = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-6) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

const pointOnRail = (layout: ReturnType<typeof getInclinedLayout>, k: number, frontRatio = 0): Point => ({
  x: layout.rail1StartX + layout.railDx * k + layout.dx * frontRatio,
  y: layout.rail1StartY + layout.railDy * k + layout.dy * frontRatio,
})

const getDisplaySlopeAngleDeg = (theta: number) => {
  // 透视主视图对真实倾角做压缩：默认 θ=30° 基本保持旧版观感，
  // 但导轨、垂直斜面磁场、滑动箭头会使用同一屏幕倾角，避免几何不一致。
  return clamp(theta * 0.55 + 2, 8, 25)
}

const getInclinedLayout = (L: number, theta: number) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL
  const displayAngleRad = (getDisplaySlopeAngleDeg(theta) * Math.PI) / 180
  const railDx = 300
  const railDy = -railDx * Math.tan(displayAngleRad)

  return {
    rail1StartX: 120,
    rail1StartY: 230,
    rail1EndX: 120 + railDx,
    rail1EndY: 230 + railDy,
    railDx,
    railDy,
    dx,
    dy,
  }
}

const describeBField = (B: number, bFieldDir: number) => {
  if (Math.abs(B) < 1e-4) return '无磁场'
  if (bFieldDir === 0) return B > 0 ? '竖直向上' : '竖直向下'
  if (bFieldDir === 1) return B > 0 ? '垂直斜面向外' : '垂直斜面向内'
  return B > 0 ? '水平向右' : '水平向左'
}

const describeAmpereForce = (physicsResult: AdvancedAmperePhysicsResult, bFieldDir: number) => {
  if (Math.abs(physicsResult.F_ampere) < 1e-4) return 'F_安 = 0'
  if (bFieldDir === 0) return physicsResult.F_ampere > 0 ? 'F_安 水平向右' : 'F_安 水平向左'
  if (bFieldDir === 1) return physicsResult.F_ampere > 0 ? 'F_安 沿斜面向上' : 'F_安 沿斜面向下'
  return physicsResult.F_ampere > 0 ? 'F_安 竖直向上' : 'F_安 竖直向下'
}

interface ScreenArrowProps {
  start: Point
  direction: Point
  length: number
  color: string
  label: string
  fontSize: number
  strokeWidth?: number
  dashed?: boolean
  opacity?: number
}

const ScreenArrow: React.FC<ScreenArrowProps> = ({
  start,
  direction,
  length,
  color,
  label,
  fontSize,
  strokeWidth = 2.4,
  dashed = false,
  opacity = 1,
}) => {
  if (length < 1e-3) return null
  const dir = normalize(direction)
  const end = { x: start.x + dir.x * length, y: start.y + dir.y * length }
  const lineEnd = { x: start.x + dir.x * Math.max(0, length - 8), y: start.y + dir.y * Math.max(0, length - 8) }
  const angleDeg = (Math.atan2(dir.y, dir.x) * 180) / Math.PI
  const textAnchor = dir.x > 0.25 ? 'start' : dir.x < -0.25 ? 'end' : 'middle'

  return (
    <g opacity={opacity} style={{ filter: `drop-shadow(0 0 2px ${withAlpha(color, 0.35)})` }}>
      <line
        x1={start.x}
        y1={start.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? '5,4' : undefined}
      />
      <g transform={`translate(${end.x}, ${end.y}) rotate(${angleDeg})`}>
        <polygon points="0,0 -9,-4.5 -9,4.5" fill={color} />
      </g>
      <text
        x={end.x + dir.x * 10}
        y={end.y + dir.y * 10}
        fontSize={fontSize}
        fill={color}
        fontWeight="extrabold"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}

export const InclinedAmpereScene: React.FC<InclinedAmpereSceneProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
  bFieldDir = 0,
  font = (s) => s,
}) => {
  const scaleX = w / VIEW_W
  const scaleY = h / VIEW_H
  const scale = Math.min(scaleX, scaleY)

  const layout = useMemo(() => getInclinedLayout(EFFECTIVE_L, theta), [theta])
  const slopeUnit = useMemo(() => normalize({ x: layout.railDx, y: layout.railDy }), [layout.railDx, layout.railDy])
  const normalUnit = useMemo(() => normalize({ x: slopeUnit.y, y: -slopeUnit.x }), [slopeUnit])

  // 导体棒物理位移 [-1.1, 1.1] 映射为 3D 比例 (0-1)
  const rodRatio = useMemo(() => {
    const xMin = -1.1
    const xMax = 1.1
    return clamp((physicsResult.x - xMin) / (xMax - xMin), 0, 1)
  }, [physicsResult.x])

  const hasField = Math.abs(B) > 1e-4

  const bPositiveUnit = useMemo<Point>(() => {
    if (bFieldDir === 0) return { x: 0, y: -1 }
    if (bFieldDir === 1) return normalUnit
    return { x: 1, y: 0 }
  }, [bFieldDir, normalUnit])

  // 磁场作用区域固定包裹导轨和导体棒；切换磁场方向时只改变内部磁感线箭头方向。
  const magneticField3D = useMemo(() => {
    if (!hasField) return null

    const boxVector = { x: -44, y: -86 }
    const fieldLineLength = 58
    const fieldLineVector = { x: bPositiveUnit.x * fieldLineLength, y: bPositiveUnit.y * fieldLineLength }

    const pointsBottom = [
      pointOnRail(layout, 0.14, 0.04),
      pointOnRail(layout, 0.86, 0.04),
      pointOnRail(layout, 0.86, 0.96),
      pointOnRail(layout, 0.14, 0.96),
    ]

    const baseLines = [
      pointOnRail(layout, 0.26, 0.18),
      pointOnRail(layout, 0.44, 0.50),
      pointOnRail(layout, 0.62, 0.82),
      pointOnRail(layout, 0.36, 0.82),
      pointOnRail(layout, 0.66, 0.20),
    ].map((p) => ({ x: p.x + boxVector.x * 0.45, y: p.y + boxVector.y * 0.45 }))

    const pointsTop = pointsBottom.map((p) => ({ x: p.x + boxVector.x, y: p.y + boxVector.y }))

    const toPoly = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')
    const labelAnchor = pointOnRail(layout, 0.62, 0.52)

    return {
      polyBottom: toPoly(pointsBottom),
      polyTop: toPoly(pointsTop),
      polyLeft: toPoly([pointsBottom[0], pointsTop[0], pointsTop[3], pointsBottom[3]]),
      polyRight: toPoly([pointsBottom[1], pointsTop[1], pointsTop[2], pointsBottom[2]]),
      polyBack: toPoly([pointsBottom[0], pointsTop[0], pointsTop[1], pointsBottom[1]]),
      polyFront: toPoly([pointsBottom[3], pointsTop[3], pointsTop[2], pointsBottom[2]]),
      baseLines,
      fieldLineVector,
      label: {
        x: clamp(labelAnchor.x + boxVector.x * 0.55 + 20, 75, 430),
        y: clamp(labelAnchor.y + boxVector.y * 0.72 - 2, 24, 250),
      },
    }
  }, [bPositiveUnit, hasField, layout])

  const rodBack = pointOnRail(layout, rodRatio, 0)
  const rodFront = pointOnRail(layout, rodRatio, 1)
  const rodCenter = { x: (rodBack.x + rodFront.x) / 2, y: (rodBack.y + rodFront.y) / 2 }

  const ampereDirection = useMemo<Point | null>(() => {
    const sign = Math.sign(physicsResult.F_ampere)
    if (sign === 0) return null
    if (bFieldDir === 0) return { x: sign, y: 0 }
    if (bFieldDir === 1) return { x: slopeUnit.x * sign, y: slopeUnit.y * sign }
    // 水平磁场模式下 F_ampere 的正方向为竖直向上，SVG 屏幕 y 向下为正。
    return { x: 0, y: -sign }
  }, [bFieldDir, physicsResult.F_ampere, slopeUnit])

  const ampereArrowLength = clamp(22 + Math.sqrt(Math.abs(physicsResult.F_ampere)) * 10, 24, 58)
  const motionSign = Math.sign(physicsResult.a)
  const motionDirection = motionSign === 0 ? null : { x: slopeUnit.x * motionSign, y: slopeUnit.y * motionSign }
  const motionStart = { x: rodCenter.x + normalUnit.x * 24, y: rodCenter.y + normalUnit.y * 24 }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 3D 场景背景卡片底板 */}
      <rect x="0" y="0" width={w} height={h} fill="none" stroke="none" />
      <text
        x="20"
        y="22"
        fontSize={font(9)}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        3D 场景展示 (斜坡)
      </text>

      {/* 3D 物理核心场景（以 500×300 为基准缩放） */}
      <g transform={`scale(${scale})`}>
        {/* 磁场包围盒后表面 */}
        {magneticField3D && (
          <g>
            <polygon points={magneticField3D.polyBack} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.05" />
            <polygon points={magneticField3D.polyLeft} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.04" />
          </g>
        )}

        {/* 3D 导轨架：与 theta 联动 */}
        <Rails type="inclined" theta={theta} width={VIEW_W} height={VIEW_H} L={EFFECTIVE_L} />

        {/* 磁场包围盒前表面与磁感线 */}
        {magneticField3D && (
          <g>
            <polygon
              points={magneticField3D.polyTop}
              fill={PHYSICS_COLORS.magneticField}
              fillOpacity="0.08"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
            <polygon
              points={magneticField3D.polyFront}
              fill={PHYSICS_COLORS.magneticField}
              fillOpacity="0.06"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />

            {magneticField3D.baseLines.map((line, idx) => {
              const isBPositive = B > 0
              const halfVector = {
                x: magneticField3D.fieldLineVector.x / 2,
                y: magneticField3D.fieldLineVector.y / 2,
              }
              const xStart = isBPositive ? line.x - halfVector.x : line.x + halfVector.x
              const yStart = isBPositive ? line.y - halfVector.y : line.y + halfVector.y
              const xEnd = isBPositive ? line.x + halfVector.x : line.x - halfVector.x
              const yEnd = isBPositive ? line.y + halfVector.y : line.y - halfVector.y
              const angleDeg = (Math.atan2(yEnd - yStart, xEnd - xStart) * 180) / Math.PI

              return (
                <g key={idx}>
                  <line
                    x1={xStart}
                    y1={yStart}
                    x2={xEnd}
                    y2={yEnd}
                    stroke={PHYSICS_COLORS.magneticField}
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                    opacity="0.65"
                  />
                  <g transform={`translate(${xEnd}, ${yEnd}) rotate(${angleDeg})`}>
                    <polygon points="0,0 -4.5,-2.2 -4.5,2.2" fill={PHYSICS_COLORS.magneticField} opacity="0.85" />
                  </g>
                </g>
              )
            })}

            <text
              x={magneticField3D.label.x}
              y={magneticField3D.label.y}
              fontSize={font(7) / scale}
              fill={PHYSICS_COLORS.magneticField}
              fontWeight="extrabold"
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              B = {Math.abs(B).toFixed(1)} T · {describeBField(B, bFieldDir)}
            </text>
          </g>
        )}

        {/* 3D 导体棒 */}
        <ConductingRod
          type="inclined"
          x={rodRatio}
          theta={theta}
          currentDir={I > 0 ? 'in' : I < 0 ? 'out' : 'none'}
          L={EFFECTIVE_L}
          width={VIEW_W}
          height={VIEW_H}
        />

        {/* 主场景中的关键状态箭头：安培力方向 + 失稳滑动方向 */}
        {ampereDirection && (
          <ScreenArrow
            start={rodCenter}
            direction={ampereDirection}
            length={ampereArrowLength}
            color={PHYSICS_COLORS.lorentzForce}
            label="F_安"
            fontSize={font(8) / scale}
            strokeWidth={2.6}
          />
        )}
        {motionDirection && Math.abs(physicsResult.a) > 0.05 && (
          <ScreenArrow
            start={motionStart}
            direction={motionDirection}
            length={42}
            color={PHYSICS_COLORS.acceleration}
            label="a"
            fontSize={font(7) / scale}
            strokeWidth={2.4}
            dashed
            opacity={0.92}
          />
        )}

        {/* 小提示：把主视图方向与侧视受力图状态对齐 */}
        <g transform={`translate(${clamp(rodCenter.x - 48, 24, 375)}, ${clamp(rodCenter.y + 34, 34, 270)})`}>
          <rect
            x="0"
            y="0"
            width="96"
            height="17"
            rx="5"
            fill={withAlpha(PHYSICS_COLORS.lorentzForce, 0.08)}
            stroke={withAlpha(PHYSICS_COLORS.lorentzForce, 0.24)}
            strokeWidth="0.8"
          />
          <text
            x="48"
            y="11.5"
            fontSize={font(6.3) / scale}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            {describeAmpereForce(physicsResult, bFieldDir)}
          </text>
        </g>
      </g>

      {/* 平衡/滑动提示标语 */}
      <g transform="translate(20, 265)">
        {physicsResult.state === 'equilibrium' ? (
          <g>
            <rect x="0" y="0" width="102" height="15" fill={withAlpha(PHYSICS_COLORS.forceNet, 0.12)} stroke={withAlpha(PHYSICS_COLORS.forceNet, 0.35)} strokeWidth="0.8" rx="4" />
            <text x="51" y="10" fontSize={font(7)} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ✓ 导体棒静止平衡
            </text>
          </g>
        ) : (
          <g>
            <rect x="0" y="0" width="112" height="15" fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)} stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)} strokeWidth="0.8" rx="4" />
            <text x="56" y="10" fontSize={font(7)} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="extrabold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ⚠ {physicsResult.state === 'sliding-up' ? '往斜面上滑中' : '往斜面下滑中'}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

export default InclinedAmpereScene
