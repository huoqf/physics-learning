/**
 * UI 组件库
 *
 * 提供项目中所有通用 UI 组件，包括按钮、滑块、卡片、表单控件等。
 * 所有组件遵循统一的设计规范，支持主题定制和响应式布局。
 *
 * @example
 * ```tsx
 * import { Button, Slider, Card } from '@/components/UI'
 *
 * // 使用 UI 组件
 * <Card>
 *   <Button onClick={() => console.log('clicked')}>确认</Button>
 *   <Slider value={50} min={0} max={100} onChange={(v) => console.log(v)} />
 * </Card>
 * ```
 */
export { Button } from './Button'
export { Slider } from './Slider'
export { KatexFormula } from './KatexFormula'
export { Badge } from './Badge'
export { Card } from './Card'
export { AnimationControls } from './AnimationControls'
export { ParamControl } from './ParamControl'
export { PhysicsPanel } from './PhysicsPanel'
export { PageTransition } from './PageTransition'
export { ErrorBoundary } from './ErrorBoundary'
export { ScoreReport } from './ScoreReport'
export { DiscoveryGuide } from './DiscoveryGuide'
export { SegmentedControl } from './SegmentedControl'
export { ToggleSwitch } from './ToggleSwitch'
export { OptionButton } from './OptionButton'
export { TipCard } from './TipCard'
export { MiniChart } from './MiniChart'
export type { MiniChartLine, MiniChartStaticLine, MiniChartProps } from './MiniChart'
export { Spring } from './Spring'

