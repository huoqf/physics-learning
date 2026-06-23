import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  elasticCollision,
  inelasticCollisionSpeed,
  calculateInitialKineticEnergy,
  calculateFinalKineticEnergy,
  collisionWithEnergyLoss,
  calculateEnergyLoss,
  isVelocitySwapCase,
  isHeavyLightCase,
} from '@/physics/collision'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
} from '@/theme/physics'

/** 碰撞动画布局常量 */
const COL_LAYOUT = {
  canvasPadding: 50,
  groundOffset: 80,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  velocityScale: 25,
  /** 动能柱状图最大高度 (px) */
  ekBarMaxHeight: 60,
  /** 动能柱状图宽度 (px) */
  ekBarWidth: 30,
  g: 9.8,
} as const

export default function CollisionAnimation() {
    const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: 700,
    designHeight: 450,
  })

  const {
    m1 = 3, v1 = 5,
    m2 = 2, v2 = 0,
    isElastic = 1,
    mA = 3, vA = 5,
    mB = 2, kLoss = 0,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const groundY = canvasSize.height - COL_LAYOUT.groundOffset

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: vp.visibleX,
      y: 0,
      width: vp.visibleW - COL_LAYOUT.canvasPadding * 2,
      height: canvasSize.height - COL_LAYOUT.canvasPadding,
    },
    originX: vp.visibleX,
    originY: groundY,
    worldWidth: vp.visibleW,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      velocity: 12,
    },
  }), [vp.visibleX, vp.visibleW, canvasSize.height, groundY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 基础模式：弹性/非弹性碰撞 ──────────────────────────────
  const R_A = COL_LAYOUT.ballBaseRadius + m1 * COL_LAYOUT.massRadiusScale
  const R_B = COL_LAYOUT.ballBaseRadius + m2 * COL_LAYOUT.massRadiusScale

  const initPosAx = vp.visibleX + vp.visibleW * 0.25
  const initPosBx = vp.visibleX + vp.visibleW * 0.7

  // 碰撞计算
  const gap = initPosBx - R_B - (initPosAx + R_A)
  const approachSpeed = (v1 - v2) * COL_LAYOUT.velocityScale
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2
  let isSticking = false

  if (approachSpeed > 0 && gap > 0) {
    collisionTime = gap / approachSpeed
    if (isElastic === 1) {
      const [va, vb] = elasticCollision(m1, v1, m2, v2)
      v1After = va
      v2After = vb
    } else {
      const vCommon = inelasticCollisionSpeed(m1, v1, m2, v2)
      v1After = vCommon
      v2After = vCommon
      isSticking = true
    }
  }

  // 当前位置和速度
  const scale = COL_LAYOUT.velocityScale
  let posAx: number, posBx: number, currentV1: number, currentV2: number
  const hasCollided = time >= collisionTime

  if (time < collisionTime) {
    posAx = initPosAx + v1 * time * scale
    posBx = initPosBx + v2 * time * scale
    currentV1 = v1
    currentV2 = v2
  } else {
    const dt = time - collisionTime
    const colPosAx = initPosAx + v1 * collisionTime * scale
    const colPosBx = initPosBx + v2 * collisionTime * scale
    posAx = colPosAx + v1After * dt * scale
    posBx = isSticking ? colPosAx + v1After * dt * scale + R_A + R_B : colPosBx + v2After * dt * scale
    currentV1 = v1After
    currentV2 = v2After
  }

  // 边界约束
  const leftBound = vp.visibleX + COL_LAYOUT.canvasPadding + R_A
  const rightBound = vp.visibleX + vp.visibleW - COL_LAYOUT.canvasPadding - R_B
  posAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, posAx))
  posBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, posBx))

  // 动能
  const EkBefore = calculateInitialKineticEnergy(m1, v1, m2, v2)
  const EkAfter = calculateFinalKineticEnergy(m1, v1After, m2, v2After)

  // ── 进阶模式：带能量损失系数 ────────────────────────────────
  const [vAAfter, vBAfter] = collisionWithEnergyLoss(mA, vA, mB, kLoss)
  const EkA_before = 0.5 * mA * vA * vA
  const EkA_after = 0.5 * mA * vAAfter * vAAfter
  const EkB_after = 0.5 * mB * vBAfter * vBAfter
  const deltaEk = calculateEnergyLoss(mA, vA, mB, vAAfter, vBAfter)
  const velocitySwap = isVelocitySwapCase(mA, mB, kLoss)
  const heavyLight = isHeavyLightCase(mA, mB)

  // 进阶模式碰撞动画
  const R_Adv = COL_LAYOUT.ballBaseRadius + mA * COL_LAYOUT.massRadiusScale
  const R_Bdv = COL_LAYOUT.ballBaseRadius + mB * COL_LAYOUT.massRadiusScale
  const initPosAAdv = vp.visibleX + vp.visibleW * 0.25
  const initPosBAdv = vp.visibleX + vp.visibleW * 0.7
  const gapAdv = initPosBAdv - R_Bdv - (initPosAAdv + R_Adv)
  const approachAdv = vA * COL_LAYOUT.velocityScale
  let colTimeAdv = Infinity
  if (approachAdv > 0 && gapAdv > 0) {
    colTimeAdv = gapAdv / approachAdv
  }

  let posAAdv: number, posBAdv: number, curVA: number, curVB: number
  const hasCollidedAdv = time >= colTimeAdv

  if (time < colTimeAdv) {
    posAAdv = initPosAAdv + vA * time * scale
    posBAdv = initPosBAdv
    curVA = vA
    curVB = 0
  } else {
    const dt = time - colTimeAdv
    const colPosA = initPosAAdv + vA * colTimeAdv * scale
    posAAdv = colPosA + vAAfter * dt * scale
    posBAdv = initPosBAdv + vBAfter * dt * scale
    curVA = vAAfter
    curVB = vBAfter
  }

  posAAdv = Math.max(vp.visibleX + COL_LAYOUT.canvasPadding + R_Adv, Math.min(vp.visibleX + vp.visibleW - COL_LAYOUT.canvasPadding - R_Adv, posAAdv))
  posBAdv = Math.max(vp.visibleX + COL_LAYOUT.canvasPadding + R_Bdv, Math.min(vp.visibleX + vp.visibleW - COL_LAYOUT.canvasPadding - R_Bdv, posBAdv))

  // 质心
  const xCmAdv = (mA * posAAdv + mB * posBAdv) / (mA + mB)

  // 动能柱状图映射
  const ekMaxRef = Math.max(EkA_before, 1)
  const mapEkBar = (ek: number) => (ek / ekMaxRef) * COL_LAYOUT.ekBarMaxHeight

  // 矢量映射

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* ========== defs ========== */}
        <defs>
          <radialGradient id="steel-sphere-grad-col" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>
          <radialGradient id="steel-sphere-grad-col-b" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
          </radialGradient>
        </defs>

        {/* ========== 地面线 ========== */}
        <line
          x1={COL_LAYOUT.canvasPadding}
          y1={groundY}
          x2={canvasSize.width - COL_LAYOUT.canvasPadding}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ========== 基础模式 ========== */}
        {!isAdvanced && (
          <g>
            {/* A球 */}
            <circle cx={posAx} cy={groundY - R_A} r={R_A}
              fill="url(#steel-sphere-grad-col)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine} />
            <text x={posAx} y={groundY - R_A + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">A</text>

            {/* B球 */}
            <circle cx={posBx} cy={groundY - R_B} r={R_B}
              fill="url(#steel-sphere-grad-col-b)" stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine} />
            <text x={posBx} y={groundY - R_B + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">B</text>

            {/* 碰撞特效：弹性=弹簧，非弹性=胶水 */}
            {hasCollided && Math.abs(time - collisionTime) < 0.4 && (
              <g>
                {isElastic === 1 ? (
                  // 弹簧特效
                  <path
                    d={`M ${posAx + R_A},${groundY - R_A} L ${posAx + R_A + 5},${groundY - R_A - 6} L ${posAx + R_A + 10},${groundY - R_A + 6} L ${posAx + R_A + 15},${groundY - R_A - 6} L ${posBx - R_B},${groundY - R_B}`}
                    fill="none" stroke={PHYSICS_COLORS.elasticForce} strokeWidth={2}
                  />
                ) : (
                  // 胶水特效
                  <rect
                    x={(posAx + posBx) / 2 - 8}
                    y={groundY - Math.max(R_A, R_B) - 5}
                    width={16}
                    height={10}
                    rx={3}
                    fill={PHYSICS_COLORS.impulse}
                    opacity={0.6}
                  />
                )}
              </g>
            )}

            {/* 速度箭头 */}
            {showVectors && (
              <g>
                {currentV1 !== 0 && (
                  <VectorArrow
                    origin={{ x: posAx, y: R_A * 2 + 10 }}
                    vector={{ x: currentV1, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                  />
                )}
                <text x={posAx} y={groundY - R_A * 2 - 16} fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                  v₁={currentV1.toFixed(1)}
                </text>

                {currentV2 !== 0 && (
                  <VectorArrow
                    origin={{ x: posBx, y: R_B * 2 + 10 }}
                    vector={{ x: currentV2, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={PHYSICS_COLORS.elasticForce}
                  />
                )}
                <text x={posBx} y={groundY - R_B * 2 - 16} fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.elasticForce} textAnchor="middle" fontWeight="bold">
                  v₂={currentV2.toFixed(1)}
                </text>
              </g>
            )}

            {/* 机械能守恒验证 */}
            <g transform={`translate(${COL_LAYOUT.canvasPadding}, 20)`}>
              <text fontSize={FONT.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                {isElastic === 1 ? '完全弹性碰撞' : '完全非弹性碰撞'}
              </text>
              <text x={0} y={20} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.kineticEnergy}>
                E_k初 = {EkBefore.toFixed(1)} J
              </text>
              <text x={0} y={38} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.kineticEnergy}>
                E_k末 = {EkAfter.toFixed(1)} J
              </text>
              <text x={0} y={56} fontSize={FONT.axisSize}
                fill={Math.abs(EkBefore - EkAfter) < 0.1 ? PHYSICS_COLORS.kineticEnergy : PHYSICS_COLORS.heatLoss}
                fontWeight="bold">
                {Math.abs(EkBefore - EkAfter) < 0.1 ? '✓ 机械能守恒' : `ΔE_k = ${(EkBefore - EkAfter).toFixed(1)} J（损失）`}
              </text>
            </g>
          </g>
        )}

        {/* ========== 进阶模式 ========== */}
        {isAdvanced && (
          <g>
            {/* 特例高亮：速度交换 */}
            {velocitySwap && hasCollidedAdv && (
              <rect x={0} y={0} width={canvasSize.width} height={canvasSize.height}
                fill={PHYSICS_COLORS.kineticEnergy} opacity={0.05} />
            )}

            {/* 质心参考线 */}
            <line x1={xCmAdv} y1={20} x2={xCmAdv} y2={groundY}
              stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1}
              strokeDasharray="4,4" opacity={0.4} />
            <text x={xCmAdv} y={16} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.referencePoint} textAnchor="middle">
              质心
            </text>

            {/* A球 */}
            <circle cx={posAAdv} cy={groundY - R_Adv} r={R_Adv}
              fill="url(#steel-sphere-grad-col)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine} />
            <text x={posAAdv} y={groundY - R_Adv + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">A</text>

            {/* B球 */}
            <circle cx={posBAdv} cy={groundY - R_Bdv} r={R_Bdv}
              fill="url(#steel-sphere-grad-col-b)" stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine} />
            <text x={posBAdv} y={groundY - R_Bdv + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">B</text>

            {/* 碰撞闪光 */}
            {hasCollidedAdv && Math.abs(time - colTimeAdv) < 0.3 && (
              <circle cx={(posAAdv + posBAdv) / 2} cy={groundY - Math.max(R_Adv, R_Bdv)}
                r={8 + (0.3 - Math.abs(time - colTimeAdv)) * 30}
                fill={PHYSICS_COLORS.kineticEnergy} opacity={0.3} />
            )}

            {/* 速度箭头 */}
            {showVectors && (
              <g>
                {curVA !== 0 && (
                  <VectorArrow
                    origin={{ x: posAAdv, y: R_Adv * 2 + 10 }}
                    vector={{ x: curVA, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                  />
                )}
                <text x={posAAdv} y={groundY - R_Adv * 2 - 16} fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
                  v_A' = {curVA.toFixed(2)}
                </text>

                {curVB !== 0 && (
                  <VectorArrow
                    origin={{ x: posBAdv, y: R_Bdv * 2 + 10 }}
                    vector={{ x: curVB, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={PHYSICS_COLORS.elasticForce}
                  />
                )}
                <text x={posBAdv} y={groundY - R_Bdv * 2 - 16} fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.elasticForce} fontWeight="bold" textAnchor="middle">
                  v_B' = {curVB.toFixed(2)}
                </text>
              </g>
            )}

            {/* 动能变化双柱状图 */}
            <g transform={`translate(${canvasSize.width - 180}, 20)`}>
              <text x={60} y={-4} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                动能变化
              </text>

              {/* A球碰前 */}
              <rect x={0} y={0} width={COL_LAYOUT.ekBarWidth} height={mapEkBar(EkA_before)}
                fill={PHYSICS_COLORS.velocity} opacity={0.6} rx={2} />
              <text x={COL_LAYOUT.ekBarWidth / 2} y={-4} fontSize={font(6)} fill={PHYSICS_COLORS.velocity} textAnchor="middle">
                A碰前
              </text>

              {/* A球碰后 */}
              <rect x={COL_LAYOUT.ekBarWidth + 5} y={0} width={COL_LAYOUT.ekBarWidth} height={mapEkBar(EkA_after)}
                fill={PHYSICS_COLORS.velocity} opacity={0.3} rx={2} />
              <text x={COL_LAYOUT.ekBarWidth + 5 + COL_LAYOUT.ekBarWidth / 2} y={-4} fontSize={font(6)} fill={PHYSICS_COLORS.velocity} textAnchor="middle">
                A碰后
              </text>

              {/* B球碰后 */}
              <rect x={(COL_LAYOUT.ekBarWidth + 5) * 2} y={0} width={COL_LAYOUT.ekBarWidth} height={mapEkBar(EkB_after)}
                fill={PHYSICS_COLORS.elasticForce} opacity={0.6} rx={2} />
              <text x={(COL_LAYOUT.ekBarWidth + 5) * 2 + COL_LAYOUT.ekBarWidth / 2} y={-4} fontSize={font(6)} fill={PHYSICS_COLORS.elasticForce} textAnchor="middle">
                B碰后
              </text>

              {/* ΔE_k */}
              {deltaEk > 0.01 && (
                <text x={60} y={COL_LAYOUT.ekBarMaxHeight + 15} fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.heatLoss} textAnchor="middle" fontWeight="bold">
                  ΔE_k = {deltaEk.toFixed(1)} J
                </text>
              )}
            </g>

            {/* 特例高亮提示 */}
            {velocitySwap && hasCollidedAdv && (
              <text x={canvasSize.width / 2} y={30} fontSize={FONT.bodySize}
                fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold" textAnchor="middle">
                等质量弹性碰撞：速度交换！A静止，B带走全部速度
              </text>
            )}
            {heavyLight && hasCollidedAdv && (
              <text x={canvasSize.width / 2} y={30} fontSize={FONT.bodySize}
                fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
                大撞小：v_B' ≈ 2v_A = {(2 * vA).toFixed(1)} m/s
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
