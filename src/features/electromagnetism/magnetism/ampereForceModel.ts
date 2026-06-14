/**
 * 安培力物理计算模型层 - 代理导出物理引擎纯函数。
 * 物理计算的全部纯函数定义在 src/physics/electromagnetism.ts 中。
 */

export {
  solveBasicAmpere,
  solveAdvancedAmpere,
} from '@/physics'

export type {
  BasicAmperePhysicsResult,
  AdvancedAmperePhysicsResult,
} from '@/physics'
