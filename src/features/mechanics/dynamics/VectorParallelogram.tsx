import { VectorArrow, DragHandle } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

import type { SceneScale } from '@/scene'
import type { VectorAdditionPhysicsData } from './useVectorAdditionPhysics'

interface VectorParallelogramProps {
  physicsData: VectorAdditionPhysicsData
  sceneScale: SceneScale
  onDragStart: (target: 'f1' | 'f2', e: React.PointerEvent) => void
}

export function VectorParallelogram({ physicsData, sceneScale, onDragStart }: VectorParallelogramProps) {
  const { origin, f1End, f2End, fResultantEnd, f1ToResultant, f2ToResultant } = physicsData

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

      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: f2End.cx - origin.cx, y: -(f2End.cy - origin.cy) }}
        type="tension" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
        pixelLength={Math.hypot(f2End.cx - origin.cx, f2End.cy - origin.cy)} />
      <text x={f2End.cx + (f2End.cx > origin.cx ? 8 : -16)} y={f2End.cy - 8}
        fontSize={CANVAS_STYLE.font.label} fontFamily={CANVAS_STYLE.font.family}
        fill={PHYSICS_COLORS.tension} fontWeight="bold"
        textAnchor={f2End.cx > origin.cx ? "start" : "end"}>F₂</text>

      <DragHandle cx={f2End.cx} cy={f2End.cy} color={PHYSICS_COLORS.tension}
        cursor="grab" onPointerDown={(e) => onDragStart('f2', e)} />

      <line x1={f1ToResultant.x1} y1={f1ToResultant.y1} x2={f1ToResultant.x2} y2={f1ToResultant.y2}
        stroke={PHYSICS_COLORS.tension} strokeWidth={CANVAS_STYLE.stroke.reference}
        opacity={CANVAS_STYLE.opacity.reference}
        strokeDasharray={CANVAS_STYLE.dash.reference.join(',')} />
      <line x1={f2ToResultant.x1} y1={f2ToResultant.y1} x2={f2ToResultant.x2} y2={f2ToResultant.y2}
        stroke={PHYSICS_COLORS.appliedForce} strokeWidth={CANVAS_STYLE.stroke.reference}
        opacity={CANVAS_STYLE.opacity.reference}
        strokeDasharray={CANVAS_STYLE.dash.reference.join(',')} />

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
