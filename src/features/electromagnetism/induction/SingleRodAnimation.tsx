import { useMemo } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { ConductingRod, MagneticFieldGrid, Rails, Rheostat, SVGSingleBar, VectorArrow } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { SceneScale } from '@/scene/SceneScale'
import { getSingleRodState, type SingleRodMode } from '@/physics/singleRod'

const DESIGN = CANVAS_PRESETS.splitV
const RAIL = {
  leftX: 72,
  rightX: 566,
  topY: 112,
  bottomY: 218,
  resistorX: 42,
  viewLengthM: 5,
  chargeSlotW: 34,
  chargeSlotH: 156,
  particleCount: 18,
} as const

const PIXEL_VECTOR_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 1,
}

function pixelOrigin(x: number, y: number) {
  return { x, y: -y }
}

function pixelVector(dx: number, dy: number) {
  return { x: dx, y: -dy }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

export default function SingleRodAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: SingleRodMode = (params.startMechanism ?? 0) === 0 ? 'constantForce' : 'initialVelocity'
  const state = useMemo(() => getSingleRodState({
    mode,
    driveForce: params.driveForce ?? 1.2,
    initialVelocity: params.initialVelocity ?? 5,
    magneticB: params.magneticB ?? 1.2,
    railSpacing: params.railSpacing ?? 0.8,
    resistance: params.resistance ?? 1.5,
    rodMass: params.rodMass ?? 0.2,
  }, time), [mode, params.driveForce, params.initialVelocity, params.magneticB, params.railSpacing, params.resistance, params.rodMass, time])

  const enableChargeSlot = (params.enableChargeSlot ?? 1) === 1
  const railW = RAIL.rightX - RAIL.leftX
  const rodX = RAIL.leftX + clamp(state.x / RAIL.viewLengthM, 0, 1) * railW
  const rodCenterY = (RAIL.topY + RAIL.bottomY) / 2
  const currentSpeed = clamp(Math.abs(state.current) * 26, 6, 34)
  const particleOffset = time * currentSpeed
  const vLength = clamp(state.v * 26, 0, 86)
  const faLength = clamp(state.ampereForce * 34, 0, 82)
  const fLength = clamp(state.externalForce * 34, 0, 82)
  const chargeLevel = clamp(state.charge / Math.max(0.2, state.charge + 0.8), 0, 1)

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <rect width={DESIGN.width} height={DESIGN.height} fill={PHYSICS_COLORS.white} />

      <MagneticFieldGrid
        x={20}
        y={24}
        w={590}
        h={256}
        direction="in"
        rows={8}
        cols={18}
        radius={5}
        opacity={0.46}
      />

      <Rails
        type="horizontal"
        cx={(RAIL.leftX + RAIL.rightX) / 2}
        cy={rodCenterY}
        length={RAIL.rightX - RAIL.leftX}
        spacing={RAIL.bottomY - RAIL.topY}
        width={DESIGN.width}
        height={DESIGN.height}
      />
      <path
        d={`M ${RAIL.leftX} ${RAIL.topY} L ${RAIL.resistorX} ${RAIL.topY} L ${RAIL.resistorX} ${RAIL.bottomY} L ${RAIL.leftX} ${RAIL.bottomY}`}
        fill="none"
        stroke={PHYSICS_COLORS.strokeDark}
        strokeWidth={3}
      />
      <Rheostat
        x={RAIL.resistorX}
        y={rodCenterY}
        value={params.resistance ?? 1.5}
        min={0.2}
        max={5}
        width={78}
        label="R"
        showLabel={false}
        variant="symbolic"
        font={canvasSize.font}
      />

      {Array.from({ length: RAIL.particleCount }, (_, idx) => {
        const pathLen = 2 * railW + 2 * (RAIL.bottomY - RAIL.topY)
        const s = mod(idx * (pathLen / RAIL.particleCount) + particleOffset, pathLen)
        let x: number = RAIL.leftX
        let y: number = RAIL.topY
        if (s < railW) {
          x = RAIL.leftX + s
          y = RAIL.topY
        } else if (s < railW + (RAIL.bottomY - RAIL.topY)) {
          x = rodX
          y = RAIL.topY + (s - railW)
        } else if (s < 2 * railW + (RAIL.bottomY - RAIL.topY)) {
          x = RAIL.rightX - (s - railW - (RAIL.bottomY - RAIL.topY))
          y = RAIL.bottomY
        } else {
          x = RAIL.leftX
          y = RAIL.bottomY - (s - 2 * railW - (RAIL.bottomY - RAIL.topY))
        }
        return <circle key={idx} cx={x} cy={y} r={3} fill={PHYSICS_COLORS.electricCurrent} opacity={0.35 + 0.5 * Math.abs(state.current) / Math.max(0.1, Math.abs(state.current) + 1)} />
      })}

      <ConductingRod
        type="horizontal"
        x={rodX}
        spacing={RAIL.bottomY - RAIL.topY - 40}
        width={DESIGN.width}
        height={DESIGN.height}
        currentDir={state.current > 0.001 ? 'in' : 'none'}
      />
      <text x={rodX} y={RAIL.topY - 28} fontSize={canvasSize.font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        导体棒
      </text>

      <VectorArrow
        origin={pixelOrigin(rodX, rodCenterY - 20)}
        vector={pixelVector(1, 0)}
        type="velocity"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={vLength}
        label="v"
        font={canvasSize.font}
      />
      <VectorArrow
        origin={pixelOrigin(rodX, rodCenterY + 4)}
        vector={pixelVector(-1, 0)}
        type="lorentzForce"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={faLength}
        label="FA"
        font={canvasSize.font}
      />
      {mode === 'constantForce' && (
        <VectorArrow
          origin={pixelOrigin(rodX, rodCenterY + 28)}
          vector={pixelVector(1, 0)}
          type="appliedForce"
          sceneScale={PIXEL_VECTOR_SCALE}
          pixelLength={fLength}
          label="F"
          font={canvasSize.font}
        />
      )}

      {enableChargeSlot && (
        <SVGSingleBar
          x={632}
          baseY={228}
          height={RAIL.chargeSlotH * chargeLevel}
          barWidth={RAIL.chargeSlotW}
          color={PHYSICS_COLORS.electricCurrent}
          label="q"
          valueText={`${state.charge.toFixed(1)}C`}
          font={canvasSize.font}
          trackHeight={RAIL.chargeSlotH}
          rx={5}
        />
      )}

      <text x={22} y={302} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight}>
        绿色 ×：匀强磁场 / 蓝：速度 / 紫：安培力 / 深蓝：外力 / 红：感应电流与电荷量
      </text>
    </AnimationSvgCanvas>
  )
}
