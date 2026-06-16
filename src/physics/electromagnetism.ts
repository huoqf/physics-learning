/**
 * 电磁学纯函数库 — re-export barrel。
 * 实际实现已拆分为子模块，此处统一 re-export 以保持向后兼容。
 */

export * from './electrostatics'
export * from './dcCircuit'
export * from './magnetism'
export * from './induction'
export * from './acCircuit'

// 渲染辅助函数已迁出，但为兼容旧 import 路径仍在此 re-export
export {
  type HandChirality,
  type Vec2,
  type HandFingerAngles,
  type HandPoseResult,
  THUMB_BASE_ANGLE,
  computeHandPose,
  computeCuttingEMFHandPose,
} from '@/utils/handPose'

export {
  normalizeAngleDeg,
  lerpAngleDeg,
} from '@/math/angle'
