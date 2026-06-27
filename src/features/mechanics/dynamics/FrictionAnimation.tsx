import { useEffect, useRef, useState } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useSimulationFrame } from '@/utils/animation'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, FONT, SCENE_COLORS } from '@/theme/physics'
import { calculateFrictionPullModel, calculateDoubleFrictionIncline } from '@/physics'
import { GRAVITY } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Block } from '@/components/Physics/Block'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScaleFromViewport } from '@/scene'
import type { SceneLayoutProfile } from '@/scene'
import { useAnimationLayout } from '@/context/AnimationLayoutContext'
import { calculateVectorPixelLength } from '@/utils/vectorLength'

// ── 布局常量 ──────────────────────────────────────────────────────────
const FRICTION_DESIGN = { width: 800, height: 440 } as const

const FRICTION_LAYOUT = {
  groundYRatio_m1: 0.75,       // 比例：模式一地面距可视区域顶部
  boxStartXRatio: 0.175,       // 比例：滑块起始 X 占可视区域宽度
  pullScaleRightMargin: 0.075, // 比例：拉力比例尺右侧留白
  groundYRatio_m2: 0.84,       // 比例：模式二地面距可视区域顶部
  pivotRatio: 0.18,            // 比例：斜面支点距可视区域左侧
  boardLengthRatio: 0.52,      // 比例：斜轨长度占可视区域宽度
} as const

const FRICTION_SCENE_PROFILE: SceneLayoutProfile = {
  mode: 'visibleArea',
  designWidth: FRICTION_DESIGN.width,
  designHeight: FRICTION_DESIGN.height,
  refMagnitudes: {
    appliedForce: 40,
    friction: 40,
    normalForce: 40,
    gravity: 40,
    force: 40,
  },
}
const INITIAL_SIM = { x1: 0, v1: 0, xM: 0, vM: 0, x_rel: 0, v_rel: 0 }

// ──────────────────────────────────────────────────────────────────────

export default function FrictionAnimation() {
  const { params, time, showVectors, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      updateParam: s.updateParam,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide)
  const { font } = canvasSize

  const contextProfile = useAnimationLayout()
  const sceneProfile = contextProfile ?? FRICTION_SCENE_PROFILE

  const vp = useViewport(canvasSize, {
    designWidth: sceneProfile.designWidth,
    designHeight: sceneProfile.designHeight,
  })

  // 物理量参考比例尺计算（基于可视区域）
  const pullScale = (vp.visibleW * (1 - FRICTION_LAYOUT.boxStartXRatio - FRICTION_LAYOUT.pullScaleRightMargin)) / 5
  const inclineScale = (vp.visibleH * 0.5) / 3.5

  // 声明统一的 SceneScale，使 VectorArrow 归一化长度符合规范
  const frictionSceneScale = createSceneScaleFromViewport(vp, sceneProfile)

  const mode = params.mode ?? 0
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? GRAVITY
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15
  const M = params.M ?? 10
  const mu_1 = params.mu_1 ?? 0.3
  const mu_2 = params.mu_2 ?? 0.2

  const weight = m * g
  const weight_M = M * g

  // ─── 外拉力 F_applied 的鼠标拖拽直接操控手势 ───
  const isBasicMode = mode === 0
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ clientX: 0, startF: 0 })

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    dragStartRef.current = { clientX: e.clientX, startF: F_applied }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStartRef.current.clientX
      const deltaF = deltaX / 5.5
      const newF = Math.min(40, Math.max(0, Math.round((dragStartRef.current.startF + deltaF) * 2) / 2))
      updateParam('F_applied', newF)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, updateParam])

  // ─── 实时动力学积分（useSimulationFrame，独立于播放键）───
  // useState 触发渲染，useRef 保存最新状态避免 rAF 回调过期闭包
  const [simState, setSimState] = useState(INITIAL_SIM)
  const simStateRef = useRef(INITIAL_SIM)

  // 参数变化时立即复位到起点
  useEffect(() => {
    simStateRef.current = INITIAL_SIM
    setSimState(INITIAL_SIM)
  }, [mode, m, mu, g, F_applied, angle, M, mu_1, mu_2])

  // 全局复位（time → 0）时复位
  const wasTimeZeroRef = useRef(true)
  useEffect(() => {
    const isZero = time === 0
    if (isZero && !wasTimeZeroRef.current) {
      simStateRef.current = INITIAL_SIM
      setSimState(INITIAL_SIM)
    }
    wasTimeZeroRef.current = isZero
  }, [time])

  // 1. 模式一：水平面拉力模型
  const {
    F_normal: F_normal_m1,
    f_actual: f_actual_m1,
    isSliding: isSliding_m1
  } = calculateFrictionPullModel(m, mu, F_applied, g)

  // 2. 模式二：双重摩擦力斜面模型
  const angleRad = (angle * Math.PI) / 180
  const res_m2 = calculateDoubleFrictionIncline({ m, M, theta: angle, mu_1, mu_2, g })

  // 布局坐标（供仿真与渲染共用）
  const groundY_m1 = vp.visibleY + vp.visibleH * FRICTION_LAYOUT.groundYRatio_m1
  const boxStartX_m1 = vp.visibleX + vp.visibleW * FRICTION_LAYOUT.boxStartXRatio
  const groundY_m2 = vp.visibleY + vp.visibleH * FRICTION_LAYOUT.groundYRatio_m2
  const pivotX = vp.visibleX + vp.visibleW * FRICTION_LAYOUT.pivotRatio
  const boardLength = vp.visibleW * FRICTION_LAYOUT.boardLengthRatio
  const boardLength_px = boardLength

  // 位移上限（供仿真边界处理，与渲染几何保持一致）
  // 模式一：滑块右边缘到达画布右边缘时停止（模拟撞墙，速度归零位置保持）
  const x1Limit_m = (vp.visibleW - boxStartX_m1 - 22) / pullScale
  // 模式二：滑块到达斜面底端时停止（滑落地面，速度归零位置保持）
  const xRelLimit_m = (boardLength_px * 0.85) / inclineScale

  // 实时仿真积分：始终运行，参数变化时由上方 useEffect 复位
  useSimulationFrame((deltaTimeMs) => {
    const dt = Math.min(0.033, deltaTimeMs / 1000)
    if (dt <= 0) return

    const prev = simStateRef.current

    if (mode === 0) {
      const f_max = 1.12 * mu * m * g
      const f_slip = mu * m * g
      let a1 = 0

      if (prev.v1 > 0.001) {
        a1 = (F_applied - f_slip) / m
      } else if (F_applied > f_max) {
        a1 = (F_applied - f_slip) / m
      }

      let newV1 = prev.v1 + a1 * dt
      let newX1 = prev.x1 + newV1 * dt

      if (newV1 <= 0.001) newV1 = 0
      // 到达画布右边缘时停止（撞墙，速度归零位置保持）
      if (newX1 >= x1Limit_m) {
        newX1 = x1Limit_m
        newV1 = 0
      }

      const next = { ...prev, x1: newX1, v1: newV1 }
      if (newX1 === prev.x1 && newV1 === prev.v1) return
      simStateRef.current = next
      setSimState(next)
    } else {
      let a_rel_frame = 0
      if (prev.v_rel > 0.001) {
        a_rel_frame = g * Math.sin(angleRad) + res_m2.a_M * Math.cos(angleRad) - mu_1 * (g * Math.cos(angleRad) - res_m2.a_M * Math.sin(angleRad))
      } else if (angle > res_m2.criticalAngle) {
        a_rel_frame = g * Math.sin(angleRad) + res_m2.a_M * Math.cos(angleRad) - mu_1 * (g * Math.cos(angleRad) - res_m2.a_M * Math.sin(angleRad))
      }

      let a_M_frame = 0
      if (prev.vM > 0.001) {
        a_M_frame = res_m2.a_M
      } else if (res_m2.isInclineSliding) {
        a_M_frame = res_m2.a_M
      }

      let newV_rel = prev.v_rel + a_rel_frame * dt
      let newX_rel = prev.x_rel + newV_rel * dt
      if (newV_rel <= 0.001) newV_rel = 0
      // 到达斜面底端时停止（滑落地面，速度归零位置保持）
      if (newX_rel >= xRelLimit_m) {
        newX_rel = xRelLimit_m
        newV_rel = 0
      }

      let newVM = prev.vM + a_M_frame * dt
      let newXM = prev.xM + newVM * dt
      if (newVM <= 0.001) newVM = 0
      // 斜面体到达画布右边缘时停止（撞墙，速度归零位置保持）
      const xMLimit_m = (vp.visibleW - 30 - vp.visibleW * FRICTION_LAYOUT.pivotRatio - boardLength_px * Math.cos(angleRad)) / inclineScale
      if (xMLimit_m > 0 && newXM >= xMLimit_m) {
        newXM = xMLimit_m
        newVM = 0
      }

      const next = { ...prev, x_rel: newX_rel, v_rel: newV_rel, xM: newXM, vM: newVM }
      if (newX_rel === prev.x_rel && newV_rel === prev.v_rel && newXM === prev.xM && newVM === prev.vM) return
      simStateRef.current = next
      setSimState(next)
    }
  })

  const displacement_m1 = simState.x1 * pullScale
  const displacement_M = simState.xM * inclineScale
  const displacement_rel = simState.x_rel * inclineScale

  const boxSize = 44
  const boxX_m1 = boxStartX_m1 + displacement_m1
  const boxY_m1 = groundY_m1 - boxSize

  // 斜面与地面坐标几何
  const H = boardLength * Math.sin(angleRad)
  const W = boardLength * Math.cos(angleRad)

  // 滑块初始在斜轨顶端偏下一点
  const boxLocalStartX = boardLength * 0.15
  const boxLocalX = boxLocalStartX + displacement_rel

  // 绝对世界坐标 (滑块重心)
  const localY = -boxSize / 2
  const deltaX = boxLocalX * Math.cos(angleRad) - localY * Math.sin(angleRad)
  const deltaY = boxLocalX * Math.sin(angleRad) + localY * Math.cos(angleRad)
  const blockWorldX = pivotX + displacement_M + deltaX
  const blockWorldY = groundY_m2 - H + deltaY

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          {/* 钢体材质渐变 */}
          <linearGradient id="steel-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          {/* 斜面体金属渐变 */}
          <linearGradient id="incline-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          {/* 矢量箭头定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.friction, PHYSICS_COLORS.normalForce, PHYSICS_COLORS.gravity, PHYSICS_COLORS.acceleration]} />
        </defs>

        {/* ─── 模式一：水平面拉力模型渲染 ─── */}
        {mode === 0 && (
          <g>
            {/* 水平地面 (组件化，地面带斜线阴影，不使用有厚度的 platform 矩形) */}
            <PhysicsGround
              x={60}
              y={groundY_m1}
              width={vp.visibleW - 120}
              type="ground"
              appearance={{
                showHatch: true,
                color: '#475569'
              }}
            />

            {/* 滑动时的摩擦微粒 */}
            {isSliding_m1 && (
              <g opacity={0.4}>
                <circle cx={boxX_m1 - 15} cy={groundY_m1 - 4} r={2} fill={PHYSICS_COLORS.friction} />
                <circle cx={boxX_m1 - 30} cy={groundY_m1 - 3} r={1.5} fill={PHYSICS_COLORS.friction} />
                <circle cx={boxX_m1 - 8} cy={groundY_m1 - 6} r={2.5} fill={PHYSICS_COLORS.friction} />
              </g>
            )}

            {/* 木箱滑块 */}
            <Block
              x={boxX_m1 - boxSize / 2}
              y={boxY_m1}
              width={boxSize}
              height={boxSize}
              type="wood"
              label={`m = ${m}kg`}
              stroke={CANVAS_COLORS.objectStroke}
              strokeWidth={1.8}
            />

            {/* 拉绳 (连向右端) */}
            <line
              x1={boxX_m1 + boxSize / 2} y1={groundY_m1 - boxSize / 2}
              x2={vp.visibleX + vp.visibleW - 60} y2={groundY_m1 - boxSize / 2}
              stroke={SCENE_COLORS.surface.smoothMark} strokeWidth={1} strokeDasharray="3,3"
            />

            {/* 受力分析矢量 (自动归一化长度) */}
            {showVectors && (
              <g>
                {/* 1. 外拉力 F (向右) */}
                <VectorArrow
                  origin={{ x: boxX_m1 + boxSize / 2, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: F_applied, y: 0 }}
                  type="appliedForce"
                  sceneScale={frictionSceneScale}
                />
                {isBasicMode ? (() => {
                  // 精准计算和 VectorArrow 内部完全相同的箭头像素长度，使拖拽热区和文字标签和箭头尖端完美重合！
                  const refMag = frictionSceneScale.refMagnitudes?.appliedForce ?? 40
                  const totalPxLen = calculateVectorPixelLength(
                    F_applied,
                    'appliedForce',
                    frictionSceneScale.maxVectorLength,
                    refMag
                  )
                  const tipPxX = boxX_m1 + boxSize / 2 + totalPxLen
                  const tipPxY = groundY_m1 - boxSize / 2

                  return (
                    <>
                      <text
                        x={tipPxX + 8} y={tipPxY + 4}
                        fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold"
                      >
                        F = {F_applied}N
                      </text>
                      {/* 拖拽热区圆圈 */}
                      <circle
                        cx={tipPxX}
                        cy={tipPxY}
                        r={12}
                        fill={PHYSICS_COLORS.appliedForce}
                        opacity={0.0}
                        className="cursor-ew-resize hover:opacity-15 active:opacity-30 transition-opacity duration-150"
                        onMouseDown={handleDragStart}
                      />
                    </>
                  )
                })() : (
                  <text
                    x={boxX_m1 + boxSize / 2 + 30} y={groundY_m1 - boxSize / 2 - 12}
                    fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold"
                  >
                    F
                  </text>
                )}

                {/* 2. 摩擦力 f (向左) */}
                {f_actual_m1 > 0.1 && (
                  <>
                    <VectorArrow
                      origin={{ x: boxX_m1 - boxSize / 2, y: -groundY_m1 }}
                      vector={{ x: -f_actual_m1, y: 0 }}
                      type="friction"
                      sceneScale={frictionSceneScale}
                    />
                    <text
                      x={boxX_m1 - boxSize / 2 - 25} y={groundY_m1 + 14}
                      fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.friction} fontWeight="bold"
                    >
                      f
                    </text>
                  </>
                )}

                {/* 3. 支持力 F_N (向上) */}
                <VectorArrow
                  origin={{ x: boxX_m1, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: 0, y: F_normal_m1 }}
                  type="normalForce"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={boxX_m1 - 22} y={groundY_m1 - boxSize / 2 - 32}
                  fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.normalForce} fontWeight="bold"
                >
                  F_N
                </text>

                {/* 4. 重力 G (向下) */}
                <VectorArrow
                  origin={{ x: boxX_m1, y: -(groundY_m1 - boxSize / 2) }}
                  vector={{ x: 0, y: -weight }}
                  type="gravity"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={boxX_m1 + 8} y={groundY_m1 - boxSize / 2 + 40}
                  fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                >
                  G
                </text>
              </g>
            )}
          </g>
        )}

        {/* ─── 模式二：双重摩擦力斜面模型渲染 ─── */}
        {mode === 1 && (
          <g>
            {/* 地面线 (组件化，带斜线阴影，不再使用 platform) */}
            <PhysicsGround
              x={30}
              y={groundY_m2}
              width={vp.visibleW - 60}
              type="ground"
              appearance={{
                showHatch: true,
                color: '#475569'
              }}
            />

            {/* 1. 三角形斜面体 (支持向右滑动 displacement_M) */}
            <g>
              {/* 三角形斜面 */}
              <polygon
                points={`
                  ${pivotX + displacement_M},${groundY_m2}
                  ${pivotX + displacement_M + W},${groundY_m2}
                  ${pivotX + displacement_M},${groundY_m2 - H}
                `}
                fill="#E2E8F0"
                stroke="#475569"
                strokeWidth={1.5}
              />
              <text
                x={pivotX + displacement_M + W * 0.25}
                y={groundY_m2 - 12}
                fontSize={font(11)}
                fill={PHYSICS_COLORS.labelText}
                fontWeight="bold"
              >
                M = {M}kg
              </text>
            </g>

            {/* 2. 嵌套 transform 绘制滑块 (直接贴在斜面上滑动) */}
            <g transform={`translate(${pivotX + displacement_M}, ${groundY_m2 - H}) rotate(${angle})`}>
              {/* 木箱滑块 */}
              <Block
                x={boxLocalX - boxSize / 2}
                y={-boxSize}
                width={boxSize}
                height={boxSize}
                type="wood"
                label={`m = ${m}kg`}
                stroke={CANVAS_COLORS.objectStroke}
                strokeWidth={1.8}
              />
            </g>

            {/* 3. 力的矢量绘制 (完全在世界参考系中绘制，防畸变与合规) */}
            {showVectors && (
              <g>
                {/* ── 滑块受力 ── */}
                {/* 重力 G_m (向下) */}
                <VectorArrow
                  origin={{ x: blockWorldX, y: -blockWorldY }}
                  vector={{ x: 0, y: -weight }}
                  type="gravity"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={blockWorldX + 8} y={blockWorldY + 36}
                  fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                >
                  G_m
                </text>

                {/* 支持力 FN1 (垂直斜面向上) */}
                <VectorArrow
                  origin={{ x: blockWorldX, y: -blockWorldY }}
                  vector={{ x: res_m2.FN1 * Math.sin(angleRad), y: res_m2.FN1 * Math.cos(angleRad) }}
                  type="normalForce"
                  sceneScale={frictionSceneScale}
                />
                <text
                  x={blockWorldX + res_m2.FN1 * 0.5 * Math.sin(angleRad) + 12}
                  y={blockWorldY - res_m2.FN1 * 0.5 * Math.cos(angleRad) - 10}
                  fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.normalForce} fontWeight="bold"
                >
                  F_N1
                </text>

                {/* 摩擦力 f1 (沿斜面向上/向左上) */}
                {res_m2.f1 > 0.1 && (
                  <>
                    <VectorArrow
                      origin={{ x: blockWorldX, y: -blockWorldY }}
                      vector={{ x: -res_m2.f1 * Math.cos(angleRad), y: res_m2.f1 * Math.sin(angleRad) }}
                      type="friction"
                      sceneScale={frictionSceneScale}
                    />
                    <text
                      x={blockWorldX - res_m2.f1 * 0.5 * Math.cos(angleRad) - 20}
                      y={blockWorldY - res_m2.f1 * 0.5 * Math.sin(angleRad) - 10}
                      fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.friction} fontWeight="bold"
                    >
                      f₁
                    </text>
                  </>
                )}

                {/* ── 斜面体受力 ── */}
                {(() => {
                  const inclineCenterWorldX = pivotX + displacement_M + W / 3
                  const inclineCenterWorldY = groundY_m2 - H / 3

                  return (
                    <g>
                      {/* 斜面重力 G_M (向下) */}
                      <VectorArrow
                        origin={{ x: inclineCenterWorldX, y: -inclineCenterWorldY }}
                        vector={{ x: 0, y: -weight_M }}
                        type="gravity"
                        sceneScale={frictionSceneScale}
                      />
                      <text
                        x={inclineCenterWorldX + 8} y={inclineCenterWorldY + 36}
                        fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                      >
                        G_M
                      </text>

                      {/* 地面支持力 FN2 (向上) */}
                      <VectorArrow
                        origin={{ x: inclineCenterWorldX, y: -groundY_m2 }}
                        vector={{ x: 0, y: res_m2.FN2 }}
                        type="normalForce"
                        sceneScale={frictionSceneScale}
                      />
                      <text
                        x={inclineCenterWorldX - 22} y={groundY_m2 - 32}
                        fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.normalForce} fontWeight="bold"
                      >
                        F_N2
                      </text>

                      {/* 地面摩擦力 f2 (向左) */}
                      {res_m2.f2 > 0.1 && (
                        <>
                          <VectorArrow
                            origin={{ x: inclineCenterWorldX, y: -groundY_m2 }}
                            vector={{ x: -res_m2.f2, y: 0 }}
                            type="friction"
                            sceneScale={frictionSceneScale}
                          />
                          <text
                            x={inclineCenterWorldX - 28} y={groundY_m2 + 14}
                            fontSize={font(FONT.axisSize)} fill={PHYSICS_COLORS.friction} fontWeight="bold"
                          >
                            f₂
                          </text>
                        </>
                      )}
                    </g>
                  )
                })()}

                {/* ── 滑块绝对加速度的正交分解辅助线 ── */}
                {res_m2.isBlockSliding && (
                  <g opacity={0.65}>
                    {/* 水平加速度 a_1x (向左，红色虚线) */}
                    <line
                      x1={blockWorldX} y1={blockWorldY}
                      x2={blockWorldX - res_m2.a_1x * 12} y2={blockWorldY}
                      stroke={PHYSICS_COLORS.acceleration} strokeWidth={1} strokeDasharray="3,3"
                    />
                    <polygon
                      points={`
                        ${blockWorldX - res_m2.a_1x * 12},${blockWorldY}
                        ${blockWorldX - res_m2.a_1x * 12 + 4},${blockWorldY - 2}
                        ${blockWorldX - res_m2.a_1x * 12 + 4},${blockWorldY + 2}
                      `}
                      fill={PHYSICS_COLORS.acceleration}
                    />
                    <text
                      x={blockWorldX - res_m2.a_1x * 12 - 18} y={blockWorldY + 4}
                      fontSize={font(9)} fill={PHYSICS_COLORS.acceleration} fontWeight="semibold"
                    >
                      a_1x
                    </text>

                    {/* 竖直加速度 a_1y (向下，红色虚线) */}
                    <line
                      x1={blockWorldX} y1={blockWorldY}
                      x2={blockWorldX} y2={blockWorldY + res_m2.a_1y * 12}
                      stroke={PHYSICS_COLORS.acceleration} strokeWidth={1} strokeDasharray="3,3"
                    />
                    <polygon
                      points={`
                        ${blockWorldX},${blockWorldY + res_m2.a_1y * 12}
                        ${blockWorldX - 2},${blockWorldY + res_m2.a_1y * 12 - 4}
                        ${blockWorldX + 2},${blockWorldY + res_m2.a_1y * 12 - 4}
                      `}
                      fill={PHYSICS_COLORS.acceleration}
                    />
                    <text
                      x={blockWorldX + 4} y={blockWorldY + res_m2.a_1y * 12 + 8}
                      fontSize={font(9)} fill={PHYSICS_COLORS.acceleration} fontWeight="semibold"
                    >
                      a_1y
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* 倾角标注弧线 */}
            <g>
              <path
                d={`M ${pivotX + displacement_M + W - 40} ${groundY_m2} A 40 40 0 0 0 ${pivotX + displacement_M + W - 40 * Math.cos(angleRad)} ${groundY_m2 - 40 * Math.sin(angleRad)}`}
                fill="none" stroke={CANVAS_COLORS.annotation} strokeWidth={1.2}
              />
              <text
                x={pivotX + displacement_M + W - 52} y={groundY_m2 - 10}
                fontSize={font(11)} fill={CANVAS_COLORS.annotation} fontWeight="bold"
              >
                θ = {angle}°
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* 水平拉力直接拖拽控制小标提示 */}
      {isBasicMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-neutral-400 bg-white/80 px-3 py-1 rounded-full shadow-sm pointer-events-none">
          💡 可用鼠标按住并左右拖拽拉力 F 箭头端点调节大小
        </div>
      )}
    </div>
  )
}
