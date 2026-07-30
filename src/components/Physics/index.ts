/**
 * 物理组件库
 *
 * 提供项目中所有物理实验相关的 SVG 组件，包括力学、电磁学等领域的实验器材。
 * 所有组件遵循物理准确性原则，支持参数化配置和交互响应。
 *
 * @example
 * ```tsx
 * import { Ball, TickerTimer, PaperTape, Photogate } from '@/components/Physics'
 *
 * // 使用物理组件
 * <g>
 *   <Ball cx={100} cy={200} r={14} type="steel" />
 *   <TickerTimer x={200} y={150} isVibrating />
 *   <PaperTape x={200} y={200} width={200} dots={[10, 30, 60, 100, 150]} />
 * </g>
 * ```
 */
// ============================================================================
// 力学基础组件 (Mechanics Basics)
// ============================================================================
export { PhysicsGround } from "./PhysicsGround"
export { Ball } from './Ball'
export { Block } from './Block'
export { Incline } from './Incline'
export { SportsCar } from './SportsCar'
export { Pulley } from './Pulley'
export { EnergyBars } from './EnergyBars'
export type { EnergyBarItem } from './EnergyBars'
export { SVGSingleBar } from './SVGSingleBar'

// ============================================================================
// 力学实验专属器材 (Mechanics Lab Apparatus)
// ============================================================================
export { PaperTape } from './PaperTape'
export { TickerTimer } from './TickerTimer'
export { Photogate } from './Photogate'
export { TimerDisplay } from './TimerDisplay'
export { LabRuler } from './LabRuler'
export { VernierCaliper } from './VernierCaliper'
export { Micrometer } from './Micrometer'
export { SpringBalance } from './SpringBalance'
export { LabStand } from './LabStand'

// ============================================================================
// 粒子轨迹渲染 (Particle Trajectory)
// ============================================================================
export { ParticleTrajectory } from './ParticleTrajectory'
export { drawCanvasParticleTrajectory } from './drawCanvasParticleTrajectory'

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
export { MeterPointer } from './MeterPointer'
export { LightBulb } from './LightBulb'
export { Rheostat } from './Rheostat'

// ============================================================================
// 电磁学 - 磁场 (Magnetism)
// ============================================================================
export { BarMagnet } from './BarMagnet'
export { MagneticPoles } from './MagneticPoles'
export { ParametricMagneticField } from './ParametricMagneticField'
export { Solenoid } from './Solenoid'
export { CoilBase } from './CoilBase'
export { MagneticFieldGrid, MagneticFieldSymbols } from './MagneticFieldGrid'
export { drawMagneticFieldGrid } from './drawMagneticFieldGrid'

// ============================================================================
// 磁感线工具 (Magnetic Field Utilities)
// ============================================================================
export { bezierAt, bezierTangent, FieldArrow } from './magneticFieldUtils'

// ============================================================================
// 电磁学 - 电磁感应 (Electromagnetic Induction)
// ============================================================================
export { ConductingRod } from './ConductingRod'
export { ConductingRod as ConductorRod } from './ConductingRod'
export { CoupledCoilField } from './CoupledCoilField'
export { PrimaryCoil } from './PrimaryCoil'
export { Rails } from './Rails'
export { RotatingCoil } from './RotatingCoil'
export { TransformerApparatus } from './TransformerApparatus'
export type { TransformerApparatusProps } from './TransformerApparatus'

// ============================================================================
// 电磁学 - 共用组件 (Shared)
// ============================================================================
export { HandRule } from './HandRule'
export { SkeletonHand } from './SkeletalHand'

// ============================================================================
// 通用工具组件 (Utilities)
// ============================================================================
export { VectorArrow } from './VectorArrow'
export type { ArrowType } from './VectorArrow'
export { PhysicsVectorArrow } from './PhysicsVectorArrow'
export { VectorDefs } from './VectorDefs'
export { DragHandle } from './DragHandle'
export { markerId } from './vectorDefsUtils'

// ============================================================================
// 类型导出 (Type Exports)
// ============================================================================
export type { PaperTapeProps } from './PaperTape'
export type { TickerTimerProps } from './TickerTimer'
export type { PhotogateProps } from './Photogate'
export type { TimerDisplayProps } from './TimerDisplay'
export type { LabRulerProps } from './LabRuler'
export type { VernierCaliperProps } from './VernierCaliper'
export type { MicrometerProps } from './Micrometer'
export type { SpringBalanceProps } from './SpringBalance'
export type { LabStandProps } from './LabStand'

export type { MagneticPolesProps } from './MagneticPoles'
export type { RotatingCoilProps } from './RotatingCoil'
export type { BarMagnetProps } from './BarMagnet'
export type { SolenoidProps } from './Solenoid'
export type { CoilBaseProps } from './CoilBase'
export type { GalvanometerProps } from './Galvanometer'
export type { MeterPointerProps } from './MeterPointer'
export type { PrimaryCoilProps } from './PrimaryCoil'
export type { DCSourceProps } from './DCSource'
export type { RheostatProps } from './Rheostat'
export type { PulleyProps } from './Pulley'
export type { ChargeSign } from './types'
export type { MagneticFieldGridProps, MagneticFieldSymbolsProps, FieldDirection } from './MagneticFieldGrid'
export type { HandRuleProps, HandRuleMode } from './HandRule'
export type { SkeletonHandProps, HandPose, HandChirality } from './SkeletalHand'
export type { BallProps, BallPresetType } from './Ball'
export type { BlockProps, BlockPresetType } from './Block'
export type { InclineProps } from './Incline'
export type { ParticleTrajectoryProps } from './ParticleTrajectory'
