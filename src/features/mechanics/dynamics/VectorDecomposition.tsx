import { VectorArrow, DragHandle } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

import type { SceneScale } from '@/scene'
import type { VectorAdditionPhysicsData } from './useVectorAdditionPhysics'

interface VectorDecompositionProps {
  physicsData: VectorAdditionPhysicsData
  sceneScale: SceneScale
  onDragStart: (target: 'f', e: React.PointerEvent) => void
}

export function VectorDecomposition({ physicsData, sceneScale, onDragStart }: VectorDecompositionProps) {
  const { origin, fxEnd, fyEnd, fxProj, fyProj, fResultantEnd } = physicsData

  return (
    <>
      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: fxEnd.cx - origin.cx, y: -(fxEnd.cy - origin.cy) }}
        type="forceComponent" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
        pixelLength={Math.hypot(fxEnd.cx - origin.cx, fxEnd.cy - origin.cy)} />
      <text x={fxEnd.cx > origin.cx ? fxEnd.cx - 8 : fxEnd.cx + 8} y={origin.cy + 18}
        fontSize={CANVAS_STYLE.font.label} fontFamily={CANVAS_STYLE.font.family}
        fill={PHYSICS_COLORS.forceComponent} fontWeight="bold"
        textAnchor={fxEnd.cx > origin.cx ? "end" : "start"}>F_x</text>

      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: fyEnd.cx - origin.cx, y: -(fyEnd.cy - origin.cy) }}
        type="forceComponent" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorSub}
        pixelLength={Math.hypot(fyEnd.cx - origin.cx, fyEnd.cy - origin.cy)} />
      <text x={origin.cx - 12} y={fyEnd.cy > origin.cy ? fyEnd.cy - 6 : fyEnd.cy + 14}
        fontSize={CANVAS_STYLE.font.label} fontFamily={CANVAS_STYLE.font.family}
        fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" textAnchor="end">F_y</text>

      <line x1={fxProj.x1} y1={fxProj.y1} x2={fxProj.x2} y2={fxProj.y2}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference}
        strokeDasharray={CANVAS_STYLE.dash.projection.join(',')} />
      <line x1={fyProj.x1} y1={fyProj.y1} x2={fyProj.x2} y2={fyProj.y2}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference}
        strokeDasharray={CANVAS_STYLE.dash.projection.join(',')} />

      <VectorArrow originPixel={{ x: origin.cx, y: origin.cy }}
        vector={{ x: fResultantEnd.cx - origin.cx, y: -(fResultantEnd.cy - origin.cy) }}
        type="force" sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorMain}
        pixelLength={Math.hypot(fResultantEnd.cx - origin.cx, fResultantEnd.cy - origin.cy)} />
      <text x={fResultantEnd.cx + (fResultantEnd.cx > origin.cx ? 8 : -14)}
        y={fResultantEnd.cy + (fResultantEnd.cy > origin.cy ? 14 : -8)}
        fontSize={CANVAS_STYLE.font.labelBold} fontFamily={CANVAS_STYLE.font.family}
        fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F</text>

      <DragHandle cx={fResultantEnd.cx} cy={fResultantEnd.cy}
        color={PHYSICS_COLORS.forceNet} cursor="grab" showPulse
        onPointerDown={(e) => onDragStart('f', e)} />
    </>
  )
}
