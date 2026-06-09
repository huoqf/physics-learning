/**
 * 动画物理量看板数据构建 — 懒注册入口。
 *
 * 按动画 ID 懒加载对应的物理量构建模块，避免将全部 2500+ 行代码打入主 bundle。
 * 构建器加载后缓存，后续帧调用为同步执行，不影响 60fps 渲染。
 */
import type { PhysicsPanelData, QuantityBuilder } from './quantities/types'

// 重导出类型，保持对外接口不变
export type { PhysicsQuantity, GaokaoPoint, Formula, PhysicsPanelData } from './quantities/types'

/** 懒加载构建器映射表 */
const lazyBuilders: Record<string, () => Promise<{ [key: string]: QuantityBuilder }>> = {
  // 运动学
  'anim-velocity': () => import('./quantities/kinematics'),
  'anim-acceleration': () => import('./quantities/kinematics'),
  'anim-uniform-acceleration': () => import('./quantities/kinematics'),
  'anim-free-fall': () => import('./quantities/kinematics'),
  'anim-vertical-throw': () => import('./quantities/kinematics'),
  'anim-projectile': () => import('./quantities/kinematics'),
  'anim-oblique-throw': () => import('./quantities/kinematics'),

  // 动力学
  'anim-connected-bodies': () => import('./quantities/dynamics'),
  'anim-spring-force': () => import('./quantities/dynamics'),
  'anim-friction': () => import('./quantities/dynamics'),
  'anim-equilibrium': () => import('./quantities/dynamics'),
  'anim-vector-addition': () => import('./quantities/dynamics'),
  'anim-newton-second': () => import('./quantities/dynamics'),
  'anim-weightlessness': () => import('./quantities/dynamics'),
  'anim-gravity-basic': () => import('./quantities/dynamics'),
  'anim-gravity': () => import('./quantities/dynamics'),

  // 圆周运动
  'anim-circular-motion': () => import('./quantities/circular'),
  'anim-centripetal': () => import('./quantities/circular'),

  // 万有引力
  'anim-kepler': () => import('./quantities/gravitation'),
  'anim-satellite': () => import('./quantities/gravitation'),

  // 动量
  'anim-momentum': () => import('./quantities/momentum'),
  'anim-impulse': () => import('./quantities/momentum'),
  'anim-impulse-concept': () => import('./quantities/momentum'),
  'anim-momentum-conservation': () => import('./quantities/momentum'),
  'anim-collision': () => import('./quantities/momentum'),

  // 电磁学
  'anim-coulomb-law': () => import('./quantities/electromagnetism'),
  'anim-electric-field': () => import('./quantities/electromagnetism'),
  'anim-charge-in-efield': () => import('./quantities/electromagnetism'),
  'anim-capacitor': () => import('./quantities/electromagnetism'),
  'anim-field-lines': () => import('./quantities/electromagnetism'),
  'anim-electric-potential': () => import('./quantities/electromagnetism'),
  'anim-ohm-law': () => import('./quantities/electromagnetism'),
  'anim-circuit-analysis': () => import('./quantities/electromagnetism'),
  'anim-closed-circuit': () => import('./quantities/electromagnetism'),
  'anim-ampere-force': () => import('./quantities/electromagnetism'),
  'anim-lorentz-force': () => import('./quantities/electromagnetism'),
  'anim-charge-in-bfield': () => import('./quantities/electromagnetism'),
  'anim-faraday-law': () => import('./quantities/electromagnetism'),
  'anim-lenzs-law': () => import('./quantities/electromagnetism'),
  'anim-cutting-emf': () => import('./quantities/electromagnetism'),
  'anim-ac-generation': () => import('./quantities/electromagnetism'),
  'anim-ac-values': () => import('./quantities/electromagnetism'),
  'anim-transformer': () => import('./quantities/electromagnetism'),
  'anim-power-transmission': () => import('./quantities/electromagnetism'),

  // 能量与功
  'anim-power': () => import('./quantities/energy'),
  'anim-kinetic-energy': () => import('./quantities/energy'),
  'anim-potential-energy': () => import('./quantities/energy'),
  'anim-energy-conservation': () => import('./quantities/energy'),
  'anim-work': () => import('./quantities/energy'),
}

/** 各模块的构建器函数名映射 */
const builderNames: Record<string, string> = {
  // 运动学
  'anim-velocity': 'buildKinematicsQuantities',
  'anim-acceleration': 'buildKinematicsQuantities',
  'anim-uniform-acceleration': 'buildKinematicsQuantities',
  'anim-free-fall': 'buildKinematicsQuantities',
  'anim-vertical-throw': 'buildKinematicsQuantities',
  'anim-projectile': 'buildKinematicsQuantities',
  'anim-oblique-throw': 'buildKinematicsQuantities',

  // 动力学
  'anim-connected-bodies': 'buildDynamicsQuantities',
  'anim-spring-force': 'buildDynamicsQuantities',
  'anim-friction': 'buildDynamicsQuantities',
  'anim-equilibrium': 'buildDynamicsQuantities',
  'anim-vector-addition': 'buildDynamicsQuantities',
  'anim-newton-second': 'buildDynamicsQuantities',
  'anim-weightlessness': 'buildDynamicsQuantities',
  'anim-gravity-basic': 'buildDynamicsQuantities',
  'anim-gravity': 'buildDynamicsQuantities',

  // 圆周运动
  'anim-circular-motion': 'buildCircularQuantities',
  'anim-centripetal': 'buildCircularQuantities',

  // 万有引力
  'anim-kepler': 'buildGravitationQuantities',
  'anim-satellite': 'buildGravitationQuantities',

  // 动量
  'anim-momentum': 'buildMomentumQuantities',
  'anim-impulse': 'buildMomentumQuantities',
  'anim-impulse-concept': 'buildMomentumQuantities',
  'anim-momentum-conservation': 'buildMomentumQuantities',
  'anim-collision': 'buildMomentumQuantities',

  // 电磁学
  'anim-coulomb-law': 'buildElectromagnetismQuantities',
  'anim-electric-field': 'buildElectromagnetismQuantities',
  'anim-charge-in-efield': 'buildElectromagnetismQuantities',
  'anim-capacitor': 'buildElectromagnetismQuantities',
  'anim-field-lines': 'buildElectromagnetismQuantities',
  'anim-electric-potential': 'buildElectromagnetismQuantities',
  'anim-ohm-law': 'buildElectromagnetismQuantities',
  'anim-circuit-analysis': 'buildElectromagnetismQuantities',
  'anim-closed-circuit': 'buildElectromagnetismQuantities',
  'anim-ampere-force': 'buildElectromagnetismQuantities',
  'anim-lorentz-force': 'buildElectromagnetismQuantities',
  'anim-charge-in-bfield': 'buildElectromagnetismQuantities',
  'anim-faraday-law': 'buildElectromagnetismQuantities',
  'anim-lenzs-law': 'buildElectromagnetismQuantities',
  'anim-cutting-emf': 'buildElectromagnetismQuantities',
  'anim-ac-generation': 'buildElectromagnetismQuantities',
  'anim-ac-values': 'buildElectromagnetismQuantities',
  'anim-transformer': 'buildElectromagnetismQuantities',
  'anim-power-transmission': 'buildElectromagnetismQuantities',

  // 能量与功
  'anim-power': 'buildEnergyQuantities',
  'anim-kinetic-energy': 'buildEnergyQuantities',
  'anim-potential-energy': 'buildEnergyQuantities',
  'anim-energy-conservation': 'buildEnergyQuantities',
  'anim-work': 'buildEnergyQuantities',
}

/** 已加载的构建器缓存（模块级单例） */
const builderCache = new Map<string, QuantityBuilder>()

/**
 * 预加载指定动画的物理量构建器。
 * 在进入动画页时调用，确保首帧渲染前构建器已就绪。
 */
export async function preloadQuantityBuilder(animId: string): Promise<void> {
  if (builderCache.has(animId)) return

  const lazyLoader = lazyBuilders[animId]
  if (!lazyLoader) return

  const module = await lazyLoader()
  const builderName = builderNames[animId]
  const builder = module[builderName]
  if (builder) {
    builderCache.set(animId, builder)
  }
}

/**
 * 构建物理量看板数据（同步调用，需先 preload）。
 *
 * 如果构建器尚未加载，返回兜底数据。
 * 正常流程：AnimationPage 进入时先 preload，后续帧同步调用此函数。
 */
export function buildPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData {
  const builder = builderCache.get(animId)
  if (builder) {
    const result = builder(animId, params, time)
    if (result) return result
  }

  // 兜底：构建器未加载或不匹配时，返回参数列表
  return {
    quantities: Object.entries(params).map(([key, value]) => ({
      label: key,
      value,
      unit: '',
    })),
  }
}
