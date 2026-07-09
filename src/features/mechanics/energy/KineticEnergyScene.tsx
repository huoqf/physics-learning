import { VectorArrow, SVGSingleBar, Block, PhysicsGround } from '@/components/Physics'
import { useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import { createSceneScaleFromViewport } from '@/scene'
import type { KEModelState } from '@/physics/kineticEnergy'
import { GRAVITY } from '@/physics/constants'

const KE_SCENE_LAYOUT = {
  leftPaddingRatio: 0.06,
  rightPaddingRatio: 0.048,
  groundYRatio: 0.85,
  ballToTrackRatio: 0.10,
  ballMaxWidthRatio: 0.025,
  barPanelWidthRatio: 0.13,
  barBaselineRatio: 0.45,
} as const

interface KineticEnergySceneProps {
  state: KEModelState
  params: {
    m: number
    v0?: number
    F?: number
    s?: number
    R?: number
    mu?: number
    mode?: number
  }
  canvasSize: { width: number; height: number; font: (size: number) => number }
  vp: { visibleX: number; visibleY: number; visibleW: number; visibleH: number; centerX: number; centerY: number }
  showVectors: boolean
  v_c: number
  scale: number
  time: number
}

export function KineticEnergyScene({
  state,
  params,
  canvasSize,
  vp,
  showVectors,
  v_c,
  scale,
  time,
}: KineticEnergySceneProps) {
  const { font } = canvasSize

  const mode = params.mode ?? 0
  const m = params.m
  const v0 = params.v0 ?? 0
  const F_pull = params.F ?? 15
  const s_target = params.s ?? 6
  const R = params.R ?? 5
  const mu = params.mu ?? 0.15

  const padding = canvasSize.width * KE_SCENE_LAYOUT.leftPaddingRatio
  const groundY = canvasSize.height * KE_SCENE_LAYOUT.groundYRatio
  const objW = canvasSize.width * 0.08
  const objH = objW

  const ballR = mode === 0
    ? CANVAS_STYLE.OBJECT.ball
    : Math.max(
        CANVAS_STYLE.OBJECT.minRadius,
        Math.min(R * scale * KE_SCENE_LAYOUT.ballToTrackRatio, canvasSize.width * KE_SCENE_LAYOUT.ballMaxWidthRatio)
      )

  let ballCX: number
  let ballCY: number
  let tangentDirX: number
  let tangentDirY: number
  let inwardDirX: number
  let inwardDirY: number

  if (mode === 0) {
    ballCX = padding + state.x * scale
    ballCY = groundY - objH
    tangentDirX = 1
    tangentDirY = 0
    inwardDirX = 0
    inwardDirY = -1
  } else if (state.phase === 0) {
    const trackCX = padding + state.x * scale
    const trackCY = (groundY - R * scale) + state.y * scale
    const centerCX = padding + R * scale
    const centerCY = groundY - R * scale
    const dxToCenter = centerCX - trackCX
    const dyToCenter = centerCY - trackCY
    const distToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter)
    inwardDirX = distToCenter > 0 ? dxToCenter / distToCenter : 0
    inwardDirY = distToCenter > 0 ? dyToCenter / distToCenter : 0
    // 凹型弧：球在轨道内侧（靠近圆心方向），球心沿 inwardDir 偏移
    ballCX = trackCX + ballR * inwardDirX
    ballCY = trackCY + ballR * inwardDirY
    tangentDirX = -inwardDirY
    tangentDirY = inwardDirX
  } else {
    ballCX = padding + state.x * scale
    ballCY = groundY - ballR
    tangentDirX = 1
    tangentDirY = 0
    inwardDirX = 0
    inwardDirY = -1
  }

  const carX = padding + state.x * scale

  const initialEk = 0.5 * m * v0 * v0
  const deltaEk = state.Ek - initialEk

  const maxBarH = 55
  const maxEnergyVal = Math.max(
    mode === 0 ? (F_pull * s_target) : (m * 9.8 * R),
    10
  )
  const barW_H = maxEnergyVal > 0 ? (Math.abs(state.W) / maxEnergyVal) * maxBarH : 0
  const barEk_H = maxEnergyVal > 0 ? (Math.abs(deltaEk) / maxEnergyVal) * maxBarH : 0

  const pPhase = (time * 10) % 1
  const particles = [0, 1, 2, 3].map(i => {
    const phase = (pPhase + i * 0.25) % 1
    const x = carX + objW + 10 + (1 - phase) * 35
    const opacity = phase < 0.2 ? phase / 0.2 : phase > 0.8 ? (1 - phase) / 0.2 : 1
    return { x, opacity }
  })

  const sceneScale = useMemo(() => {
    const refF = mode === 0 ? F_pull : Math.max(m * 9.8 * 1.5, 15)
    const refV = mode === 0 ? Math.sqrt(v0 * v0 + 2 * (F_pull / m) * s_target) : Math.sqrt(v0 * v0 + 2 * 9.8 * R)
    return createSceneScaleFromViewport(vp, 'transform', {
      designWidth: canvasSize.width,
      designHeight: canvasSize.height,
      refMagnitudes: {
        velocity: refV,
        force: refF,
        gravity: refF,
        normalForce: refF,
        friction: refF,
        appliedForce: refF,
      },
    })
  }, [vp, canvasSize.width, canvasSize.height, mode, m, v0, F_pull, s_target, R])

  return (
    <svg width={canvasSize.width} height={canvasSize.height} className="bg-transparent">
      <defs>
        <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
        </radialGradient>
      </defs>

      <PhysicsGround
        x={padding * 0.5}
        y={groundY}
        width={canvasSize.width - padding}
        appearance={{ showHatch: true }}
      />

      {mode === 1 && (
        <g>
          {/* 凹型1/4圆弧轨道：sweep-flag=0 绘制内凹弧（碗形），底端切线水平 */}
          <path
            d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 0 ${padding + R * scale} ${groundY}`}
            fill="none"
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={STROKE.trackLine}
          />
          <path
            d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 0 ${padding + R * scale} ${groundY}`}
            fill="none"
            stroke={colors.neutral[100]}
            strokeWidth={STROKE.objectThin}
            opacity={0.7}
          />
          <line
            x1={padding}
            y1={groundY - R * scale}
            x2={padding - 6}
            y2={groundY - R * scale + 12}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={1.5}
          />
        </g>
      )}

      {mode === 0 && state.phase === 0 && state.v > 0.05 && (
        <g stroke={PHYSICS_COLORS.work} strokeWidth={1.5}>
          {particles.map((p, idx) => (
            <circle
              key={`p-stream-${idx}`}
              cx={p.x}
              cy={groundY - objH * 0.5}
              r={1.8}
              opacity={p.opacity}
              fill={PHYSICS_COLORS.work}
            />
          ))}
        </g>
      )}

      {mode === 1 && state.phase === 0 && mu > 0.01 && state.v > 0.05 && (
        <line
          x1={ballCX - tangentDirX * (ballR + 2)}
          y1={ballCY - tangentDirY * (ballR + 2)}
          x2={ballCX - tangentDirX * (ballR + 18)}
          y2={ballCY - tangentDirY * (ballR + 18)}
          stroke={PHYSICS_COLORS.friction}
          strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.reference.join(',')}
          opacity={0.8 * (state.v / (v_c > 0 ? v_c : 1))}
        />
      )}

      {(() => {
        const panelW = canvasSize.width * KE_SCENE_LAYOUT.barPanelWidthRatio
        const barW = panelW * 0.22
        const bar1X = panelW * 0.12
        const eqX = panelW * 0.5
        const bar2X = panelW * 0.62
        const eqY = -barW * 1.1
        return (
          <g transform={`translate(${canvasSize.width - padding - panelW}, ${groundY - canvasSize.height * KE_SCENE_LAYOUT.barBaselineRatio})`}>
            <g transform={`translate(0, ${canvasSize.height * KE_SCENE_LAYOUT.barBaselineRatio * 0.5})`}>
              <line x1={barW * 0.5} y1={0} x2={panelW - barW * 0.5} y2={0} stroke={CANVAS_COLORS.grid} strokeWidth={0.8} />

              <SVGSingleBar
                x={bar1X}
                baseY={0}
                height={barW_H}
                barWidth={barW}
                color={PHYSICS_COLORS.work}
                label="功 W"
                valueText={`${state.W >= 0 ? '+' : ''}${state.W.toFixed(1)}J`}
                font={font}
                showTrack={false}
              />

              <text x={eqX} y={eqY} fontSize={font(12)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
                =
              </text>

              <SVGSingleBar
                x={bar2X}
                baseY={0}
                height={barEk_H}
                barWidth={barW}
                color={PHYSICS_COLORS.kineticEnergy}
                label="ΔEk"
                valueText={`${deltaEk >= 0 ? '+' : ''}${deltaEk.toFixed(1)}J`}
                font={font}
                showTrack={false}
              />
            </g>
          </g>
        )
      })()}

      {mode === 0 ? (
        <g transform={`translate(${carX}, ${groundY - objH})`}>
          <Block
            x={0}
            y={0}
            width={objW}
            height={objH}
            type="woodCart"
            label={`${m.toFixed(1)}kg`}
            strokeWidth={1.5}
          />

          {showVectors && state.F > 0.1 && (
            <VectorArrow
              origin={{ x: objW, y: objH * 0.5 }}
              vector={{ x: state.F, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
              label="F"
            />
          )}

          {showVectors && state.v > 0.05 && (
            <VectorArrow
              origin={{ x: objW * 0.5, y: -3.5 }}
              vector={{ x: state.v, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              label="v"
            />
          )}
        </g>
      ) : (
        <g>
          <circle
            cx={ballCX}
            cy={ballCY}
            r={ballR}
            fill="url(#steel-sphere-grad)"
            stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
            strokeWidth={STROKE.objectLine}
          />

          <g>
            {/* 切向合外力 F_net（驱动 ΔEk 变化的力） */}
            {Math.abs(state.F) > 0.1 && (
              <VectorArrow
                origin={{ x: ballCX, y: -ballCY }}
                vector={{ x: state.F * tangentDirX, y: -state.F * tangentDirY }}
                type="force"
                sceneScale={sceneScale}
                label="F合"
              />
            )}

            {/* 曲面段：逐力分解（重力、法向力、摩擦力） */}
            {state.phase === 0 && (() => {
              const g = GRAVITY
              const mg = m * g
              // 凹型弧：法向力 N = mg*sinθ + mv²/R（高考标准：底端 F_N - mg = mv²/R）
              const normalForce = mg * Math.sin(state.theta) + m * state.v * state.v / R
              const fFriction = mu * normalForce
              return (
                <g>
                  {/* 重力 mg：竖直向下 */}
                  {mg > 0.1 && (
                    <VectorArrow
                      origin={{ x: ballCX, y: -ballCY }}
                      vector={{ x: 0, y: -mg }}
                      type="gravity"
                      sceneScale={sceneScale}
                      strokeWidth={STROKE.vectorSub}
                      label="mg"
                    />
                  )}
                  {/* 法向力 N：指向圆心（凹型弧内侧） */}
                  {normalForce > 0.1 && (
                    <VectorArrow
                      origin={{ x: ballCX, y: -ballCY }}
                      vector={{ x: normalForce * inwardDirX, y: -normalForce * inwardDirY }}
                      type="normalForce"
                      sceneScale={sceneScale}
                      strokeWidth={STROKE.vectorSub}
                      label="N"
                    />
                  )}
                  {/* 摩擦力 f：与运动方向相反（沿切线上坡） */}
                  {fFriction > 0.1 && (
                    <VectorArrow
                      origin={{ x: ballCX, y: -ballCY }}
                      vector={{ x: -fFriction * tangentDirX, y: fFriction * tangentDirY }}
                      type="friction"
                      sceneScale={sceneScale}
                      strokeWidth={STROKE.vectorSub}
                      label="f"
                    />
                  )}
                </g>
              )
            })()}
          </g>

          {/* 速度 v：沿切线方向（下滑方向） */}
          {showVectors && state.v > 0.05 && (
            <VectorArrow
              origin={{ x: ballCX, y: -ballCY }}
              vector={{ x: state.v * tangentDirX, y: -state.v * tangentDirY }}
              type="velocity"
              sceneScale={sceneScale}
              label="v"
            />
          )}
        </g>
      )}

      {mode === 1 && (
        <g transform={`translate(${padding}, ${canvasSize.height * 0.75})`}>
          <rect width={80} height={18} rx={3} fill={
            state.phase === 0 ? colors.neutral[100] : colors.neutral[200]
          } stroke={
            state.phase === 0 ? colors.neutral[400] : colors.neutral[500]
          } strokeWidth={0.8} />
          <text x={40} y={12} fontSize={Math.max(CANVAS_STYLE.FONT.small - 1, canvasSize.width * 0.016 * 0.8)} fontWeight="bold" textAnchor="middle" fill={
            state.phase === 0 ? colors.neutral[700] : colors.neutral[700]
          }>
            {state.phase === 0 ? '曲面下滑中' : '水平滑行中'}
          </text>
        </g>
      )}
    </svg>
  )
}
