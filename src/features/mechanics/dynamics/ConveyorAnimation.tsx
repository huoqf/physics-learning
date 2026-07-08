import { useMemo } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene/SceneScale'
import { getConveyorFrame, type ConveyorMode } from '@/physics/conveyor'

const MASS_KG = 1
const THETA_RAD = Math.PI / 12
const THETA_DEG = 15
const DESIGN = CANVAS_PRESETS.splitV
const SCENE = {
  leftX: 82,
  rightX: 618,
  baseY: 205,
  rollerRadius: 34,
  beltStroke: 26,
  blockW: 46,
  blockH: 30,
  dotCount: 13,
  dotRadius: 3,
  heatCount: 7,
  velocityScale: 14,
  frictionScale: 9,
  scratchScale: 42,
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

export default function ConveyorAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: ConveyorMode = (params.conveyorMode ?? 0) === 0 ? 'horizontal' : 'inclined'
  const vBelt = params.vBelt ?? 3
  const v0 = params.v0 ?? 0
  const mu = params.mu ?? 0.2
  const length = params.L ?? 6
  const showSyncLine = (params.showSyncLine ?? 1) === 1
  const showScratch = (params.showScratch ?? 1) === 1
  const theta = mode === 'inclined' ? THETA_RAD : 0
  const angleDeg = mode === 'inclined' ? THETA_DEG : 0

  const state = useMemo(
    () => getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, time, MASS_KG),
    [vBelt, v0, mu, length, mode, time],
  )

  const geometry = useMemo(() => {
    const beltLengthPx = SCENE.rightX - SCENE.leftX
    const leftY = SCENE.baseY + (mode === 'inclined' ? 38 : 0)
    const rightY = leftY - Math.tan(theta) * beltLengthPx
    const unit = { x: Math.cos(theta), y: -Math.sin(theta) }
    const normal = { x: Math.sin(theta), y: Math.cos(theta) }
    const xRatio = clamp(state.xObj / length, 0, 1)
    const blockCenter = {
      x: SCENE.leftX + beltLengthPx * xRatio + normal.x * (SCENE.blockH / 2 + 8),
      y: leftY + (rightY - leftY) * xRatio - normal.y * (SCENE.blockH / 2 + 8),
    }
    return { beltLengthPx, leftY, rightY, unit, normal, blockCenter }
  }, [length, mode, state.xObj, theta])

  const beltOffset = mod(time * vBelt * 22, geometry.beltLengthPx / SCENE.dotCount)
  const velocityLength = clamp(Math.abs(state.vObj) * SCENE.velocityScale, 0, 86)
  const frictionLength = clamp(Math.abs(state.friction) * SCENE.frictionScale, 0, 76)
  const velocitySign = state.vObj === 0 ? 1 : Math.sign(state.vObj)
  const frictionSign = state.friction === 0 ? 1 : Math.sign(state.friction)
  const isSliding = state.phase === 'sliding'
  const scratchLength = clamp(state.relativeDistanceAbs * SCENE.scratchScale, 0, geometry.beltLengthPx * 0.82)

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        <linearGradient id="conveyor-belt-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={PHYSICS_COLORS.strokeDark} />
          <stop offset="50%" stopColor={PHYSICS_COLORS.textMuted} />
          <stop offset="100%" stopColor={PHYSICS_COLORS.strokeDark} />
        </linearGradient>
      </defs>

      <rect width={DESIGN.width} height={DESIGN.height} fill={PHYSICS_COLORS.white} />

      <g>
        <line
          x1={SCENE.leftX}
          y1={geometry.leftY}
          x2={SCENE.rightX}
          y2={geometry.rightY}
          stroke="url(#conveyor-belt-gradient)"
          strokeWidth={SCENE.beltStroke}
          strokeLinecap="round"
        />
        <line
          x1={SCENE.leftX}
          y1={geometry.leftY + SCENE.rollerRadius * 1.45}
          x2={SCENE.rightX}
          y2={geometry.rightY + SCENE.rollerRadius * 1.45}
          stroke={withAlpha(PHYSICS_COLORS.strokeDark, 0.24)}
          strokeWidth={SCENE.beltStroke * 0.72}
          strokeLinecap="round"
        />
        {[SCENE.leftX, SCENE.rightX].map((cx, index) => {
          const cy = index === 0 ? geometry.leftY : geometry.rightY
          const spin = time * vBelt * 110 * (index === 0 ? 1 : -1)
          return (
            <g key={cx} transform={`rotate(${spin}, ${cx}, ${cy})`}>
              <circle
                cx={cx}
                cy={cy}
                r={SCENE.rollerRadius}
                fill={SCENE_COLORS.surface.wallFill}
                stroke={SCENE_COLORS.surface.wallStroke}
                strokeWidth={3}
              />
              <line x1={cx - 22} y1={cy} x2={cx + 22} y2={cy} stroke={PHYSICS_COLORS.textMuted} strokeWidth={3} />
              <line x1={cx} y1={cy - 22} x2={cx} y2={cy + 22} stroke={PHYSICS_COLORS.textMuted} strokeWidth={3} />
            </g>
          )
        })}

        {Array.from({ length: SCENE.dotCount }, (_, idx) => {
          const s = mod(idx * (geometry.beltLengthPx / SCENE.dotCount) + beltOffset, geometry.beltLengthPx)
          const x = SCENE.leftX + geometry.unit.x * s
          const y = geometry.leftY + geometry.unit.y * s - 2
          return <circle key={idx} cx={x} cy={y} r={SCENE.dotRadius} fill={PHYSICS_COLORS.gridSubtle} />
        })}
      </g>

      {showScratch && scratchLength > 1 && (
        <line
          x1={geometry.blockCenter.x - geometry.unit.x * scratchLength}
          y1={geometry.blockCenter.y - geometry.unit.y * scratchLength + 20}
          x2={geometry.blockCenter.x}
          y2={geometry.blockCenter.y + 20}
          stroke={withAlpha(PHYSICS_COLORS.heatLoss, 0.72)}
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}

      {isSliding && showScratch && Array.from({ length: SCENE.heatCount }, (_, idx) => {
        const phase = (idx + time * 5) % SCENE.heatCount
        const offset = (phase - SCENE.heatCount / 2) * 5
        return (
          <circle
            key={idx}
            cx={geometry.blockCenter.x + geometry.normal.x * offset - geometry.unit.x * idx * 2}
            cy={geometry.blockCenter.y + 18 - geometry.normal.y * offset}
            r={2 + (idx % 2)}
            fill={PHYSICS_COLORS.heatLoss}
            opacity={0.28 + idx / (SCENE.heatCount * 1.6)}
          />
        )
      })}

      {showSyncLine && state.tSync != null && state.tSync <= time && (
        <g>
          <line
            x1={geometry.blockCenter.x}
            y1={geometry.blockCenter.y - 58}
            x2={geometry.blockCenter.x}
            y2={geometry.blockCenter.y + 44}
            stroke={PHYSICS_COLORS.annotation}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <text
            x={geometry.blockCenter.x + 8}
            y={geometry.blockCenter.y - 64}
            fontSize={canvasSize.font(11)}
            fill={PHYSICS_COLORS.annotation}
            fontWeight="bold"
          >
            共速后分段
          </text>
        </g>
      )}

      <g transform={`translate(${geometry.blockCenter.x}, ${geometry.blockCenter.y}) rotate(${-angleDeg})`}>
        <rect
          x={-SCENE.blockW / 2}
          y={-SCENE.blockH / 2}
          width={SCENE.blockW}
          height={SCENE.blockH}
          rx={5}
          fill={PHYSICS_COLORS.objectFillWarm}
          stroke={PHYSICS_COLORS.strokeDark}
          strokeWidth={2}
        />
        <text
          x={0}
          y={4}
          fontSize={canvasSize.font(10)}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          物块
        </text>
      </g>

      <VectorArrow
        origin={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y - 8)}
        vector={pixelVector(geometry.unit.x * velocitySign, geometry.unit.y * velocitySign)}
        type="velocity"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={velocityLength}
        label="v"
        font={canvasSize.font}
      />
      <VectorArrow
        origin={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y + 12)}
        vector={pixelVector(geometry.unit.x * frictionSign, geometry.unit.y * frictionSign)}
        type="friction"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={frictionLength}
        color={PHYSICS_COLORS.friction}
        label="f"
        font={canvasSize.font}
      />

      <line
        x1={SCENE.leftX}
        y1={geometry.leftY + 52}
        x2={SCENE.leftX}
        y2={geometry.leftY + 86}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={2}
      />
      <line
        x1={SCENE.rightX}
        y1={geometry.rightY + 52}
        x2={SCENE.rightX}
        y2={geometry.rightY + 86}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={2}
      />
      <text x={SCENE.leftX} y={geometry.leftY + 102} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
        x=0
      </text>
      <text x={SCENE.rightX} y={geometry.rightY + 102} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
        x=L
      </text>

      <text x={20} y={24} fontSize={canvasSize.font(12)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
        {mode === 'horizontal' ? '水平传送带' : '倾斜传送带 θ=15°'}：先看 v物 - v带，再判摩擦方向
      </text>
      <text x={20} y={304} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight}>
        蓝：物块速度 / 黄褐：摩擦力 / 红：相对划痕与生热
      </text>
    </AnimationSvgCanvas>
  )
}
