import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

/**
 * 带预加载能力的 lazy 包装器。
 *
 * 用法与 React.lazy 完全一致，额外暴露 preload() 方法：
 * ```ts
 * const Comp = lazyWithPreload(() => import('./MyComponent'))
 * // 用户 hover 时触发预加载
 * Comp.preload()
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> & { preload: () => Promise<void> } {
  const component = lazy(factory)
  let pending: Promise<void> | null = null
  const preload = () => {
    if (!pending) {
      pending = factory().then(() => {})
    }
    return pending
  }
  return Object.assign(component, { preload })
}
