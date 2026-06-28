import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const mechanicsMomentumAnimations = defineAnimations({
  'anim-momentum': {
    title: '动量',
    knowledgeId: 'mechanics-8-1',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumAnimation')),
    defaultParams: { m: 3, v: 4, mA: 3, vA: 5, mB: 2, vB: -3, advancedMode: 0, showEkChart: 1 } as const,
    paramMeta: [
      { key: 'm', label: '质量 m', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v', label: '速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'mA', label: 'A球质量 m_A', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vA', label: 'A球速度 v_A', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mB', label: 'B球质量 m_B', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vB', label: 'B球速度 v_B', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/MomentumSidebar')),
  },
  'anim-impulse-concept': {
    title: '冲量',
    knowledgeId: 'mechanics-8-2',
    Component: lazy(() => import('@/features/mechanics/momentum/ImpulseAnimation')),
    defaultParams: { F: 10, t_duration: 3, FMax: 10, t_total: 3, forceType: 0, advancedMode: 0 } as const,
    paramMeta: [
      { key: 'F', label: '恒力 F', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'advancedMode', showIfValue: 0 },
      { key: 't_duration', label: '作用时间 t', min: 1, max: 10, step: 0.5, unit: 's', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'FMax', label: '力最大值 F_max', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'advancedMode', showIfValue: 1 },
      { key: 't_total', label: '作用总时间 t', min: 1, max: 10, step: 0.5, unit: 's', showIf: 'advancedMode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/ImpulseSidebar')),
  },
  'anim-impulse': {
    title: '动量定理',
    knowledgeId: 'mechanics-8-3',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumTheoremAnimation')),
    defaultParams: { m: 2, h: 2, k: 5, rho: 1000, S: 0.01, v_fluid: 5, alpha: 0, advancedMode: 0 } as const,
    paramMeta: [
      { key: 'm', label: '物体质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'h', label: '下落高度 h', min: 0.5, max: 5, step: 0.5, unit: 'm', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'k', label: '缓冲垫软硬 k', min: 1, max: 20, step: 1, unit: 'N/m', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'rho', label: '流体密度 ρ', min: 500, max: 5000, step: 100, unit: 'kg/m³', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'S', label: '截面积 S', min: 0.005, max: 0.02, step: 0.001, unit: 'm²', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'v_fluid', label: '流速 v', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'alpha', label: '反弹系数 α', min: 0, max: 1, step: 0.1, unit: '', showIf: 'advancedMode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/MomentumTheoremSidebar')),
  },
  'anim-momentum-conservation': {
    title: '动量守恒定律',
    knowledgeId: 'mechanics-8-4',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumConservationAnimation')),
    defaultParams: { m1: 3, v1: 5, m2: 2, v2: 0, m_slider: 1, M_board: 3, v0: 6, mu: 0.3, L: 2, advancedMode: 0, collisionType: 0, e_coefficient: 0.5 } as const,
    paramMeta: [
      { key: 'm1', label: 'A球质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v1', label: 'A球速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm2', label: 'B球质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm_slider', label: '滑块质量 m', min: 0.5, max: 5, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'M_board', label: '木板质量 M', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'v0', label: '滑块初速度 v₀', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mu', label: '动摩擦因数 μ', min: 0.1, max: 0.6, step: 0.05, unit: '', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'L', label: '木板长度 L', min: 0.5, max: 5, step: 0.5, unit: 'm', showIf: 'advancedMode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/MomentumConservationSidebar')),
  },
  'anim-collision': {
    title: '弹性碰撞与非弹性碰撞',
    knowledgeId: 'mechanics-8-5',
    Component: lazy(() => import('@/features/mechanics/momentum/CollisionAnimation')),
    defaultParams: { m1: 3, v1: 5, m2: 2, v2: 0, isElastic: 1, mA: 3, vA: 5, mB: 2, kLoss: 0, advancedMode: 0 } as const,
    paramMeta: [
      { key: 'm1', label: 'A球质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v1', label: 'A球速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm2', label: 'B球质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'mA', label: 'A球质量 m_A', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mB', label: 'B球质量 m_B', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vA', label: 'A球初速度 v_A', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'kLoss', label: '能量损失系数 k', min: 0, max: 1, step: 0.1, unit: '', showIf: 'advancedMode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/CollisionSidebar')),
  },
  'anim-momentum-application': {
    title: '动量守恒应用',
    knowledgeId: 'mechanics-8-6',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumApplicationAnimation')),
    defaultParams: {
      modelType: 0, // 0: 弧形槽-滑块, 1: 弹簧双滑块, 2: 人船模型
      m_block: 2,
      M_slot: 5,
      R_slot: 1.5,
      mA_spring: 2,
      mB_spring: 3,
      v0_spring: 5,
      k_spring: 20,
      m_person: 50,
      M_boat: 150,
      L_boat: 4,
      manBoatControl: 0, // 0: 自动, 1: 键盘
    } as const,
    paramMeta: [
      { key: 'modelType', label: '选择经典模型', min: 0, max: 2, step: 1, unit: '', showIf: 'always' }
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/momentum/MomentumApplicationSidebar')),
  },
})

