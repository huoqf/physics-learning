import { PHYSICS_COLORS, ENERGY_COLORS, STROKE, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { ZeroPotentialLine } from './ZeroPotentialLine'
import type { SceneScale } from '@/scene'

interface ValleySceneProps {
  animCenterX: number
  groundY: number
  R_pix: number
  arcStartX: number
  arcStartY: number
  arcEndX: number
  arcEndY: number
  objPos: { x: number; y: number }
  objW: number
  objH: number
  thetaDeg: number
  state: { v: number; phase: number }
  m: number
  showVectors: boolean
  maxV: number
  sceneScale: SceneScale
  yRefLine: number
  hRef: number
  font: (n: number) => number
  handleMouseDown: (e: React.MouseEvent<SVGElement>) => void
}

export function ValleyScene({
  animCenterX,
  groundY,
  R_pix,
  arcStartX,
  arcStartY,
  arcEndX,
  arcEndY,
  objPos,
  objW,
  objH,
  thetaDeg,
  state,
  m,
  showVectors,
  maxV,
  sceneScale,
  yRefLine,
  hRef,
  font,
  handleMouseDown,
}: ValleySceneProps) {
  return (
    <g>
      {/* 凹圆弧轨道线 */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${R_pix} ${R_pix} 0 0 0 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke={PHYSICS_COLORS.labelText}
        strokeWidth={STROKE.groundLine}
      />
      <path
        d={`M ${arcStartX} ${arcStartY} A ${R_pix} ${R_pix} 0 0 0 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke={CANVAS_COLORS.gridSubtle}
        strokeWidth={0.5}
        opacity={0.8}
      />

      {/* 零势能基准线（可拖动） */}
      <ZeroPotentialLine
        animCenterX={animCenterX}
        yRefLine={yRefLine}
        hRef={hRef}
        mode={1}
        groundY={groundY}
        font={font}
        onMouseDown={handleMouseDown}
      />

      {/* 小车（沿圆弧贴紧滑行，并顺着切向倾角旋转） */}
      <g transform={`translate(${objPos.x}, ${objPos.y}) rotate(${-thetaDeg}) translate(${-objW / 2}, ${-objH})`}>
        {/* 木车身 */}
        <rect width={objW} height={objH - 1} rx={2} fill="url(#block-grad)" stroke={SCENE_COLORS.materials.woodSphereGrad[1]} strokeWidth={1.5} />
        
        <text x={objW * 0.5} y={objH * 0.6} fontSize={font(8)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
          {m.toFixed(1)}kg
        </text>
        {/* 轮子 */}
        <circle cx={objW * 0.25} cy={objH - 0.3} r={1.6} fill={CANVAS_COLORS.labelText} />
        <circle cx={objW * 0.75} cy={objH - 0.3} r={1.6} fill={CANVAS_COLORS.labelText} />

        {/* 切向速度矢量 v */}
        {showVectors && Math.abs(state.v) > 0.1 && (() => {
          const velRatio = Math.min(Math.abs(state.v) / maxV, 1)
          const arrowPx = Math.max(14, velRatio * sceneScale.maxVectorLength * 0.85)
          return (
            <VectorArrow
              origin={{ x: objW * 0.5, y: -(objH + 3) }}
              vector={{ x: arrowPx * Math.sign(state.v), y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              pixelLength={arrowPx}
            />
          )
        })()}
      </g>

      {/* 阶段状态指示：卡死停在坡上时闪烁提示 */}
      {state.phase === 1 && (
        <g transform={`translate(${animCenterX - 45}, ${groundY - 110})`}>
          <rect width={90} height={18} rx={3} fill={withAlpha(PHYSICS_COLORS.alertRed, 0.08)} stroke={withAlpha(PHYSICS_COLORS.alertRed, 0.4)} strokeWidth={0.8} />
          <text x={45} y={12} fontSize={font(7.5)} fontWeight="bold" textAnchor="middle" fill={ENERGY_COLORS.internalEnergy}>
            摩擦受力平衡已静止
          </text>
        </g>
      )}
    </g>
  )
}