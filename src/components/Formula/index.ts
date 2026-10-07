/**
 * 公式渲染组件库
 *
 * 承载依赖 KaTeX 的组件（KaTeX 的 `katex.min.css` 是模块级副作用）。
 *
 * ⚠️ 与 `@/components/UI` 隔离的原因：UI barrel 会被 app shell（`main.tsx` /
 * `app/Layout.tsx`）静态引用。若把本目录组件挂在 UI barrel 下，即使调用方从未
 * 使用它们，Rollup 也会为保留 CSS 副作用而把 `katex` 提升进首屏 entry chunk
 * 并触发 `modulepreload`。因此公式类组件单独成 barrel，只在懒加载页面中引用。
 *
 * @example
 * ```tsx
 * import { KatexFormula, PhysicsPanel } from '@/components/Formula'
 * ```
 */
export { KatexFormula } from './KatexFormula'
export { PhysicsPanel } from './PhysicsPanel'
