import { PhysicsVectorArrow, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import type { SceneScale } from '@/scene'
import { MOMENTUM_LAYOUT } from './MomentumAnimation'

interface MomentumSceneProps {
  canvasSize: { width: number; height: number; font: (v: number) => number }
  sceneScale: SceneScale
  isAdvanced: boolean
  showVectors: boolean
  // 基础模式
  m: number; v: number; p_basic: number; R_basic: number; basicBallX: number
  ballCenterY: number; groundY: number
  mapArrowLen: (val: number) => number
  mapMomentumBarH: (pVal: number) => number
  // 进阶模式
  mA: number; mB: number
  R_A: number; R_B: number
  clampedPosAx: number; clampedPosBx: number
  currentVA: number; currentVB: number
  pA: number; pB: number; pTotal: number
  xCm: number
  hasCollided: boolean; collisionTime: number; time: number
}

export function MomentumScene({
  canvasSize, sceneScale, isAdvanced, showVectors,
  m, v, p_basic, R_basic, basicBallX, ballCenterY, groundY,
  mapArrowLen, mapMomentumBarH,
  mA, mB, R_A, R_B, clampedPosAx, clampedPosBx,
  currentVA, currentVB, pA, pB, pTotal, xCm,
  hasCollided, collisionTime, time,
}: MomentumSceneProps) {
  return (
    <>
      <defs>
        <radialGradient id="steel-sphere-grad-mom" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
        </radialGradient>
        <radialGradient id="steel-sphere-grad-mom-b" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
        </radialGradient>
      </defs>

      {/* 地面 */}
      <PhysicsGround
        x={MOMENTUM_LAYOUT.canvasPadding} y={groundY}
        width={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding * 2}
        appearance={{ showHatch: true }}
        ruler={{ domain: [0, 100], showAxisArrow: true, axisLabel: isAdvanced ? 'x 正方向' : 'x', axisOffset: 20 }}
      />

      {/* 基础模式 */}
      {!isAdvanced && (
        <g>
          <circle cx={basicBallX} cy={ballCenterY} r={R_basic}
            fill="url(#steel-sphere-grad-mom)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <text x={basicBallX} y={ballCenterY - R_basic - 8} fontSize={canvasSize.font(13)}
            fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
            m = {m.toFixed(1)} kg
          </text>
          {showVectors && v > 0 && (
            <PhysicsVectorArrow originDesign={{ x: basicBallX + R_basic + 4, y: ballCenterY }}
              vector={{ x: v, y: 0 }} type="velocity" sceneScale={sceneScale} />
          )}
          <g transform={`translate(${basicBallX + R_basic + mapArrowLen(v) + 30}, ${ballCenterY})`}>
            <rect x={-MOMENTUM_LAYOUT.momentumBarWidth / 2} y={p_basic >= 0 ? -mapMomentumBarH(p_basic) : 0}
              width={MOMENTUM_LAYOUT.momentumBarWidth} height={mapMomentumBarH(p_basic)}
              fill={PHYSICS_COLORS.momentum} opacity={0.7} rx={3} />
            <text x={0} y={p_basic >= 0 ? -mapMomentumBarH(p_basic) - 6 : mapMomentumBarH(p_basic) + 14}
              fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.momentum} fontWeight="bold" textAnchor="middle">
              p = {p_basic.toFixed(1)}
            </text>
          </g>
        </g>
      )}

      {/* 进阶模式 */}
      {isAdvanced && (
        <g>
          {/* A球 */}
          <circle cx={clampedPosAx} cy={ballCenterY} r={R_A}
            fill="url(#steel-sphere-grad-mom)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <text x={clampedPosAx} y={ballCenterY + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">A</text>
          <text x={clampedPosAx} y={ballCenterY - R_A - 8} fontSize={canvasSize.font(12)}
            fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
            m_A = {mA.toFixed(1)} kg
          </text>

          {/* B球 */}
          <circle cx={clampedPosBx} cy={ballCenterY} r={R_B}
            fill="url(#steel-sphere-grad-mom-b)" stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <text x={clampedPosBx} y={ballCenterY + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">B</text>
          <text x={clampedPosBx} y={ballCenterY - R_B - 8} fontSize={canvasSize.font(12)}
            fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
            m_B = {mB.toFixed(1)} kg
          </text>

          {/* 质心 */}
          <circle cx={xCm} cy={ballCenterY} r={4} fill={PHYSICS_COLORS.referencePoint}
            stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1} />
          <text x={xCm} y={ballCenterY + 18} fontSize={canvasSize.font(10)}
            fill={PHYSICS_COLORS.referencePoint} textAnchor="middle">质心</text>

          {/* 碰撞闪光 */}
          {hasCollided && Math.abs(time - collisionTime) < 0.3 && (
            <circle cx={(clampedPosAx + clampedPosBx) / 2} cy={ballCenterY}
              r={8 + (0.3 - Math.abs(time - collisionTime)) * 30}
              fill={PHYSICS_COLORS.kineticEnergy} opacity={0.3} />
          )}

          {/* 速度/动量矢量 */}
          {showVectors && (
            <g>
              {currentVA !== 0 && (
                <PhysicsVectorArrow originDesign={{ x: clampedPosAx, y: ballCenterY + R_A + 20 }}
                  vector={{ x: currentVA, y: 0 }} type="velocity" sceneScale={sceneScale} />
              )}
              <text x={clampedPosAx + mapArrowLen(currentVA) * Math.sign(currentVA) / 2}
                y={ballCenterY - R_A - 26} fontSize={canvasSize.font(10)}
                fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
                v_A = {currentVA > 0 ? '+' : ''}{currentVA.toFixed(1)}
              </text>

              {currentVB !== 0 && (
                <PhysicsVectorArrow originDesign={{ x: clampedPosBx, y: ballCenterY + R_B + 20 }}
                  vector={{ x: currentVB, y: 0 }} type="velocity" sceneScale={sceneScale}
                  color={PHYSICS_COLORS.elasticForce} />
              )}
              <text x={clampedPosBx + mapArrowLen(currentVB) * Math.sign(currentVB) / 2}
                y={ballCenterY - R_B - 26} fontSize={canvasSize.font(10)}
                fill={PHYSICS_COLORS.elasticForce} fontWeight="bold" textAnchor="middle">
                v_B = {currentVB > 0 ? '+' : ''}{currentVB.toFixed(1)}
              </text>

              {pA !== 0 && (
                <PhysicsVectorArrow originDesign={{ x: clampedPosAx, y: groundY + MOMENTUM_LAYOUT.momentumAxisY }}
                  vector={{ x: pA, y: 0 }} type="momentum" sceneScale={sceneScale} />
              )}
              <text x={clampedPosAx} y={groundY + MOMENTUM_LAYOUT.momentumAxisY - 6}
                fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.momentum} textAnchor="middle">
                p_A = {pA > 0 ? '+' : ''}{pA.toFixed(1)}
              </text>

              {pB !== 0 && (
                <PhysicsVectorArrow originDesign={{ x: clampedPosBx, y: groundY + MOMENTUM_LAYOUT.momentumAxisY }}
                  vector={{ x: pB, y: 0 }} type="momentum" sceneScale={sceneScale}
                  color={PHYSICS_COLORS.impulse} />
              )}
              <text x={clampedPosBx} y={groundY + MOMENTUM_LAYOUT.momentumAxisY - 6}
                fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.impulse} textAnchor="middle">
                p_B = {pB > 0 ? '+' : ''}{pB.toFixed(1)}
              </text>

              {pTotal !== 0 && (
                <PhysicsVectorArrow originDesign={{ x: xCm, y: groundY + MOMENTUM_LAYOUT.totalMomentumAxisY }}
                  vector={{ x: pTotal, y: 0 }} type="momentum" sceneScale={sceneScale} />
              )}
              <text x={xCm} y={groundY + MOMENTUM_LAYOUT.totalMomentumAxisY - 6}
                fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.momentum} textAnchor="middle" fontWeight="bold">
                p_总 = {pTotal > 0 ? '+' : ''}{pTotal.toFixed(1)}
              </text>
            </g>
          )}
        </g>
      )}

    </>
  )
}
