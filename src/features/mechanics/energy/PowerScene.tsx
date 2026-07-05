import { useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScaleFromViewport } from '@/scene'
import type { PowerModelState } from '@/physics/power'

interface PowerSceneProps {
  state: PowerModelState
  params: {
    P?: number
    m?: number
    f?: number
    carType?: number
    mode?: number
  }
  canvasSize: { width: number; height: number; font: (size: number) => number }
  vp: { visibleX: number; visibleY: number; visibleW: number; visibleH: number; centerX: number; centerY: number }
  showVectors: boolean
  maxV: number
  scale: number
  time: number
}

export function PowerScene({
  state,
  params,
  canvasSize,
  vp,
  showVectors,
  maxV,
  scale,
  time,
}: PowerSceneProps) {
  const { font } = canvasSize
  const P_rated = params.P ?? 60000
  const f = params.f ?? 2000
  const carType = params.carType ?? 0
  const m = params.m ?? 2000

  const padding = canvasSize.width * 0.06
  const groundY = canvasSize.height * 0.85
  const objW = canvasSize.width * 0.08
  const objH = objW * 0.6

  const carX = Math.min(padding + state.s * scale, canvasSize.width - padding - objW)

  const powerRatio = state.P / P_rated
  const wavePhase = (time * 5) % 1
  const powerWaves = [0, 1, 2].map(i => {
    const phase = (wavePhase + i / 3) % 1
    const radius = 5 + phase * 22 * (0.4 + 0.6 * powerRatio)
    const opacity = (1 - phase) * 0.85 * powerRatio
    return { radius, opacity }
  })

  const frictionRatio = f / 5000
  const fPhase = (time * 8) % 1
  const fWaves = [0, 1].map(i => {
    const phase = (fPhase + i * 0.5) % 1
    const len = phase * 18 * (0.3 + 0.7 * (state.v / maxV))
    const opacity = (1 - phase) * 0.75 * frictionRatio
    return { len, opacity }
  })

  const Ek = 0.5 * m * state.v * state.v
  const EkMax = 0.5 * m * maxV * maxV
  const ekRatio = EkMax > 0 ? Math.min(Ek / EkMax, 1) : 0

  const sceneScale = useMemo(() => createSceneScaleFromViewport(vp, 'transform', {
    designWidth: canvasSize.width,
    designHeight: canvasSize.height,
  }), [vp, canvasSize.width, canvasSize.height])

  return (
    <svg width={canvasSize.width} height={canvasSize.height} className="bg-transparent">
      <defs>
        <linearGradient id="car-body-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.southMid} />
        </linearGradient>
        <linearGradient id="car-wheel-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
        </linearGradient>
        <linearGradient id="supercar-body-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.northMid} />
        </linearGradient>
        <linearGradient id="truck-head-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
        </linearGradient>
        <linearGradient id="truck-cargo-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.neutral[100]} />
          <stop offset="100%" stopColor={colors.neutral[300]} />
        </linearGradient>
      </defs>

      <PhysicsGround
        x={padding * 0.5} y={groundY} width={canvasSize.width - padding}
        appearance={{ color: PHYSICS_COLORS.labelText, showBaseShadow: true }}
      />

      <text x={padding} y={canvasSize.height * 0.60} fontSize={Math.max(10, canvasSize.width * 0.016)}
        fill={PHYSICS_COLORS.labelText} fontWeight="bold">
        {(params.mode ?? 0) === 0 ? '恒定功率起动模拟' : '恒定加速度起动模拟'}
      </text>

      {state.v > 0.1 && fWaves.map((fw, idx) => {
        const w1X = carX + objW * 0.22
        const w2X = carX + objW * 0.78
        return (
          <g key={`f-wave-${idx}`} strokeOpacity={fw.opacity}>
            <line x1={w1X} y1={groundY} x2={w1X - fw.len} y2={groundY - fw.len * 0.15}
              stroke={PHYSICS_COLORS.friction} strokeWidth={1.2} />
            <line x1={w1X} y1={groundY} x2={w1X - fw.len * 0.9} y2={groundY + 1.5}
              stroke={PHYSICS_COLORS.heatLoss} strokeWidth={0.8} />
            <line x1={w2X} y1={groundY} x2={w2X - fw.len} y2={groundY - fw.len * 0.15}
              stroke={PHYSICS_COLORS.friction} strokeWidth={1.2} />
            <line x1={w2X} y1={groundY} x2={w2X - fw.len * 0.9} y2={groundY + 1.5}
              stroke={PHYSICS_COLORS.heatLoss} strokeWidth={0.8} />
          </g>
        )
      })}

      {state.P > 1000 && powerWaves.map((wave, idx) => (
        <path
          key={`p-wave-${idx}`}
          d={`M ${carX} ${groundY - objH * 0.8 + wave.radius * 0.4} A ${wave.radius} ${wave.radius * 0.6} 0 0 0 ${carX} ${groundY - objH * 0.2 - wave.radius * 0.4}`}
          fill="none"
          stroke={PHYSICS_COLORS.power}
          strokeWidth={1.5 + powerRatio}
          strokeOpacity={wave.opacity}
        />
      ))}

      <g transform={`translate(${carX}, ${groundY - objH})`}>
        {carType === 1 ? (
          <g>
            <path
              d={`M 0 ${objH - 3} L 0 ${objH * 0.48} Q ${objW * 0.15} ${objH * 0.22} ${objW * 0.35} ${objH * 0.22} L ${objW * 0.58} ${objH * 0.22} L ${objW * 0.95} ${objH * 0.65} L ${objW} ${objH - 3} Z`}
              fill="url(#supercar-body-grad)"
              stroke={SCENE_COLORS.magnet.northMid}
              strokeWidth={1.5}
            />
            <path
              d={`M ${objW * 0.38} ${objH * 0.26} L ${objW * 0.56} ${objH * 0.26} L ${objW * 0.68} ${objH * 0.52} L ${objW * 0.34} ${objH * 0.52} Z`}
              fill={PHYSICS_COLORS.objectFill}
              opacity={0.8}
            />
            <g transform={`translate(${objW * 0.15}, ${objH * 0.70})`}>
              <rect width={objW * 0.7} height={4} rx={1} fill="none" stroke={colors.neutral[300]} strokeWidth={0.5} />
              <rect width={objW * 0.7 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
              <text x={objW * 0.35} y={3.5} fontSize={font(5)} textAnchor="middle" fill={colors.neutral.white} fontWeight="bold" opacity={0.9}>Ek</text>
            </g>
            <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
            <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
          </g>
        ) : carType === 2 ? (
          <g>
            <rect x={0} y={objH * 0.83} width={objW} height={3} fill={colors.neutral[600]} />
            <rect x={0} y={objH * 0.08} width={objW * 0.65} height={objH * 0.75} rx={1} fill="url(#truck-cargo-grad)" stroke={colors.neutral[400]} strokeWidth={1} />
            <line x1={objW * 0.16} y1={objH * 0.08} x2={objW * 0.16} y2={objH * 0.83} stroke={CANVAS_COLORS.grid} strokeWidth={0.5} />
            <line x1={objW * 0.32} y1={objH * 0.08} x2={objW * 0.32} y2={objH * 0.83} stroke={CANVAS_COLORS.grid} strokeWidth={0.5} />
            <line x1={objW * 0.48} y1={objH * 0.08} x2={objW * 0.48} y2={objH * 0.83} stroke={CANVAS_COLORS.grid} strokeWidth={0.5} />
            <path
              d={`M ${objW * 0.67} ${objH * 0.83} L ${objW * 0.67} ${objH * 0.22} L ${objW * 0.82} ${objH * 0.22} L ${objW * 0.95} ${objH * 0.42} L ${objW * 0.95} ${objH * 0.83} Z`}
              fill="url(#truck-head-grad)"
              stroke={colors.neutral[500]}
              strokeWidth={1}
            />
            <path
              d={`M ${objW * 0.74} ${objH * 0.26} L ${objW * 0.81} ${objH * 0.26} L ${objW * 0.90} ${objH * 0.40} L ${objW * 0.74} ${objH * 0.40} Z`}
              fill={PHYSICS_COLORS.objectFill}
              opacity={0.8}
            />
            <g transform={`translate(${objW * 0.08}, ${objH * 0.42})`}>
              <rect width={objW * 0.48} height={4} rx={1} fill="none" stroke={colors.neutral[400]} strokeWidth={0.5} />
              <rect width={objW * 0.48 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
              <text x={objW * 0.24} y={3.5} fontSize={font(5)} textAnchor="middle" fill={colors.neutral[800]} fontWeight="bold" opacity={0.8}>Ek</text>
            </g>
            <g transform={`translate(${objW * 0.16}, ${objH - 2.5})`}>
              <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
            </g>
            <g transform={`translate(${objW * 0.46}, ${objH - 2.5})`}>
              <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
            </g>
            <g transform={`translate(${objW * 0.82}, ${objH - 2.5})`}>
              <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
            </g>
          </g>
        ) : (
          <g>
            <rect width={objW} height={objH - 4} rx={3} fill="url(#car-body-grad)" stroke={SCENE_COLORS.magnet.southMid} strokeWidth={1.5} />
            <rect x={objW * 0.1} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <rect x={objW * 0.4} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <rect x={objW * 0.7} y={objH * 0.15} width={objW * 0.2} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
            <line x1={objW * 0.05} y1={objH * 0.55} x2={objW * 0.95} y2={objH * 0.55} stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} opacity={0.4} />
            <g transform={`translate(${objW * 0.15}, ${objH * 0.65})`}>
              <rect width={objW * 0.7} height={4} rx={1} fill="none" stroke={colors.neutral[300]} strokeWidth={0.5} />
              <rect width={objW * 0.7 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
              <text x={objW * 0.35} y={3.5} fontSize={font(5)} textAnchor="middle" fill={colors.neutral.white} fontWeight="bold" opacity={0.9}>Ek</text>
            </g>
            <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
            <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
              <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
              <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            </g>
          </g>
        )}
      </g>

      {showVectors && state.F > 0 && (
        <VectorArrow
          origin={{ x: carX + objW + 2, y: -(groundY - objH * 0.5) }}
          vector={{ x: Math.min(state.F * 0.008, 60), y: 0 }}
          type="appliedForce"
          sceneScale={sceneScale}
          pixelLength={Math.min(state.F * 0.008, 60)}
        />
      )}

      {showVectors && f > 0 && (
        <VectorArrow
          origin={{ x: carX - 2, y: -(groundY - objH * 0.4) }}
          vector={{ x: -Math.min(f * 0.008, 30), y: 0 }}
          type="friction"
          sceneScale={sceneScale}
          pixelLength={Math.min(f * 0.008, 30)}
        />
      )}

      {showVectors && state.v > 0.05 && (
        <VectorArrow
          origin={{ x: carX + objW * 0.5, y: -(groundY + 3.5) }}
          vector={{ x: Math.min(state.v * 3.5, 70), y: 0 }}
          type="velocity"
          sceneScale={sceneScale}
          pixelLength={Math.min(state.v * 3.5, 70)}
        />
      )}

      <g transform={`translate(${canvasSize.width - padding - 130}, ${canvasSize.height * 0.60})`}>
        <rect width={135} height={60} rx={4} fill={colors.neutral[50]} stroke={colors.neutral[200]} strokeWidth={0.5} />
        <text x={8} y={15} fontSize={Math.max(9, canvasSize.width * 0.016 * 0.8)} fill={PHYSICS_COLORS.velocity} fontWeight="semibold">
          速度 v = {state.v.toFixed(1)} m/s
        </text>
        <text x={8} y={32} fontSize={Math.max(9, canvasSize.width * 0.016 * 0.8)} fill={PHYSICS_COLORS.power} fontWeight="semibold">
          功率 P = {(state.P / 1000).toFixed(1)} kW
        </text>
        <text x={8} y={49} fontSize={Math.max(9, canvasSize.width * 0.016 * 0.8)} fill={PHYSICS_COLORS.acceleration}>
          加速度 a = {state.a.toFixed(2)} m/s²
        </text>
      </g>

      {(params.mode ?? 1) === 1 && state.v > 0.01 && (
        <g transform={`translate(${padding}, ${canvasSize.height * 0.66})`}>
          <rect width={80} height={18} rx={3} fill={
            state.phase === 0 ? colors.neutral[100] :
            state.phase === 1 ? colors.neutral[200] : colors.neutral[300]
          } stroke={
            state.phase === 0 ? colors.neutral[400] :
            state.phase === 1 ? colors.neutral[500] : colors.neutral[500]
          } strokeWidth={0.8} />
          <text x={40} y={12} fontSize={Math.max(9, canvasSize.width * 0.016 * 0.8)} fontWeight="bold" textAnchor="middle" fill={
            state.phase === 0 ? colors.neutral[700] :
            state.phase === 1 ? colors.neutral[700] : colors.neutral[700]
          }>
            {state.phase === 0 ? '匀加速阶段' : state.phase === 1 ? '变加速阶段' : '已达最大速'}
          </text>
        </g>
      )}
    </svg>
  )
}
