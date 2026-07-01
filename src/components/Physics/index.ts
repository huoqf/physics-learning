/**
 * 物理组件库
 *
 * 提供项目中所有物理实验相关的 SVG 组件，包括力学、电磁学等领域的实验器材。
 * 所有组件遵循物理准确性原则，支持参数化配置和交互响应。
 *
 * @example
 * ```tsx
 * import { Ball, DCSource, Galvanometer } from '@/components/Physics'
 *
 * // 使用物理组件
 * <g>
 *   <Ball cx={100} cy={200} r={14} type="steel" />
 *   <DCSource x={200} y={200} voltage={12.0} type="instrument" />
 *   <Galvanometer x={300} y={200} />
 * </g>
 * ```
 */
// ============================================================================
// 力学组件 (Mechanics)
// ============================================================================
export { PhysicsGround } from "./PhysicsGround"
export { Ball } from './Ball'
export { Block } from './Block'
export { SportsCar } from './SportsCar'
export { Pulley } from './Pulley'
export { EnergyBars } from './EnergyBars'
export { SVGSingleBar } from './SVGSingleBar'

// ============================================================================
// 电磁学 - 静电场 (Electrostatics)
// ============================================================================
export { CapacitorPlates } from './CapacitorPlates'
export { ParticleEmitter } from './ParticleEmitter'

// ============================================================================
// 电磁学 - 恒定电流 (DC Circuits)
// ============================================================================
export { DCSource } from './DCSource'
export { DialMeter } from './DialMeter'
export { Galvanometer } from './Galvanometer'
export { LightBulb } from './LightBulb'
export { Rheostat } from './Rheostat'

// ============================================================================
// 电磁学 - 磁场 (Magnetism)
// ============================================================================
export { BarMagnet } from './BarMagnet'
export { MagneticPoles } from './MagneticPoles'
export { ParametricMagneticField } from './ParametricMagneticField'
export { Solenoid } from './Solenoid'
export { MagneticFieldGrid, MagneticFieldSymbols, drawMagneticFieldGrid } from './MagneticFieldGrid'

// ============================================================================
// 电磁学 - 电磁感应 (Electromagnetic Induction)
// ============================================================================
export { ConductingRod, ConductingRod as ConductorRod } from './ConductingRod'
export { CoupledCoilField } from './CoupledCoilField'
export { PrimaryCoil } from './PrimaryCoil'
export { Rails } from './Rails'
export { RotatingCoil } from './RotatingCoil'

// ============================================================================
// 电磁学 - 共用组件 (Shared)
// ============================================================================
export { HandRule } from './HandRule'
export { SkeletonHand } from './SkeletalHand'

// ============================================================================
// 通用工具组件 (Utilities)
// ============================================================================
export { VectorArrow } from './VectorArrow'
export { VectorDefs } from './VectorDefs'

// ============================================================================
// 类型导出 (Type Exports)
// ============================================================================
export type { MagneticPolesProps } from './MagneticPoles'
export type { RotatingCoilProps } from './RotatingCoil'
export type { BarMagnetProps } from './BarMagnet'
export type { SolenoidProps } from './Solenoid'
export type { GalvanometerProps } from './Galvanometer'
export type { PrimaryCoilProps } from './PrimaryCoil'
export type { DCSourceProps } from './DCSource'
export type { RheostatProps } from './Rheostat'
export type { PulleyProps } from './Pulley'
export type { ChargeSign } from './types'

