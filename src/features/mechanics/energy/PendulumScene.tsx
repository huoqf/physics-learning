import { colors } from '@/theme/colors'
import { SCENE_COLORS } from '@/theme/physics'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { ZeroPotentialLine } from './ZeroPotentialLine'
import type { SceneScale } from '@/scene'

interface PendulumSceneProps {
  animCenterX: number
  hangY: number
  R_pix: number
  objPos: { x: number; y: number }
  state: { theta: number; v: number }
  showVectors: boolean
  maxV: number
  sceneScale: SceneScale
  yRefLine: number
  hRef: number
  font: (n: number) => number
  handleMouseDown: (e: React.MouseEvent<SVGElement>) => void
}

export function PendulumScene({
  animCenterX,
  hangY,
  R_pix,
  objPos,
  state,
  showVectors,
  maxV,
  sceneScale,
  yRefLine,
  hRef,
  font,
  handleMouseDown,
}: PendulumSceneProps) {
  return (
    <g>
      {/* 顶部悬挂支架 */}
      <rect x={animCenterX - 20} y={hangY - 12} width={40} height={12} fill={colors.neutral[400]} rx={1} />
      <PhysicsGround
        x={animCenterX - 30} y={hangY} width={60}
        type="bracket"
        appearance={{ color: colors.neutral[600] }}
      />

      {/* 运动极限虚导线范围 */}
      <path
        d={`M ${animCenterX - R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)} A ${R_pix} ${R_pix} 0 0 0 ${animCenterX + R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)}`}
        fill="none"
        stroke={colors.neutral[100]}
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* 零势能基准线（可拖动） */}
      <ZeroPotentialLine
        animCenterX={animCenterX}
        yRefLine={yRefLine}
        hRef={hRef}
        mode={0}
        hangY={hangY}
        R_pix={R_pix}
        font={font}
        onMouseDown={handleMouseDown}
      />

      {/* 摆线 */}
      <line
        x1={animCenterX}
        y1={hangY}
        x2={objPos.x}
        y2={objPos.y}
        stroke={colors.neutral[700]}
        strokeWidth={1.2}
      />
      {/* 轴心点 */}
      <circle cx={animCenterX} cy={hangY} r={3} fill={colors.neutral[800]} />

      {/* 摆球 */}
      <circle
        cx={objPos.x}
        cy={objPos.y}
        r={12}
        fill="url(#pendulum-bob-grad)"
        stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
        strokeWidth={1.5}
      />
      
      {/* 切向速度矢量 v */}
      {showVectors && Math.abs(state.v) > 0.15 && (() => {
        const velRatio = Math.min(Math.abs(state.v) / maxV, 1)
        const arrowPx = Math.max(14, velRatio * sceneScale.maxVectorLength * 0.85)
        return (
          <VectorArrow
            origin={{ x: objPos.x, y: -objPos.y }}
            vector={{ x: Math.cos(state.theta) * arrowPx * Math.sign(state.v), y: Math.sin(state.theta) * arrowPx * Math.sign(state.v) }}
            type="velocity"
            sceneScale={sceneScale}
            pixelLength={arrowPx}
          />
        )
      })()}
    </g>
  )
}