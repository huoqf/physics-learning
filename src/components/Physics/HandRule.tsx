import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimationFrame } from '@/utils/animation'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  computeHandPose,
  lerpAngleDeg,
  type HandChirality,
  type Vec2,
} from '@/physics'
import { SkeletonHand, type HandPose } from './SkeletalHand'

/**
 * 手指定则交互组件
 * ----------------------------------------------------------------------------
 * 在"导体切割磁感线"等场景中，**自动**用右手 / 左手骨骼手演示 B/v/I 三指关系：
 *   右手定则：拇·v   食·B   中·I   （v×B = I）
 *   左手定则：拇·F   食·B   中·I   （F = BIL）
 *
 * 功能：
 *   1. 接收 v 方向 + B 方向 / 或 (v, I) / 或 (B, I, F) 自动推算姿态
 *   2. 平滑旋转（lerp 最短角度），随物理量变化过渡
 *   3. 拖拽旋转：用户可手动绕手掌中心旋转（用于"探索"）
 *   4. 姿态切换：张开 / 半握 / 握拳
 *   5. 高亮拇/食/中 三指 + 指尖彩色标签环
 *   6. 零向量（v=0 或无 EMF）时降级为"张开"姿态 + 灰显
 */

export type HandRuleMode = 'right' | 'left' | 'fist'

export interface HandRuleProps {
  /** 模式：右手定则（拇 v）/ 左手定则（拇 F）/ 握拳（强调三指） */
  mode: HandRuleMode
  /** 拇指方向（Canvas 2D 向量）。当 mode='right' 时为 v；'left' 时为 F；'fist' 时默认用 v。 */
  thumbDir: Vec2
  /** 食指方向（B 方向投影，可为零向量表示纯纸面外 ⊙/⊗） */
  indexDir: Vec2
  /** 中指方向（I 方向投影） */
  middleDir: Vec2
  /** 掌心中心（父 <svg> 坐标系） */
  cx: number
  cy: number
  /** 缩放 */
  scale?: number
  /** 是否启用拖拽旋转 */
  draggable?: boolean
  /** 外部强制姿态（覆盖自动推断） */
  poseOverride?: HandPose
  /** 容器 SVG 引用（用于 pointer 事件坐标换算），可省略 */
  svgRef?: React.RefObject<SVGSVGElement | null>
  /** 是否激活（无 EMF/速度时降级为半透明） */
  active?: boolean
  /** 提示文字（可选） */
  title?: string
  /** 整体 opacity（外部控制） */
  opacity?: number
  /** 是否手背 */
  isBack?: boolean
}

const DEFAULT_TIP_LABELS: Record<'thumb' | 'index' | 'middle', string> = {
  thumb: '拇',
  index: '食',
  middle: '中',
}
const DEFAULT_TIP_COLORS: Record<'thumb' | 'index' | 'middle', string> = {
  thumb: PHYSICS_COLORS.electricCurrent,    // electricCurrent
  index: PHYSICS_COLORS.magneticField,      // magneticField
  middle: PHYSICS_COLORS.forceNet,          // forceNet
}

export function HandRule({
  mode,
  thumbDir,
  // indexDir: 保留在 HandRuleProps 接口（语义上是"食指方向 / B 方向"），
  //          但内部不再使用 —— 之前用 BLabel 渲染 ⊙/⊗，现已交给上层组件
  //          在 B 标题里渲染（避免和标题里的 ⊗ 重复）。
  //          保留接口字段是为了 API 稳定性。
  middleDir,
  cx,
  cy,
  scale = 1,
  draggable = true,
  poseOverride,
  svgRef,
  active = true,
  title,
  opacity = 1,
  isBack = false,
}: HandRuleProps) {
  // ── 自动推算目标姿态（rotationDeg / chirality / pose）─────────────────
  // 故意只追踪 .x/.y，传入新对象但坐标未变时不会重新计算
  const { x: tx, y: ty } = thumbDir
  const { x: mx, y: my } = middleDir
  const auto = useMemo(() => computeHandPose(thumbDir, middleDir), [tx, ty, mx, my])

  // ── 用户拖拽偏移量（叠加在自动旋转上）───────────────────────────────
  const [userOffset, setUserOffset] = useState(0)
  const dragStateRef = useRef<{
    isDragging: boolean
    lastAngle: number
    startUserOffset: number
    pointerId: number | null
  }>({ isDragging: false, lastAngle: 0, startUserOffset: 0, pointerId: null })

  // 当前实际渲染的旋转角（用 ref 存，绕过 React 渲染延迟实现平滑插值）
  const currentRotationRef = useRef(auto.rotationDeg)
  const [, forceUpdate] = useState(0)

  // 当 auto.rotationDeg 变化时（向量改变），target 跟着变
  const targetRotationRef = useRef(auto.rotationDeg)
  useEffect(() => {
    targetRotationRef.current = auto.rotationDeg + userOffset
  }, [auto.rotationDeg, userOffset])

  // 手性由 computeHandPose 从 thumb × middle 叉积自动推导
  const chirality: HandChirality = auto.chirality
  // fist 模式在 v 有效时使用半握姿态
  const inferredPose: HandPose = useMemo(() => {
    if (poseOverride) return poseOverride
    const hasMotion = Math.hypot(tx, ty) > 1e-6
    if (mode === 'fist') return hasMotion ? 'half-fist' : 'open'
    // 'right' / 'left' 模式：有运动用张开（更清楚展示三指关系），无运动半握
    return hasMotion ? 'open' : 'half-fist'
  }, [mode, poseOverride, tx, ty])

  // ── 平滑旋转（每帧用 lerpAngleDeg 逼近 target）──────────────────────
  useAnimationFrame(() => {
    const next = lerpAngleDeg(currentRotationRef.current, targetRotationRef.current, 0.22)
    if (Math.abs(next - currentRotationRef.current) < 1e-3) return
    currentRotationRef.current = next
    forceUpdate((n) => (n + 1) % 1_000_000)
  }, { playing: true })

  // ── 拖拽旋转交互 ────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!draggable) return
    if (!svgRef?.current) return
    e.stopPropagation()
    const rect = svgRef.current.getBoundingClientRect()
    // 计算 pointer 相对手掌中心的角度（Canvas 像素坐标）
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI
    dragStateRef.current = {
      isDragging: true,
      lastAngle: angle,
      startUserOffset: userOffset,
      pointerId: e.pointerId,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const s = dragStateRef.current
    if (!s.isDragging || !svgRef?.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI
    let delta = angle - s.lastAngle
    // 把 delta 归到 (-180, 180]
    if (delta > 180) delta -= 360
    else if (delta < -180) delta += 360
    setUserOffset(s.startUserOffset + delta)
  }
  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    const s = dragStateRef.current
    if (!s.isDragging) return
    s.isDragging = false
    if (s.pointerId !== null) {
      try { e.currentTarget.releasePointerCapture(s.pointerId) } catch { /* noop */ }
    }
    s.pointerId = null
  }

  // ── 双击复位：把 userOffset 归零，让手回到自动计算的标准姿态 ───────
  const handleDoubleClick = (e: React.MouseEvent<SVGGElement>) => {
    if (!draggable) return
    e.stopPropagation()
    setUserOffset(0)
  }

  // ── 渲染 ────────────────────────────────────────────────────────────
  const showHighlight = active && (Math.hypot(tx, ty) > 1e-6 || Math.hypot(mx, my) > 1e-6)
  const highlight = showHighlight
    ? { thumb: true, index: true, middle: true, ring: false, little: false }
    : { thumb: false, index: false, middle: false, ring: false, little: false }
  const showTipMarker = { thumb: true, index: true, middle: true, ring: false, little: false }
  const tipLabels = DEFAULT_TIP_LABELS
  const tipColors = DEFAULT_TIP_COLORS

  return (
    <g opacity={active ? opacity : 0.45}>
      {title && (
        <text
          x={cx}
          y={cy - 78}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill={PHYSICS_COLORS.labelText}
          style={{ userSelect: 'none' }}
        >
          {title}
        </text>
      )}
      <g
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: draggable ? 'grab' : 'default' }}
      >
        <SkeletonHand
          cx={cx}
          cy={cy}
          rotation={currentRotationRef.current}
          scale={scale}
          chirality={chirality}
          isBack={isBack}
          pose={inferredPose}
          highlight={highlight}
          showTipMarker={showTipMarker}
          tipLabels={tipLabels}
          tipColors={tipColors}
        />
      </g>
      {/* 拖拽/复位提示 */}
      {draggable && (
        <text
          x={cx}
          y={cy + 78}
          textAnchor="middle"
          fontSize={10}
          fill={PHYSICS_COLORS.axis}
          style={{ userSelect: 'none' }}
        >
          {Math.abs(userOffset) > 0.5 ? '已旋转 · 双击复位' : '拖动旋转 · 双击复位'}
        </text>
      )}
    </g>
  )
}

export default HandRule
