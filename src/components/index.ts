/**
 * 组件库顶层入口
 *
 * 便捷入口，适用于页面层或跨领域场景。
 * 复杂模块或领域代码推荐使用子目录 barrel：
 *
 * @example
 * ```tsx
 * // 推荐：子目录 barrel
 * import { VectorArrow } from '@/components/Physics'
 * import { Button } from '@/components/UI'
 *
 * // 可接受：顶层 barrel
 * import { Ball, VectorArrow, Button } from '@/components'
 * ```
 */
export * from './Chart'
export * from './Layout'
export * from './Physics'
export * from './UI'
