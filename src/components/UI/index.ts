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
// ============================================================================
// 基础控件 (Basic Controls)
// ============================================================================
export { Button } from './Button'
export { Slider } from './Slider'
export { ToggleSwitch } from './ToggleSwitch'
export { OptionButton } from './OptionButton'
export { SegmentedControl } from './SegmentedControl'

// ============================================================================
// 表单与数据 (Forms & Data)
// ============================================================================
export { ParamControl } from './ParamControl'
export { ControlPanel } from './ControlPanel'
export { ScrollDataTable } from './ScrollDataTable'
export type { ScrollDataTableColumn, ScrollDataTableProps } from './ScrollDataTable'

// ============================================================================
// 面板与布局 (Panels & Layout)
// ============================================================================
export { LeftPanel, LeftPanelSection, LeftPanelScrollArea } from './LeftPanel'
export { PhysicsPanel } from './PhysicsPanel'
export { Card } from './Card'

// ============================================================================
// 反馈与展示 (Feedback & Display)
// ============================================================================
export { Badge } from './Badge'
export { TipCard } from './TipCard'
export { MiniChart } from './MiniChart'
export type { MiniChartLine, MiniChartStaticLine, MiniChartProps } from './MiniChart'
export { ScoreReport } from './ScoreReport'
export { DiscoveryGuide } from './DiscoveryGuide'
export type { DiscoveryStepData } from './DiscoveryGuide'
export { KatexFormula } from './KatexFormula'

// ============================================================================
// 动画与过渡 (Animation & Transition)
// ============================================================================
export { AnimationControls } from './AnimationControls'
export { Spring } from './Spring'
export { PageTransition } from './PageTransition'

// ============================================================================
// 系统 (System)
// ============================================================================
export { ErrorBoundary } from './ErrorBoundary'
