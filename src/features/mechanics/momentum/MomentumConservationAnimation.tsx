import { VectorArrow, PhysicsGround } from '@/components/Physics'
import { useCanvasSize, useViewport } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import { VelocityTimeChart } from '@/components/Chart'
import {
  useMomentumConservationPhysics,
  MC_LAYOUT,
} from './hooks/useMomentumConservationPhysics'

export default function MomentumConservationAnimation() {
  /** 画布设计尺寸：上方双图表占 310px，本场景仅 180px 高 */
  const DESIGN_WIDTH = 840
  const DESIGN_HEIGHT = 180

  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT })

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  const {
    basic, advanced, isAdvanced, chartData, p1, p2, pTotal, mapArrowLen, mapMomentumBar,
  } = useMomentumConservationPhysics(params, time)

  const groundY = 130

  const vectorSceneScale = useMemo(() => ({
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    originX: 0,
    originY: groundY,
    maxVectorLength: MC_LAYOUT.vectorMaxLength,
    refMagnitudes: { velocity: 10 },
  }), [groundY])

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 box-border bg-neutral-50 overflow-hidden">
      {/* ==================== 上方并列图表区 ==================== */}
      <div className="flex gap-4 h-[310px] shrink-0">
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={chartData.currentVtPoints1}
              domainPoints={chartData.currentDomainVtPoints1}
              currentTime={time}
              tMax={10}
              title="速度-时间图像 (V-T)"
              xLabel="时间 t (s)"
              yLabel="速度 v (m/s)"
              additionalSeries={[
                {
                  points: chartData.currentVtPoints2,
                  domainPoints: chartData.currentDomainVtPoints2,
                  label: isAdvanced ? '木板' : 'B球',
                  series: 'secondary',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={chartData.currentPtPoints1}
              domainPoints={chartData.currentDomainPtPoints1}
              currentTime={time}
              tMax={10}
              title="动量-时间图像 (P-T)"
              xLabel="时间 t (s)"
              yLabel="动量 p (kg·m/s)"
              additionalSeries={[
                {
                  points: chartData.currentPtPoints2,
                  domainPoints: chartData.currentDomainPtPoints2,
                  label: isAdvanced ? '木板' : 'B球',
                  series: 'secondary',
                },
                {
                  points: chartData.currentPtPointsTotal,
                  domainPoints: chartData.currentDomainPtPointsTotal,
                  label: '总动量',
                  series: 'success',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>
      </div>

      {/* ==================== 下方仿真动画区 ==================== */}
      <div ref={containerRef} className="flex-1 min-h-[100px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
        <svg className="w-full h-full block">
          <defs>
            <radialGradient id="steel-sphere-grad-mc" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
            </radialGradient>
            <radialGradient id="steel-sphere-grad-mc-b" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
            </radialGradient>
            <linearGradient id="wood-board-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.labWoodGrad[0]} />
              <stop offset="30%" stopColor={SCENE_COLORS.materials.labWoodGrad[1]} />
              <stop offset="70%" stopColor={SCENE_COLORS.materials.labWoodGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.labWoodGrad[3]} />
            </linearGradient>
          </defs>

          <g transform={vp.transform}>
            <PhysicsGround
              x={MC_LAYOUT.canvasPadding} y={groundY}
              width={700 - 2 * MC_LAYOUT.canvasPadding}
              appearance={{ color: PHYSICS_COLORS.labelText }}
            />

            {/* 基础模式：两球碰撞 */}
            {!isAdvanced && (
              <g>
                <circle
                  cx={basic.posAx} cy={groundY - basic.R_A} r={basic.R_A}
                  fill="url(#steel-sphere-grad-mc)"
                  stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text x={basic.posAx} y={groundY - basic.R_A + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">
                  A
                </text>

                <circle
                  cx={basic.posBx} cy={groundY - basic.R_B} r={basic.R_B}
                  fill="url(#steel-sphere-grad-mc-b)"
                  stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text x={basic.posBx} y={groundY - basic.R_B + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">
                  B
                </text>

                {time >= basic.collisionTime && Math.abs(time - basic.collisionTime) < 0.3 && (
                  <circle
                    cx={(basic.posAx + basic.posBx) / 2}
                    cy={groundY - Math.max(basic.R_A, basic.R_B)}
                    r={8 + (0.3 - Math.abs(time - basic.collisionTime)) * 30}
                    fill={PHYSICS_COLORS.kineticEnergy}
                    opacity={0.3}
                  />
                )}

                {showVectors && (
                  <g>
                    {basic.currentV1 !== 0 && (
                      <VectorArrow
                        origin={{ x: basic.posAx, y: basic.R_A }}
                        vector={{ x: basic.currentV1, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                      />
                    )}
                    <text x={basic.posAx} y={groundY - basic.R_A * 2 - 12} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                      v₁={basic.currentV1.toFixed(1)}
                    </text>

                    {basic.currentV2 !== 0 && (
                      <VectorArrow
                        origin={{ x: basic.posBx, y: basic.R_B }}
                        vector={{ x: basic.currentV2, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                        color={PHYSICS_COLORS.elasticForce}
                      />
                    )}
                    <text x={basic.posBx} y={groundY - basic.R_B * 2 - 12} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.elasticForce} textAnchor="middle" fontWeight="bold">
                      v₂={basic.currentV2.toFixed(1)}
                    </text>
                  </g>
                )}

                {/* 总动量双色长条图 */}
                <g transform={`translate(${MC_LAYOUT.canvasPadding}, ${groundY + 22})`}>
                  {p1 >= 0 ? (
                    <>
                      <rect x={0} y={0} width={mapMomentumBar(p1)} height={10} fill={PHYSICS_COLORS.momentum} opacity={0.7} rx={2} />
                      {p1 > 1.0 && (
                        <text x={mapMomentumBar(p1) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">p₁</text>
                      )}
                      <rect x={mapMomentumBar(p1)} y={0} width={mapMomentumBar(p2)} height={10} fill={PHYSICS_COLORS.impulse} opacity={0.7} rx={2} />
                      {p2 > 1.0 && (
                        <text x={mapMomentumBar(p1) + mapMomentumBar(p2) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">p₂</text>
                      )}
                    </>
                  ) : (
                    <>
                      <rect x={0} y={0} width={mapMomentumBar(p2)} height={10} fill={PHYSICS_COLORS.impulse} opacity={0.7} rx={2} />
                      <text x={mapMomentumBar(p2) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">p₂</text>
                      <rect x={mapMomentumBar(p2) - mapMomentumBar(Math.abs(p1))} y={1} width={mapMomentumBar(Math.abs(p1))} height={8} fill={PHYSICS_COLORS.forceArrowRed} opacity={0.8} rx={1} />
                      <text x={mapMomentumBar(p2) - mapMomentumBar(Math.abs(p1)) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">-p₁</text>
                    </>
                  )}
                  <text x={mapMomentumBar(pTotal) + 8} y={9} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.momentum} fontWeight="bold">
                    p_总 = {pTotal.toFixed(1)} kg·m/s
                  </text>
                </g>
              </g>
            )}

            {/* 进阶模式：滑块-木板 */}
            {isAdvanced && (
              <g>
                <rect
                  x={advanced.boardPixelX} y={advanced.boardTopY}
                  width={advanced.boardPixelW} height={MC_LAYOUT.boardHeight}
                  rx={3} fill="url(#wood-board-grad)"
                  stroke={SCENE_COLORS.materials.labWoodGrad[3]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text
                  x={advanced.boardPixelX + advanced.boardPixelW / 2}
                  y={advanced.boardTopY + MC_LAYOUT.boardHeight / 2 + 3}
                  fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold"
                >
                  M = {(params.M_board ?? 3).toFixed(1)} kg
                </text>

                <rect
                  x={advanced.sliderPixelX - MC_LAYOUT.sliderWidth / 2}
                  y={advanced.sliderTopY}
                  width={MC_LAYOUT.sliderWidth} height={MC_LAYOUT.sliderHeight}
                  rx={4} fill="url(#steel-sphere-grad-mc)"
                  stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                  opacity={advanced.sliderOffBoard ? 0.8 : 1}
                />
                <text
                  x={advanced.sliderPixelX}
                  y={advanced.sliderTopY + MC_LAYOUT.sliderHeight / 2 + 3}
                  fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold"
                >
                  m = {(params.m_slider ?? 1).toFixed(1)} kg
                </text>

                {!advanced.sliderOffBoard && advanced.currentVSlider !== advanced.currentVBoard && advanced.currentDeltaX > 0 && (
                  <line
                    x1={Math.max(advanced.boardPixelX, advanced.sliderPixelX - MC_LAYOUT.sliderWidth / 2)}
                    y1={advanced.boardTopY + 1}
                    x2={advanced.sliderPixelX + MC_LAYOUT.sliderWidth / 2}
                    y2={advanced.boardTopY + 1}
                    stroke={PHYSICS_COLORS.elasticForce} strokeWidth={2} opacity={0.4} strokeDasharray="3,2"
                  />
                )}

                <circle
                  cx={advanced.centerOfMassX}
                  cy={advanced.boardTopY - 3} r={3} fill={PHYSICS_COLORS.referencePoint}
                />
                <text
                  x={advanced.centerOfMassX}
                  y={advanced.boardTopY - 8} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.referencePoint} textAnchor="middle"
                >
                  质心
                </text>

                {!advanced.isFallen && time >= advanced.tCommon && (
                  <line
                    x1={MC_LAYOUT.canvasPadding} y1={advanced.sliderTopY - 5}
                    x2={700 - MC_LAYOUT.canvasPadding} y2={advanced.sliderTopY - 5}
                    stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={1} strokeDasharray="6,4" opacity={0.5}
                  />
                )}

                {showVectors && (
                  <g>
                    {advanced.currentVSlider > 0 && (
                      <VectorArrow
                        origin={{ x: advanced.sliderPixelX, y: groundY - advanced.sliderTopY - 14 }}
                        vector={{ x: advanced.currentVSlider, y: 0 }}
                        type="velocity" sceneScale={vectorSceneScale}
                      />
                    )}
                    <text
                      x={advanced.sliderPixelX + mapArrowLen(advanced.currentVSlider) / 2}
                      y={advanced.sliderTopY - 12}
                      fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle"
                    >
                      v_滑块 = {advanced.currentVSlider.toFixed(2)}
                    </text>

                    {advanced.currentVBoard > 0 && (
                      <VectorArrow
                        origin={{ x: advanced.boardPixelX + advanced.boardPixelW / 2, y: groundY - advanced.boardTopY - 9 }}
                        vector={{ x: advanced.currentVBoard, y: 0 }}
                        type="velocity" sceneScale={vectorSceneScale} color={PHYSICS_COLORS.elasticForce}
                      />
                    )}
                    <text
                      x={advanced.boardPixelX + advanced.boardPixelW / 2 + mapArrowLen(advanced.currentVBoard) / 2}
                      y={advanced.boardTopY + MC_LAYOUT.boardHeight + 14}
                      fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.elasticForce} fontWeight="bold" textAnchor="middle"
                    >
                      v_木板 = {advanced.currentVBoard.toFixed(2)}
                    </text>

                    {!advanced.isFallen && time >= advanced.tCommon && (
                      <text
                        x={700 * 0.5} y={advanced.sliderTopY - 12}
                        fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold" textAnchor="middle"
                      >
                        v_共 = {advanced.vCommon.toFixed(2)} m/s
                      </text>
                    )}
                  </g>
                )}

                {advanced.sliderOffBoard && (
                  <g transform={`translate(${700 * 0.5}, 25)`}>
                    <rect x={-180} y={-14} width={360} height={22} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1} />
                    <text fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" textAnchor="middle" y={1}>
                      临界：板长 L &lt; 共速位移 Δx，滑块已滑落！
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
