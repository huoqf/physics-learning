import { VectorArrow, PhysicsVectorArrow, VectorDefs, ParticleTrajectory } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics'
import { VelocityTimeChart } from '@/components/Chart'
import { Card } from '@/components/UI'
import { electricForceDir } from '@/physics/magnetism/forces'

import { useChargeInEFieldPhysics, drawAngleArc, TERMINAL_CORE_RADIUS, INTERSECTION_DOT_RADIUS, PLATE_GAP, PLATE_LENGTH, PARTICLE_MASS } from './hooks/useChargeInEFieldPhysics'
import { useChargeInEFieldCharts } from './hooks/useChargeInEFieldCharts'

export default function ChargeInEField() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const U = params.U ?? 150
  const v0 = params.v0 ?? 15
  const q = params.q ?? 2
  const freq = params.freq ?? 30
  const isAC = params.isAC ?? 0
  const useGravity = params.useGravity ?? 0
  const phi0 = params.phi0 ?? 0

  // 物理计算 & 场景几何
  const physics = useChargeInEFieldPhysics({
    U, v0, q, freq, isAC, useGravity, phi0,
    time, showVectors, showGrid, vp, setIsPlaying,
  })

  // 图表数据
  const charts = useChargeInEFieldCharts({
    points: physics.simResult.points,
    v0, U, q, freq, isAC, phi0, useGravity,
    tSim: physics.tSim,
    tEnd: physics.simResult.tEnd,
  })

  const {
    simResult, tSim, ended, currentState,
    midY, startX, topPlateY, bottomPlateY,
    cx, cy, curFieldSign,
    historyPoints, predictedPoints, tailPoints,
    sceneScale,
    vx_px, vy_px, totalPxLen, vxPxLen, vyPxLen,
    tangentData, gridLines,
  } = physics

  const {
    vtPoints, vxSeries, chartYBounds,
    energyData, energySeries, energyYBounds,
  } = charts

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* 图像区 (放上方，占 h-[260px] 左右，并列展示 v-t & E-t，无切换按钮，最大化绘图空间) */}
      <Card className="h-[260px] p-3 select-none">
        <div className="w-full h-full flex gap-4">
          <div className="flex-1 min-w-0 h-full relative">
            <VelocityTimeChart
              points={vtPoints}
              domainPoints={vtPoints}
              additionalSeries={vxSeries}
              currentTime={tSim}
              tMax={simResult.tEnd}
              vRange={[chartYBounds.min, chartYBounds.max]}
              title="速度分量 v_y & v_x 随时间变化"
              showArea
            />
          </div>
          <div className="flex-1 min-w-0 h-full relative">
            <VelocityTimeChart
              points={energyData.ekPoints}
              domainPoints={energyData.ekPoints}
              additionalSeries={energySeries}
              currentTime={tSim}
              tMax={simResult.tEnd}
              vRange={[energyYBounds.min, energyYBounds.max]}
              yLabel="E (mJ)"
              title="能量转换 (动能 E_k, 电势能 E_p, 重力势能 E_g, 总能量 E_总)"
              series="primary"
            />
          </div>
        </div>
      </Card>

      {/* 动画反馈区 (放下方，max 限死 splitV 设计尺寸防止 scale > 1 放大) */}
      <Card className="flex-1 min-h-0 max-w-[840px] max-h-[325px] p-3 relative flex items-center justify-center overflow-hidden">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="select-none"
        >
          <defs>
            <VectorDefs
              colors={[
                PHYSICS_COLORS.velocity,
                PHYSICS_COLORS.velocityY,
                PHYSICS_COLORS.acceleration,
                PHYSICS_COLORS.electricForce,
                PHYSICS_COLORS.gravity,
              ]}
            />
          </defs>

          {/* 网格参考 */}
          {gridLines}

          {/* 粒子发射枪 */}
          <rect
            x={startX - 24}
            y={midY - 8}
            width={24}
            height={16}
            fill={SCENE_COLORS.electricalApparatus.terminalBody}
            rx={2}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
          />
          <circle cx={startX - 24} cy={midY} r={TERMINAL_CORE_RADIUS} fill={SCENE_COLORS.electricalApparatus.terminalCore} />

          {/* 上极板 */}
          <line
            x1={startX}
            y1={topPlateY}
            x2={startX + 520}
            y2={topPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            strokeWidth={CANVAS_STYLE.stroke.groundLine}
            strokeLinecap="round"
          />
          <text
            x={startX - 15}
            y={topPlateY + 5}
            fontSize={font(14)}
            fontWeight="bold"
            textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
          >
            {curFieldSign > 0 ? '＋' : '－'}
          </text>

          {/* 下极板 */}
          <line
            x1={startX}
            y1={bottomPlateY}
            x2={startX + 520}
            y2={bottomPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
            strokeWidth={CANVAS_STYLE.stroke.groundLine}
            strokeLinecap="round"
          />
          <text
            x={startX - 15}
            y={bottomPlateY + 5}
            fontSize={font(14)}
            fontWeight="bold"
            textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
          >
            {curFieldSign > 0 ? '－' : '＋'}
          </text>

          {/* 均匀分布的电场强度指示 */}
          {showVectors &&
            Array.from({ length: 7 }, (_, i) => {
              const fx = startX + 25 + (i * 470) / 6
              const startY = curFieldSign > 0 ? topPlateY + 6 : bottomPlateY - 6
              const endY = curFieldSign > 0 ? bottomPlateY - 6 : topPlateY + 6
              return (
                <g key={`E-line-${i}`}>
                  <line
                    x1={fx}
                    y1={startY}
                    x2={fx}
                    y2={endY}
                    stroke={PHYSICS_COLORS.electricField}
                    strokeWidth={CANVAS_STYLE.stroke.fieldLineThin}
                    strokeDasharray="5,4"
                  />
                  {/* 随极性反转的电场箭头 */}
                  <path
                    d={
                      curFieldSign > 0
                        ? `M ${fx - 4} ${midY - 3} L ${fx} ${midY + 3} L ${fx + 4} ${midY - 3}`
                        : `M ${fx - 4} ${midY + 3} L ${fx} ${midY - 3} L ${fx + 4} ${midY + 3}`
                    }
                    fill="none"
                    stroke={PHYSICS_COLORS.electricField}
                    strokeWidth={CANVAS_STYLE.stroke.fieldLine}
                  />
                </g>
              )
            })}
          {showVectors && (
            <text
              x={startX + 510}
              y={midY - 10}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.electricField}
              fontWeight="bold"
              textAnchor="end"
            >
              E (匀强电场)
            </text>
          )}

          {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
          {historyPoints.length > 0 && (
            <ParticleTrajectory
              historyPoints={historyPoints}
              predictedPoints={predictedPoints}
              tailPoints={tailPoints}
              isFocus
              chargeSign="+"
            />
          )}
          {/* 速度反向延长线与夹角可视化（平抛几何推论） */}
          {tangentData && (
            <g>
              {/* 1. 速度反向延长虚线 */}
              <line
                x1={tangentData.pxYStart > 0 ? startX : tangentData.cInterX} // 裁剪在区域内
                y1={tangentData.pxYStart}
                x2={cx}
                y2={cy}
                stroke={PHYSICS_COLORS.tangentLine}
                strokeWidth={CANVAS_STYLE.stroke.tangent}
                strokeDasharray="3,3"
              />

              {/* 2. 发射点到粒子的位移虚线 */}
              <line
                x1={startX}
                y1={midY}
                x2={cx}
                y2={cy}
                stroke={PHYSICS_COLORS.displacement}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
                opacity={0.7}
              />

              {/* 3. 水平中轴线交点圆圈与标记 */}
              <circle cx={tangentData.cInterX} cy={midY} r={INTERSECTION_DOT_RADIUS} fill={PHYSICS_COLORS.tangentLine} />
              <text
                x={tangentData.cInterX}
                y={midY - 8}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.tangentLine}
                fontWeight="bold"
                textAnchor="middle"
              >
                {currentState.x < PLATE_LENGTH ? 'x/2' : 'L/2'}
              </text>

              {/* 4. 速度偏角 θ 弧线与文字标注 */}
              {Math.abs(tangentData.theta) > 0.02 && (
                <g>
                  <path
                    d={drawAngleArc(tangentData.cInterX, midY, 0, tangentData.theta, 24)}
                    fill="none"
                    stroke={PHYSICS_COLORS.tangentLine}
                    strokeWidth={CANVAS_STYLE.stroke.tangent}
                  />
                  <text
                    x={tangentData.cInterX + 30 * Math.cos(tangentData.theta / 2)}
                    y={midY + 30 * Math.sin(tangentData.theta / 2) + 4}
                    fontSize={font(11)}
                    fill={PHYSICS_COLORS.tangentLine}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    θ
                  </text>
                </g>
              )}

              {/* 5. 位移偏角 α 弧线与文字标注 */}
              {Math.abs(tangentData.alpha) > 0.02 && (
                <g>
                  <path
                    d={drawAngleArc(startX, midY, 0, tangentData.alpha, 28)}
                    fill="none"
                    stroke={PHYSICS_COLORS.displacement}
                    strokeWidth={CANVAS_STYLE.stroke.tangent}
                  />
                  <text
                    x={startX + 36 * Math.cos(tangentData.alpha / 2)}
                    y={midY + 36 * Math.sin(tangentData.alpha / 2) + 4}
                    fontSize={font(11)}
                    fill={PHYSICS_COLORS.displacement}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    α
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 速度分量与速度分解虚线框 */}
          {showVectors && !ended && (
            <g>
              {/* 矩形分解虚线框 */}
              <line
                x1={cx + vx_px}
                y1={cy}
                x2={cx + vx_px}
                y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
              />
              <line
                x1={cx}
                y1={cy + vy_px}
                x2={cx + vx_px}
                y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
              />

              {/* v0 (水平分速度，经典蓝) */}
              <VectorArrow
                originDesign={{ x: cx, y: cy }}
                vector={{ x: currentState.vx, y: 0 }}
                type="velocityX"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={vxPxLen}
              />
              <text
                x={cx + vx_px + 8}
                y={cy + 3}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocityX}
                fontWeight="bold"
              >
                v₀
              </text>

              {/* vy (竖直分速度，浅蓝) */}
              {Math.abs(currentState.vy) > 0.05 && (
                <VectorArrow
                  originDesign={{ x: cx, y: cy }}
                  vector={{ x: 0, y: -currentState.vy }}
                  type="velocityY"
                  arrowType="physical-schematic"
                  sceneScale={sceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={vyPxLen}
                />
              )}
              <text
                x={cx - 3}
                y={cy + vy_px + (vy_px > 0 ? 12 : -4)}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocityY}
                fontWeight="bold"
                textAnchor="middle"
              >
                vᵧ
              </text>

              {/* 合速度 v (深蓝) */}
              <VectorArrow
                originDesign={{ x: cx, y: cy }}
                vector={{ x: currentState.vx, y: -currentState.vy }}
                type="velocity"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                pixelLength={totalPxLen}
              />
              <text
                x={cx + vx_px + 8}
                y={cy + vy_px + (vy_px > 0 ? 8 : -4)}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
              >
                v
              </text>

              {/* 电场力 F_E (紫色) */}
              {(() => {
                const eDir = electricForceDir({ x: 0, y: -curFieldSign }, q * 1e-6)
                const electricAccel = (q * 1e-6 * curFieldSign * U / PLATE_GAP) / PARTICLE_MASS
                return (
                  <PhysicsVectorArrow
                    originDesign={{ x: cx, y: cy }}
                    vector={{ x: eDir.x * electricAccel, y: eDir.y * electricAccel }}
                    type="electricForce"
                    sceneScale={sceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  />
                )
              })()}

              {/* 重力 mg (绿色) */}
              {useGravity === 1 && (
                <PhysicsVectorArrow
                  originDesign={{ x: cx, y: cy }}
                  vector={{ x: 0, y: -9.8 }}
                  type="gravity"
                  sceneScale={sceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                />
              )}
            </g>
          )}

          {/* 终止状态指示 */}
          {ended && (
            <g transform={`translate(${cx}, ${cy + (cy > midY ? -18 : 24)})`}>
              <rect x={-45} y={-14} width={90} height={20} fill={withAlpha(CANVAS_COLORS.labelText, 0.85)} rx={4} />
              <text fontSize={font(10)} fill={CANVAS_COLORS.objectFill} textAnchor="middle" fontWeight="bold" y={0}>
                {simResult.hitType === 'top' ? '撞击上极板' : simResult.hitType === 'bottom' ? '撞击下极板' : '已射出电场'}
              </text>
            </g>
          )}
        </AnimationSvgCanvas>
      </Card>
    </div>
  )
}
