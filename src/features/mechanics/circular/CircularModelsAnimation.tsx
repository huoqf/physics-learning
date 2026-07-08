import { useMemo } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene/SceneScale'
import {
  calculateConicalPendulumState,
  calculateDiskRotationState,
} from '@/physics/circularModels'

const MASS_KG = 1
const DESIGN = CANVAS_PRESETS.splitH
const SCENE = {
  centerX: DESIGN.width / 2,
  pivotY: 82,
  diskCenterY: 338,
  pendulumBaseY: 392,
  projectionDepth: 0.34,
  lengthPx: 270,
  diskRadiusPx: 132,
  blockSize: 24,
  orbitDash: '6 6',
  axisDash: '4 6',
  vectorScale: {
    velocity: 8,
    force: 9,
    gravity: 18,
  },
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

function Label({ x, y, children, font }: { x: number; y: number; children: string; font: (n: number) => number }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={font(11)}
      fill={PHYSICS_COLORS.labelTextLight}
      textAnchor="middle"
      fontWeight="bold"
    >
      {children}
    </text>
  )
}

export default function CircularModelsAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode = params.modelMode ?? 0
  const omega = params.omega ?? 3
  const length = params.L ?? 1
  const radius = params.r ?? 0.8
  const mu = params.mu ?? 0.4
  const phase = omega * time

  const conical = useMemo(
    () => calculateConicalPendulumState(omega, length, MASS_KG),
    [omega, length],
  )
  const disk = useMemo(
    () => calculateDiskRotationState(omega, radius, mu, MASS_KG),
    [omega, radius, mu],
  )

  const isConical = mode === 0
  const projected = useMemo(() => {
    if (isConical) {
      const orbitRadiusPx = SCENE.lengthPx * Math.sin(conical.thetaRad)
      const stringProjectedPx = SCENE.lengthPx * Math.cos(conical.thetaRad)
      const x = SCENE.centerX + orbitRadiusPx * Math.cos(phase)
      const y = SCENE.pivotY + stringProjectedPx - orbitRadiusPx * SCENE.projectionDepth * Math.sin(phase)
      return { x, y, orbitRadiusPx, orbitY: SCENE.pivotY + stringProjectedPx }
    }

    const radiusRatio = radius / 2
    const baseRadiusPx = radiusRatio * SCENE.diskRadiusPx
    const slipProgress = disk.slipping ? clamp((time % 3) / 2.2, 0, 1) : 0
    const excess = disk.slipping ? clamp(omega / disk.criticalOmega - 1, 0, 1.4) : 0
    const visualRadiusPx = clamp(
      baseRadiusPx + slipProgress * (SCENE.diskRadiusPx - baseRadiusPx + excess * 28),
      16,
      SCENE.diskRadiusPx + 34,
    )
    const x = SCENE.centerX + visualRadiusPx * Math.cos(phase)
    const y = SCENE.diskCenterY - visualRadiusPx * SCENE.projectionDepth * Math.sin(phase)
    return { x, y, orbitRadiusPx: visualRadiusPx, orbitY: SCENE.diskCenterY }
  }, [isConical, conical.thetaRad, phase, radius, disk.slipping, disk.criticalOmega, omega, time])

  const tangent = {
    x: -Math.sin(phase),
    y: isConical ? -SCENE.projectionDepth * Math.cos(phase) : SCENE.projectionDepth * Math.cos(phase),
  }
  const towardCenter = {
    x: SCENE.centerX - projected.x,
    y: projected.orbitY - projected.y,
  }
  const tangentNorm = Math.hypot(tangent.x, tangent.y) || 1
  const centerNorm = Math.hypot(towardCenter.x, towardCenter.y) || 1
  const velocityLength = clamp(omega * (isConical ? Math.max(conical.radius, 0.2) : radius) * SCENE.vectorScale.velocity, 28, 72)
  const forceLength = isConical
    ? clamp(conical.centripetalForce * SCENE.vectorScale.force, 24, 86)
    : clamp(disk.frictionRatio * 86, 20, 86)

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        <radialGradient id="circular-model-ball" cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor={PHYSICS_COLORS.white} />
          <stop offset="45%" stopColor={PHYSICS_COLORS.objectFill} />
          <stop offset="100%" stopColor={PHYSICS_COLORS.objectStroke} />
        </radialGradient>
        <linearGradient id="circular-model-disk" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={withAlpha(SCENE_COLORS.surface.groundFill, 0.72)} />
          <stop offset="100%" stopColor={withAlpha(SCENE_COLORS.surface.groundStroke, 0.32)} />
        </linearGradient>
      </defs>

      <rect width={DESIGN.width} height={DESIGN.height} fill={PHYSICS_COLORS.white} />

      <line
        x1={SCENE.centerX}
        y1={54}
        x2={SCENE.centerX}
        y2={566}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={2}
        strokeDasharray={SCENE.axisDash}
      />
      <circle cx={SCENE.centerX} cy={SCENE.pivotY} r={5} fill={PHYSICS_COLORS.textMuted} />
      <Label x={SCENE.centerX} y={40} font={canvasSize.font}>旋转轴</Label>

      {isConical ? (
        <g>
          <ellipse
            cx={SCENE.centerX}
            cy={projected.orbitY}
            rx={Math.max(10, projected.orbitRadiusPx)}
            ry={Math.max(4, projected.orbitRadiusPx * SCENE.projectionDepth)}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={2}
            strokeDasharray={SCENE.orbitDash}
          />
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={projected.x}
            y2={projected.y}
            stroke={SCENE_COLORS.surface.ropeColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={SCENE.centerX}
            y2={SCENE.pivotY + SCENE.lengthPx}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={1.5}
            strokeDasharray={SCENE.axisDash}
          />
          <path
            d={`M ${SCENE.centerX} ${SCENE.pivotY + 42} A 42 42 0 0 1 ${SCENE.centerX + 42 * Math.sin(conical.thetaRad)} ${SCENE.pivotY + 42 * Math.cos(conical.thetaRad)}`}
            fill="none"
            stroke={PHYSICS_COLORS.annotation}
            strokeWidth={2}
          />
          <Label x={SCENE.centerX + 46} y={SCENE.pivotY + 58} font={canvasSize.font}>θ</Label>
          {!conical.stable && (
            <text
              x={SCENE.centerX}
              y={594}
              fontSize={canvasSize.font(12)}
              fill={PHYSICS_COLORS.dangerText}
              textAnchor="middle"
              fontWeight="bold"
            >
              转速不足：ω &lt; √(g/L)，非零圆锥摆不稳定
            </text>
          )}
        </g>
      ) : (
        <g>
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={SCENE.diskRadiusPx}
            ry={SCENE.diskRadiusPx * SCENE.projectionDepth}
            fill="url(#circular-model-disk)"
            stroke={SCENE_COLORS.surface.groundStroke}
            strokeWidth={2}
          />
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={Math.max(8, (radius / 2) * SCENE.diskRadiusPx)}
            ry={Math.max(3, (radius / 2) * SCENE.diskRadiusPx * SCENE.projectionDepth)}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={2}
            strokeDasharray={SCENE.orbitDash}
          />
          <Label x={SCENE.centerX} y={SCENE.diskCenterY + SCENE.diskRadiusPx * SCENE.projectionDepth + 38} font={canvasSize.font}>
            水平圆盘
          </Label>
          {disk.slipping && (
            <text
              x={SCENE.centerX}
              y={594}
              fontSize={canvasSize.font(12)}
              fill={PHYSICS_COLORS.dangerText}
              textAnchor="middle"
              fontWeight="bold"
            >
              已超过临界角速度：木块相对圆盘向外滑动
            </text>
          )}
        </g>
      )}

      <VectorArrow
        origin={pixelOrigin(projected.x, projected.y)}
        vector={pixelVector(tangent.x / tangentNorm, tangent.y / tangentNorm)}
        type="velocity"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={velocityLength}
        label="v"
        font={canvasSize.font}
      />
      <VectorArrow
        origin={pixelOrigin(projected.x, projected.y)}
        vector={pixelVector(0, 1)}
        type="gravity"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={48}
        label="mg"
        font={canvasSize.font}
      />
      <VectorArrow
        origin={pixelOrigin(projected.x, projected.y)}
        vector={pixelVector(towardCenter.x / centerNorm, towardCenter.y / centerNorm)}
        type="force"
        sceneScale={PIXEL_VECTOR_SCALE}
        pixelLength={forceLength}
        color={PHYSICS_COLORS.forceNet}
        label={isConical ? 'T水平' : 'f'}
        glow={disk.slipping && !isConical}
        font={canvasSize.font}
      />

      {isConical ? (
        <circle
          cx={projected.x}
          cy={projected.y}
          r={16}
          fill="url(#circular-model-ball)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={2}
        />
      ) : (
        <rect
          x={projected.x - SCENE.blockSize / 2}
          y={projected.y - SCENE.blockSize / 2}
          width={SCENE.blockSize}
          height={SCENE.blockSize}
          rx={4}
          fill={PHYSICS_COLORS.objectFillWarm}
          stroke={PHYSICS_COLORS.strokeDark}
          strokeWidth={2}
        />
      )}

      <text
        x={18}
        y={624}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
      >
        蓝：速度 / 绿：重力 / 橙：水平方向合外力来源
      </text>
    </AnimationSvgCanvas>
  )
}
