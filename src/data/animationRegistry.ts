import { lazy } from 'react'
import { AnimationConfig } from './types'

export const animationRegistry: Record<string, AnimationConfig> = {
  'anim-velocity': {
    id: 'anim-velocity',
    title: '速度演示',
    knowledgeId: 'mechanics-1-3',
    Component: lazy(() => import('@/features/mechanics/VelocityAnimation')),
    defaultParams: { v: 5, t: 0 }
  },
  'anim-acceleration': {
    id: 'anim-acceleration',
    title: '加速度演示',
    knowledgeId: 'mechanics-1-4',
    Component: lazy(() => import('@/features/mechanics/AccelerationAnimation')),
    defaultParams: { v0: 0, a: 2, t: 0 }
  },
  'anim-uniform-acceleration': {
    id: 'anim-uniform-acceleration',
    title: '匀变速直线运动',
    knowledgeId: 'mechanics-2-1',
    Component: lazy(() => import('@/features/mechanics/UniformAccelerationAnimation')),
    defaultParams: { v0: 0, a: 1.5, t: 0 }
  },
  'anim-free-fall': {
    id: 'anim-free-fall',
    title: '自由落体运动',
    knowledgeId: 'mechanics-2-2',
    Component: lazy(() => import('@/features/mechanics/FreeFallAnimation')),
    defaultParams: { v0: 0, g: 9.8, t: 0 }
  },
  'anim-vertical-throw': {
    id: 'anim-vertical-throw',
    title: '竖直上抛运动',
    knowledgeId: 'mechanics-2-3',
    Component: lazy(() => import('@/features/mechanics/VerticalThrowAnimation')),
    defaultParams: { v0: 15, g: 9.8, t: 0 }
  },
  'anim-spring-force': {
    id: 'anim-spring-force',
    title: '弹力演示',
    knowledgeId: 'mechanics-3-2',
    Component: lazy(() => import('@/features/mechanics/SpringForceAnimation')),
    defaultParams: { k: 100, x: 0, m: 1 }
  },
  'anim-friction': {
    id: 'anim-friction',
    title: '摩擦力演示',
    knowledgeId: 'mechanics-3-3',
    Component: lazy(() => import('@/features/mechanics/FrictionAnimation')),
    defaultParams: { m: 5, mu: 0.3, angle: 0, g: 9.8 }
  },
  'anim-vector-addition': {
    id: 'anim-vector-addition',
    title: '力的合成与分解',
    knowledgeId: 'mechanics-3-4',
    Component: lazy(() => import('@/features/mechanics/VectorAdditionAnimation')),
    defaultParams: { f1: 10, f2: 8, angle: 60 }
  },
  'anim-equilibrium': {
    id: 'anim-equilibrium',
    title: '共点力平衡',
    knowledgeId: 'mechanics-3-5',
    Component: lazy(() => import('@/features/mechanics/EquilibriumAnimation')),
    defaultParams: { f1: 10, f2: 10, f3: 10 }
  },
  'anim-newton-second': {
    id: 'anim-newton-second',
    title: '牛顿第二定律',
    knowledgeId: 'mechanics-4-2',
    Component: lazy(() => import('@/features/mechanics/NewtonSecondAnimation')),
    defaultParams: { F: 10, m: 2, mu: 0 }
  },
  'anim-weightlessness': {
    id: 'anim-weightlessness',
    title: '超重与失重',
    knowledgeId: 'mechanics-4-4',
    Component: lazy(() => import('@/features/mechanics/WeightlessnessAnimation')),
    defaultParams: { a: 2, g: 9.8, m: 50 }
  },
  'anim-connected-bodies': {
    id: 'anim-connected-bodies',
    title: '连接体问题',
    knowledgeId: 'mechanics-4-5',
    Component: lazy(() => import('@/features/mechanics/ConnectedBodiesAnimation')),
    defaultParams: { m1: 2, m2: 3, F: 15, mu: 0.1 }
  },
  'anim-projectile': {
    id: 'anim-projectile',
    title: '平抛运动',
    knowledgeId: 'mechanics-5-2',
    Component: lazy(() => import('@/features/mechanics/ProjectileAnimation')),
    defaultParams: { v0x: 10, g: 9.8, t: 0 }
  },
  'anim-oblique-throw': {
    id: 'anim-oblique-throw',
    title: '斜抛运动',
    knowledgeId: 'mechanics-5-3',
    Component: lazy(() => import('@/features/mechanics/ObliqueThrowAnimation')),
    defaultParams: { v0: 15, angle: 45, g: 9.8, t: 0 }
  },
  'anim-circular-motion': {
    id: 'anim-circular-motion',
    title: '匀速圆周运动',
    knowledgeId: 'mechanics-5-4',
    Component: lazy(() => import('@/features/mechanics/CircularMotionAnimation')),
    defaultParams: { r: 2, omega: 1, t: 0 }
  },
  'anim-centripetal': {
    id: 'anim-centripetal',
    title: '向心加速度与向心力',
    knowledgeId: 'mechanics-5-5',
    Component: lazy(() => import('@/features/mechanics/CentripetalAnimation')),
    defaultParams: { r: 2, v: 3, m: 1 }
  },
  'anim-kepler': {
    id: 'anim-kepler',
    title: '开普勒定律',
    knowledgeId: 'mechanics-6-1',
    Component: lazy(() => import('@/features/mechanics/KeplerAnimation')),
    defaultParams: { a: 5, b: 3, period: 10 }
  },
  'anim-gravity': {
    id: 'anim-gravity',
    title: '万有引力定律',
    knowledgeId: 'mechanics-6-2',
    Component: lazy(() => import('@/features/mechanics/GravityAnimation')),
    defaultParams: { m1: 1000, m2: 10, r: 5 }
  },
  'anim-satellite': {
    id: 'anim-satellite',
    title: '人造卫星',
    knowledgeId: 'mechanics-6-3',
    Component: lazy(() => import('@/features/mechanics/SatelliteAnimation')),
    defaultParams: { r: 7, M: 5.97e24, G: 6.67e-11 }
  },
  'anim-kinetic-energy': {
    id: 'anim-kinetic-energy',
    title: '动能定理',
    knowledgeId: 'mechanics-7-3',
    Component: lazy(() => import('@/features/mechanics/KineticEnergyAnimation')),
    defaultParams: { m: 2, v0: 0, F: 10, s: 5 }
  },
  'anim-energy-conservation': {
    id: 'anim-energy-conservation',
    title: '机械能守恒定律',
    knowledgeId: 'mechanics-7-5',
    Component: lazy(() => import('@/features/mechanics/EnergyConservationAnimation')),
    defaultParams: { m: 2, h: 10, v0: 0, g: 9.8 }
  },
  'anim-impulse': {
    id: 'anim-impulse',
    title: '动量定理',
    knowledgeId: 'mechanics-8-3',
    Component: lazy(() => import('@/features/mechanics/MomentumTheoremAnimation')),
    defaultParams: { m: 2, v0: 0, F: 10, t_duration: 3 }
  },
  'anim-momentum-conservation': {
    id: 'anim-momentum-conservation',
    title: '动量守恒定律',
    knowledgeId: 'mechanics-8-4',
    Component: lazy(() => import('@/features/mechanics/MomentumConservationAnimation')),
    defaultParams: { m1: 2, m2: 3, v1: 5, v2: 0, e: 0.8 }
  },
  'anim-collision': {
    id: 'anim-collision',
    title: '弹性碰撞与非弹性碰撞',
    knowledgeId: 'mechanics-8-5',
    Component: lazy(() => import('@/features/mechanics/CollisionAnimation')),
    defaultParams: { m1: 2, m2: 3, v1: 5, v2: -2, isElastic: 1 }
  },

  // ===== 电磁学 · 静电场（[M4-1]）=====
  'anim-coulomb-law': {
    id: 'anim-coulomb-law',
    title: '库仑定律',
    knowledgeId: 'electricity-1-1',
    Component: lazy(() => import('@/features/electromagnetism/CoulombLaw')),
    defaultParams: { q1: 2, q2: -3, r: 4 }
  },
  'anim-electric-field': {
    id: 'anim-electric-field',
    title: '点电荷电场强度',
    knowledgeId: 'electricity-1-2',
    Component: lazy(() => import('@/features/electromagnetism/ElectricField')),
    defaultParams: { q: 5, rTest: 3 }
  },
  'anim-charge-in-efield': {
    id: 'anim-charge-in-efield',
    title: '带电粒子在匀强电场中运动',
    knowledgeId: 'electricity-1-3',
    Component: lazy(() => import('@/features/electromagnetism/ChargeInEField')),
    defaultParams: { E: 10, q: 5, m: 200, v0: 20, t: 0 }
  },
  'anim-capacitor': {
    id: 'anim-capacitor',
    title: '平行板电容器',
    knowledgeId: 'electricity-1-4',
    Component: lazy(() => import('@/features/electromagnetism/Capacitor')),
    defaultParams: { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 }
  },
  'anim-field-lines': {
    id: 'anim-field-lines',
    title: '电场线与等势面',
    knowledgeId: 'electricity-1-5',
    Component: lazy(() => import('@/features/electromagnetism/FieldLines')),
    defaultParams: { q1: 5, q2: -5, distance: 8, mode: 1 } // mode: 1=异种, 0=同种
  },
  'anim-electric-potential': {
    id: 'anim-electric-potential',
    title: '电势与等势面',
    knowledgeId: 'electricity-1-6',
    Component: lazy(() => import('@/features/electromagnetism/ElectricPotential')),
    defaultParams: { q: 5, rTest: 5 }
  },

  // ===== 电磁学 · 恒定电流（[M4-1]）=====
  'anim-ohm-law': {
    id: 'anim-ohm-law',
    title: '欧姆定律',
    knowledgeId: 'electricity-2-1',
    Component: lazy(() => import('@/features/electromagnetism/OhmLaw')),
    defaultParams: { U: 6, R: 3 }
  },
  'anim-circuit-analysis': {
    id: 'anim-circuit-analysis',
    title: '串并联电路',
    knowledgeId: 'electricity-2-2',
    Component: lazy(() => import('@/features/electromagnetism/CircuitAnalysis')),
    defaultParams: { U: 12, R1: 4, R2: 2, mode: 0 }
  },
  'anim-closed-circuit': {
    id: 'anim-closed-circuit',
    title: '闭合电路欧姆定律',
    knowledgeId: 'electricity-2-3',
    Component: lazy(() => import('@/features/electromagnetism/ClosedCircuit')),
    defaultParams: { EMF: 6, r: 1, R: 5 }
  },

  // ===== 电磁学 · 磁场（[M4-1]）=====
  'anim-ampere-force': {
    id: 'anim-ampere-force',
    title: '安培力 F=BIL',
    knowledgeId: 'electricity-3-1',
    Component: lazy(() => import('@/features/electromagnetism/AmpereForce')),
    defaultParams: { B: 1, I: 2, L: 5, angle: 90 }
  },
  'anim-lorentz-force': {
    id: 'anim-lorentz-force',
    title: '洛伦兹力 F=qvB',
    knowledgeId: 'electricity-3-2',
    Component: lazy(() => import('@/features/electromagnetism/LorentzForce')),
    defaultParams: { q: 1, v: 10, B: 1, angle: 90 }
  },
  'anim-charge-in-bfield': {
    id: 'anim-charge-in-bfield',
    title: '带电粒子在磁场中运动',
    knowledgeId: 'electricity-3-3',
    Component: lazy(() => import('@/features/electromagnetism/ChargeInBField')),
    defaultParams: { q: 1, m: 1, v: 10, B: 1 }
  },

  // ===== 电磁学 · 电磁感应（[M4-1]）=====
  'anim-faraday-law': {
    id: 'anim-faraday-law',
    title: '法拉第电磁感应定律',
    knowledgeId: 'electricity-4-2',
    Component: lazy(() => import('@/features/electromagnetism/FaradayLaw')),
    defaultParams: { N: 5, B: 1.2 }
  },
  'anim-lenzs-law': {
    id: 'anim-lenzs-law',
    title: '楞次定律',
    knowledgeId: 'electricity-4-1',
    Component: lazy(() => import('@/features/electromagnetism/LenzsLaw')),
    defaultParams: { magnetSpeed: 2, magnetPole: 1, coilN: 10 }
  },
  'anim-cutting-emf': {
    id: 'anim-cutting-emf',
    title: '导体切割磁感线',
    knowledgeId: 'electricity-4-3',
    Component: lazy(() => import('@/features/electromagnetism/CuttingEMF')),
    defaultParams: { B: 1, L: 0.5, v: 2, R: 2 }
  }
}

export function getAnimationConfig(id: string): AnimationConfig | undefined {
  return animationRegistry[id]
}