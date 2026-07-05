/**
 * 安培力物理计算模型层 - 代理导出物理引擎纯函数。
 * 物理计算的全部纯函数定义在 src/physics/magnetism/ampereForce.ts 中。
 *
 * @agent-rule 组件层统一通过此代理消费物理纯函数，禁止直接从 @/physics 引入安培力计算
 */

export {
  AMPERE_BASIC_SCENE,
  AMPERE_ADVANCED_SCENE,
  solveBasicAmpere,
  solveAdvancedAmpere,
} from '@/physics'

export type {
  BasicAmperePhysicsResult,
  AdvancedAmperePhysicsResult,
} from '@/physics'
