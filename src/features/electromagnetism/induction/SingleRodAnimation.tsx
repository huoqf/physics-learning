import { useMemo } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { ConductingRod, MagneticFieldGrid, Rails, Rheostat, SVGSingleBar, PhysicsVectorArrow } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { SceneScale } from '@/scene/SceneScale'
import { getSingleRodState, type SingleRodMode } from '@/physics/singleRod'
import { ampereForceDir } from '@/physics/magnetism/forces'
import { calculateVectorPixelLength } from '@/utils/vectorLength'

const DESIGN = CANVAS_PRESETS.splitV

/** 导轨水平布局常量（与 railSpacing 无关） */
const RAIL_X = {
  leftX: 86,
  rightX: 679,
  resistorX: 50,
  viewLengthM: 5,
} as const

/** 电荷槽布局常量 */
const CHARGE_SLOT = {
  x: 758,
  baseY: 228,
  width: 34,
} as const

/** 默认 railSpacing 对应的视觉间距 (px) */
const DEFAULT_VISUAL_SPACING = 106
const DEFAULT_RAIL_SPACING_M = 0.8

const VECTOR_SCENE_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 86,
  refMagnitudes: {
    velocity: 3.31,
    currentDirection: 1.43,
    lorentzForce: 1.52,
    appliedForce: 1.77,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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
  const railSpacingM = params.railSpacing ?? 0.8

  // 导轨视觉间距随物理参数 railSpacing 等比缩放
  const railVisualSpacing = DEFAULT_VISUAL_SPACING * (railSpacingM / DEFAULT_RAIL_SPACING_M)
  const railW = RAIL_X.rightX - RAIL_X.leftX
  const rodX = RAIL_X.leftX + clamp(state.x / RAIL_X.viewLengthM, 0, 1) * railW
  const rodCenterY = DESIGN.height / 2
  const railTopY = rodCenterY - railVisualSpacing / 2
  const railBottomY = rodCenterY + railVisualSpacing / 2
  const chargeSlotH = railVisualSpacing + 50

  const chargeLevel = clamp(state.charge / Math.max(0.2, state.charge + 0.8), 0, 1)

  // 电流方向箭头需要居中，预计算其设计长度用于 origin 偏移
  const iArrowLength = Math.abs(state.current) > 0.001
    ? calculateVectorPixelLength(
        Math.abs(state.current),
        'currentDirection',
        VECTOR_SCENE_SCALE.maxVectorLength,
        VECTOR_SCENE_SCALE.refMagnitudes!.currentDirection!,
      )
    : 0

  // 安培力方向：电流沿导体棒（竖直），B 入纸面
  const forceDir = ampereForceDir({ x: 0, y: 1 }, 'intoPage', state.current)

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
        cx={(RAIL_X.leftX + RAIL_X.rightX) / 2}
        cy={rodCenterY}
        length={RAIL_X.rightX - RAIL_X.leftX}
        spacing={railVisualSpacing}
        width={DESIGN.width}
        height={DESIGN.height}
      />
      <path
        d={`M ${RAIL_X.leftX} ${railTopY} L ${RAIL_X.resistorX} ${railTopY} L ${RAIL_X.resistorX} ${railBottomY} L ${RAIL_X.leftX} ${railBottomY}`}
        fill="none"
        stroke={PHYSICS_COLORS.strokeDark}
        strokeWidth={3}
      />
      <Rheostat
        x={RAIL_X.resistorX}
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

      {Math.abs(state.current) > 0.001 && (
        <PhysicsVectorArrow
          originDesign={{ x: rodX - 16, y: state.current >= 0 ? rodCenterY + iArrowLength / 2 : rodCenterY - iArrowLength / 2 }}
          vector={{ x: 0, y: state.current }}
          type="currentDirection"
          sceneScale={VECTOR_SCENE_SCALE}
          label="I"
          font={canvasSize.font}
        />
      )}

      <ConductingRod
        type="horizontal"
        x={rodX}
        spacing={railVisualSpacing - 40}
        width={DESIGN.width}
        height={DESIGN.height}
        currentDir={state.current > 0.001 ? 'in' : 'none'}
      />
      <text x={rodX} y={railTopY - 28} fontSize={canvasSize.font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        导体棒
      </text>

      <PhysicsVectorArrow
        originDesign={{ x: rodX, y: rodCenterY - 20 }}
        vector={{ x: state.v, y: 0 }}
        type="velocity"
        sceneScale={VECTOR_SCENE_SCALE}
        label="v"
        font={canvasSize.font}
      />
      <PhysicsVectorArrow
        originDesign={{ x: rodX, y: rodCenterY + 4 }}
        vector={{ x: state.ampereForce * forceDir.x, y: state.ampereForce * forceDir.y }}
        type="lorentzForce"
        sceneScale={VECTOR_SCENE_SCALE}
        label="FA"
        font={canvasSize.font}
      />
      {mode === 'constantForce' && (
        <PhysicsVectorArrow
          originDesign={{ x: rodX, y: rodCenterY + 28 }}
          vector={{ x: state.externalForce, y: 0 }}
          type="appliedForce"
          sceneScale={VECTOR_SCENE_SCALE}
          label="F"
          font={canvasSize.font}
        />
      )}

      {enableChargeSlot && (
        <g>
          <text
            x={CHARGE_SLOT.x + CHARGE_SLOT.width / 2}
            y={CHARGE_SLOT.baseY - chargeSlotH - 10}
            fontSize={canvasSize.font(9)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            电荷量 q/C
          </text>
          <SVGSingleBar
            x={CHARGE_SLOT.x}
            baseY={CHARGE_SLOT.baseY}
            height={chargeSlotH * chargeLevel}
            barWidth={CHARGE_SLOT.width}
            color={PHYSICS_COLORS.electricCurrent}
            label="q"
            valueText={`${state.charge.toFixed(1)}C`}
            font={canvasSize.font}
            trackHeight={chargeSlotH}
            rx={5}
          />
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
