import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'
import { GRAVITY } from '@/physics/constants'

export const mechanicsEnergyAnimations = defineAnimations({
  'anim-work': {
    title: '恒力做功',
    knowledgeId: 'mechanics-7-1',
    Component: lazy(() => import('@/features/mechanics/energy/WorkAnimation')),
    defaultParams: { F: 10, angleDeg: 30, s: 5, m: 2, mu: 0.3, g: GRAVITY, mode: 0 },
    paramMeta: [
      { key: 'F', label: '拉力 F', min: 0, max: 50, step: 1, unit: 'N' },
      { key: 'angleDeg', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
      { key: 's', label: '位移 s', min: 1, max: 20, step: 0.5, unit: 'm' },
      { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'mode', showIfValue: 1 },
      { key: 'mu', label: '动摩擦因数 μ', min: 0, max: 0.6, step: 0.05, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/energy/WorkSidebar')),
  },
  'anim-power': {
    title: '功率',
    knowledgeId: 'mechanics-7-2',
    Component: lazy(() => import('@/features/mechanics/energy/PowerAnimation')),
    defaultParams: { P: 60000, m: 2000, f: 2000, a: 1.5, mode: 0 },
    paramMeta: [
      { key: 'P', label: '额定功率 P', min: 10000, max: 200000, step: 5000, unit: 'W' },
      { key: 'm', label: '质量 m', min: 500, max: 5000, step: 100, unit: 'kg' },
      { key: 'f', label: '阻力 f', min: 500, max: 5000, step: 100, unit: 'N', showIf: 'mode', showIfValue: 1 },
      { key: 'a', label: '目标加速度 a', min: 0.5, max: 5, step: 0.1, unit: 'm/s²', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/energy/PowerSidebar')),
  },
  'anim-kinetic-energy': {
    title: '动能定理',
    knowledgeId: 'mechanics-7-3',
    Component: lazy(() => import('@/features/mechanics/energy/KineticEnergyAnimation')),
    defaultParams: { m: 2, v0: 0, F: 15, s: 6, R: 5, mu: 0.15, mode: 0 },
    paramMeta: [
      { key: 'm', label: '质量 m', min: 1, max: 10, step: 0.5, unit: 'kg' },
      { key: 'v0', label: '初速度 v₀', min: 0, max: 5, step: 0.5, unit: 'm/s' },
      { key: 'F', label: '拉力 F', min: 0, max: 40, step: 1, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 's', label: '拉力位移 s', min: 1, max: 15, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 0 },
      { key: 'R', label: '轨道半径 R', min: 2, max: 8, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 1 },
      { key: 'mu', label: '摩擦因数 μ', min: 0.00, max: 0.60, step: 0.05, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/energy/KineticEnergySidebar')),
  },
  'anim-potential-energy': {
    title: '重力势能与弹性势能',
    knowledgeId: 'mechanics-7-4',
    Component: lazy(() => import('@/features/mechanics/energy/PotentialEnergyAnimation')),
    defaultParams: { m: 2, g: 9.8, y0: 8, y_ref: 3, k: 100, x0: 2.0, mode: 0 },
    paramMeta: [
      { key: 'm', label: '质量 m', min: 0.5, max: 8, step: 0.5, unit: 'kg' },
      { key: 'y0', label: '初始高度 y₀', min: 2, max: 10, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 0 },
      { key: 'y_ref', label: '零势能面 y_ref', min: 0, max: 8, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 0 },
      { key: 'k', label: '弹簧系数 k', min: 20, max: 200, step: 10, unit: 'N/m', showIf: 'mode', showIfValue: 1 },
      { key: 'x0', label: '初始形变 x₀', min: -3, max: 3, step: 0.2, unit: 'm', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/energy/PotentialEnergySidebar')),
  },
  'anim-energy-conservation': {
    title: '机械能守恒定律',
    knowledgeId: 'mechanics-7-5',
    Component: lazy(() => import('@/features/mechanics/energy/EnergyConservationAnimation')),
    defaultParams: { m: 2.0, g: 9.8, L: 5.0, theta0: 45, R: 5.0, mu: 0.1, mode: 0, hRef: 0.0 },
    paramMeta: [
      { key: 'm', label: '质量 m', min: 0.5, max: 5.0, step: 0.5, unit: 'kg' },
      { key: 'theta0', label: '初始角 θ₀', min: -60, max: 60, step: 5, unit: '°' },
      { key: 'L', label: '摆线长度 L', min: 2.0, max: 8.0, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 0 },
      { key: 'R', label: '轨道半径 R', min: 2.0, max: 8.0, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 1 },
      { key: 'mu', label: '摩擦因数 μ', min: 0.00, max: 0.30, step: 0.02, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/energy/EnergyConservationSidebar')),
  },
})
