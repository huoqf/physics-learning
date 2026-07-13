import { useMemo, useRef } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow, Ball, PhysicsGround } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { COMMON_MATERIALS, SPHERE_COLORS } from '@/theme/physics/scene/materials'
import { PENDULUM_COLORS, SURFACE_COLORS } from '@/theme/physics/scene/mechanics'
import type { SceneScale } from '@/scene/SceneScale'
import {
  calculateConicalPendulumState,
  calculateDiskRotationState,
  calculateDiskSlippingState,
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
} as const

// 2.5D 像素矢量的比例尺基准
const PIXEL_VECTOR_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 1,
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
  const showVectors = useAnimationStore((s) => s.showVectors)
  const isPlaying = useAnimationStore((s) => s.isPlaying)

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

  // ─── 惯性物理缓动（Lerp） ───
  const lastTimeRef = useRef(time)
  const thetaSmoothRef = useRef(isConical ? conical.thetaRad : 0)
  const radiusSmoothRef = useRef(radius)

  if (isPlaying) {
    const dt = Math.max(0, Math.min(0.1, time - lastTimeRef.current))
    const lerpFactor = 1 - Math.exp(-6 * dt) // 缓动阻尼系统

    const targetTheta = isConical ? conical.thetaRad : 0
    thetaSmoothRef.current += (targetTheta - thetaSmoothRef.current) * lerpFactor

    if (!isConical && !disk.slipping) {
      radiusSmoothRef.current += (radius - radiusSmoothRef.current) * lerpFactor
    }
  } else {
    // 暂停状态下瞬时改变参数以方便调试
    thetaSmoothRef.current = isConical ? conical.thetaRad : 0
    if (!isConical && !disk.slipping) {
      radiusSmoothRef.current = radius
    }
  }
  lastTimeRef.current = time

  const thetaSmooth = thetaSmoothRef.current
  const radiusSmooth = radiusSmoothRef.current

  // ─── 圆锥摆 / 旋转圆盘 质点坐标与状态机 ───
  const projected = useMemo(() => {
    if (isConical) {
      const orbitRadiusPx = SCENE.lengthPx * Math.sin(thetaSmooth)
      const stringProjectedPx = SCENE.lengthPx * Math.cos(thetaSmooth)
      const x = SCENE.centerX + orbitRadiusPx * Math.cos(phase)
      const y = SCENE.pivotY + stringProjectedPx - orbitRadiusPx * SCENE.projectionDepth * Math.sin(phase)
      return {
        x,
        y,
        orbitRadiusPx,
        orbitY: SCENE.pivotY + stringProjectedPx,
        opacity: 1.0,
        isFlownOut: false,
      }
    }

    // 旋转圆盘：计算打滑螺旋平抛轨迹
    const slipState = calculateDiskSlippingState(time, omega, radiusSmooth, mu, MASS_KG)
    
    // 物理 1m 映射为 66 像素
    const physScale = SCENE.diskRadiusPx / 2.0
    const x = SCENE.centerX + slipState.x * physScale
    const y = SCENE.diskCenterY - slipState.y * physScale * SCENE.projectionDepth - slipState.z * physScale

    return {
      x,
      y,
      orbitRadiusPx: slipState.radius * physScale,
      orbitY: SCENE.diskCenterY,
      opacity: slipState.opacity,
      isFlownOut: slipState.isFlownOut,
      slipState,
    }
  }, [isConical, thetaSmooth, phase, radiusSmooth, omega, mu, time])


  // ─── 矢量方向与长度计算（像素空间） ───
  const tangent = {
    x: -Math.sin(phase),
    y: -SCENE.projectionDepth * Math.cos(phase),
  }
  const tangentNorm = Math.hypot(tangent.x, tangent.y) || 1

  // 速度矢量：1m/s 对应 15px
  const currentR = isConical ? length * Math.sin(thetaSmooth) : radiusSmooth
  const speedVal = omega * currentR
  const velocityLength = clamp(speedVal * 15, 28, 86)

  // ─── 力的合成与分析数据准备 ───
  // 力 1N 对应 6px 长度
  const gForceVal = MASS_KG * 9.8
  const gForceLength = gForceVal * 6 // 58.8px

  // 重力在画布上永远竖直向下
  const gravityVec = pixelVector(0, 1)

  // 用于计算矢量引线
  const vecData = useMemo(() => {
    if (isConical) {
      // 摆线方向
      const dxLine = SCENE.centerX - projected.x
      const dyLine = SCENE.pivotY - projected.y
      const normLine = Math.hypot(dxLine, dyLine) || 1
      const tensionVec = pixelVector(dxLine / normLine, dyLine / normLine)

      const cosTheta = Math.cos(thetaSmooth)
      const tensionVal = cosTheta > 0.05 ? gForceVal / cosTheta : gForceVal
      const tensionLength = clamp(tensionVal * 6, 24, 110)

      // 合力（向心力）：水平指向旋转轴
      const dxCentrip = SCENE.centerX - projected.x
      const centripVec = pixelVector(dxCentrip > 0 ? 1 : -1, 0)
      const centripVal = gForceVal * Math.tan(thetaSmooth)
      const centripLength = clamp(centripVal * 6, 0, 110)

      // 平行四边形辅助点（重力终点和拉力终点）
      // 拉力的画布偏移
      const tOffX = (dxLine / normLine) * tensionLength
      const tOffY = (dyLine / normLine) * tensionLength
      
      // 合力（向心力）的画布偏移
      const cOffX = (dxCentrip > 0 ? 1 : -1) * centripLength

      return {
        tensionVec,
        tensionLength,
        centripVec,
        centripLength,
        // 平行四边形虚线端点
        tOffX,
        tOffY,
        cOffX,
      }
    } else {
      // 水平圆盘模式
      const state = projected.slipState
      const fLength = state ? state.friction * 6 : 0
      const nLength = state ? state.normalForce * 6 : 0

      // 摩擦力指向转轴
      const dxCenter = SCENE.centerX - projected.x
      const dyCenter = SCENE.diskCenterY - projected.y
      const normCenter = Math.hypot(dxCenter, dyCenter) || 1
      const frictionVec = pixelVector(dxCenter / normCenter, dyCenter / normCenter)

      // 支持力竖直向上
      const normalVec = pixelVector(0, -1)

      return {
        frictionVec,
        frictionLength: fLength,
        normalVec,
        normalLength: nLength,
      }
    }
  }, [isConical, projected, thetaSmooth, gForceVal])

  // 3D 旋转盘表面的 3 条径向标记线旋转相位
  const diskLines = useMemo(() => {
    return Array.from({ length: 3 }).map((_, idx) => {
      const angle = phase + (idx * 2 * Math.PI) / 3
      return {
        x: SCENE.centerX + SCENE.diskRadiusPx * Math.cos(angle),
        y: SCENE.diskCenterY - SCENE.diskRadiusPx * SCENE.projectionDepth * Math.sin(angle),
      }
    })
  }, [phase])

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-slate-50 rounded-xl shadow-inner">
      <defs>
        {/* 黄铜摆球径向渐变 */}
        <radialGradient id="brass-bob-grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SPHERE_COLORS.pendulumBob.gradient[0]} />
          <stop offset="35%" stopColor={SPHERE_COLORS.pendulumBob.gradient[1]} />
          <stop offset="85%" stopColor={SPHERE_COLORS.pendulumBob.gradient[2]} />
          <stop offset="100%" stopColor={SPHERE_COLORS.pendulumBob.gradient[3]} />
        </radialGradient>
        {/* 木纹物块渐变 */}
        <linearGradient id="lab-wood-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={COMMON_MATERIALS.labWoodGrad[0]} />
          <stop offset="40%" stopColor={COMMON_MATERIALS.labWoodGrad[1]} />
          <stop offset="80%" stopColor={COMMON_MATERIALS.labWoodGrad[2]} />
          <stop offset="100%" stopColor={COMMON_MATERIALS.labWoodGrad[3]} />
        </linearGradient>
        {/* 立体不锈钢旋转轴渐变 */}
        <linearGradient id="shaft-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={COMMON_MATERIALS.sliderMetalGrad[3]} />
          <stop offset="30%" stopColor={COMMON_MATERIALS.sliderMetalGrad[0]} />
          <stop offset="60%" stopColor={COMMON_MATERIALS.sliderMetalGrad[1]} />
          <stop offset="100%" stopColor={COMMON_MATERIALS.sliderMetalGrad[2]} />
        </linearGradient>
        {/* 立体旋转圆盘顶面金属渐变 */}
        <linearGradient id="disk-top-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[0], 0.9)} />
          <stop offset="100%" stopColor={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[2], 0.7)} />
        </linearGradient>
        {/* 立体旋转圆盘侧面金属渐变 */}
        <linearGradient id="disk-side-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={COMMON_MATERIALS.aluminumMetalGrad[2]} />
          <stop offset="100%" stopColor={COMMON_MATERIALS.aluminumMetalGrad[3]} />
        </linearGradient>
      </defs>

      {/* 旋转轴几何参考虚线（仅圆锥摆模式下，充当旋转中心轴线） */}
      {isConical && (
        <line
          x1={SCENE.centerX}
          y1={54}
          x2={SCENE.centerX}
          y2={SCENE.pivotY + SCENE.lengthPx + 30}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray={SCENE.axisDash}
        />
      )}

      {/* 悬挂天花板底座与旋转角速度 ω 指示器（仅圆锥摆模式下，还原高中课本纯悬绳圆锥摆模型） */}
      {isConical && (
        <g>
          <PhysicsGround
            x={SCENE.centerX - 24}
            y={SCENE.pivotY - 6}
            width={48}
            type="platform"
            appearance={{ thickness: 6 }}
          />
          {/* 悬挂固定环 */}
          <circle cx={SCENE.centerX} cy={SCENE.pivotY} r={4.5} fill={PENDULUM_COLORS.pivotStroke} />
          
          {/* 旋转角速度 ω 环形指示器 */}
          <g opacity={omega > 0.1 ? 0.85 : 0.3}>
            {/* 后侧半圆弧 (虚线) */}
            <path
              d={`M ${SCENE.centerX - 18} 120 A 18 5 0 0 1 ${SCENE.centerX + 18} 120`}
              fill="none"
              stroke={PHYSICS_COLORS.angularVelocity}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            {/* 前侧半圆弧 (实线，带指向左前方的箭头) */}
            <path
              d={`M ${SCENE.centerX + 18} 120 A 18 5 0 0 1 ${SCENE.centerX - 13} 123.5`}
              fill="none"
              stroke={PHYSICS_COLORS.angularVelocity}
              strokeWidth={1.8}
            />
            {/* 旋转箭头三角形 */}
            <polygon
              points={`${SCENE.centerX - 13},121.5 ${SCENE.centerX - 18},126 ${SCENE.centerX - 10},125`}
              fill={PHYSICS_COLORS.angularVelocity}
            />
            {/* ω 标注 */}
            <text
              x={SCENE.centerX - 30}
              y={122}
              fill={PHYSICS_COLORS.angularVelocity}
              fontSize={canvasSize.font(12)}
              fontWeight="bold"
              fontStyle="italic"
            >
              ω
            </text>
          </g>
        </g>
      )}

      {/* 3D 旋转轴 下半截轴（仅圆盘模式下，作为轴底段画在圆盘最底层） */}
      {!isConical && (
        <rect
          x={SCENE.centerX - 4}
          y={SCENE.diskCenterY}
          width={8}
          height={228}
          fill="url(#shaft-grad)"
          stroke={PENDULUM_COLORS.rodStroke}
          strokeWidth={1}
        />
      )}

      {isConical ? (
        // ─── 圆锥摆场景 ───
        <g>
          {/* 小球在下方的投影影子 */}
          <ellipse
            cx={projected.x}
            cy={projected.orbitY}
            rx={16}
            ry={16 * SCENE.projectionDepth}
            fill={SPHERE_COLORS.steel.shadow}
            stroke="none"
          />
          {/* 运动圆周轨迹 */}
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
          {/* 摆线 */}
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={projected.x}
            y2={projected.y}
            stroke={SURFACE_COLORS.ropeColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* 竖直中心线（参考线） */}
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={SCENE.centerX}
            y2={SCENE.pivotY + SCENE.lengthPx}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={1.5}
            strokeDasharray={SCENE.axisDash}
          />
          {/* 夹角 θ 弧线 */}
          <path
            d={`M ${SCENE.centerX} ${SCENE.pivotY + 42} A 42 42 0 0 1 ${SCENE.centerX + 42 * Math.sin(thetaSmooth)} ${SCENE.pivotY + 42 * Math.cos(thetaSmooth)}`}
            fill="none"
            stroke={PHYSICS_COLORS.annotation}
            strokeWidth={2}
          />
          <Label x={SCENE.centerX + 16} y={SCENE.pivotY + 58} font={canvasSize.font}>θ</Label>
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
        // ─── 旋转圆盘场景 ───
        <g>
          {/* 3D 具有厚度的金属盘 侧面 */}
          <path
            d={`M ${SCENE.centerX - SCENE.diskRadiusPx} ${SCENE.diskCenterY} A ${SCENE.diskRadiusPx} ${SCENE.diskRadiusPx * SCENE.projectionDepth} 0 0 0 ${SCENE.centerX + SCENE.diskRadiusPx} ${SCENE.diskCenterY} L ${SCENE.centerX + SCENE.diskRadiusPx} ${SCENE.diskCenterY + 12} A ${SCENE.diskRadiusPx} ${SCENE.diskRadiusPx * SCENE.projectionDepth} 0 0 1 ${SCENE.centerX - SCENE.diskRadiusPx} ${SCENE.diskCenterY + 12} Z`}
            fill="url(#disk-side-grad)"
            stroke={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[3], 0.8)}
            strokeWidth={1.2}
          />
          {/* 3D 金属盘 顶面 */}
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={SCENE.diskRadiusPx}
            ry={SCENE.diskRadiusPx * SCENE.projectionDepth}
            fill="url(#disk-top-grad)"
            stroke={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[2], 0.9)}
            strokeWidth={1.5}
          />
          
          {/* 圆盘旋转表面径向标记刻度线 */}
          {diskLines.map((linePt, idx) => (
            <line
              key={idx}
              x1={SCENE.centerX}
              y1={SCENE.diskCenterY}
              x2={linePt.x}
              y2={linePt.y}
              stroke={PHYSICS_COLORS.strokeDark}
              strokeWidth={1}
              opacity={0.35}
            />
          ))}

          {/* 运动轨迹虚线圈 */}
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={Math.max(8, (radiusSmooth / 2) * SCENE.diskRadiusPx)}
            ry={Math.max(3, (radiusSmooth / 2) * SCENE.diskRadiusPx * SCENE.projectionDepth)}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={1.8}
            strokeDasharray={SCENE.orbitDash}
          />

          {/* 物块落在圆盘面上的影子 (平抛飞出时与物块分离) */}
          {projected.opacity > 0 && (
            <ellipse
              cx={SCENE.centerX + (projected.slipState?.x ?? 0) * (SCENE.diskRadiusPx / 2.0)}
              cy={SCENE.diskCenterY - (projected.slipState?.y ?? 0) * (SCENE.diskRadiusPx / 2.0) * SCENE.projectionDepth}
              rx={14 * projected.opacity}
              ry={14 * SCENE.projectionDepth * projected.opacity}
              fill={SPHERE_COLORS.oscillatorMetal.shadow}
              opacity={projected.isFlownOut ? Math.max(0, projected.opacity - 0.3) : projected.opacity}
            />
          )}

          <Label x={SCENE.centerX} y={SCENE.diskCenterY + SCENE.diskRadiusPx * SCENE.projectionDepth + 34} font={canvasSize.font}>
            水平旋转圆盘
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
              已超过临界角速度：木块打滑离心并飞出
            </text>
          )}
        </g>
      )}

      {/* ─── 动态矢量箭头 (受力分析) ─── */}
      {showVectors && projected.opacity > 0 && (
        <g opacity={projected.opacity}>
          {/* 1. 速度矢量 v (蓝色，沿切线方向) */}
          <VectorArrow
            originPixel={{ x: projected.x, y: projected.y }}
            vector={pixelVector(tangent.x / tangentNorm, tangent.y / tangentNorm)}
            type="velocity"
            sceneScale={PIXEL_VECTOR_SCALE}
            pixelLength={velocityLength}
            label="v"
            font={canvasSize.font}
          />

          {/* 2. 重力 mg (深绿色，竖直向下) */}
          <VectorArrow
            originPixel={{ x: projected.x, y: projected.y }}
            vector={gravityVec}
            type="gravity"
            sceneScale={PIXEL_VECTOR_SCALE}
            pixelLength={gForceLength}
            label="mg"
            font={canvasSize.font}
          />

          {isConical ? (
            // ─── 圆锥摆力合成 ───
            <g>
              {/* 拉力 F_T (绳索紫，斜向上沿绳) */}
              <VectorArrow
                originPixel={{ x: projected.x, y: projected.y }}
                vector={vecData.tensionVec!}
                type="tension"
                sceneScale={PIXEL_VECTOR_SCALE}
                pixelLength={vecData.tensionLength!}
                label="FT"
                font={canvasSize.font}
              />

              {/* 平行四边形定则辅助线 */}
              <line
                x1={projected.x}
                y1={projected.y + gForceLength}
                x2={projected.x + vecData.cOffX!}
                y2={projected.y}
                stroke={PHYSICS_COLORS.textMuted}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={projected.x + vecData.tOffX!}
                y1={projected.y - vecData.tOffY!}
                x2={projected.x + vecData.cOffX!}
                y2={projected.y}
                stroke={PHYSICS_COLORS.textMuted}
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* 效果向心合力 F_合 (动力亮橙，水平指向旋转轴) */}
              {vecData.centripLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.centripVec!}
                  type="force"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.centripLength!}
                  color={PHYSICS_COLORS.forceNet}
                  label="F合"
                  dashed
                  font={canvasSize.font}
                />
              )}
            </g>
          ) : (
            // ─── 旋转圆盘受力平衡 ───
            <g>
              {/* 支持力 F_N (支持天蓝，竖直向上) */}
              {vecData.normalLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.normalVec!}
                  type="normalForce"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.normalLength!}
                  label="FN"
                  font={canvasSize.font}
                />
              )}

              {/* 摩擦力 f (静摩擦黄褐，沿半径指向圆心) */}
              {vecData.frictionLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.frictionVec!}
                  type="friction"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.frictionLength!}
                  color={disk.slipping ? PHYSICS_COLORS.friction : PHYSICS_COLORS.frictionStatic}
                  label={disk.slipping ? "f滑" : "f静"}
                  glow={disk.slipping}
                  font={canvasSize.font}
                />
              )}
            </g>
          )}
        </g>
      )}

      {/* ─── 物理实体小球 / 木块 ─── */}
      {projected.opacity > 0 && (
        <g opacity={projected.opacity}>
          {isConical ? (
            // 精致黄铜摆球
            <Ball
              cx={projected.x}
              cy={projected.y}
              r={16}
              type="pendulumBob"
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={1.5}
            />
          ) : (
            // 立体木质物块 (圆角矩形 + 表面木纹填充)
            <rect
              x={projected.x - SCENE.blockSize / 2}
              y={projected.y - SCENE.blockSize / 2}
              width={SCENE.blockSize}
              height={SCENE.blockSize}
              rx={3}
              fill="url(#lab-wood-grad)"
              stroke={PHYSICS_COLORS.strokeDark}
              strokeWidth={1.8}
            />
          )}
        </g>
      )}

      {/* 3D 旋转轴 上半截轴（仅圆盘模式，画在圆盘、物体和受力分析上层，以形成完美的 3D 穿插透视遮挡） */}
      {!isConical && (
        <g>
          <rect
            x={SCENE.centerX - 4}
            y={54}
            width={8}
            height={284}
            fill="url(#shaft-grad)"
            stroke={PENDULUM_COLORS.rodStroke}
            strokeWidth={1}
          />
          {/* 轴帽 */}
          <rect
            x={SCENE.centerX - 6}
            y={46}
            width={12}
            height={8}
            rx={1.5}
            fill={PENDULUM_COLORS.pivotFill}
            stroke={PENDULUM_COLORS.pivotStroke}
            strokeWidth={1}
          />
          <circle cx={SCENE.centerX} cy={SCENE.pivotY} r={3} fill={PENDULUM_COLORS.pivotStroke} />
          <Label x={SCENE.centerX} y={34} font={canvasSize.font}>旋转轴</Label>
        </g>
      )}

      {/* ─── 底部物理量图例说明 ─── */}
      <text
        x={18}
        y={626}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
      >
        蓝：速度 v / 绿：重力 mg / 紫：拉力 FT / 天蓝：支持力 FN / 褐：摩擦力 f / 橙：合力 F合
      </text>
    </AnimationSvgCanvas>
  )
}
