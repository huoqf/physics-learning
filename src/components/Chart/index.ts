/**
 * 图表组件库
 *
 * 提供项目中所有物理图表相关的组件，包括速度-时间图像、位移-时间图像等。
 * 所有图表基于 BasePhysicsChart 基础设施，支持插件化架构和响应式布局。
 *
 * @example
 * ```tsx
 * import { VelocityTimeChart, ChartCursor, ChartArea } from '@/components/Chart'
 *
 * // 使用图表组件
 * <VelocityTimeChart
 *   points={data}
 *   currentTime={5}
 *   tMax={10}
 *   showArea={true}
 * >
 *   <ChartCursor x={currentTime} />
 * </VelocityTimeChart>
 * ```
 */
// ============================================================================
// 图表基础设施 (Chart Infrastructure)
// ============================================================================
export { BasePhysicsChart } from './BasePhysicsChart'
export type { BasePhysicsChartProps } from './BasePhysicsChart'

export { ChartContext, useChartContext } from './ChartContext'
export type { ChartContextValue } from './ChartContext'

// ============================================================================
// 图表插件 (Chart Plugins)
// ============================================================================
export { ChartCursor } from './ChartCursor'
export { ChartArea } from './ChartArea'
export { ChartTangent } from './ChartTangent'
export { ChartSecant } from './ChartSecant'
export type { ChartSecantProps } from './ChartSecant'

// ============================================================================
// 业务预设 (Business Presets)
// ============================================================================
export { VelocityTimeChart } from './VelocityTimeChart'
export type { ChartDataSeries, VTStage } from './VelocityTimeChart'
export { DisplacementTimeChart } from './DisplacementTimeChart'
export { AccelerationTimeChart } from './AccelerationTimeChart'
export { RelationChart } from './RelationChart'
export type { RelationChartProps, RelationDataSeries, RelationMarker } from './RelationChart'
