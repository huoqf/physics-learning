import { useMemo } from 'react'
import { Block, PhysicsVectorArrow, PhysicsGround } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { layoutLabels } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateNewtonSecond,
  calculateFriction,
  calculateAcceleratedMotion,
  calculateNewtonSecondVariableMotion,
} from '@/physics'
import { GRAVITY } from '@/physics/constants'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT } from '@/theme/physics'
import type { SceneLayoutProfile } from '@/scene'

import { useAnimationLayout } from '@/context/AnimationLayoutContext'

// ── 布局常量 ──────────────────────────────────────────────────────────
const NEWTON_DESIGN = { width: 700, height: 650 } as const

const NEWTON_LAYOUT = {
  groundYRatio: 0.80,        // 比例：地面距画布顶部
  originXRatio: 0.11,        // 比例：小车出发点占画布宽�?
  carWidth: 80,              // px：小车宽�?
  safeMarginRRatio: 0.29,    // 比例：小车终点右侧安全边距占画布宽度
  gridWidthRatio: 0.81,      // 比例：网格线宽度占画布宽�?
  trackEndRatio: 0.96,       // 比例：轨道右端占画布宽度
} as const

const NEWTON_SCENE_PROFILE: SceneLayoutProfile = {
  mode: 'visibleArea',
  designWidth: NEWTON_DESIGN.width,
  designHeight: NEWTON_DESIGN.height,
  refMagnitudes: {
    appliedForce: 40,
    friction: 40,
    gravity: 100,
    normalForce: 100,
    force: 40,
    velocity: 20,
    acceleration: 10,
  },
}
// ──────────────────────────────────────────────────────────────────────

export default function NewtonSecondAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })

  const contextProfile = useAnimationLayout()
  const sceneProfile = contextProfile ?? NEWTON_SCENE_PROFILE

  const {
    F = 10,
    m = 2,
    mu = 0,
    advancedMode = 0,
    modelIdx = 0,
    k = 2,
    F0 = 15,
    omega = 1.5,
  } = params

  let F_applied = F
  let f = 0
  let F_net = 0
  let a = 0
  let v = 0
  let s = 0

  if (advancedMode === 1) {
    const motion = calculateNewtonSecondVariableMotion(
      modelIdx as 0 | 1,
      { m, mu, k, F0, omega },
      time
    )
    F_applied = motion.F_applied
    f = motion.f
    F_net = motion.F_net
    a = motion.a
    v = motion.v
    s = motion.s
  } else {
    const g = GRAVITY
    const N = m * g
    const frictionRes = calculateFriction(mu, N)
    f = frictionRes.f
    F_applied = F
    F_net = Math.max(0, F_applied - f)
    const newtonRes = calculateNewtonSecond(F_net, m)
    a = newtonRes.a
    const motionRes = calculateAcceleratedMotion(0, a, time)
    v = motionRes.v
    s = motionRes.s
  }

  // 动态 refMagnitude：所有矢量随当前值缩放，确保 ratio ≤ 1.0，箭头不溢出
  const dynamicRefMagnitudes = useMemo(() => ({
    ...sceneProfile.refMagnitudes,
    appliedForce: Math.max(F_applied, 5) * 2,
    friction: Math.max(f, 5) * 2,
    gravity: Math.max(m * GRAVITY, 5) * 2,
    normalForce: Math.max(m * GRAVITY, 5) * 2,
    force: Math.max(F_net, 5) * 2,
    velocity: Math.max(Math.abs(v), 5) * 2,
    acceleration: Math.max(Math.abs(a), 5) * 2,
  }), [sceneProfile.refMagnitudes, F_applied, f, m, F_net, v, a])

  const sceneScale = useSceneScale({
    vp, preset, anchor: 'viewport',
    physicsWidth: preset.width, physicsHeight: preset.height,
    refMagnitudes: dynamicRefMagnitudes,
    maxVectorLength: 120,
  })

  const groundY = vp.visibleY + vp.visibleH * NEWTON_LAYOUT.groundYRatio
  const originX = vp.visibleX + vp.visibleW * NEWTON_LAYOUT.originXRatio

  // 限制小车不跑�?Canvas 屏幕
  const maxCanvasS = vp.visibleX + vp.visibleW * (1 - NEWTON_LAYOUT.safeMarginRRatio)
  const canvasS = s * (vp.visibleW / NEWTON_DESIGN.width)
  const displayCanvasS = Math.min(canvasS, maxCanvasS - originX)

  // 小车尺寸
  const carWidth = NEWTON_LAYOUT.carWidth
  const carHeight = 35 + m * 5
  const carX = originX + displayCanvasS
  const carY = groundY - carHeight
  const cx = carX + carWidth / 2
  const cy = carY + carHeight / 2

  // 标签避让：F_N、v、a 三个标签在物块上方，需自动分离
  const labelFontSize = FONT.axisSize
  // 速度/加速度标签偏移量：箭头长度已由 refMagnitudes 归一化，最大 ≈ maxVectorLength * 0.5
  const vLabelOffset = sceneScale.maxVectorLength * 0.5 + 8
  const aLabelOffset = sceneScale.maxVectorLength * 0.5 + 8
  const positionedLabels = layoutLabels([
    { x: cx, y: cy - 52, text: `F_N=${(m * 9.8).toFixed(1)}N`, fontSize: labelFontSize, anchor: 'middle', priority: 2 },
    { x: carX + vLabelOffset, y: carY - 15, text: `v=${v.toFixed(2)} m/s`, fontSize: labelFontSize, anchor: 'start', priority: 1 },
    { x: carX + aLabelOffset, y: carY - 32, text: `a=${a.toFixed(2)} m/s²`, fontSize: labelFontSize, anchor: 'start', priority: 0 },
  ], {
    bounds: { left: 0, right: canvasSize.width, top: 0, bottom: groundY },
    padding: 4,
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* 轨道 */}
        <PhysicsGround
          x={originX - 20} y={groundY}
          width={vp.visibleX + vp.visibleW * NEWTON_LAYOUT.trackEndRatio - (originX - 20)}
          appearance={{ color: PHYSICS_COLORS.labelText }}
        />
        {/* 轨道左侧挡板 */}
        <line
          x1={originX - 20}
          y1={groundY - 30}
          x2={originX - 20}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* 滑块小车：使用不锈钢金属渐变材质填充 */}
        <Block
          x={carX}
          y={carY}
          width={carWidth}
          height={carHeight}
          type="metal"
          label={`${m} kg`}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />

        {showVectors && (
          <g>
            {/* 1. 拉力 F (外力) */}
            <PhysicsVectorArrow
              originDesign={{ x: cx, y: cy }}
              vector={{ x: F_applied, y: 0 }}
              type="appliedForce"
              sceneScale={sceneScale}
              label="F"
            />
            <text
              x={cx + sceneScale.maxVectorLength * 0.5 + 8}
              y={cy + 4}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.appliedForce}
              fontWeight="bold"
            >
              ={F_applied.toFixed(1)}N
            </text>

            {/* 2. 摩擦力 f (当存在摩擦力时) */}
            {f > 0.01 && (() => {
              const shouldSeparateFrictionLabel = F_applied > 0.01
              const fLabelY = shouldSeparateFrictionLabel ? cy + 4 + FONT.bodySize * 1.2 : cy + 4
              return (
                <>
                  <PhysicsVectorArrow
                    originDesign={{ x: cx, y: cy }}
                    vector={{ x: -f, y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    label="f"
                  />
                  <text
                    x={cx - sceneScale.maxVectorLength * 0.5 - 8}
                    y={fLabelY}
                    fontSize={FONT.axisSize}
                    fill={PHYSICS_COLORS.friction}
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    ={f.toFixed(1)}N
                  </text>
                </>
              )
            })()}

            {/* 3. 重力 G = mg (向下) */}
            <PhysicsVectorArrow
              originDesign={{ x: cx, y: cy }}
              vector={{ x: 0, y: -m * GRAVITY }}
              type="gravity"
              sceneScale={sceneScale}
              label="G"
            />
            <text
              x={cx}
              y={cy + 60}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              G={(m * 9.8).toFixed(1)}N
            </text>

            {/* 4. 支持力 F_N (向上) */}
            <PhysicsVectorArrow
              originDesign={{ x: cx, y: cy }}
              vector={{ x: 0, y: m * GRAVITY }}
              type="normalForce"
              sceneScale={sceneScale}
              label="F_N"
            />
            <text
              x={positionedLabels[0].x}
              y={positionedLabels[0].y}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.normalForce}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_N={(m * 9.8).toFixed(1)}N
            </text>

            {/* 5. 合力 F_net (亮橙，画在地面下方) */}
            {F_net > 0.01 && (
              <g transform={`translate(${cx - 30}, ${groundY + 20})`}>
                <PhysicsVectorArrow
                  originDesign={{ x: 0, y: 0 }}
                  vector={{ x: F_net, y: 0 }}
                  type="force"
                  sceneScale={sceneScale}
                  label="F_合"
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain * 1.5}
                />
                <text
                  x={sceneScale.maxVectorLength * 0.5 + 8}
                  y={4}
                  fontSize={FONT.bodySize}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  ={F_net.toFixed(1)}N
                </text>
              </g>
            )}

            {/* 6. 速度 v 矢量 (经典蓝，画在车顶上方) */}
            <PhysicsVectorArrow
              originDesign={{ x: cx, y: cy }}
              vector={{ x: 1, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
            />
            <text
              x={positionedLabels[1].x}
              y={positionedLabels[1].y}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v={v.toFixed(2)} m/s
            </text>

            {/* 7. 加速度 a 矢量 (警示红，画在速度上方) */}
            {a > 0.01 && (
              <>
                <PhysicsVectorArrow
                  originDesign={{ x: cx, y: cy }}
                  vector={{ x: 1, y: 0 }}
                  type="acceleration"
                  sceneScale={sceneScale}
                />
                <text
                  x={positionedLabels[2].x}
                  y={positionedLabels[2].y}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.acceleration}
                  fontWeight="bold"
                >
                  a={a.toFixed(2)} m/s²
                </text>
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
