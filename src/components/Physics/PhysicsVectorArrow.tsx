import type { Vector2 } from '../../physics/Vector2'
import type { SceneScale } from '../../scene/SceneScale'
import type { VectorType } from '../../theme/physics/vectorStyle'
import { VectorArrow } from './VectorArrow'

/**
 * 物理矢量箭头组件
 *
 * 为需要物理正确标注的力、速度、加速度等矢量设计。
 * 禁止视觉捷径：不接受 pixelLength，长度必须通过 sceneScale.refMagnitudes 归一化。
 *
 * 起点坐标二选一：
 * - `origin`：物理坐标（米），由 sceneScale 转换为设计坐标
 * - `originDesign`：设计坐标（design-unit），直接使用
 *
 * @example
 * ```tsx
 * // 物理坐标（推荐）
 * <PhysicsVectorArrow
 *   origin={{ x: 0, y: 0 }}
 *   vector={{ x: 10, y: 0 }}
 *   type="force"
 *   sceneScale={sceneScale}
 * />
 *
 * // 设计坐标（兼容现有代码）
 * <PhysicsVectorArrow
 *   originDesign={{ x: 420, y: 325 }}
 *   vector={{ x: 10, y: 0 }}
 *   type="force"
 *   sceneScale={sceneScale}
 * />
 * ```
 */
interface PhysicsVectorArrowProps {
  /** 矢量起点（物理坐标，米，y↑正方向，sceneScale 会将其转换为设计坐标） */
  origin?: Vector2
  /** 矢量起点（设计坐标，y↓正方向，在 `<g transform={vp.transform}>` 内直接使用） */
  originDesign?: { x: number; y: number }
  /** 矢量值（物理坐标，y↑正方向，单位取决于 type） */
  vector: Vector2
  /** 矢量类型（决定默认颜色和参考量级） */
  type: VectorType
  /** 场景缩放参数（含 originX/Y、scaleX/Y、refMagnitudes） */
  sceneScale: SceneScale
  /** 自定义颜色（覆盖 VECTOR_COLORS[type]） */
  color?: string
  /** 自定义线宽 */
  strokeWidth?: number
  /** 自定义参考量级（覆盖 sceneScale.refMagnitudes[type]） */
  refMagnitude?: number
  /** 矢量符号名称标签 */
  label?: string
  /** 是否使用虚线箭头 */
  dashed?: boolean
  /** 是否在箭头外侧增加发光阴影，提高对比度 */
  glow?: boolean
  /** 字体缩放函数（由父组件 useCanvasSize 提供） */
  font?: (base: number) => number
}

/**
 * 物理矢量箭头 — 禁止视觉捷径（pixelLength）
 *
 * 与 VectorArrow 的区别：
 * - 不接受 pixelLength，长度必须通过 sceneScale.refMagnitudes 归一化
 * - 不接受 originPixel（deprecated alias）
 * - 适用场景：需要物理正确标注的力、速度、加速度等矢量
 */
export function PhysicsVectorArrow({
  origin,
  originDesign,
  vector,
  type,
  sceneScale,
  color,
  strokeWidth,
  refMagnitude,
  label,
  dashed,
  glow,
  font,
}: PhysicsVectorArrowProps) {
  return (
    <VectorArrow
      origin={origin}
      originDesign={originDesign}
      vector={vector}
      type={type}
      sceneScale={sceneScale}
      color={color}
      strokeWidth={strokeWidth}
      refMagnitude={refMagnitude}
      label={label}
      dashed={dashed}
      glow={glow}
      font={font}
    />
  )
}
