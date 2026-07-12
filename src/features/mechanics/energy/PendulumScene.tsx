import { PhysicsGround, VectorArrow } from '@/components/Physics'
import { SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'

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
  m: number
  g: number
  L: number
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
  m,
  g,
  L,
}: PendulumSceneProps) {
  return (
    <g>
      {/* 顶部悬挂支架 */}
      <rect x={animCenterX - 20} y={hangY - 12} width={40} height={12} fill={CANVAS_COLORS.trackHistory} rx={1} />
      <PhysicsGround
        x={animCenterX - 30} y={hangY} width={60}
        type="bracket"
        appearance={{ color: CANVAS_COLORS.labelTextLight }}
      />

      {/* 运动极限虚导线范围 */}
      <path
        d={`M ${animCenterX - R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)} A ${R_pix} ${R_pix} 0 0 0 ${animCenterX + R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)}`}
        fill="none"
        stroke={CANVAS_COLORS.gridSubtle}
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
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.2}
      />
      {/* 轴心点 */}
      <circle cx={animCenterX} cy={hangY} r={3} fill={CANVAS_COLORS.labelText} />

      {/* 摆球 */}
      <circle
        cx={objPos.x}
        cy={objPos.y}
        r={12}
        fill="url(#pendulum-bob-grad)"
        stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
        strokeWidth={1.5}
      />
      
      {/* 重力矢量 G — 恒定向下 */}
      {showVectors && (
        <VectorArrow
          originPixel={{ x: objPos.x, y: objPos.y }}
          vector={{ x: 0, y: -1 }}
          type="gravity"
          sceneScale={sceneScale}
          pixelLength={Math.min(m * g * 2, sceneScale.maxVectorLength * 0.9)}
          label="G"
        />
      )}

      {/* 张力矢量 T — 沿绳指向悬挂点 */}
      {showVectors && (
        <VectorArrow
          originPixel={{ x: objPos.x, y: objPos.y }}
          vector={{ x: -Math.sin(state.theta), y: Math.cos(state.theta) }}
          type="tension"
          sceneScale={sceneScale}
          pixelLength={Math.min((m * g * Math.cos(state.theta) + m * state.v * state.v / L) * 2, sceneScale.maxVectorLength * 0.9)}
          label="T"
        />
      )}

      {/* 切向速度矢量 v */}
      {showVectors && Math.abs(state.v) > 0.15 && (() => {
        const velRatio = Math.min(Math.abs(state.v) / maxV, 1)
        const arrowPx = Math.max(14, velRatio * sceneScale.maxVectorLength * 0.85)
        return (
          <VectorArrow
            originPixel={{ x: objPos.x, y: objPos.y }}
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