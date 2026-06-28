import { useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CANVAS_STYLE, VECTOR_DISPLAY } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { Block } from '@/components/Physics/Block'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import type { KEModelState } from '@/physics/kineticEnergy'
import { GRAVITY } from '@/physics/constants'

const KE_SCENE_LAYOUT = {
  leftPaddingRatio: 0.06,
  rightPaddingRatio: 0.048,
  groundYRatio: 0.85,
  ballToTrackRatio: 0.10,
  ballMaxWidthRatio: 0.025,
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
  showVectors: boolean
  v_c: number
  scale: number
  time: number
}

export function KineticEnergyScene({
  state,
  params,
  canvasSize,
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
    ballCX = trackCX - ballR * inwardDirX
    ballCY = trackCY - ballR * inwardDirY
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

  const vMax = mode === 0 ? Math.sqrt(v0 * v0 + 2 * (F_pull / m) * s_target) : Math.sqrt(v0 * v0 + 2 * 9.8 * R)
  const fMax = mode === 0 ? F_pull : m * 9.8
  const vectorMaxLen = Math.min(canvasSize.width, canvasSize.height) * VECTOR_DISPLAY.force.maxLengthRatio
  const vArrowLen = ballR + (state.v / Math.max(vMax, 0.1)) * (vectorMaxLen - ballR)
  const fArrowLen = ballR + (Math.abs(state.F) / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)

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

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

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
          <path
            d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 1 ${padding + R * scale} ${groundY}`}
            fill="none"
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={STROKE.trackLine}
          />
          <path
            d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 1 ${padding + R * scale} ${groundY}`}
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

      <g transform={`translate(${canvasSize.width - padding - 90}, ${canvasSize.height * 0.58})`}>
        <rect width={90} height={85} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={colors.neutral[200]} strokeWidth={0.8} />
        
        <g transform="translate(0, 65)">
          <line x1={8} y1={0} x2={82} y2={0} stroke={colors.neutral[400]} strokeWidth={0.8} />

          <rect
            x={14}
            y={-barW_H}
            width={16}
            height={barW_H}
            fill={PHYSICS_COLORS.work}
            opacity={0.85}
            rx={0.5}
          />
          <text x={22} y={-barW_H - 4} fontSize={font(8.5)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
            {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
          </text>
          <text x={22} y={12} fontSize={font(8.5)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
            功 W
          </text>

          <rect
            x={60}
            y={-barEk_H}
            width={16}
            height={barEk_H}
            fill={PHYSICS_COLORS.kineticEnergy}
            opacity={0.85}
            rx={0.5}
          />
          <text x={68} y={-barEk_H - 4} fontSize={font(8.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="bold">
            {deltaEk >= 0 ? '+' : ''}{deltaEk.toFixed(1)}J
          </text>
          <text x={68} y={12} fontSize={font(8.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="semibold">
            ΔEk
          </text>
          
          <text x={45} y={-18} fontSize={font(12)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
            =
          </text>
        </g>
      </g>

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
              origin={{ x: -Math.min(state.F * 1.5, 45), y: objH * 0.5 }}
              vector={{ x: -1, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
              pixelLength={Math.min(state.F * 1.5, 45) - 2}
            />
          )}

          {showVectors && state.v > 0.05 && (
            <VectorArrow
              origin={{ x: objW * 0.5, y: -3.5 }}
              vector={{ x: 1, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              pixelLength={Math.min(state.v * 4.5, 60)}
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
            {Math.abs(state.F) > 0.1 && (
              <VectorArrow
                origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                vector={state.F >= 0
                  ? { x: tangentDirX, y: -tangentDirY }
                  : { x: -tangentDirX, y: tangentDirY }}
                type="elasticForce"
                sceneScale={sceneScale}
                pixelLength={fArrowLen}
              />
            )}

            {state.phase === 0 && (() => {
              const g = GRAVITY
              const mg = m * g
              const normalForce = mg * Math.cos(state.theta) + m * state.v * state.v / R
              const fFriction = mu * normalForce
              const gravityLen = ballR + (mg / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)
              const frictionLen = ballR + (fFriction / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)
              return (
                <g>
                  {mg > 0.1 && (
                    <VectorArrow
                      origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                      vector={{ x: 0, y: -1 }}
                      type="gravity"
                      sceneScale={sceneScale}
                      pixelLength={gravityLen}
                      strokeWidth={STROKE.vectorSub}
                    />
                  )}
                  {fFriction > 0.1 && (
                    <VectorArrow
                      origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                      vector={{ x: tangentDirX, y: -tangentDirY }}
                      type="friction"
                      sceneScale={sceneScale}
                      pixelLength={frictionLen}
                      strokeWidth={STROKE.vectorSub}
                    />
                  )}
                </g>
              )
            })()}
          </g>

          {showVectors && state.v > 0.05 && (
            <VectorArrow
              origin={{ x: ballCX, y: canvasSize.height - ballCY }}
              vector={{ x: tangentDirX, y: -tangentDirY }}
              type="velocity"
              sceneScale={sceneScale}
              pixelLength={vArrowLen}
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
