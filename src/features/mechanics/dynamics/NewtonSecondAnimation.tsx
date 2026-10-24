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
import { refFromPeak } from '@/utils/vectorRefs'
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

/** 滑杆默认值（与 registry defaultParams 一致） */
const NEWTON_DEFAULTS = { F: 10, m: 2, mu: 0 } as const
/** 滑杆量程（与 registry paramMeta 一致） */
const NEWTON_BOUNDS = { F: 50, mMin: 0.5, mMax: 10, muMax: 0.5 } as const
/**
 * 速度没有量程上界（v = a·t 随时间线性增长），基准改取「默认加速度下 10 s 的末速度」：
 * 默认帧的箭头恰好用 10 s 走完满量程，学生能看到速度随时间的增长；
 * 调大 F 后加速度变大，箭头会更早撞到满量程截断（数值标签仍给精确值）。
 */
const NEWTON_VELOCITY_PEAK =
  (NEWTON_DEFAULTS.F / NEWTON_DEFAULTS.m) * 10
/** 加速度基准：单滑杆极值扫描（F 推到上界 / m 推到下界） */
const NEWTON_ACCELERATION_PEAK = Math.max(
  NEWTON_BOUNDS.F / NEWTON_DEFAULTS.m,
  NEWTON_DEFAULTS.F / NEWTON_BOUNDS.mMin,
)

const NEWTON_SCENE_PROFILE: SceneLayoutProfile = {
  mode: 'visibleArea',
  designWidth: NEWTON_DESIGN.width,
  designHeight: NEWTON_DESIGN.height,
  refMagnitudes: {
    /**
     * 四个力共用同一基准（= 力滑杆量程上界 F_max）。
     *
     * 受力分析图里 F_外、f、G、N 是拿来**互相比较**的，基准必须同标度：
     * 若各按自己的量程定基准（F→50 N、G→m_max·g=98 N），F=10 N 的箭会比 G=19.6 N 的箭长，
     * 画面直接给出「拉力大于重力」的错误结论。
     * 取 F_max 而不是 98 N：98 N 会让默认帧的拉力箭缩到 7px（低于可读阈值），
     * 而重力在 m 推到 10 kg 的极端工况下撞满量程截断 —— 那时重力依然是画面最长的力箭。
     */
    appliedForce: refFromPeak(NEWTON_BOUNDS.F),
    friction: refFromPeak(NEWTON_BOUNDS.F),
    gravity: refFromPeak(NEWTON_BOUNDS.F),
    normalForce: refFromPeak(NEWTON_BOUNDS.F),
    force: refFromPeak(NEWTON_BOUNDS.F),
    velocity: refFromPeak(NEWTON_VELOCITY_PEAK),
    acceleration: refFromPeak(NEWTON_ACCELERATION_PEAK),
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
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })

  const contextProfile = useAnimationLayout()
  /**
   * registry 的 sceneLayout 只声明了画布尺寸（visibleArea / 700×400），没有 refMagnitudes；
   * 直接用它就会拿到空对象 → 所有箭头退回恒定 14px。故与本地基准做并集：
   * 注册表若显式给了某个类型的基准则以其为准，其余仍用本页标定值。
   */
  const refMagnitudes = {
    ...NEWTON_SCENE_PROFILE.refMagnitudes,
    ...(contextProfile?.refMagnitudes ?? {}),
  }

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

  /**
   * 基准固定（不再按当前值缩放）。
   *
   * 旧实现 `appliedForce: max(F_applied,5)*2` 之类让每个箭头都恒为半量程：
   * − 同一帧里 F_外 与 f 永远等长，受力分析图看不出谁大 —— 而「比较两个力」正是本页的教学目的；
   * − 把 F 从 10 N 拖到 50 N，箭头长度一动不动。
   * 固定基准后箭头长度才与量值成比例，ratio 超出 1 的部分仍由 min(ratio,1) 截断，不会溢出。
   */
  // 本页所有几何与所有矢量起点都是设计坐标（originDesign），矢量长度走
  // refMagnitudes + maxVectorLength 归一化，不经过 worldToDesign 换算。
  // 因此唯一需要的是 scaleX === scaleY === 1：锚点写 'viewport' 时
  // scaleX/Y 会随容器宽高比浮动（容器不是 840:650 就失衡并告警），'design' 恒为 1。
  const sceneScale = useSceneScale({
    vp, preset, anchor: 'design',
    physicsWidth: preset.width, physicsHeight: preset.height,
    refMagnitudes,
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

            {/* 6. 速度 v 矢量 (经典蓝，画在车顶上方)：传真实速率，长度才随速度增长 */}
            <PhysicsVectorArrow
              originDesign={{ x: cx, y: cy }}
              vector={{ x: v, y: 0 }}
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
                  vector={{ x: a, y: 0 }}
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
