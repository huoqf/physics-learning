import type { CSSProperties } from 'react'

/**
 * 2D 骨骼手 · 数据结构
 * ----------------------------------------------------------------------------
 * 一只手 = 5 根手指，每根手指 = 1 个基部坐标 + 若干节骨骼。
 * 每节骨骼记录 `length`（长度，像素）和 `angle`（相对父骨骼的旋转角，度）。
 * 这与 Spine / Live2D 的骨骼模型一致，只是简化为 2D 链式旋转。
 */

export interface Bone {
  length: number
  angle: number
}

export interface Finger {
  name: 'thumb' | 'index' | 'middle' | 'ring' | 'little'
  baseX: number
  baseY: number
  bones: Bone[]
}

export type HandChirality = 'right' | 'left'
export type HandPose = 'open' | 'half-fist' | 'fist'

// 主题色（与 theme/physicsColors 保持语义一致；纯渲染用，不引用 store）
const SKIN_FILL = '#F3C7A6'
const SKIN_JOINT = '#E6B896'
const SKIN_STROKE = '#7C4A2E'
const HIGHLIGHT_FILL = '#FFD9B0'
const HIGHLIGHT_JOINT = '#F2BC92'
const HIGHLIGHT_STROKE = '#9A3412'
const TIP_RING = '#7E22CE' // magneticField
const TIP_RING_LABEL = 'white'

// ──────────────────────────────────────────────────────────────────────────
// 解剖学约定
// ----------------------------------------------------------------------------
// "等角手" → 改为"真人手"。
// 默认姿态：右手掌心朝向观察者。
//   - 拇指在手掌**左下侧**，基部 (baseX<0, baseY≈0)，第一段骨指向**左上方**（≈ -130°）
//   - 食指/中指/无名指/小指沿手掌**上方**排列，基部 (baseY<0)，第一段骨指向**正上方**（-90°）
//
// 整只手旋转的语义：
//   rotation = atan2(thumbDir.y, thumbDir.x) - THUMB_BASE_ANGLE
//   其中 THUMB_BASE_ANGLE（见 '@/physics'）= -130°（右手拇指静止方向）
//
// 左手通过水平镜像 (mirrorX) 得到（baseX 取反、bone[0] 角度取 180-angle）。
// ──────────────────────────────────────────────────────────────────────────

// THUMB_BASE_ANGLE 从 '@/physics' 导入，文档说明见那里。

const OPEN_FINGERS: Finger[] = [
  // 拇指：右下侧，指向右上方（基部原为 -26, 6 -> 26, 6）
  { name: 'thumb',  baseX: 26, baseY: 6, bones: [
    { length: 30, angle: -50 }, // 调整角度以符合右手拇指位置
    { length: 24, angle: 25 },
  ]},
  // 食指：上方略偏右（原 -22 -> 22）
  { name: 'index',  baseX: 22, baseY: -30, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: 0 },
    { length: 18, angle: 0 },
  ]},
  // 中指：上方居中（最长）
  { name: 'middle', baseX: 4, baseY: -34, bones: [
    { length: 34, angle: -90 },
    { length: 28, angle: 0 },
    { length: 20, angle: 0 },
  ]},
  // 无名指：上方略偏左（原 12 -> -12）
  { name: 'ring',   baseX: -12, baseY: -32, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: 0 },
    { length: 18, angle: 0 },
  ]},
  // 小拇指：左上方（最短，原 24 -> -24）
  { name: 'little', baseX: -24, baseY: -26, bones: [
    { length: 24, angle: -90 },
    { length: 20, angle: 0 },
    { length: 14, angle: 0 },
  ]},
]

const FIST_FINGERS: Finger[] = [
  // 拇指：基部 26, 6
  { name: 'thumb',  baseX: 26, baseY: 6, bones: [
    { length: 30, angle: -50 },
    { length: 24, angle: 50 },
  ]},
  // 食指：完全卷起
  { name: 'index',  baseX: 22, baseY: -30, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: -90 },
    { length: 18, angle: -80 },
  ]},
  // 中指：完全卷起
  { name: 'middle', baseX: 4, baseY: -34, bones: [
    { length: 34, angle: -90 },
    { length: 28, angle: -90 },
    { length: 20, angle: -80 },
  ]},
  // 无名指：完全卷起
  { name: 'ring',   baseX: -12, baseY: -32, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: -90 },
    { length: 18, angle: -80 },
  ]},
  // 小拇指：完全卷起
  { name: 'little', baseX: -24, baseY: -26, bones: [
    { length: 24, angle: -90 },
    { length: 20, angle: -90 },
    { length: 14, angle: -80 },
  ]},
]

const HALF_FIST_FINGERS: Finger[] = [
  // 拇指：保持张开姿态
  { name: 'thumb',  baseX: 26, baseY: 6, bones: [
    { length: 30, angle: -50 },
    { length: 24, angle: 25 },
  ]},
  // 食指：保持伸直
  { name: 'index',  baseX: 22, baseY: -30, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: 0 },
    { length: 18, angle: 0 },
  ]},
  // 中指：保持伸直
  { name: 'middle', baseX: 4, baseY: -34, bones: [
    { length: 34, angle: -90 },
    { length: 28, angle: 0 },
    { length: 20, angle: 0 },
  ]},
  // 无名指：半卷
  { name: 'ring',   baseX: -12, baseY: -32, bones: [
    { length: 30, angle: -90 },
    { length: 24, angle: -55 },
    { length: 18, angle: -45 },
  ]},
  // 小拇指：半卷
  { name: 'little', baseX: -24, baseY: -26, bones: [
    { length: 24, angle: -90 },
    { length: 20, angle: -60 },
    { length: 14, angle: -50 },
  ]},
]

const POSE_TABLE: Record<HandPose, Finger[]> = {
  open: OPEN_FINGERS,
  'half-fist': HALF_FIST_FINGERS,
  fist: FIST_FINGERS,
}

/** 把右手骨骼数据水平镜像得到左手。
 *
 *  几何解释：水平镜像 (x → -x) 把绝对角度 θ 映射为 (180° - θ)。
 *  骨骼链是相对父骨骼的局部角度，所以：
 *    - bone[0]（第一段，直接挂在画布坐标系下）= 绝对角度，需要取 (180° - angle)
 *    - bone[1+]（相对父骨骼）= 父骨骼的局部坐标系也被水平镜像了，
 *      相对父骨骼的旋转角度保持不变。
 */
function mirrorX(fingers: Finger[]): Finger[] {
  return fingers.map((f) => ({
    ...f,
    baseX: -f.baseX,
    bones: f.bones.map((b, i) =>
      i === 0 ? { ...b, angle: 180 - b.angle } : b,
    ),
  }))
}

/** 计算指尖在 hand 局部坐标系下的真实位置。
 *
 *  ⚠️ 之前用 `Σ length` 当作 tipX 是错误的！手指的 bone[0] 通常是非 0 角度
 *  （拇指 -130°、四指 -90°），所以指尖**不**在手指局部坐标系的 (Σ length, 0)
 *  上，而要沿骨链累计旋转后才到达真实坐标。
 */
function computeFingerTip(finger: Finger): { x: number; y: number } {
  let x = 0
  let y = 0
  let cumulativeAngleDeg = 0
  for (const bone of finger.bones) {
    cumulativeAngleDeg += bone.angle
    const rad = (cumulativeAngleDeg * Math.PI) / 180
    x += bone.length * Math.cos(rad)
    y += bone.length * Math.sin(rad)
  }
  return { x: finger.baseX + x, y: finger.baseY + y }
}

/** 取指定姿态的手指配置。纯函数，可被测试直接覆盖。
 *
 *  - 'right'：右手（拇指在左下侧，指向左上方）
 *  - 'left' ：左手（拇指在右下侧，指向右上方）= 右手水平镜像
 */
export function getFingersForPose(pose: HandPose, chirality: HandChirality = 'right'): Finger[] {
  const base = POSE_TABLE[pose]
  return chirality === 'right' ? base : mirrorX(base)
}

// ──────────────────────────────────────────────────────────────────────────
// 单节骨骼 · 关节 + 指节（Spine 风格最简版）
// 骨节 height=9、关节 r=3.5（更接近真手指比例，避免"小球串"感）
// ──────────────────────────────────────────────────────────────────────────

interface BoneSegmentProps {
  length: number
  highlight: boolean
  isTip?: boolean
}

function BoneSegment({ length, highlight, isTip = false }: BoneSegmentProps) {
  const fill = highlight ? HIGHLIGHT_FILL : SKIN_FILL
  const joint = highlight ? HIGHLIGHT_JOINT : SKIN_JOINT
  const stroke = highlight ? HIGHLIGHT_STROKE : SKIN_STROKE
  const h = 9
  return (
    <>
      <rect
        x={0}
        y={-h / 2}
        width={length}
        height={h}
        rx={h / 2}
        ry={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.1}
      />
      {/* 指尖不再画大圆球（避免"小球串"），其他关节保留小圆点 */}
      {!isTip && (
        <circle cx={0} cy={0} r={3.5} fill={joint} stroke={stroke} strokeWidth={1} />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// 递归绘制一整条手指：每节挂在前一节末端
// ──────────────────────────────────────────────────────────────────────────

interface FingerSegmentProps {
  bones: Bone[]
  highlight: boolean
  index?: number
}

function FingerSegment({ bones, highlight, index = 0 }: FingerSegmentProps) {
  if (index >= bones.length) return null
  const bone = bones[index]
  const isTip = index === bones.length - 1
  return (
    <g transform={`rotate(${bone.angle})`}>
      <BoneSegment length={bone.length} highlight={highlight} isTip={isTip} />
      <g transform={`translate(${bone.length}, 0)`}>
        <FingerSegment bones={bones} highlight={highlight} index={index + 1} />
      </g>
    </g>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// 手指视图：根部平移到 (baseX, baseY)，并在指尖（若指定）放一个标签环
// ──────────────────────────────────────────────────────────────────────────

interface FingerViewProps {
  finger: Finger
  highlight: boolean
  showTipMarker: boolean
  tipLabel?: string
  tipColor?: string
}

function FingerView({ finger, highlight, showTipMarker, tipLabel, tipColor }: FingerViewProps) {
  // 指尖在 hand 局部坐标系下的真实位置（沿骨链累计旋转），用于在指尖放标签环
  const tip = computeFingerTip(finger)
  return (
    <g transform={`translate(${finger.baseX}, ${finger.baseY})`}>
      <FingerSegment bones={finger.bones} highlight={highlight} />
      {showTipMarker && tipLabel && (
        <g transform={`translate(${tip.x - finger.baseX}, ${tip.y - finger.baseY})`}>
          <circle
            cx={0}
            cy={0}
            r={11}
            fill={tipColor ?? TIP_RING}
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill={TIP_RING_LABEL}
          >
            {tipLabel}
          </text>
        </g>
      )}
    </g>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// 手掌（圆角矩形）+ 手腕（窄矩形）
// 手掌宽 64、高 72（手指总长 ≈ 82 ≈ 1.15× 手掌宽，比例合理）
// ──────────────────────────────────────────────────────────────────────────

const PALM_W = 64
const PALM_H = 72

function Palm({ chirality }: { chirality: HandChirality }) {
  // 按照人体结构，掌心朝向观察者时，是右手掌心。
  // 我们直接标注明确，消除纹理带来的歧义。
  const label = "掌心"
  
  return (
    <>
      <rect
        x={-PALM_W / 2}
        y={-PALM_H / 2}
        width={PALM_W}
        height={PALM_H}
        rx={18}
        ry={18}
        fill={SKIN_FILL}
        stroke={SKIN_STROKE}
        strokeWidth={1.4}
      />
      {/* 明确标注文字，确保清晰 */}
      <text
        x={0}
        y={8}
        textAnchor="middle"
        fontSize={16}
        fontWeight="bold"
        fill={SKIN_STROKE}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {label}
      </text>
      {/* 手腕 */}
      <rect x={-18} y={PALM_H / 2 - 2} width={36} height={12} rx={6} fill={SKIN_FILL} stroke={SKIN_STROKE} strokeWidth={1.2} />
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// 公开 API：SkeletonHand
// ──────────────────────────────────────────────────────────────────────────

export interface SkeletonHandProps {
  /** 整只手在画布中的中心位置（父 <svg> 坐标系） */
  cx: number
  cy: number
  /** 整体旋转角（度，0 = 静止姿态：拇指指向左上方 -130°） */
  rotation: number
  /** 缩放，默认 1 */
  scale?: number
  /** 手性：右手 / 左手（决定拇指在左/右侧） */
  chirality?: HandChirality
  /** 姿态：张开 / 半握 / 握拳 */
  pose: HandPose
  /** 高亮哪几根手指（用于"拇/食/中"标识） */
  highlight?: Partial<Record<Finger['name'], boolean>>
  /** 在哪几根手指的指尖放标签环 */
  showTipMarker?: Partial<Record<Finger['name'], boolean>>
  /** 指尖标签文本（默认"拇/食/中/无/小"） */
  tipLabels?: Partial<Record<Finger['name'], string>>
  /** 指尖环颜色（按手指） */
  tipColors?: Partial<Record<Finger['name'], string>>
  /** 是否显示手掌 */
  showPalm?: boolean
  /** 鼠标按下回调（用于拖动旋转） */
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void
  /** 容器 style 透传 */
  style?: CSSProperties
  className?: string
}

const DEFAULT_TIP_LABELS: Record<Finger['name'], string> = {
  thumb: '拇',
  index: '食',
  middle: '中',
  ring: '无',
  little: '小',
}

const DEFAULT_TIP_COLORS: Record<Finger['name'], string> = {
  thumb: '#059669',     // electricCurrent
  index: '#7E22CE',     // magneticField
  middle: '#EA580C',    // forceNet
  ring: '#94A3B8',
  little: '#94A3B8',
}

export function SkeletonHand({
  cx,
  cy,
  rotation,
  scale = 1,
  chirality = 'right',
  pose,
  highlight = {},
  showTipMarker = {},
  tipLabels = {},
  tipColors = {},
  showPalm = true,
  onPointerDown,
  style,
  className,
}: SkeletonHandProps) {
  const fingers = getFingersForPose(pose, chirality)
  const mergedLabels: Record<Finger['name'], string> = { ...DEFAULT_TIP_LABELS, ...tipLabels }
  const mergedColors: Record<Finger['name'], string> = { ...DEFAULT_TIP_COLORS, ...tipColors }
  return (
    <g
      transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation})`}
      style={{ cursor: onPointerDown ? 'grab' : 'default', touchAction: 'none', ...style }}
      onPointerDown={onPointerDown}
      className={className}
    >
      {showPalm && <Palm chirality={chirality} />}
      {fingers.map((finger) => (
        <FingerView
          key={finger.name}
          finger={finger}
          highlight={!!highlight[finger.name]}
          showTipMarker={!!showTipMarker[finger.name]}
          tipLabel={mergedLabels[finger.name]}
          tipColor={mergedColors[finger.name]}
        />
      ))}
    </g>
  )
}

export default SkeletonHand
