import { VectorArrow, DragHandle } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

import type { SceneScale } from '@/scene'
import type { VectorAdditionPhysicsData } from './useVectorAdditionPhysics'

interface VectorTriangleProps {
  physicsData: VectorAdditionPhysicsData
  sceneScale: SceneScale
  isPlaying: boolean
  onDragStart: (target: 'f1' | 'f2', e: React.PointerEvent) => void
}

export function VectorTriangle({ physicsData, sceneScale, isPlaying, onDragStart }: VectorTriangleProps) {
  const { origin, f1End, fResultantEnd, f2ShiftedStart, f2ShiftedEnd } = physicsData

  return (
    <>
      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: f1End.cx - origin.cx, y: -(f1End.cy - origin.cy) }}
        type="appliedForce" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
        pixelLength={Math.hypot(f1End.cx - origin.cx, f1End.cy - origin.cy)} />
      <text x={f1End.cx} y={f1End.cy + 18} fontSize={CANVAS_STYLE.font.label}
        fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.appliedForce}
        fontWeight="bold" textAnchor="middle">F₁</text>

      <DragHandle cx={f1End.cx} cy={f1End.cy} color={PHYSICS_COLORS.appliedForce}
        cursor="ew-resize" onPointerDown={(e) => onDragStart('f1', e)} />

      <DragHandle cx={f2ShiftedEnd.cx} cy={f2ShiftedEnd.cy} color={PHYSICS_COLORS.tension}
        cursor="grab" onPointerDown={(e) => onDragStart('f2', e)} />

      <VectorArrow originPixel={{ x: f2ShiftedStart.cx, y: f2ShiftedStart.cy }}
        vector={{ x: f2ShiftedEnd.cx - f2ShiftedStart.cx, y: -(f2ShiftedEnd.cy - f2ShiftedStart.cy) }}
        type="tension" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
        pixelLength={Math.hypot(f2ShiftedEnd.cx - f2ShiftedStart.cx, f2ShiftedEnd.cy - f2ShiftedStart.cy)} />
      <text x={f2ShiftedEnd.cx + (f2ShiftedEnd.cx > f2ShiftedStart.cx ? 8 : -16)}
        y={f2ShiftedEnd.cy - 8} fontSize={CANVAS_STYLE.font.label}
        fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.tension}
        fontWeight="bold" textAnchor={f2ShiftedEnd.cx > f2ShiftedStart.cx ? "start" : "end"}>F₂</text>

      {isPlaying && (
        <line x1={origin.cx} y1={origin.cy} x2={f1End.cx} y2={f1End.cy}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.guide}
          opacity={CANVAS_STYLE.opacity.guide}
          strokeDasharray={CANVAS_STYLE.dash.guide.join(',')} />
      )}

      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: fResultantEnd.cx - origin.cx, y: -(fResultantEnd.cy - origin.cy) }}
        type="force" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorMain}
        pixelLength={Math.hypot(fResultantEnd.cx - origin.cx, fResultantEnd.cy - origin.cy)} />
      <text x={fResultantEnd.cx + 8} y={fResultantEnd.cy - 8}
        fontSize={CANVAS_STYLE.font.labelBold} fontFamily={CANVAS_STYLE.font.family}
        fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F</text>
    </>
  )
}
