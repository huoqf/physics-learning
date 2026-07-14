/**
 * 绳与弹簧瞬时切断 — SVG 场景组件
 *
 * 布局：splitH（420×650）
 * 坐标系统：viewBox 固定常量 + 设计坐标（方式 A）
 */

import { useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { Ball, PhysicsGround, VectorArrow, VectorDefs } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { BALL_RADIUS, calculateBallBFallTime } from '@/physics/dynamics/spring-force'
import { useSpringForceCutRope, CUT_ROPE_DESIGN } from '../hooks/useSpringForceCutRope'

const DESIGN_HEIGHT = CUT_ROPE_DESIGN.height

/** 力矢量箭头缩放系数 [px/N] */
const FORCE_ARROW_SCALE = 3.0

export default function SpringForceCutRopeScene() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  const {
    k, m, isCut,
    showVectors,
    positions: { yA, yB, yC, yD },
    forces: {
      fA_spring, fA_rope, fA_grav, a_A,
      fB_rope, fB_grav, a_B,
      fC_rope, fC_spring, fC_grav, a_C,
      fD_spring, fD_grav, a_D,
      fSpring2,
    },
    tCut,
  } = useSpringForceCutRope()

  // 剪断后自动播放（最慢速），B 球落地后自动停播并恢复原速
  // 注意：用户主动按"暂停"后不应被强制重启，因此把"剪断触发"与"落地停止"拆为两个 effect
  const { isPlaying, setIsPlaying, setSpeed } = useAnimationStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      setSpeed: s.setSpeed,
    })),
  )

  // 跟踪上一次 isCut 状态，仅在 0→1 跳变时触发播放，避免暂停后被自动重启
  const prevIsCutRef = useRef(isCut)

  // 剪断瞬间触发播放（最慢速）；解除剪断时停止并恢复原速
  useEffect(() => {
    if (isCut === 1 && prevIsCutRef.current === 0) {
      setSpeed(0.25)
      setIsPlaying(true)
    }
    if (isCut === 0 && prevIsCutRef.current === 1) {
      setSpeed(1)
      setIsPlaying(false)
    }
    prevIsCutRef.current = isCut
  }, [isCut, setSpeed, setIsPlaying])

  // B 球落地后自动停播并恢复原速（仅在播放中检查，不强制重启用户暂停）
  useEffect(() => {
    if (isCut === 1 && isPlaying) {
      const fallTime = calculateBallBFallTime(
        m,
        k,
        CUT_ROPE_DESIGN.ceilY,
        CUT_ROPE_DESIGN.groundY,
      )
      if (tCut >= fallTime) {
        setSpeed(1)
        setIsPlaying(false)
      }
    }
  }, [isCut, isPlaying, tCut, m, k, setSpeed, setIsPlaying])

  const { ceilY, xLeft, xRight, dividerX, bracketWidth, groundY } = CUT_ROPE_DESIGN
  // 地面分段：左侧系统一、右侧系统二各一段（避开中间分界线）
  const groundSegmentWidth = (dividerX - 20) - 20

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.elasticForce, PHYSICS_COLORS.gravity, PHYSICS_COLORS.tension]} />
      </defs>

      {/* 中间分界虚线 */}
      <line
        x1={dividerX}
        y1={20}
        x2={dividerX}
        y2={DESIGN_HEIGHT - 20}
        stroke={PHYSICS_COLORS.grid}
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* 系统标题 */}
      <text x={xLeft} y={35} fontSize={font(14)} fontWeight="bold" fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        系统一
      </text>
      <text x={xRight} y={35} fontSize={font(14)} fontWeight="bold" fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        系统二
      </text>

      {/* 天花板支架 */}
      <PhysicsGround x={xLeft - bracketWidth / 2} y={ceilY} width={bracketWidth} type="bracket" />
      <PhysicsGround x={xRight - bracketWidth / 2} y={ceilY} width={bracketWidth} type="bracket" />

      {/* 地面（B 球落地参照物）— 左右各一段，避开中间分界线 */}
      <PhysicsGround
        x={20}
        y={groundY}
        width={groundSegmentWidth}
        type="ground"
        appearance={{ color: PHYSICS_COLORS.axis, showBaseShadow: true }}
      />
      <PhysicsGround
        x={dividerX + 5}
        y={groundY}
        width={groundSegmentWidth - 5}
        type="ground"
        appearance={{ color: PHYSICS_COLORS.axis, showBaseShadow: true }}
      />

      {/* ── 系统一：弹簧在上，绳在下 ── */}
      <Spring
        x1={xLeft}
        y1={ceilY}
        x2={xLeft}
        y2={yA - BALL_RADIUS}
        coils={12}
        radius={14}
      />
      <Ball cx={xLeft} cy={yA} r={BALL_RADIUS} type="steel" />
      <text x={xLeft - 24} y={yA + 6} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight}>A</text>

      {/* 系统一细绳 */}
      {isCut === 0 ? (
        <line
          x1={xLeft} y1={yA + BALL_RADIUS} x2={xLeft} y2={yB - BALL_RADIUS}
          stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={2}
        />
      ) : (
        <g>
          <line x1={xLeft} y1={yA + BALL_RADIUS} x2={xLeft} y2={yA + BALL_RADIUS + 15}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.5} strokeDasharray="2,2" opacity={0.5} />
          <line x1={xLeft} y1={yB - BALL_RADIUS - 15} x2={xLeft} y2={yB - BALL_RADIUS}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.5} strokeDasharray="2,2" opacity={0.5} />
          {tCut < 1.0 && (
            <g transform={`translate(${xLeft}, ${(yA + yB) / 2})`}>
              <line x1={-6} y1={-6} x2={6} y2={6} stroke={colors.danger[500]} strokeWidth={2.5} />
              <line x1={6} y1={-6} x2={-6} y2={6} stroke={colors.danger[500]} strokeWidth={2.5} />
            </g>
          )}
        </g>
      )}
      <Ball cx={xLeft} cy={yB} r={BALL_RADIUS} type="steel" />
      <text x={xLeft - 24} y={yB + 6} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight}>B</text>

      {/* ── 系统二：绳在上，弹簧在下 ── */}
      {isCut === 0 ? (
        <line
          x1={xRight} y1={ceilY} x2={xRight} y2={yC - BALL_RADIUS}
          stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={2}
        />
      ) : (
        <g>
          <line x1={xRight} y1={ceilY} x2={xRight} y2={ceilY + 15}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.5} strokeDasharray="2,2" opacity={0.5} />
          <line x1={xRight} y1={yC - BALL_RADIUS - 15} x2={xRight} y2={yC - BALL_RADIUS}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.5} strokeDasharray="2,2" opacity={0.5} />
          {tCut < 1.0 && (
            <g transform={`translate(${xRight}, ${(ceilY + yC) / 2})`}>
              <line x1={-6} y1={-6} x2={6} y2={6} stroke={colors.danger[500]} strokeWidth={2.5} />
              <line x1={6} y1={-6} x2={-6} y2={6} stroke={colors.danger[500]} strokeWidth={2.5} />
            </g>
          )}
        </g>
      )}

      <Ball cx={xRight} cy={yC} r={BALL_RADIUS} type="steel" />
      <text x={xRight + 22} y={yC + 6} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight}>C</text>

      <Spring
        x1={xRight} y1={yC + BALL_RADIUS} x2={xRight} y2={yD - BALL_RADIUS}
        coils={12} radius={14}
      />

      <Ball cx={xRight} cy={yD} r={BALL_RADIUS} type="steel" />
      <text x={xRight + 22} y={yD + 6} fontSize={font(13)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight}>D</text>

      {/* ── 受力矢量 ── */}
      {showVectors && (isCut === 0 || tCut < 1.2) && (
        <g>
          {/* A 球受力 */}
          <VectorArrow originPixel={{ x: xLeft, y: yA }} vector={{ x: 0, y: fA_grav * FORCE_ARROW_SCALE }}
            type="gravity" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fA_grav * FORCE_ARROW_SCALE)} />
          <text x={xLeft + 20} y={yA + 32} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.gravity}>
            G=mg={(-fA_grav).toFixed(1)}N
          </text>

          <VectorArrow originPixel={{ x: xLeft, y: yA }} vector={{ x: 0, y: fA_spring * FORCE_ARROW_SCALE }}
            type="elasticForce" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fA_spring * FORCE_ARROW_SCALE)} />
          <text x={xLeft + 20} y={yA - 28} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.elasticForce}>
            {isCut === 1 ? `F弹=${fA_spring.toFixed(1)}N` : `F弹=2mg=${fA_spring.toFixed(1)}N`}
          </text>

          {isCut === 0 && (
            <g>
              <VectorArrow originPixel={{ x: xLeft, y: yA }} vector={{ x: 0, y: fA_rope * FORCE_ARROW_SCALE }}
                type="tension" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
                pixelLength={Math.abs(fA_rope * FORCE_ARROW_SCALE)} />
              <text x={xLeft - 20} y={yA + 18} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.tension} textAnchor="end">
                T绳=mg={(-fA_rope).toFixed(1)}N
              </text>
            </g>
          )}

          {isCut === 1 && Math.abs(a_A) > 0.05 && (
            <VectorArrow originPixel={{ x: xLeft - 40, y: yA }} vector={{ x: 0, y: a_A }}
              type="acceleration" sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.abs(a_A) * (30 / 9.8)} label={`aA=${Math.abs(a_A).toFixed(1)}`} />
          )}
          {isCut === 1 && Math.abs(a_A) <= 0.05 && (
            <g transform={`translate(${xLeft - 40}, ${yA})`}>
              <circle cx={0} cy={0} r={4} fill={SCENE_COLORS.pendulum.equilibrium} />
              <text x={-10} y={5} fontSize={font(12)} fontWeight="bold" fill={colors.success[600]} textAnchor="end">aA = 0</text>
            </g>
          )}

          {/* B 球受力 */}
          <VectorArrow originPixel={{ x: xLeft, y: yB }} vector={{ x: 0, y: fB_grav * FORCE_ARROW_SCALE }}
            type="gravity" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fB_grav * FORCE_ARROW_SCALE)} />
          <text x={xLeft + 20} y={yB + 28} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.gravity}>
            G=mg={(-fB_grav).toFixed(1)}N
          </text>

          {isCut === 0 && (
            <g>
              <VectorArrow originPixel={{ x: xLeft, y: yB }} vector={{ x: 0, y: fB_rope * FORCE_ARROW_SCALE }}
                type="tension" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
                pixelLength={Math.abs(fB_rope * FORCE_ARROW_SCALE)} />
              <text x={xLeft - 20} y={yB - 18} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.tension} textAnchor="end">
                T绳=mg={fB_rope.toFixed(1)}N
              </text>
            </g>
          )}

          {isCut === 1 && Math.abs(a_B) > 0.05 && (
            <VectorArrow originPixel={{ x: xLeft - 40, y: yB }} vector={{ x: 0, y: a_B }}
              type="acceleration" sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.abs(a_B) * (30 / 9.8)} label={`aB=${Math.abs(a_B).toFixed(1)}`} />
          )}

          {/* C 球受力 */}
          <VectorArrow originPixel={{ x: xRight, y: yC }} vector={{ x: 0, y: fC_grav * FORCE_ARROW_SCALE }}
            type="gravity" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fC_grav * FORCE_ARROW_SCALE)} />
          <text x={xRight + 20} y={yC + 26} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.gravity}>
            G=mg={(-fC_grav).toFixed(1)}N
          </text>

          <VectorArrow originPixel={{ x: xRight, y: yC }} vector={{ x: 0, y: fC_spring * FORCE_ARROW_SCALE }}
            type="elasticForce" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fC_spring * FORCE_ARROW_SCALE)} />
          <text x={xRight + 20} y={yC + 46} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.elasticForce}>
            {isCut === 1 ? `F弹=${Math.abs(fSpring2).toFixed(1)}N` : `F弹=mg=${fSpring2.toFixed(1)}N`}
          </text>

          {isCut === 0 && (
            <g>
              <VectorArrow originPixel={{ x: xRight, y: yC }} vector={{ x: 0, y: fC_rope * FORCE_ARROW_SCALE }}
                type="tension" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
                pixelLength={Math.abs(fC_rope * FORCE_ARROW_SCALE)} />
              <text x={xRight - 20} y={yC - 28} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.tension} textAnchor="end">
                T绳=2mg={fC_rope.toFixed(1)}N
              </text>
            </g>
          )}

          {isCut === 1 && Math.abs(a_C) > 0.05 && (
            <VectorArrow originPixel={{ x: xRight + 40, y: yC }} vector={{ x: 0, y: a_C }}
              type="acceleration" sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.abs(a_C) * (30 / 9.8)} label={`aC=${Math.abs(a_C).toFixed(1)}`} />
          )}
          {isCut === 1 && Math.abs(a_C) <= 0.05 && (
            <g transform={`translate(${xRight + 40}, ${yC})`}>
              <circle cx={0} cy={0} r={4} fill={SCENE_COLORS.pendulum.equilibrium} />
              <text x={10} y={5} fontSize={font(12)} fontWeight="bold" fill={colors.success[600]} textAnchor="start">aC = 0</text>
            </g>
          )}

          {/* D 球受力 */}
          <VectorArrow originPixel={{ x: xRight, y: yD }} vector={{ x: 0, y: fD_grav * FORCE_ARROW_SCALE }}
            type="gravity" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fD_grav * FORCE_ARROW_SCALE)} />
          <text x={xRight + 20} y={yD + 28} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.gravity}>
            G=mg={(-fD_grav).toFixed(1)}N
          </text>

          <VectorArrow originPixel={{ x: xRight, y: yD }} vector={{ x: 0, y: fD_spring * FORCE_ARROW_SCALE }}
            type="elasticForce" sceneScale={IDENTITY_SCENE_SCALE} strokeWidth={1.5}
            pixelLength={Math.abs(fD_spring * FORCE_ARROW_SCALE)} />
          <text x={xRight + 20} y={yD - 28} fontSize={font(11)} fontWeight="bold" fill={PHYSICS_COLORS.elasticForce}>
            {isCut === 1 ? `F弹=${Math.abs(fSpring2).toFixed(1)}N` : `F弹=mg=${fD_spring.toFixed(1)}N`}
          </text>

          {isCut === 1 && Math.abs(a_D) > 0.05 && (
            <VectorArrow originPixel={{ x: xRight + 40, y: yD }} vector={{ x: 0, y: a_D }}
              type="acceleration" sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.abs(a_D) * (30 / 9.8)} label={`aD=${Math.abs(a_D).toFixed(1)}`} />
          )}
          {isCut === 1 && Math.abs(a_D) <= 0.05 && (
            <g transform={`translate(${xRight + 40}, ${yD})`}>
              <circle cx={0} cy={0} r={4} fill={SCENE_COLORS.pendulum.equilibrium} />
              <text x={10} y={5} fontSize={font(12)} fontWeight="bold" fill={colors.success[600]} textAnchor="start">aD = 0</text>
            </g>
          )}
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
