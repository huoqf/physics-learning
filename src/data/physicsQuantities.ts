/**
 * 动画物理量看板数据构建 — 懒注册入口。
 *
 * 按动画 ID 懒加载对应的物理量构建模块，避免将全部 2500+ 行代码打入主 bundle。
 * 构建器加载后缓存，后续帧调用为同步执行，不影响 60fps 渲染。
 */
import type { PhysicsPanelData, QuantityBuilder } from './quantities/types'

// 重导出类型，保持对外接口不变
export type { PhysicsQuantity, GaokaoPoint, Formula, PhysicsPanelData } from './quantities/types'

/** 构建器函数名联合类型 — 新增条目时拼错名字会在编译期报错 */
type BuilderName =
  | 'buildKinematicsQuantities'
  | 'buildForceMotionQuantities'
  | 'buildDynamicsQuantities'
  | 'buildCircularQuantities'
  | 'buildGravitationQuantities'
  | 'buildMomentumQuantities'
  | 'buildElectromagnetismQuantities'
  | 'buildEnergyQuantities'
  | 'buildThermodynamicsQuantities'
  | 'buildIntermolecularForcesQuantities'
  | 'buildGasLawsQuantities'
  | 'buildClapeyronQuantities'
  | 'buildFirstLawQuantities'
  | 'buildSecondLawQuantities'
  | 'buildReflectionQuantities'
  | 'buildRefractionQuantities'
  | 'buildTotalReflectionQuantities'
  | 'buildThinLensQuantities'

/** 单条注册记录：懒加载器 + 构建器函数名 */
interface QuantityRegistration {
  loader: () => Promise<Record<string, QuantityBuilder>>
  builderName: BuilderName
}

/** 动画 ID → 物理量构建器 注册表（单一数据源，不可能漏同步） */
const quantityRegistry: Record<string, QuantityRegistration> = {
  // 运动学
  'anim-velocity':              { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-acceleration':          { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-uniform-acceleration':  { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-free-fall':             { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-vertical-throw':        { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-projectile':            { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },
  'anim-oblique-throw':         { loader: () => import('./quantities/kinematics'),     builderName: 'buildKinematicsQuantities' },

  // 力与运动专题
  'anim-force-motion-topic':    { loader: () => import('./quantities/forceMotion'),    builderName: 'buildForceMotionQuantities' },

  // 动力学
  'anim-connected-bodies':      { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-spring-force':          { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-friction':              { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-equilibrium':           { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-vector-addition':       { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-newton-second':         { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-weightlessness':        { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-gravity-basic':         { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },
  'anim-gravity':               { loader: () => import('./quantities/dynamics'),       builderName: 'buildDynamicsQuantities' },

  // 圆周运动
  'anim-circular-motion':       { loader: () => import('./quantities/circular'),       builderName: 'buildCircularQuantities' },
  'anim-centripetal':           { loader: () => import('./quantities/circular'),       builderName: 'buildCircularQuantities' },

  // 万有引力
  'anim-kepler':                { loader: () => import('./quantities/gravitation'),    builderName: 'buildGravitationQuantities' },
  'anim-satellite':             { loader: () => import('./quantities/gravitation'),    builderName: 'buildGravitationQuantities' },

  // 动量
  'anim-momentum':              { loader: () => import('./quantities/momentum'),       builderName: 'buildMomentumQuantities' },
  'anim-impulse':               { loader: () => import('./quantities/momentum'),       builderName: 'buildMomentumQuantities' },
  'anim-impulse-concept':       { loader: () => import('./quantities/momentum'),       builderName: 'buildMomentumQuantities' },
  'anim-momentum-conservation': { loader: () => import('./quantities/momentum'),       builderName: 'buildMomentumQuantities' },
  'anim-collision':             { loader: () => import('./quantities/momentum'),       builderName: 'buildMomentumQuantities' },

  // 电磁学
  'anim-coulomb-law':           { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-electric-field':        { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-charge-in-efield':      { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-capacitor':             { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-field-lines':           { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-electric-potential':    { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-ohm-law':               { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-circuit-analysis':      { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-closed-circuit':        { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-ampere-force':          { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-lorentz-force':         { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-charge-in-bfield':      { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-faraday-law':           { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-lenzs-law':             { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-cutting-emf':           { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-electromagnetic-induction': { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-ac-generation':         { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-ac-values':             { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-transformer':           { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },
  'anim-power-transmission':    { loader: () => import('./quantities/electromagnetism'), builderName: 'buildElectromagnetismQuantities' },

  // 能量与功
  'anim-power':                 { loader: () => import('./quantities/energy'),         builderName: 'buildEnergyQuantities' },
  'anim-kinetic-energy':        { loader: () => import('./quantities/energy'),         builderName: 'buildEnergyQuantities' },
  'anim-potential-energy':      { loader: () => import('./quantities/energy'),         builderName: 'buildEnergyQuantities' },
  'anim-energy-conservation':   { loader: () => import('./quantities/energy'),         builderName: 'buildEnergyQuantities' },
  'anim-work':                  { loader: () => import('./quantities/energy'),         builderName: 'buildEnergyQuantities' },

  // 热学
  'anim-brownian-motion':       { loader: () => import('./quantities/thermodynamics'), builderName: 'buildThermodynamicsQuantities' },
  'anim-intermolecular-forces': { loader: () => import('./quantities/intermolecularForces'), builderName: 'buildIntermolecularForcesQuantities' },
  'anim-gas-laws':            { loader: () => import('./quantities/gasLaws'), builderName: 'buildGasLawsQuantities' },
  'anim-clapeyron':           { loader: () => import('./quantities/clapeyron'), builderName: 'buildClapeyronQuantities' },
  'anim-first-law':           { loader: () => import('./quantities/firstLaw'), builderName: 'buildFirstLawQuantities' },
  'anim-second-law':          { loader: () => import('./quantities/secondLaw'), builderName: 'buildSecondLawQuantities' },

  // 光学
  'anim-reflection':          { loader: () => import('./quantities/reflection'), builderName: 'buildReflectionQuantities' },
  'anim-refraction':          { loader: () => import('./quantities/refraction'), builderName: 'buildRefractionQuantities' },
  'anim-total-reflection':    { loader: () => import('./quantities/totalReflection'), builderName: 'buildTotalReflectionQuantities' },
  'anim-thin-lens':           { loader: () => import('./quantities/thinLens'), builderName: 'buildThinLensQuantities' },
}

/** 已加载的构建器缓存（模块级单例） */
const builderCache = new Map<string, QuantityBuilder>()

/**
 * 预加载指定动画的物理量构建器。
 * 在进入动画页时调用，确保首帧渲染前构建器已就绪。
 */
export async function preloadQuantityBuilder(animId: string): Promise<void> {
  if (builderCache.has(animId)) return

  const reg = quantityRegistry[animId]
  if (!reg) return

  const module = await reg.loader()
  const builder = module[reg.builderName]
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
  lastChangedParam?: string | null,
): PhysicsPanelData {
  const builder = builderCache.get(animId)
  if (builder) {
    // 传递 lastChangedParam（构建器可选使用）
    const result = (builder as (
      animId: string,
      params: Record<string, number>,
      time: number,
      lastChangedParam?: string | null,
    ) => PhysicsPanelData | null)(animId, params, time, lastChangedParam)
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
