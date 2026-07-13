/**
 * BulletBlockScene.tsx
 * 子弹打木块 SVG 场景组件
 *
 * 职责：渲染导轨、木块、子弹、矢量箭头、相对位移阴影、热量粒子和三层位移标注拉线
 * 所有坐标均为设计坐标（SVG 内部），不直接处理物理单位
 */
import { useMemo, useId } from 'react'
import { Block, VectorArrow, VectorDefs } from '@/components/Physics'
import { PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics/colors'
import type { SceneScale } from '@/scene/SceneScale'
import { worldToPixel } from '@/scene/SceneScale'
import type { BulletBlockState } from '@/physics/bulletBlock'
import { BB_LAYOUT } from './hooks/useBulletBlockPhysics'

/** 伪随机但稳定的粒子生成（基于种子，不依赖 Math.random） */
function getParticle(seed: number, contactX: number, baseY: number, animTime: number) {
  const s1 = Math.sin(seed * 1.7) * 0.5 + 0.5
  const s2 = Math.cos(seed * 2.3) * 0.5 + 0.5
  const dx = (s1 - 0.5) * 14
  const dy = -(s2 * 10 + animTime * 3)
  const opacity = Math.max(0, 0.55 - animTime * 0.25 - Math.abs(dx) / 25)
  const r = 1.2 + (seed % 3) * 0.6
  return { cx: contactX + dx, cy: baseY + dy, r, opacity }
}

/** 穿透出瞬间飞溅的木屑碎粒动画计算 */
function getWoodDebris(seed: number, blockRightX: number, baseY: number, dtAnim: number) {
  // dtAnim 为穿出后经过的动画时间 (s)
  const angle = ((seed * 123.4) % 1.2) - 0.6 // 弧度：约 -35度 到 35度
  const speed = 120 + (seed % 5) * 30 // 设计坐标像素/秒
  const gravity = 250 // 重力加速度 像素/秒^2

  const vx = Math.cos(angle) * speed
  const vy = Math.sin(angle) * speed

  // 动画轨迹公式：s = v0 * t + 0.5 * a * t^2
  const dx = vx * dtAnim
  const dy = vy * dtAnim + 0.5 * gravity * dtAnim * dtAnim

  const opacity = Math.max(0, 0.8 - dtAnim * 1.5)
  const size = 1.0 + (seed % 3) * 0.8

  return { cx: blockRightX + dx, cy: baseY + dy, r: size, opacity }
}

interface DimensionBracketProps {
  x1: number
  x2: number
  y: number
  label: string
  valueText: string
  color: string
  highlighted: boolean
  dimmed: boolean
  font: (s: number) => number
}

/**
 * 维度拉线/位移指示器组件
 */
function DimensionBracket({
  x1,
  x2,
  y,
  label,
  valueText,
  color,
  highlighted,
  dimmed,
  font,
}: DimensionBracketProps) {
  if (Math.abs(x1 - x2) < 2) return null
  const strokeW = highlighted ? 2 : 1
  const opacity = highlighted ? 1 : dimmed ? 0.35 : 0.75

  return (
    <g opacity={opacity} className="transition-all duration-200" pointerEvents="none">
      {/* 水平主轴线 */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={strokeW} />
      {/* 左右两侧小垂直挡线 */}
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={color} strokeWidth={strokeW} />
      {/* 相对位移拉线，如果是木块内部，可以用反向的小勾子体现相对深度 */}
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={color} strokeWidth={strokeW} />

      {/* 覆盖背景线的白色底板矩形 */}
      <rect
        x={(x1 + x2) / 2 - 40}
        y={y - 6}
        width={80}
        height={12}
        fill={PHYSICS_COLORS.white}
        opacity={0.9}
        rx={1}
      />
      {/* 文本标注 */}
      <text
        x={(x1 + x2) / 2}
        y={y + 3.5}
        fill={color}
        fontSize={font(8)}
        textAnchor="middle"
        fontWeight={highlighted ? 'bold' : 'normal'}
        className="select-none"
      >
        {label} = {valueText}
      </text>
    </g>
  )
}

interface BulletBlockSceneProps {
  state: BulletBlockState
  param: { m: number; M: number; L: number; v0: number }
  timeline: { deltaXMax: number; tExit: number }
  mode: 'retain' | 'penetrate'
  sceneScale: SceneScale
  font: (base: number) => number
  showDeltaX: boolean
  time: number
  timeScale: number
  groundWidth: number
  groundX: number
  highlightType: 's1' | 's2' | 'deltaX' | null
}

export default function BulletBlockScene({
  state,
  param,
  timeline,
  sceneScale,
  font,
  showDeltaX,
  time,
  timeScale,
  groundWidth,
  groundX,
  highlightType,
}: BulletBlockSceneProps) {
  const uniqueId = useId().replace(/:/g, '-')

  const hasExited = state.phase === 'exited'

  const blockLeft = worldToPixel(state.blockX, 0, sceneScale).px
  const blockTop = BB_LAYOUT.groundY - BB_LAYOUT.blockHeight
  
  // 木块视觉宽度始终等于物理厚度 L
  const blockWorldWidth = param.L
  const blockWidth = blockWorldWidth * sceneScale.scaleX

  const bulletCenterX = worldToPixel(state.bulletX, 0, sceneScale).px
  const bulletCenterY = BB_LAYOUT.groundY - BB_LAYOUT.blockHeight / 2

  const inContact = state.phase === 'penetrating' && state.relativeDepth > 1e-6
  const contactX = inContact
    ? worldToPixel(state.blockX + Math.min(state.relativeDepth, param.L), 0, sceneScale).px
    : blockLeft

  // 1. 热量火花粒子（穿透滑动阶段）
  const particles = useMemo(() => {
    if (!inContact) return []
    return Array.from({ length: 12 }, (_, i) =>
      getParticle(i * 137.5, contactX, bulletCenterY, time),
    )
  }, [inContact, contactX, bulletCenterY, time])

  // 2. 穿出破裂木屑粒子：使用动画时间差计算
  const exitDtAnim = useMemo(() => {
    if (!hasExited || !isFinite(timeline.tExit)) return 0
    const tExitAnim = timeline.tExit * timeScale
    return Math.max(0, time - tExitAnim)
  }, [hasExited, timeline.tExit, timeScale, time])

  const showDebris = hasExited && exitDtAnim > 0 && exitDtAnim < 0.8

  const debrisList = useMemo(() => {
    if (!showDebris) return []
    const blockRight = blockLeft + blockWidth
    const baseY = BB_LAYOUT.groundY - BB_LAYOUT.blockHeight * 0.5
    return Array.from({ length: 15 }, (_, i) =>
      getWoodDebris(i * 97 + 13, blockRight, baseY, exitDtAnim),
    )
  }, [showDebris, blockLeft, blockWidth, exitDtAnim])

  // 3. 位移拉线起点与终点设计（像素坐标）
  const originPixelX = BB_LAYOUT.blockInitX // 物理 0 点对应的像素坐标

  // 当 state.t < -1e-9（飞入阶段）时，不显示位移和深度标注
  const isFlying = state.t < -1e-9

  // 子弹位移 s1
  const s1X1 = originPixelX
  const s1X2 = isFlying ? originPixelX : bulletCenterX
  const s1Text = `${Math.max(0, state.bulletX).toFixed(3)} m`

  // 木块位移 s2
  const s2X1 = originPixelX
  const s2X2 = isFlying ? originPixelX : blockLeft
  const s2Text = `${state.blockX.toFixed(3)} m`

  // 相对位移 deltaX
  const dxX1 = blockLeft
  const dxX2 = isFlying ? blockLeft : (hasExited ? blockLeft + blockWidth : bulletCenterX)
  const dxText = `${state.relativeDepth.toFixed(3)} m`

  const hasHighlight = highlightType !== null

  return (
    <g>
      <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration, PHYSICS_COLORS.elasticForce]} />

      <defs>
        {/* 木块内部摩擦发热烧焦渐变 */}
        <linearGradient id={`burn-grad-${uniqueId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PHYSICS_COLORS.internalEnergy} stopOpacity={0.65} />
          <stop offset="70%" stopColor={PHYSICS_COLORS.internalEnergy} stopOpacity={0.4} />
          <stop offset="100%" stopColor={withAlpha(PHYSICS_COLORS.friction, 0.1)} stopOpacity={0.1} />
        </linearGradient>
        {/* 子弹流线型金属质感渐变（严格引用 SCENE_COLORS） */}
        <linearGradient id={`bullet-metal-grad-${uniqueId}`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
          <stop offset="35%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
          <stop offset="70%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
        </linearGradient>
      </defs>

      {/* 地面坐标尺（以木块初始位置为 0 点） */}
      <PhysicsGround
        x={groundX}
        y={BB_LAYOUT.groundY}
        width={groundWidth}
        ruler={{
          domain: [
            (groundX - originPixelX) / sceneScale.scaleX,
            (groundX + groundWidth - originPixelX) / sceneScale.scaleX,
          ],
          unit: 'm',
          showAxisLine: true,
          showAxisArrow: true,
          axisLabel: 'x',
          position: 'bottom',
          axisOffset: 12,
        }}
      />

      {/* 子弹尾部的超高速运动模糊空气尾迹 */}
      {state.phase === 'penetrating' && state.bulletV > param.v0 * 0.3 && (
        <g opacity={0.6} pointerEvents="none">
          <line
            x1={bulletCenterX - 15}
            y1={bulletCenterY - 4}
            x2={bulletCenterX - 40}
            y2={bulletCenterY - 4}
            stroke={withAlpha(PHYSICS_COLORS.velocity, 0.25)}
            strokeWidth={1.5}
          />
          <line
            x1={bulletCenterX - 10}
            y1={bulletCenterY}
            x2={bulletCenterX - 45}
            y2={bulletCenterY}
            stroke={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
            strokeWidth={2}
          />
          <line
            x1={bulletCenterX - 15}
            y1={bulletCenterY + 4}
            x2={bulletCenterX - 40}
            y2={bulletCenterY + 4}
            stroke={withAlpha(PHYSICS_COLORS.velocity, 0.25)}
            strokeWidth={1.5}
          />
        </g>
      )}

      {/* 木块内部摩擦发热带 */}
      {state.relativeDepth > 0 && (
        <rect
          x={blockLeft}
          y={blockTop + BB_LAYOUT.blockHeight / 2 - 6}
          width={Math.min(state.relativeDepth * sceneScale.scaleX, blockWidth)}
          height={12}
          fill={`url(#burn-grad-${uniqueId})`}
          opacity={0.8}
          pointerEvents="none"
          rx={2}
        />
      )}

      {/* 相对位移阴影（保留作高考对比参照，当 showDeltaX 开启且处于穿透阶段） */}
      {showDeltaX && inContact && state.relativeDepth > 0 && (
        <rect
          x={blockLeft}
          y={blockTop + 2}
          width={Math.min(state.relativeDepth * sceneScale.scaleX, blockWidth)}
          height={BB_LAYOUT.blockHeight - 4}
          fill={PHYSICS_COLORS.referencePoint}
          opacity={0.15}
          rx={3}
          pointerEvents="none"
        />
      )}

      {/* 木块 */}
      <Block
        x={blockLeft}
        y={blockTop}
        width={blockWidth}
        height={BB_LAYOUT.blockHeight}
        type="wood"
        label={`M = ${param.M}kg`}
        font={font}
      />

      {/* 子弹：金属质感流线型尖头子弹（不贴地，严格引用 SCENE_COLORS 描边） */}
      <path
        d={`M ${bulletCenterX - 11} ${bulletCenterY - 5} 
            H ${bulletCenterX - 2} 
            C ${bulletCenterX + 3} ${bulletCenterY - 5} ${bulletCenterX + 7} ${bulletCenterY - 2.5} ${bulletCenterX + 7} ${bulletCenterY} 
            C ${bulletCenterX + 7} ${bulletCenterY + 2.5} ${bulletCenterX + 3} ${bulletCenterY + 5} ${bulletCenterX - 2} ${bulletCenterY + 5} 
            H ${bulletCenterX - 11} Z`}
        fill={`url(#bullet-metal-grad-${uniqueId})`}
        stroke={SCENE_COLORS.sphere.steel.stroke}
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* 速度与加速度矢量箭头 */}
      {/* 速度矢量 — 子弹 */}
      <VectorArrow
        originPixel={{ x: state.bulletX, y: BB_LAYOUT.bulletRadius / sceneScale.scaleY }}
        vector={{ x: state.bulletV, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        label="v₁"
      />

      {/* 速度矢量 — 木块 */}
      <VectorArrow
        originPixel={{ x: state.blockX + param.L / 2, y: BB_LAYOUT.blockHeight / sceneScale.scaleY }}
        vector={{ x: state.blockV, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        label="v₂"
        color={PHYSICS_COLORS.elasticForce}
      />

      {/* 加速度矢量 — 子弹（仅在穿透滑动阶段） */}
      {inContact && state.bulletA !== 0 && (
        <VectorArrow
          originPixel={{ x: state.bulletX, y: BB_LAYOUT.bulletRadius / sceneScale.scaleY + 0.02 }}
          vector={{ x: state.bulletA, y: 0 }}
          type="acceleration"
          sceneScale={sceneScale}
          label="a₁"
        />
      )}

      {/* 加速度矢量 — 木块（仅在穿透滑动阶段） */}
      {inContact && state.blockA !== 0 && (
        <VectorArrow
          originPixel={{ x: state.blockX + param.L / 2, y: BB_LAYOUT.blockHeight / sceneScale.scaleY + 0.02 }}
          vector={{ x: state.blockA, y: 0 }}
          type="acceleration"
          sceneScale={sceneScale}
          label="a₂"
        />
      )}

      {/* 热量粒子特效（随时间向上漂移散开） */}
      {particles.map((p, i) => (
        <circle
          key={`spark-${i}`}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={PHYSICS_COLORS.internalEnergy}
          opacity={p.opacity}
        />
      ))}

      {/* 穿出瞬间爆裂飞溅木屑粒子 */}
      {debrisList.map((d, i) => (
        <circle
          key={`debris-${i}`}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={PHYSICS_COLORS.friction}
          opacity={d.opacity}
        />
      ))}

      {/* 三层动态位移指示器拉线 */}
      {/* 1. 子弹位移 s1 (地面下方 38px) */}
      <DimensionBracket
        x1={s1X1}
        x2={s1X2}
        y={BB_LAYOUT.groundY + 38}
        label="子弹位移 s₁"
        valueText={s1Text}
        color={PHYSICS_COLORS.velocity}
        highlighted={highlightType === 's1'}
        dimmed={hasHighlight && highlightType !== 's1'}
        font={font}
      />

      {/* 2. 木块位移 s2 (地面下方 54px) */}
      <DimensionBracket
        x1={s2X1}
        x2={s2X2}
        y={BB_LAYOUT.groundY + 54}
        label="木块位移 s₂"
        valueText={s2Text}
        color={PHYSICS_COLORS.elasticForce}
        highlighted={highlightType === 's2'}
        dimmed={hasHighlight && highlightType !== 's2'}
        font={font}
      />

      {/* 3. 相对位移 deltaX (木块上方 12px) */}
      <DimensionBracket
        x1={dxX1}
        x2={dxX2}
        y={blockTop - 12}
        label="相对深度 Δs"
        valueText={dxText}
        color={PHYSICS_COLORS.internalEnergy}
        highlighted={highlightType === 'deltaX'}
        dimmed={hasHighlight && highlightType !== 'deltaX'}
        font={font}
      />
    </g>
  )
}
