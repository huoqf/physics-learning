import { useRef, useCallback, useState } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { FIRST_LAW_COLORS, SCENE_COLORS, ENERGY_COLORS, THERMO_COLORS } from '@/theme/physics'
import { STROKE, FONT, withAlpha } from '@/theme/physics'
import { PhysicsVectorArrow } from '@/components/Physics'
import { calculateSandboxState, calculateCycleState } from '@/physics/firstLaw'
import { worldToDesign } from '@/scene'

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 32
const BASE_SPEED = 1.8 // 基础分子物理运动速度 (m/s)

// ─── 粒子类型 ──────────────────────────────────────────────────────────────
interface GasParticle {
  x: number // 物理坐标 x (米)
  y: number // 物理坐标 y (米)
  vx: number // 物理速度 vx (m/s)
  vy: number // 物理速度 vy (m/s)
}

interface HeatParticle {
  x: number  // 物理坐标 x
  y: number  // 物理坐标 y
  vy: number // 向上浮动速度
  life: number // 生命周期 (0-1)
}

function initParticles(count: number): GasParticle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    return {
      x: (Math.random() - 0.5) * 1.6, // x 限制在 [-0.8, 0.8]
      y: 0.8 + Math.random() * 1.5,   // y 限制在 [0.8, 2.3]
      vx: Math.cos(angle) * BASE_SPEED,
      vy: Math.sin(angle) * BASE_SPEED,
    }
  })
}

export default function FirstLawAnimation() {
  const { params, isPlaying, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
    })),
  )

  // 1. 初始化标准 splitH 视口 (420x650)
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  // 2. 构造物理坐标系：宽度 3.0 m, 高度 6.0 m
  // x 范围 [-1.5, 1.5], y 范围 [0.0, 6.0]，y↑ 正方向，原点设为视口底部水平中央
  const visibleWidth = vp.visibleW / vp.scale
  const visibleHeight = vp.visibleH / vp.scale
  const visibleX = (vp.visibleX - vp.tx) / vp.scale
  const visibleY = (vp.visibleY - vp.ty) / vp.scale

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 3.0,
    physicsHeight: 6.0,
    originSource: 'custom',
    originX: visibleX + visibleWidth / 2,
    originY: visibleY + visibleHeight,
  })

  const mode = params.mode ?? 0
  const W_input = params.W ?? 0
  const Q_input = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0

  // 3. 获取实时状态物理量
  const state = mode === 1
    ? calculateCycleState(time)
    : calculateSandboxState(W_input, Q_input, adiabatic === 1)

  const { V, T, W, Q, deltaU, currentStepIndex } = state

  // 4. 根据物理状态算出活塞高度
  // 气缸底部在 y = 0.6 m，气缸开口在 y = 5.2 m
  // 活塞的高度范围在 y = 1.7 m (最小体积) ~ 4.7 m (最大体积)
  let pistonY = 3.2
  if (mode === 1) {
    pistonY = 3.2 + ((V - 1.0e-3) / 1.0e-3) * 1.5
  } else {
    pistonY = 3.2 - (W_input / 500) * 1.5
  }
  // 限制越界保护
  pistonY = Math.max(1.5, Math.min(4.9, pistonY))

  // 温度缩放因子 (用于粒子速度)
  const T_ref = 300
  const speedScale = Math.sqrt(Math.max(0.1, T) / T_ref)

  // ─── 粒子状态管理 ────────────────────────────────────────────────────────
  const particlesRef = useRef<GasParticle[]>(initParticles(PARTICLE_COUNT))
  const heatParticlesRef = useRef<HeatParticle[]>([])
  const [, setTick] = useState(0)

  // ─── 动画帧更新逻辑 ──────────────────────────────────────────────────────
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      // 气体内壁碰撞范围 (米)
      const xMin = -0.85
      const xMax = 0.85
      const yMin = 0.65
      const yMax = pistonY - 0.15

      // 更新基础分子运动
      for (const p of particlesRef.current) {
        // 分子碰撞反弹
        p.x += p.vx * speedScale * dt
        p.y += p.vy * speedScale * dt

        // 碰撞检测与位置约束 (防穿透)
        if (p.x < xMin) {
          p.x = xMin
          p.vx = Math.abs(p.vx)
        } else if (p.x > xMax) {
          p.x = xMax
          p.vx = -Math.abs(p.vx)
        }

        if (p.y < yMin) {
          p.y = yMin
          p.vy = Math.abs(p.vy)
        } else if (p.y > yMax) {
          p.y = yMax
          p.vy = -Math.abs(p.vy)
        }

        // 微小的无规则抖动
        p.vx += (Math.random() - 0.5) * 0.1 * dt
        p.vy += (Math.random() - 0.5) * 0.1 * dt

        // 保持速度幅值基本稳定 (受温度调节)
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const targetSpeed = BASE_SPEED * speedScale
        if (speed > 0) {
          p.vx = (p.vx / speed) * targetSpeed
          p.vy = (p.vy / speed) * targetSpeed
        }
      }

      // 更新热流粒子效果
      // 沙箱下 Q_input > 0，或循环下 Q > 0 (吸热时底部冒粉红小球)
      if (Q > 0 && Math.random() < 0.35) {
        heatParticlesRef.current.push({
          x: (Math.random() - 0.5) * 1.5,
          y: 0.6,
          vy: 0.8 + Math.random() * 0.8,
          life: 1.0,
        })
      }
      // 循环或沙箱下 Q < 0 (放热时侧壁散发蓝色小球)
      if (Q < 0 && Math.random() < 0.35) {
        heatParticlesRef.current.push({
          x: (Math.random() - 0.5) * 1.6,
          y: 0.6 + Math.random() * (pistonY - 0.8),
          vy: -0.5 - Math.random() * 0.5,
          life: 1.0,
        })
      }

      for (const hp of heatParticlesRef.current) {
        if (Q > 0) {
          hp.y += hp.vy * dt
          hp.life -= dt * 0.8 // 逐渐消失
        } else {
          // 放热：向下浮沉并向两侧偏转
          hp.y += hp.vy * dt
          hp.x += (hp.x > 0 ? 0.3 : -0.3) * dt
          hp.life -= dt * 1.2
        }
      }

      // 滤除失效粒子
      heatParticlesRef.current = heatParticlesRef.current.filter(
        (hp) => hp.life > 0 && hp.y >= 0.5 && hp.y <= pistonY,
      )

      setTick((t) => t + 1)
    },
    [pistonY, speedScale, Q],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  // ─── 坐标计算与渲染 ──────────────────────────────────────────────────────
  // 气缸外边界：x ∈ [-0.9, 0.9], y ∈ [0.5, 5.2]
  const cylLeftTop = worldToDesign(-0.9, 5.2, sceneScale)
  const cylWidth = 1.8 * sceneScale.scaleX
  const cylHeight = 4.7 * sceneScale.scaleY

  // 气体边界背景
  const gasLeftTop = worldToDesign(-0.87, pistonY, sceneScale)
  const gasWidth = 1.74 * sceneScale.scaleX
  const gasHeight = (pistonY - 0.6) * sceneScale.scaleY

  // 活塞
  const pistonLeftTop = worldToDesign(-0.89, pistonY + 0.1, sceneScale)
  const pistonWidth = 1.78 * sceneScale.scaleX
  const pistonHeight = 0.2 * sceneScale.scaleY

  // 内能色度背景 (冷蓝 -> 浅灰 -> 紫红)
  const normU = Math.max(-1, Math.min(1, deltaU / 500)) // 归一化内能
  // 插值获取背景色
  let gasBgColor = withAlpha(SCENE_COLORS.thermoChamber.gasVolumeBase, 0.4)
  if (normU > 0) {
    gasBgColor = withAlpha(THERMO_COLORS.heatAbsorb, 0.04 + normU * 0.16) // 用 heatAbsorb Token
  } else if (normU < 0) {
    gasBgColor = withAlpha(THERMO_COLORS.heatRelease, 0.04 + Math.abs(normU) * 0.16) // 用 heatRelease Token
  }


  // 做功外力矢量的物理量：
  // 力的方向：外界做功 W > 0 箭头向下 (F_y = -), W < 0 箭头向上 (F_y = +)
  // 力的物理大小与 W 成正比 (映射为 1 到 2 米的物理大小)
  const isWorkApplied = W !== 0
  const forceVector = {
    x: 0,
    y: W > 0 ? -1.5 : W < 0 ? 1.5 : 0,
  }
  // 力的作用起点
  const forceOrigin = {
    x: 0,
    // 做功向上时从活塞面出发，向下时从活塞上方出发指向活塞
    y: W > 0 ? pistonY + 1.8 : pistonY,
  }

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {/* 1. 加热/冷却源视觉表现 */}
      {Q > 0 && (
        <g>
          {/* 红色发热丝 */}
          <path
            d={`M ${worldToDesign(-0.7, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}
               Q ${worldToDesign(-0.35, 0.45, sceneScale).px} ${worldToDesign(0, 0.45, sceneScale).py} ${worldToDesign(0, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}
               T ${worldToDesign(0.7, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}`}
            fill="none"
            stroke={SCENE_COLORS.thermal.heaterOn}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.8}
          />
          <text
            x={worldToDesign(0, 0.35, sceneScale).px}
            y={worldToDesign(0, 0.35, sceneScale).py}
            fontSize={font(9)}
            fill={SCENE_COLORS.thermal.heaterOn}
            textAnchor="middle"
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            热源供热 Q &gt; 0
          </text>
        </g>
      )}

      {Q < 0 && (
        <g>
          {/* 蓝色冷却冰条 */}
          <rect
            x={worldToDesign(-0.7, 0.55, sceneScale).px}
            y={worldToDesign(-0.7, 0.55, sceneScale).py}
            width={1.4 * sceneScale.scaleX}
            height={0.15 * sceneScale.scaleY}
            fill={withAlpha(THERMO_COLORS.heatRelease, 0.4)}
            rx={2}
            opacity={0.7}
          />
          <text
            x={worldToDesign(0, 0.35, sceneScale).px}
            y={worldToDesign(0, 0.35, sceneScale).py}
            fontSize={font(9)}
            fill={THERMO_COLORS.heatRelease}
            textAnchor="middle"
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            热源吸热 Q &lt; 0 (系统放热)
          </text>
        </g>
      )}

      {/* 绝热气缸侧壁线条标记 */}
      {adiabatic === 1 && mode === 0 && (
        <text
          x={worldToDesign(0, 0.35, sceneScale).px}
          y={worldToDesign(0, 0.35, sceneScale).py}
          fontSize={font(9)}
          fill={FIRST_LAW_COLORS.adiabaticWall}
          textAnchor="middle"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          绝热气缸 Q ＝ 0
        </text>
      )}

      {/* 2. 气缸底色背景 */}
      <rect
        x={gasLeftTop.px}
        y={gasLeftTop.py}
        width={gasWidth}
        height={gasHeight}
        fill={gasBgColor}
        stroke="none"
      />

      {/* 3. 热流上升/发散视觉粒子 */}
      {heatParticlesRef.current.map((hp, i) => {
        const dPos = worldToDesign(hp.x, hp.y, sceneScale)
        const pColor = Q > 0 ? THERMO_COLORS.heatAbsorb : THERMO_COLORS.heatRelease
        return (
          <circle
            key={`heat-${i}`}
            cx={dPos.px}
            cy={dPos.py}
            r={2.5}
            fill={pColor}
            opacity={hp.life * 0.7}
          />
        )
      })}

      {/* 4. 气缸实体框线 */}
      <rect
        x={cylLeftTop.px}
        y={cylLeftTop.py}
        width={cylWidth}
        height={cylHeight}
        fill="none"
        stroke={adiabatic && mode === 0 ? FIRST_LAW_COLORS.adiabaticWall : SCENE_COLORS.thermal.gasChamberSt}
        strokeWidth={STROKE.objectLine}
        strokeDasharray={adiabatic === 1 && mode === 0 ? '6 3' : undefined}
        rx={6}
      />

      {/* 5. 气体分子粒子 */}
      {particlesRef.current.map((p, i) => {
        // 如果分子偶然漂移到活塞上方，则不渲染（或 clamp）
        if (p.y > pistonY - 0.1) return null
        const dPos = worldToDesign(p.x, p.y, sceneScale)
        // 粒子的颜色随温度变化而微微改变（高温偏红，低温偏蓝）
        const tempRatio = Math.max(0, Math.min(1, (T - 300) / 900))
        // 从 THERMO_COLORS.temperatureLow (#3B82F6 -> 59, 130, 246) 插值到 THERMO_COLORS.temperatureHigh (#EF4444 -> 239, 68, 68)
        const r = Math.round(59 + tempRatio * (239 - 59))
        const g = Math.round(130 + tempRatio * (68 - 130))
        const b = Math.round(246 + tempRatio * (68 - 246))
        const pColor = `rgb(${r}, ${g}, ${b})`
        return (
          <circle
            key={`gas-${i}`}
            cx={dPos.px}
            cy={dPos.py}
            r={3}
            fill={pColor}
            opacity={0.85}
          />
        )
      })}

      {/* 6. 活塞组件 */}
      <rect
        x={pistonLeftTop.px}
        y={pistonLeftTop.py}
        width={pistonWidth}
        height={pistonHeight}
        fill={SCENE_COLORS.thermoChamber.pistonBody}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectThin}
        rx={3}
      />
      {/* 活塞把手 */}
      <rect
        x={worldToDesign(-0.15, pistonY + 1.2, sceneScale).px}
        y={worldToDesign(-0.15, pistonY + 1.2, sceneScale).py}
        width={0.3 * sceneScale.scaleX}
        height={1.0 * sceneScale.scaleY}
        fill={SCENE_COLORS.thermoChamber.pistonBody}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectThin}
        opacity={0.8}
      />

      {/* 7. 外界受力矢量箭头 (PhysicsVectorArrow) */}
      {isWorkApplied && (
        <PhysicsVectorArrow
          origin={forceOrigin}
          vector={forceVector}
          type="force"
          sceneScale={sceneScale}
          color={ENERGY_COLORS.work}
          label={W > 0 ? 'F_外' : 'F_气'}
          font={font}
          glow
        />
      )}

      {/* 8. 实时文字状态标注 (物理位置: 气缸右上方) */}
      <g>
        <rect
          x={worldToDesign(-1.3, 5.8, sceneScale).px}
          y={worldToDesign(-1.3, 5.8, sceneScale).py}
          width={2.6 * sceneScale.scaleX}
          height={0.5 * sceneScale.scaleY}
          fill={withAlpha(SCENE_COLORS.materials.structBgLight, 0.95)}
          stroke={SCENE_COLORS.materials.structStrokePale}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={worldToDesign(0, 5.6, sceneScale).px}
          y={worldToDesign(0, 5.6, sceneScale).py}
          fontSize={font(10)}
          fill={SCENE_COLORS.charts.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {mode === 1 ? `循环步骤: ${['①等压膨胀', '②等容加热', '③等压压缩', '④等容冷却'][currentStepIndex ?? 0]}` : '沙箱自由模拟'}
        </text>
        <text
          x={worldToDesign(0, 5.4, sceneScale).px}
          y={worldToDesign(0, 5.4, sceneScale).py}
          fontSize={font(9)}
          fill={ENERGY_COLORS.internalEnergy}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          T = {T.toFixed(0)} K | ΔU = {deltaU.toFixed(0)} J
        </text>
      </g>
    </AnimationSvgCanvas>
  )
}
