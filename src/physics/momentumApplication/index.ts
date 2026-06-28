/**
 * 动量守恒定律三大经典模型物理纯计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖，数据结构完全可序列化。
 * 单位制：SI（kg, m, m/s, N, s, J, rad）
 */

export type { CurvedSlotState } from './curvedSlot'
export { getCurvedSlotAlpha, precomputeCurvedSlot, interpolateCurvedSlot } from './curvedSlot'

export type { SpringBlocksState } from './springBlocks'
export { precomputeSpringBlocks, interpolateSpringBlocks } from './springBlocks'

export type { ManBoatState } from './manBoat'
export { calculateManBoatState, getManBoatAutoMotion } from './manBoat'