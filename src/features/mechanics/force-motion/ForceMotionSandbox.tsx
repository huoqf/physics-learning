import { useMemo } from 'react'
import { DASH, FONT, OPACITY, PHYSICS_COLORS, STROKE } from '@/theme/physics'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useCanvasSize } from '@/utils/useCanvasSize'
import type { ForceMotionState } from '@/physics'
import {
  FORCE_MOTION_OBJECT_SIZE_RATIO,
  FORCE_MOTION_SANDBOX_ORIGIN_X_RATIO,
  FORCE_MOTION_SANDBOX_ORIGIN_Y_RATIO,
  FORCE_MOTION_VECTOR_MAX_RATIO,
} from './forceMotionLayout'

interface ForceMotionSandboxProps {
  state: ForceMotionState
  trajectory: ForceMotionState[]
}

function vectorEnd(length: number, dx: number, dy: number) {
  const norm = Math.hypot(dx, dy)
  if (norm < 1e-6) return { x: 0, y: 0 }
  return { x: (dx / norm) * length, y: (dy / norm) * length }
}

function pathFrom(points: Array<{ cx: number; cy: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.cx.toFixed(1)} ${point.cy.toFixed(1)}`).join(' ')
}

export default function ForceMotionSandbox({ state, trajectory }: ForceMotionSandboxProps) {
  const [containerRef, size] = useCanvasSize({ width: 640, height: 320 })
  const { width, height } = size

  const view = useMemo(() => {
    const shortEdge = Math.max(1, Math.min(width, height))
    const objectSize = Math.max(FONT.large, shortEdge * FORCE_MOTION_OBJECT_SIZE_RATIO)
    const originX = width * FORCE_MOTION_SANDBOX_ORIGIN_X_RATIO
    const originY = height * FORCE_MOTION_SANDBOX_ORIGIN_Y_RATIO

    // 计算轨迹范围用于自动缩放
    const xValues = trajectory.map((point) => point.x)
    const yValues = trajectory.map((point) => -point.y)
    xValues.push(state.x)
    yValues.push(-state.y)

    const maxX = Math.max(1, ...xValues.map(Math.abs))
    const maxY = Math.max(1, ...yValues.map(Math.abs))

    // 自动缩放，留边距
    const scaleX = (width * 0.8) / maxX
    const scaleY = (height * 0.7) / maxY
    const scale = Math.max(0.1, Math.min(scaleX, scaleY))

    const body = physicsToCanvasWithOrigin(state.x, -state.y, originX, originY, scale)
    const track = trajectory.map((point) =>
      physicsToCanvasWithOrigin(point.x, -point.y, originX, originY, scale)
    )

    const vectorMax = shortEdge * FORCE_MOTION_VECTOR_MAX_RATIO

    // 三个矢量箭头（F合、v、a）
    const forceVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, Math.abs(state.F) * scale * 0.02)),
      state.Fx,
      state.Fy
    )
    const speedVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, state.v * scale * 0.12)),
      state.vx,
      state.vy
    )
    const accelVector = vectorEnd(
      Math.min(vectorMax, Math.max(FONT.labelBold, Math.abs(state.a) * scale * 0.08)),
      state.ax,
      state.ay
    )

    return {
      shortEdge,
      objectSize,
      originX,
      originY,
      scale,
      body,
      track,
      forceVector,
      speedVector,
      accelVector,
    }
  }, [height, state, trajectory, width])

  const trackPath = pathFrom(view.track)

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <svg width={width} height={height} className="w-full h-full select-none" role="img" aria-label="力与运动探究沙箱">
        <defs>
          {/* 合外力箭头 — 橙色 */}
          <marker id="fm-arrow-force" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          {/* 速度箭头 — 蓝色 */}
          <marker id="fm-arrow-velocity" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={PHYSICS_COLORS.velocity} />
          </marker>
          {/* 加速度箭头 — 红色 */}
          <marker id="fm-arrow-accel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>

        {/* 坐标网格 */}
        <g opacity={OPACITY.grid}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = width * 0.1 * i
            return <line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={height} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
          {Array.from({ length: 7 }, (_, i) => {
            const y = height * 0.15 * i
            return <line key={`hg-${i}`} x1={0} y1={y} x2={width} y2={y} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
        </g>

        {/* 坐标轴 */}
        <line x1={0} x2={width} y1={view.originY} y2={view.originY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        <line x1={view.originX} x2={view.originX} y1={0} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        {/* 轨迹线 */}
        {trackPath && (
          <path
            d={trackPath}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={STROKE.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
            opacity={OPACITY.trackHistory}
          />
        )}

        {/* 探究小球 */}
        <g transform={`translate(${view.body.cx} ${view.body.cy})`}>
          <circle
            r={view.objectSize * 0.5}
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 小球中心点 */}
          <circle r={2} fill={PHYSICS_COLORS.objectStroke} />
        </g>

        {/* 合外力矢量 F — 橙色 */}
        <line
          x1={view.body.cx}
          y1={view.body.cy}
          x2={view.body.cx + view.forceVector.x}
          y2={view.body.cy + view.forceVector.y}
          stroke={PHYSICS_COLORS.forceNet}
          strokeWidth={STROKE.vectorMain}
          markerEnd="url(#fm-arrow-force)"
        />
        <text
          x={view.body.cx + view.forceVector.x + FONT.small}
          y={view.body.cy + view.forceVector.y}
          fill={PHYSICS_COLORS.forceNet}
          fontSize={FONT.axis}
        >F</text>

        {/* 速度矢量 v — 蓝色 */}
        <line
          x1={view.body.cx}
          y1={view.body.cy}
          x2={view.body.cx + view.speedVector.x}
          y2={view.body.cy + view.speedVector.y}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.vectorSub}
          markerEnd="url(#fm-arrow-velocity)"
        />
        <text
          x={view.body.cx + view.speedVector.x + FONT.small}
          y={view.body.cy + view.speedVector.y}
          fill={PHYSICS_COLORS.velocity}
          fontSize={FONT.axis}
        >v</text>

        {/* 加速度矢量 a — 红色 */}
        <line
          x1={view.body.cx}
          y1={view.body.cy}
          x2={view.body.cx + view.accelVector.x}
          y2={view.body.cy + view.accelVector.y}
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.vectorSub}
          markerEnd="url(#fm-arrow-accel)"
        />
        <text
          x={view.body.cx + view.accelVector.x + FONT.small}
          y={view.body.cy + view.accelVector.y}
          fill={PHYSICS_COLORS.acceleration}
          fontSize={FONT.axis}
        >a</text>
      </svg>
    </div>
  )
}
