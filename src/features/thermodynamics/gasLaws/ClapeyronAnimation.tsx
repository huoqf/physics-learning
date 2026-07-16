import { useRef, useCallback, useState, useEffect } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, STROKE, FONT, SCENE_COLORS } from '@/theme/physics'
import { PhysicsVectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { worldToDesign } from '@/scene'
import { solveClapeyron } from '@/physics/clapeyron'

// ─── 物理与模拟常量 ─────────────────────────────────────────────────────────
const N_DEFAULT = 1
const T_MIN = 200
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2
const PARTICLE_COUNT = 24
const BASE_SPEED = 1.8

// ─── 粒子与撞击类型 ─────────────────────────────────────────────────────────
interface GasParticle {
  x: number // 物理坐标 x [-0.78, 0.78]
  y: number // 物理坐标 y [0.52, y_piston - 0.05]
  vx: number
  vy: number
}

interface CollisionRipple {
  id: number
  x: number // 物理坐标 x
  y: number // 物理坐标 y
  life: number // 剩余寿命 (秒)，最大 0.2
}

interface HeatParticle {
  id: number
  x: number // 物理坐标 x
  y: number // 物理坐标 y
  life: number // 寿命百分比 1..0
  vy: number
}

// ─── 十六进制转 RGB 纯函数 (用于动态渐变插值，对齐统一主题) ───────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 59, g: 130, b: 246 }
}

function initParticles(count: number, pistonY: number): GasParticle[] {
  return Array.from({ length: count }, () => {
    const rx = -0.75 + Math.random() * 1.5
    const ry = 0.6 + Math.random() * (pistonY - 0.7)
    const angle = Math.random() * Math.PI * 2
    return {
      x: rx,
      y: ry,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
    }
  })
}

export default function ClapeyronAnimation() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  // 物理坐标系投影 (原点在底部中央，physicsWidth = 3.0, physicsHeight = 5.0)
  const visibleWidth = vp.visibleW / vp.scale
  const visibleHeight = vp.visibleH / vp.scale
  const visibleX = (vp.visibleX - vp.tx) / vp.scale
  const visibleY = (vp.visibleY - vp.ty) / vp.scale

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 3.0,
    physicsHeight: 5.0,
    originSource: 'custom',
    originX: visibleX + visibleWidth / 2,
    originY: visibleY + visibleHeight * 0.9,
  })

  // 活塞物理高度 (y): 气缸底物理 y=0.5，活塞 y 随体积在 [0.5, 3.7] 区间变化
  const volumeRatio = (V - V_MIN) / (V_MAX - V_MIN)
  const pistonY = 0.5 + volumeRatio * 3.2

  // 状态变量引用
  const particlesRef = useRef<GasParticle[]>([])
  const collisionsRef = useRef<CollisionRipple[]>([])
  const heatParticlesRef = useRef<HeatParticle[]>([])
  const [, setTick] = useState(0)

  // 初始化粒子
  useEffect(() => {
    particlesRef.current = initParticles(PARTICLE_COUNT, pistonY)
  }, [])

  // 拖动体积使活塞高度突然变小后，当代偿防止粒子“跑缸”
  useEffect(() => {
    const limitY = pistonY - 0.05
    for (const p of particlesRef.current) {
      if (p.y > limitY) {
        p.y = limitY - Math.random() * 0.1
        p.vy = -Math.abs(p.vy)
      }
    }
  }, [pistonY])

  // 动画帧回调：物理更新
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      const speedScale = Math.sqrt(T / 300)
      const limitY = pistonY - 0.05

      // 1. 更新粒子物理位置与边界碰撞
      for (const p of particlesRef.current) {
        p.x += p.vx * BASE_SPEED * speedScale * dt
        p.y += p.vy * BASE_SPEED * speedScale * dt

        // 左右壁碰撞反弹
        if (p.x < -0.78) {
          p.x = -0.78
          p.vx = Math.abs(p.vx)
          collisionsRef.current.push({ id: Math.random(), x: -0.78, y: p.y, life: 0.2 })
        }
        if (p.x > 0.78) {
          p.x = 0.78
          p.vx = -Math.abs(p.vx)
          collisionsRef.current.push({ id: Math.random(), x: 0.78, y: p.y, life: 0.2 })
        }
        // 气缸底碰撞反弹
        if (p.y < 0.52) {
          p.y = 0.52
          p.vy = Math.abs(p.vy)
          collisionsRef.current.push({ id: Math.random(), x: p.x, y: 0.52, life: 0.2 })
        }
        // 活塞下表面碰撞反弹
        if (p.y > limitY) {
          p.y = limitY
          p.vy = -Math.abs(p.vy)
          collisionsRef.current.push({ id: Math.random(), x: p.x, y: limitY, life: 0.2 })
        }

        // 速度随机微扰
        p.vx += (Math.random() - 0.5) * 0.3 * dt
        p.vy += (Math.random() - 0.5) * 0.3 * dt

        // 维持动能约束
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const maxSpeed = speedScale * 1.3
        if (speed > maxSpeed && speed > 0) {
          p.vx = (p.vx / speed) * maxSpeed
          p.vy = (p.vy / speed) * maxSpeed
        }
      }

      // 2. 更新碰撞涟漪寿命
      collisionsRef.current = collisionsRef.current
        .map((c) => ({ ...c, life: c.life - dt }))
        .filter((c) => c.life > 0)

      // 3. 当处于受热状态 (T > 300K) 时，产生红色的热微粒飘动
      if (T > 300 && isPlaying) {
        if (Math.random() < 0.15) {
          heatParticlesRef.current.push({
            id: Math.random(),
            x: -0.7 + Math.random() * 1.4,
            y: 0.5,
            life: 1.0,
            vy: 0.8 + Math.random() * 0.8,
          })
        }
      }

      // 更新热粒子位置
      heatParticlesRef.current = heatParticlesRef.current
        .map((hp) => {
          hp.y += hp.vy * dt
          hp.life -= dt * 1.4
          return hp
        })
        .filter((hp) => hp.life > 0 && hp.y < limitY)

      setTick((t) => t + 1)
    },
    [T, pistonY, isPlaying],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  // 计算当前的理想气体宏观压强 P
  const P = solveClapeyron({ key: 'V', value: V }, { key: 'T', value: T }, 'P', N_DEFAULT)

  // ─── 绘制场景组件 ────────────────────────────────────────────────────────
  const wallStroke = STROKE.objectLine

  // 温度背景颜色插值 (从低冷蓝 temperatureLow 到高热红 temperatureHigh 动态转换)
  const lowColor = hexToRgb(THERMO_COLORS.temperatureLow)
  const highColor = hexToRgb(THERMO_COLORS.temperatureHigh)
  const tNorm = (T - T_MIN) / (T_MAX - T_MIN)
  const r = Math.round(lowColor.r + tNorm * (highColor.r - lowColor.r))
  const g = Math.round(lowColor.g + tNorm * (highColor.g - lowColor.g))
  const b = Math.round(lowColor.b + tNorm * (highColor.b - lowColor.b))
  const tempColor = `rgb(${r},${g},${b})`

  // 投影边界坐标
  const cylLeftTop = worldToDesign(-0.8, 4.2, sceneScale)
  const cylWidth = 1.6 * sceneScale.scaleX
  const cylHeight = 3.7 * sceneScale.scaleY

  const gasLeftTop = worldToDesign(-0.79, pistonY, sceneScale)
  const gasWidth = 1.58 * sceneScale.scaleX
  const gasHeight = (pistonY - 0.5) * sceneScale.scaleY

  // 活塞外尺寸与坐标
  const pistonLeftTop = worldToDesign(-0.81, pistonY + 0.15, sceneScale)
  const pistonWidth = 1.62 * sceneScale.scaleX
  const pistonHeight = 0.15 * sceneScale.scaleY

  // 活塞拉杆
  const rodTop = worldToDesign(0, 4.5, sceneScale)
  const rodBottom = worldToDesign(0, pistonY + 0.15, sceneScale)

  // 计算压力矢量箭头起点和大小
  const arrowLength = Math.min(0.8, 0.25 + (P / 1e5) * 0.55)
  const arrowXPositions = [-0.4, 0, 0.4]

  // 是否处于加热模式 (T > 300 K 时电阻丝发红)
  const isHeaterActive = T > 300

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 定义渐变与材质滤镜，确保质感高级 (Rich Aesthetics) */}
        <defs>
          {/* 气体温度渐变 */}
          <linearGradient id="clapeyron-gas-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tempColor} stopOpacity={0.16} />
            <stop offset="100%" stopColor={tempColor} stopOpacity={0.03} />
          </linearGradient>

          {/* 拟物不锈钢拉丝金属渐变 (来源于 sliderMetalGrad 规范) */}
          <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx, arr) => (
              <stop
                key={idx}
                offset={`${(idx / (arr.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        </defs>

        {/* 1. 气缸底座配重板 */}
        <rect
          x={worldToDesign(-0.95, 0.5, sceneScale).px}
          y={worldToDesign(-0.95, 0.5, sceneScale).py}
          width={1.9 * sceneScale.scaleX}
          height={0.15 * sceneScale.scaleY}
          fill="url(#metal-gradient)"
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={wallStroke}
          rx={2}
        />

        {/* 2. 气缸壁外腔框架 */}
        <rect
          x={cylLeftTop.px}
          y={cylLeftTop.py}
          width={cylWidth}
          height={cylHeight}
          fill={SCENE_COLORS.thermal.beakerFill}
          stroke={SCENE_COLORS.thermoChamber.cylinderWall}
          strokeWidth={wallStroke + 3}
          rx={4}
        />
        {/* 气缸壁内壁描线 */}
        <rect
          x={cylLeftTop.px}
          y={cylLeftTop.py}
          width={cylWidth}
          height={cylHeight}
          fill="none"
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={wallStroke}
          rx={4}
        />

        {/* 3. 气体空间温度渐变背景 */}
        <rect
          x={gasLeftTop.px}
          y={gasLeftTop.py}
          width={gasWidth}
          height={gasHeight}
          fill="url(#clapeyron-gas-grad)"
        />

        {/* 4. 产生热量粒子漂动 */}
        {heatParticlesRef.current.map((hp) => {
          const designPos = worldToDesign(hp.x, hp.y, sceneScale)
          return (
            <circle
              key={hp.id}
              cx={designPos.px}
              cy={designPos.py}
              r={1.8}
              fill={SCENE_COLORS.thermal.heaterOn}
              opacity={hp.life * 0.75}
            />
          )
        })}

        {/* 5. 碰撞扩散涟漪动效 */}
        {collisionsRef.current.map((c) => {
          const designPos = worldToDesign(c.x, c.y, sceneScale)
          return (
            <circle
              key={c.id}
              cx={designPos.px}
              cy={designPos.py}
              r={15 * (1 - c.life / 0.2)}
              fill="none"
              stroke={THERMO_COLORS.pressure}
              strokeWidth={1.2}
              opacity={c.life / 0.2}
            />
          )
        })}

        {/* 6. 气体粒子 */}
        {particlesRef.current.map((p, i) => {
          const designPos = worldToDesign(p.x, p.y, sceneScale)
          return (
            <circle
              key={i}
              cx={designPos.px}
              cy={designPos.py}
              r={3}
              fill={SCENE_COLORS.materials.structStroke}
              opacity={0.85}
            />
          )
        })}

        {/* 7. 活塞金属拉杆 */}
        <line
          x1={rodBottom.px}
          y1={rodBottom.py}
          x2={rodTop.px}
          y2={rodTop.py}
          stroke="url(#metal-gradient)"
          strokeWidth={STROKE.objectThin + 2}
          strokeLinecap="round"
        />
        <line
          x1={rodBottom.px}
          y1={rodBottom.py}
          x2={rodTop.px}
          y2={rodTop.py}
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <circle
          cx={rodTop.px}
          cy={rodTop.py}
          r={7}
          fill="url(#metal-gradient)"
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={1.5}
        />

        {/* 8. 活塞本体 */}
        <rect
          x={pistonLeftTop.px}
          y={pistonLeftTop.py}
          width={pistonWidth}
          height={pistonHeight}
          fill="url(#metal-gradient)"
          stroke={SCENE_COLORS.materials.structStroke}
          strokeWidth={STROKE.objectThin}
          rx={2}
          opacity={0.95}
        />
        {/* 橡胶密封胶圈 */}
        <rect
          x={pistonLeftTop.px}
          y={pistonLeftTop.py + pistonHeight * 0.3}
          width={pistonWidth}
          height={pistonHeight * 0.15}
          fill={SCENE_COLORS.thermoChamber.pistonSeal}
          opacity={0.9}
        />
        <rect
          x={pistonLeftTop.px}
          y={pistonLeftTop.py + pistonHeight * 0.65}
          width={pistonWidth}
          height={pistonHeight * 0.15}
          fill={SCENE_COLORS.thermoChamber.pistonSeal}
          opacity={0.9}
        />

        {/* 9. 活塞受力物理箭头 */}
        {P > 0 && arrowXPositions.map((ax, idx) => (
          <PhysicsVectorArrow
            key={`p-arrow-${idx}`}
            origin={{ x: ax, y: pistonY + 0.15 + arrowLength }}
            vector={{ x: 0, y: -arrowLength }}
            type="force"
            sceneScale={sceneScale}
            color={THERMO_COLORS.pressure}
            glow
          />
        ))}

        {/* 10. 加热电阻丝 (温度大于 300K 时发红并亮起) */}
        <g>
          <path
            d={`M ${worldToDesign(-0.6, 0.43, sceneScale).px} ${worldToDesign(-0.6, 0.43, sceneScale).py}
               Q ${worldToDesign(-0.3, 0.35, sceneScale).px} ${worldToDesign(-0.3, 0.35, sceneScale).py} ${worldToDesign(0, 0.43, sceneScale).px} ${worldToDesign(0, 0.43, sceneScale).py}
               T ${worldToDesign(0.6, 0.43, sceneScale).px} ${worldToDesign(0.6, 0.43, sceneScale).py}`}
            fill="none"
            stroke={isHeaterActive ? SCENE_COLORS.thermal.heaterCoil : SCENE_COLORS.thermal.heaterOff}
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.9}
          />
          {isHeaterActive && (
            <path
              d={`M ${worldToDesign(-0.6, 0.43, sceneScale).px} ${worldToDesign(-0.6, 0.43, sceneScale).py}
                 Q ${worldToDesign(-0.3, 0.35, sceneScale).px} ${worldToDesign(-0.3, 0.35, sceneScale).py} ${worldToDesign(0, 0.43, sceneScale).px} ${worldToDesign(0, 0.43, sceneScale).py}
                 T ${worldToDesign(0.6, 0.43, sceneScale).px} ${worldToDesign(0.6, 0.43, sceneScale).py}`}
              fill="none"
              stroke={SCENE_COLORS.thermal.heaterOn}
              strokeWidth={6.5}
              strokeLinecap="round"
              opacity={0.3}
            />
          )}
          <text
            x={worldToDesign(0, 0.28, sceneScale).px}
            y={worldToDesign(0, 0.28, sceneScale).py}
            fontSize={font(9)}
            fill={isHeaterActive ? SCENE_COLORS.thermal.heaterOn : SCENE_COLORS.thermal.heaterOff}
            textAnchor="middle"
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            {isHeaterActive ? '底座加热中' : '热源待机'}
          </text>
        </g>

        {/* 11. 仪表盘读数标注 */}
        <g>
          {/* HUD 背景板 */}
          <rect
            x={worldToDesign(-1.45, 4.1, sceneScale).px}
            y={worldToDesign(-1.45, 4.1, sceneScale).py}
            width={0.6 * sceneScale.scaleX}
            height={1.5 * sceneScale.scaleY}
            fill={SCENE_COLORS.materials.structBgLight}
            stroke={SCENE_COLORS.materials.structStrokePale}
            strokeWidth={1.5}
            rx={6}
            opacity={0.92}
          />
          {/* T 温度值 */}
          <text
            x={worldToDesign(-1.15, 3.8, sceneScale).px}
            y={worldToDesign(-1.15, 3.8, sceneScale).py}
            fontSize={font(10.5)}
            fill={THERMO_COLORS.temperature}
            fontFamily={FONT.family}
            textAnchor="middle"
            fontWeight="bold"
          >
            T = {T.toFixed(0)} K
          </text>
          {/* V 体积值 */}
          <text
            x={worldToDesign(-1.15, 3.3, sceneScale).px}
            y={worldToDesign(-1.15, 3.3, sceneScale).py}
            fontSize={font(10.5)}
            fill={THERMO_COLORS.volume}
            fontFamily={FONT.family}
            textAnchor="middle"
            fontWeight="bold"
          >
            V = {(V * 1000).toFixed(1)} L
          </text>
          {/* P 压强值 */}
          <text
            x={worldToDesign(-1.15, 2.8, sceneScale).px}
            y={worldToDesign(-1.15, 2.8, sceneScale).py}
            fontSize={font(10.5)}
            fill={THERMO_COLORS.pressure}
            fontFamily={FONT.family}
            textAnchor="middle"
            fontWeight="bold"
          >
            {P > 1000 ? (P / 1000).toFixed(1) + ' kPa' : P.toFixed(0) + ' Pa'}
          </text>
        </g>
      </AnimationSvgCanvas>
    </div>
  )
}
