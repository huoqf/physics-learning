import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { GRAVITY } from '@/physics/constants'

export const mechanicsKinematicsAnimations = defineAnimations({
  'anim-velocity': {
    title: '速度演示',
    knowledgeId: 'mechanics-1-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/VelocityAnimation')),
    defaultParams: {
      v: 8, t: 0, scene: 0, deltaT: 2, totalDuration: 10, advancedMode: 0,
      modelIdx: 0, modelK: 1, modelV0: 0, modelA: 5, modelOmega: 2,
      modelA1: 2, modelVMax: 6, modelA3: 3, modelT1: 3, modelT2Dur: 2,
      modelTStop: 2, modelA5: 3,
    } as const,
    paramMeta: [
      { key: 'v', label: '速度 v', min: 1, max: 20, step: 0.5, unit: 'm/s' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/VelocitySidebar')),
    CenterExtra: lazy(() => import('@/features/mechanics/kinematics/VelocityCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-acceleration': {
    title: '加速度演示',
    knowledgeId: 'mechanics-1-4',
    Component: lazy(() => import('@/features/mechanics/kinematics/AccelerationAnimation')),
    defaultParams: {
      v0: 0, a: 2, t: 0, advancedMode: 0,
      vA: 30, deltaX0: 50, t0: 1, aB: 3, vMax: 40,
      deltaT: 1,
    } as const,
    paramMeta: [
      { key: 'vA', label: '轿车速度 vₐ', min: 10, max: 50, step: 1, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'deltaX0', label: '初始车距 Δx₀', min: 10, max: 200, step: 5, unit: 'm', showIf: 'advancedMode', showIfValue: 1 },
      { key: 't0', label: '反应时间 t₀', min: 0, max: 3, step: 0.1, unit: 's', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'aB', label: '警车加速度 aᵦ', min: 1, max: 8, step: 0.5, unit: 'm/s²', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vMax', label: '最高时速 vₘₐₓ', min: 20, max: 60, step: 1, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vA', label: '飞机速度 vₐ', min: 100, max: 300, step: 10, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'aB', label: '跑车加速度 aᵦ', min: 2, max: 10, step: 0.5, unit: 'm/s²', showIf: 'advancedMode', showIfValue: 0 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/AccelerationSidebar')),
    CenterExtra: lazy(() => import('@/features/mechanics/kinematics/AccelerationCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-uniform-acceleration': {
    title: '匀变速直线运动',
    knowledgeId: 'mechanics-2-1',
    Component: lazy(() => import('@/features/mechanics/kinematics/UniformAccelerationAnimation')),
    defaultParams: { v0: 0, a: 1.5, t: 0, advancedMode: 0, showSplit: 1, flashPeriod: 1, splitN: 0, showEquivRect: 0 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0, max: 20, step: 0.1, unit: 'm/s' },
      { key: 'a', label: '加速度 a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/UniformAccelerationSidebar')),
    CenterExtra: lazy(() => import('@/features/mechanics/kinematics/UniformAccelerationCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-free-fall': {
    title: '自由落体运动',
    knowledgeId: 'mechanics-2-2',
    Component: lazy(() => import('@/features/mechanics/kinematics/FreeFallWrapper')),
    defaultParams: { v0: 0, g: GRAVITY, pressure: 0, objectA: 0, objectB: 0, advancedMode: 0, dripPeriod: 0.5, latitude: 45, altitude: 0, t: 0 } as const,
    paramMeta: [],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/FreeFallSidebar')),
  },
  'anim-vertical-throw': {
    title: '竖直上抛运动',
    knowledgeId: 'mechanics-2-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/VerticalThrowAnimation')),
    defaultParams: { v0: 15, g: GRAVITY, t: 0, advancedMode: 0, sliceDensity: 0, airResistance: 0, targetHeight: 0 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0, max: 30, step: 0.1, unit: 'm/s' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/VerticalThrowSidebar')),
  },
  'anim-projectile': {
    title: '平抛运动',
    knowledgeId: 'mechanics-5-2',
    Component: lazy(() => import('@/features/mechanics/kinematics/ProjectileAnimation')),
    defaultParams: { v0x: 10, g: GRAVITY, t: 0, advancedMode: 0, airResistance: 0, showVacuumCompare: 1 } as const,
    paramMeta: [
      { key: 'v0x', label: '初速度 v₀', min: 2, max: 20, step: 0.1, unit: 'm/s' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/ProjectileSidebar')),
  },
  'anim-oblique-throw': {
    title: '斜抛运动',
    knowledgeId: 'mechanics-5-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/ObliqueThrowAnimation')),
    defaultParams: { v0: 15, angle: 45, g: GRAVITY, t: 0, advancedMode: 0, airResistance: 0, showVacuumCompare: 1 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 5, max: 30, step: 0.1, unit: 'm/s' },
      { key: 'angle', label: '抛射角 θ', min: 10, max: 80, step: 1, unit: '°' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/ObliqueThrowSidebar')),
  },
  'anim-kinematics-advanced': {
    title: '运动学图像扩展',
    knowledgeId: 'mechanics-2-4',
    Component: lazy(() => import('@/features/mechanics/kinematics/KinematicsAdvancedAnimation')),
    defaultParams: {
      v0: 4.0,
      a: 2.0,
      t: 0,
      chartMode: 0,
      showAux: 1,
      showVectors: 1,
    } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0.0, max: 10.0, step: 0.1, unit: 'm/s' },
      { key: 'a', label: '加速度 a', min: -4.0, max: 4.0, step: 0.1, unit: 'm/s²' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'chartMode', label: '函数图象模式切换', resetOnChange: true,
        options: [{ value: 0, label: 'v²-x模式' }, { value: 1, label: 'x/t-t模式' }] },
      { type: 'toggle', key: 'showAux', label: '显示斜率/截距解析辅助线' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/kinematics/KinematicsAdvancedSidebar')),
  },
})

