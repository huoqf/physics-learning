import { PhysicsVectorArrow, PhysicsGround } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks/useSceneScale'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import {
  useMomentumConservationPhysics,
  MC_LAYOUT,
} from './hooks/useMomentumConservationPhysics'
import MomentumConservationCharts from './MomentumConservationCharts'

const DESIGN_WIDTH = CANVAS_PRESETS.splitV.width

export default function MomentumConservationAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })

  const groundY = Math.round(preset.height * 0.55)
  const {
    basic,
    advanced,
    experiment,
    trackSliders,
    isAdvanced,
    isExperiment,
    chartData,
    p1,
    p2,
    pTotal,
    mapArrowLen,
    mapMomentumBar,
  } = useMomentumConservationPhysics(params, time, groundY, DESIGN_WIDTH)

  const vectorSceneScale = useSceneScale({
    vp, preset,
    anchor: 'custom',
    customScaleX: 1,
    customScaleY: 1,
    customOriginX: 0,
    customOriginY: groundY,
    maxVectorLength: MC_LAYOUT.vectorMaxLength,
    refMagnitudes: { velocity: isExperiment ? 2 : 10 },
  })

  // 气垫导轨像素映射函数 (1.2m 对应 760px，起点 40)
  const toTrackPx = (m: number) => 40 + (m / 1.2) * 760

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ==================== 上方并列图表区（50%） ==================== */}
      <MomentumConservationCharts
        chartData={chartData}
        currentTime={time}
        isAdvanced={isAdvanced}
        isExperiment={isExperiment}
      />

      {/* ==================== 下方仿真动画区（50%） ==================== */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
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
          {/* 气垫导轨铝合金拉丝金属渐变 */}
          <linearGradient id="air-track-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[0]} />
            <stop offset="35%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[3]} />
          </linearGradient>
          {/* 光电门黑色磨砂工程塑料渐变 */}
          <linearGradient id="photogate-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.insulationBakelite[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.insulationBakelite[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.insulationBakelite[2]} />
          </linearGradient>
        </defs>

        {!isExperiment && (
          <PhysicsGround
            x={MC_LAYOUT.canvasPadding} y={groundY}
            width={DESIGN_WIDTH - 2 * MC_LAYOUT.canvasPadding}
            appearance={{ color: PHYSICS_COLORS.labelText }}
          />
        )}

        {/* 基础模式：两球碰撞 */}
        {!isAdvanced && !isExperiment && (
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
                  <PhysicsVectorArrow
                    originDesign={{ x: basic.posAx, y: groundY - basic.R_A }}
                    vector={{ x: basic.currentV1, y: 0 }}
                    type="velocity"
                    sceneScale={vectorSceneScale}
                  />
                )}
                <text x={basic.posAx} y={groundY - basic.R_A * 2 - 12} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                  v₁={basic.currentV1.toFixed(1)}
                </text>

                {basic.currentV2 !== 0 && (
                  <PhysicsVectorArrow
                    originDesign={{ x: basic.posBx, y: groundY - basic.R_B }}
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
        {isAdvanced && !isExperiment && (
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
                x2={DESIGN_WIDTH - MC_LAYOUT.canvasPadding} y2={advanced.sliderTopY - 5}
                stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={1} strokeDasharray="6,4" opacity={0.5}
              />
            )}

            {showVectors && (
              <g>
                {advanced.currentVSlider > 0 && (
                  <PhysicsVectorArrow
                    originDesign={{ x: advanced.sliderPixelX, y: advanced.sliderTopY - 14 }}
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
                  <PhysicsVectorArrow
                    originDesign={{ x: advanced.boardPixelX + advanced.boardPixelW / 2, y: advanced.boardTopY + 9 }}
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
                    x={DESIGN_WIDTH * 0.5} y={advanced.sliderTopY - 12}
                    fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold" textAnchor="middle"
                  >
                    v_共 = {advanced.vCommon.toFixed(2)} m/s
                  </text>
                )}
              </g>
            )}

            {advanced.sliderOffBoard && (
              <g transform={`translate(${DESIGN_WIDTH * 0.5}, 25)`}>
                <rect x={-180} y={-14} width={360} height={22} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1} />
                <text fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" textAnchor="middle" y={1}>
                  临界：板长 L &lt; 共速位移 Δx，滑块已滑落！
                </text>
              </g>
            )}
          </g>
        )}

        {/* ─── 高考实验模式：气垫导轨双滑块光电门碰撞测速 ─── */}
        {isExperiment && (
          <g>
            {/* 1. 气垫导轨基座与水平微调脚垫 */}
            <g id="air-track-assembly">
              {/* 地面支柱与水平旋钮脚垫 */}
              <rect x={120} y={groundY + 28} width={16} height={20} fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar} rx={2} />
              <rect x={110} y={groundY + 44} width={36} height={6} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} rx={3} />
              <rect x={704} y={groundY + 28} width={16} height={20} fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar} rx={2} />
              <rect x={694} y={groundY + 44} width={36} height={6} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} rx={3} />

              {/* 导轨主梁 (760px 对应 1.2m) */}
              <rect
                x={40}
                y={groundY}
                width={760}
                height={28}
                fill="url(#air-track-grad)"
                stroke={SCENE_COLORS.mechanicsApparatus.airTrackBeam}
                strokeWidth={1.5}
                rx={2}
              />
              {/* 导轨上表面微孔排气口模拟点阵 */}
              {Array.from({ length: 30 }).map((_, i) => (
                <circle
                  key={`air-hole-${i}`}
                  cx={52 + i * 25.5}
                  cy={groundY + 4}
                  r={1}
                  fill={SCENE_COLORS.mechanicsApparatus.airTrackHole}
                  opacity={0.6}
                />
              ))}

              {/* 两端防脱挡块 */}
              <rect x={36} y={groundY - 14} width={8} height={42} fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper} rx={2} />
              <rect x={796} y={groundY - 14} width={8} height={42} fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper} rx={2} />

              {/* 毫米/厘米刻度标尺 (0 ~ 120 cm) */}
              <rect x={40} y={groundY + 14} width={760} height={12} fill={SCENE_COLORS.mechanicsApparatus.scaleBg} opacity={0.9} />
              <line x1={40} y1={groundY + 14} x2={800} y2={groundY + 14} stroke={SCENE_COLORS.mechanicsApparatus.scaleStroke} strokeWidth={0.8} />
              {Array.from({ length: 13 }).map((_, i) => {
                const tickX = 40 + i * (760 / 12)
                return (
                  <g key={`cm-tick-${i}`}>
                    <line x1={tickX} y1={groundY + 14} x2={tickX} y2={groundY + 22} stroke={SCENE_COLORS.mechanicsApparatus.scaleTick} strokeWidth={1} />
                    <text
                      x={tickX}
                      y={groundY + 25}
                      fontSize={canvasSize.font(7)}
                      fill={SCENE_COLORS.mechanicsApparatus.scaleText}
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {i * 10}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* 2. 两个 U 型光电门探头 */}
            {/* 光电门 1 (x = 0.35m) */}
            {(() => {
              const gate1Px = toTrackPx(experiment.gate1Pos)
              const isG1Active = trackSliders.gate1Active
              return (
                <g id="photogate-1">
                  {/* U型塑料外壳 */}
                  <path
                    d={`M ${gate1Px - 14} ${groundY + 14} L ${gate1Px - 14} ${groundY - 50} Q ${gate1Px} ${groundY - 55} ${gate1Px + 14} ${groundY - 50} L ${gate1Px + 14} ${groundY + 14} Z`}
                    fill="url(#photogate-grad)"
                    stroke={SCENE_COLORS.mechanicsApparatus.photogateBody}
                    strokeWidth={1.2}
                  />
                  {/* U型门中央通光透槽 */}
                  <rect x={gate1Px - 8} y={groundY - 42} width={16} height={40} fill={SCENE_COLORS.mechanicsApparatus.photogateSlot} opacity={0.15} />

                  {/* 红外光路（挡光片高度 groundY - 34） */}
                  <line
                    x1={gate1Px - 8}
                    y1={groundY - 34}
                    x2={gate1Px + 8}
                    y2={groundY - 34}
                    stroke={isG1Active ? SCENE_COLORS.mechanicsApparatus.photogateBeam : SCENE_COLORS.mechanicsApparatus.photogateBeamIdle}
                    strokeWidth={isG1Active ? 3 : 1.2}
                    strokeDasharray={isG1Active ? 'none' : '3 2'}
                    opacity={isG1Active ? 1 : 0.6}
                  />
                  {/* 挡光高亮光晕 */}
                  {isG1Active && (
                    <circle cx={gate1Px} cy={groundY - 34} r={6} fill={SCENE_COLORS.mechanicsApparatus.photogateBeam} opacity={0.4} />
                  )}

                  {/* 门上方数字计时表头 */}
                  <g transform={`translate(${gate1Px}, ${groundY - 70})`}>
                    {experiment.isRebounded === 1 ? (
                      <>
                        <rect x={-40} y={-14} width={80} height={28} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                        <text x={0} y={-4} fontSize={canvasSize.font(6.5)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                          碰前 Δt₁: {trackSliders.gate1BeforeTime > 0 ? `${trackSliders.gate1BeforeTime.toFixed(4)}s` : '0.0000s'}
                        </text>
                        <text
                          x={0}
                          y={8}
                          fontSize={canvasSize.font(7.5)}
                          fill={trackSliders.gate1ReboundTime > 0 ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextMuted}
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          反弹: {trackSliders.gate1ReboundTime > 0 ? `${trackSliders.gate1ReboundTime.toFixed(4)}s` : '--'}
                        </text>
                      </>
                    ) : (
                      <>
                        <rect x={-32} y={-10} width={64} height={20} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                        <text x={0} y={-2} fontSize={canvasSize.font(7)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                          光电门 1
                        </text>
                        <text
                          x={0}
                          y={7}
                          fontSize={canvasSize.font(9)}
                          fill={isG1Active ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextDone}
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {trackSliders.gate1DisplayTime > 0 ? `${trackSliders.gate1DisplayTime.toFixed(4)}s` : '0.0000s'}
                        </text>
                      </>
                    )}
                  </g>
                </g>
              )
            })()}

            {/* 光电门 2 (x = 0.85m) */}
            {(() => {
              const gate2Px = toTrackPx(experiment.gate2Pos)
              const isG2Active = trackSliders.gate2Active
              return (
                <g id="photogate-2">
                  <path
                    d={`M ${gate2Px - 14} ${groundY + 14} L ${gate2Px - 14} ${groundY - 50} Q ${gate2Px} ${groundY - 55} ${gate2Px + 14} ${groundY - 50} L ${gate2Px + 14} ${groundY + 14} Z`}
                    fill="url(#photogate-grad)"
                    stroke={SCENE_COLORS.mechanicsApparatus.photogateBody}
                    strokeWidth={1.2}
                  />
                  <rect x={gate2Px - 8} y={groundY - 42} width={16} height={40} fill={SCENE_COLORS.mechanicsApparatus.photogateSlot} opacity={0.15} />

                  <line
                    x1={gate2Px - 8}
                    y1={groundY - 34}
                    x2={gate2Px + 8}
                    y2={groundY - 34}
                    stroke={isG2Active ? SCENE_COLORS.mechanicsApparatus.photogateBeam : SCENE_COLORS.mechanicsApparatus.photogateBeamIdle}
                    strokeWidth={isG2Active ? 3 : 1.2}
                    strokeDasharray={isG2Active ? 'none' : '3 2'}
                    opacity={isG2Active ? 1 : 0.6}
                  />
                  {isG2Active && (
                    <circle cx={gate2Px} cy={groundY - 34} r={6} fill={SCENE_COLORS.mechanicsApparatus.photogateBeam} opacity={0.4} />
                  )}

                  <g transform={`translate(${gate2Px}, ${groundY - 70})`}>
                    <rect x={-32} y={-10} width={64} height={20} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                    <text x={0} y={-2} fontSize={canvasSize.font(7)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                      光电门 2
                    </text>
                    <text
                      x={0}
                      y={7}
                      fontSize={canvasSize.font(9)}
                      fill={isG2Active ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextDone}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {trackSliders.gate2DisplayTime > 0 ? `${trackSliders.gate2DisplayTime.toFixed(4)}s` : '0.0000s'}
                    </text>
                  </g>
                </g>
              )
            })()}

            {/* 3. 两辆滑块小车 */}
            {/* 滑块 1 (主碰滑块) */}
            {(() => {
              const slider1Px = toTrackPx(trackSliders.x1)
              const sliderW = (experiment.sliderLength / 1.2) * 760 // 约 76px
              const plateW = Math.max(8, (experiment.plateWidth_m / 1.2) * 760)
              const s1H = 22
              const isColNow = Math.abs(time - experiment.t_collision) < 0.15

              return (
                <g id="slider-1">
                  {/* 滑块车身 */}
                  <rect
                    x={slider1Px}
                    y={groundY - s1H}
                    width={sliderW}
                    height={s1H}
                    rx={3}
                    fill={SCENE_COLORS.mechanicsApparatus.slider1Body}
                    stroke={SCENE_COLORS.mechanicsApparatus.slider1Stroke}
                    strokeWidth={1.5}
                  />
                  {/* 滑块配重槽刻纹 */}
                  <line x1={slider1Px + 16} y1={groundY - s1H + 4} x2={slider1Px + 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider1Slot} strokeWidth={1} />
                  <line x1={slider1Px + sliderW - 16} y1={groundY - s1H + 4} x2={slider1Px + sliderW - 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider1Slot} strokeWidth={1} />

                  {/* 挡光片 (垂直装在小车中央) */}
                  <rect
                    x={slider1Px + sliderW / 2 - plateW / 2}
                    y={groundY - s1H - 18}
                    width={plateW}
                    height={18}
                    fill={SCENE_COLORS.mechanicsApparatus.plateBody}
                    stroke={SCENE_COLORS.mechanicsApparatus.plateBorder}
                    strokeWidth={0.8}
                    rx={1}
                  />
                  {/* 挡光片宽度微型标注 */}
                  <text
                    x={slider1Px + sliderW / 2}
                    y={groundY - s1H - 21}
                    fontSize={canvasSize.font(7)}
                    fill={SCENE_COLORS.mechanicsApparatus.slider1Stroke}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    Δx={experiment.plateWidth_mm}mm
                  </text>

                  {/* 滑块 1 质量标签 */}
                  <text
                    x={slider1Px + sliderW / 2}
                    y={groundY - 7}
                    fontSize={canvasSize.font(9)}
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    m₁={experiment.m1.toFixed(2)}kg
                  </text>

                  {/* 碰撞端面缓冲头 (装在滑块 1 右端) */}
                  {experiment.collisionType === 0 ? (
                    /* 弹性碰撞：银色半弧形弹簧片 */
                    <path
                      d={`M ${slider1Px + sliderW} ${groundY - 17} Q ${slider1Px + sliderW + (isColNow ? 3 : 8)} ${groundY - 11} ${slider1Px + sliderW} ${groundY - 5}`}
                      fill="none"
                      stroke={SCENE_COLORS.mechanicsApparatus.springBumper}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  ) : (
                    /* 完全非弹性碰撞：粘合撞针与橡皮泥 */
                    <g>
                      <line x1={slider1Px + sliderW} y1={groundY - 11} x2={slider1Px + sliderW + 6} y2={groundY - 11} stroke={SCENE_COLORS.mechanicsApparatus.puttyNeedle} strokeWidth={2} />
                      <circle cx={slider1Px + sliderW + 6} cy={groundY - 11} r={3} fill={SCENE_COLORS.mechanicsApparatus.puttyClay} />
                    </g>
                  )}

                  {/* 速度矢量标注 */}
                  {showVectors && trackSliders.v1 !== 0 && (
                    <g>
                      <PhysicsVectorArrow
                        originDesign={{ x: slider1Px + sliderW / 2, y: groundY - s1H - 30 }}
                        vector={{ x: trackSliders.v1, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                      />
                      <text
                        x={slider1Px + sliderW / 2 + (trackSliders.v1 > 0 ? 15 : -15)}
                        y={groundY - s1H - 32}
                        fontSize={canvasSize.font(9)}
                        fill={PHYSICS_COLORS.velocity}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        v₁={trackSliders.v1.toFixed(2)}m/s
                      </text>
                    </g>
                  )}
                </g>
              )
            })()}

            {/* 滑块 2 (被碰滑块) */}
            {(() => {
              const slider2Px = toTrackPx(trackSliders.x2)
              const sliderW = (experiment.sliderLength / 1.2) * 760
              const plateW = Math.max(8, (experiment.plateWidth_m / 1.2) * 760)
              const s2H = 22

              return (
                <g id="slider-2">
                  <rect
                    x={slider2Px}
                    y={groundY - s2H}
                    width={sliderW}
                    height={s2H}
                    rx={3}
                    fill={SCENE_COLORS.mechanicsApparatus.slider2Body}
                    stroke={SCENE_COLORS.mechanicsApparatus.slider2Stroke}
                    strokeWidth={1.5}
                  />
                  <line x1={slider2Px + 16} y1={groundY - s2H + 4} x2={slider2Px + 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider2Slot} strokeWidth={1} />
                  <line x1={slider2Px + sliderW - 16} y1={groundY - s2H + 4} x2={slider2Px + sliderW - 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider2Slot} strokeWidth={1} />

                  {/* 挡光片 */}
                  <rect
                    x={slider2Px + sliderW / 2 - plateW / 2}
                    y={groundY - s2H - 18}
                    width={plateW}
                    height={18}
                    fill={SCENE_COLORS.mechanicsApparatus.plateBody}
                    stroke={SCENE_COLORS.mechanicsApparatus.plateBorder}
                    strokeWidth={0.8}
                    rx={1}
                  />
                  <text
                    x={slider2Px + sliderW / 2}
                    y={groundY - s2H - 21}
                    fontSize={canvasSize.font(7)}
                    fill={SCENE_COLORS.mechanicsApparatus.slider2Stroke}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    Δx={experiment.plateWidth_mm}mm
                  </text>

                  <text
                    x={slider2Px + sliderW / 2}
                    y={groundY - 7}
                    fontSize={canvasSize.font(9)}
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    m₂={experiment.m2.toFixed(2)}kg
                  </text>

                  {/* 滑块 2 左端碰撞缓冲受体 */}
                  <rect x={slider2Px - 2} y={groundY - 18} width={3} height={14} fill={SCENE_COLORS.mechanicsApparatus.airTrackBeam} rx={1} />

                  {showVectors && trackSliders.v2 !== 0 && (
                    <g>
                      <PhysicsVectorArrow
                        originDesign={{ x: slider2Px + sliderW / 2, y: groundY - s2H - 30 }}
                        vector={{ x: trackSliders.v2, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                        color={PHYSICS_COLORS.elasticForce}
                      />
                      <text
                        x={slider2Px + sliderW / 2 + 15}
                        y={groundY - s2H - 32}
                        fontSize={canvasSize.font(9)}
                        fill={PHYSICS_COLORS.elasticForce}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        v₂={trackSliders.v2.toFixed(2)}m/s
                      </text>
                    </g>
                  )}
                </g>
              )
            })()}

            {/* 碰撞瞬间火花/冲击波特效 */}
            {Math.abs(time - experiment.t_collision) < 0.18 && (
              <g transform={`translate(${toTrackPx(experiment.collisionPos)}, ${groundY - 11})`}>
                <circle r={12} fill={SCENE_COLORS.mechanicsApparatus.collisionSpark} opacity={0.4} />
                <circle r={6} fill={SCENE_COLORS.mechanicsApparatus.collisionSparkCore} opacity={0.8} />
              </g>
            )}

            {/* 4. 动量守恒矢量对比指示条 (下方) */}
            <g transform={`translate(40, ${groundY + 36})`}>
              <rect x={0} y={0} width={mapMomentumBar(p1)} height={8} fill={PHYSICS_COLORS.momentum} opacity={0.85} rx={2} />
              <rect x={mapMomentumBar(Math.max(0, p1))} y={0} width={mapMomentumBar(p2)} height={8} fill={PHYSICS_COLORS.impulse} opacity={0.85} rx={2} />
              <text x={mapMomentumBar(Math.abs(pTotal)) + 8} y={7} fontSize={canvasSize.font(9)} fill={PHYSICS_COLORS.momentum} fontWeight="bold">
                p_总 = {pTotal.toFixed(3)} kg·m/s (守恒)
              </text>
            </g>

            {/* 5. 顶部实验阶段提示徽章 */}
            <g transform={`translate(${DESIGN_WIDTH / 2}, 20)`}>
              {(() => {
                let statusText = '① 滑块 1 匀速滑向光电门 1'
                if (time >= experiment.t_gate1_enter && time <= experiment.t_gate1_leave) {
                  statusText = '② 光电门 1 正在挡光测速 (Δt₁)'
                } else if (time < experiment.t_collision) {
                  statusText = '③ 滑块 1 接近静止滑块 2'
                } else if (Math.abs(time - experiment.t_collision) < 0.2) {
                  statusText = '④ 💥 两滑块发生碰撞，系统内力相互作用'
                } else if (time <= (experiment.isRebounded ? experiment.t_gate1_rebound_leave : experiment.t_gate2_leave)) {
                  statusText = experiment.isRebounded
                    ? '⑤ 碰后滑块 1 反弹向左回穿门 1，滑块 2 向右穿过门 2'
                    : '⑤ 碰后两滑块同向运动，滑块 2 穿过光电门 2'
                } else {
                  statusText = '✓ 实验完成：比对碰前总动量与碰后总动量'
                }

                return (
                  <g>
                    <rect x={-150} y={-11} width={300} height={22} rx={11} fill={SCENE_COLORS.labels.glassPanelBg} stroke={SCENE_COLORS.mechanicsApparatus.puttyNeedle} strokeWidth={1} />
                    <text fontSize={canvasSize.font(9.5)} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} fontWeight="bold" textAnchor="middle" y={3}>
                      {statusText}
                    </text>
                  </g>
                )
              })()}
            </g>
          </g>
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
