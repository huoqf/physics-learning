import type { VectorType } from '@/theme/physics'

/**
 * 场景布局模式 — 声明组件如何消费 ViewportInfo
 *
 * - 'transform'   : 使用 vp.transform 包裹设计坐标（0..designW / 0..designH）
 * - 'visibleArea' : 使用 vp.visibleX/visibleW 做比例布局
 * - 'centerScale' : 使用 vp.centerX/centerY/scale 做中心缩放
 */
export type SceneLayoutMode = 'transform' | 'visibleArea' | 'centerScale'

export interface SceneLayoutProfile {
  /** 布局模式 */
  mode: SceneLayoutMode
  /** 设计基准宽（px） */
  designWidth: number
  /** 设计基准高（px） */
  designHeight: number
  /** overlay 遮挡（px），与 DOM panel 同源 */
  overlay?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  /** 物理世界宽度（px），用于覆盖 designWidth 参与 scale 计算 */
  worldWidth?: number
  /** 物理世界高度（px），用于覆盖 designHeight 参与 scale 计算 */
  worldHeight?: number
  /** 矢量参考量级（用于 refMagnitudes 归一化） */
  refMagnitudes?: Partial<Record<VectorType, number>>
}