import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const mechanicsCircularGravitationAnimations = defineAnimations({
  'anim-circular-motion': {
    title: '匀速圆周运动',
    knowledgeId: 'mechanics-5-4',
    Component: lazy(() => import('@/features/mechanics/circular/CircularMotionAnimation')),
    defaultParams: { r: 5, omega: 1, t: 0, advancedMode: 0, showProjection: 1, showWaveform: 1 } as const,
    paramMeta: [
      { key: 'r', label: '半径 r', min: 5, max: 10, step: 0.1, unit: 'm' },
      { key: 'omega', label: '角速度 ω', min: 0.1, max: 5, step: 0.1, unit: 'rad/s' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/circular/CircularMotionSidebar')),
  },
  'anim-centripetal': {
    title: '向心加速度与向心力',
    knowledgeId: 'mechanics-5-5',
    Component: lazy(() => import('@/features/mechanics/circular/CentripetalAnimation')),
    defaultParams: { r: 3, v: 3, v0: 5, m: 1, advancedMode: 0, showWaveform: 1, trackType: 0, showAcceleration: 1 } as const,
    paramMeta: [
      { key: 'r', label: '半径 r', min: 3, max: 5, step: 0.1, unit: 'm' },
      { key: 'v', label: '线速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s', hideIf: 'advancedMode', hideIfValue: 1 },
      { key: 'v0', label: '最低点初速度 v₀', min: 1, max: 15, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/circular/CentripetalSidebar')),
  },
  'anim-kepler': {
    title: '开普勒定律',
    knowledgeId: 'mechanics-6-1',
    Component: lazy(() => import('@/features/mechanics/gravitation/KeplerAnimation')),
    defaultParams: { a: 4.5, b: 3.0, period: 10, mode: 0, a2: 7.5, b2: 6.0 } as const,
    paramMeta: [
      { key: 'a', label: '内轨半长轴 a₁', min: 2.5, max: 5.5, step: 0.1, unit: '' },
      { key: 'b', label: '内轨半短轴 b₁', min: 1.5, max: 4.5, step: 0.1, unit: '' },
      { key: 'period', label: '内轨周期 T₁', min: 5, max: 20, step: 0.5, unit: 's' },
      { key: 'a2', label: '外轨半长轴 a₂', min: 6.0, max: 10.0, step: 0.1, unit: '', showIf: 'mode', showIfValue: 2 },
      { key: 'b2', label: '外轨半短轴 b₂', min: 4.5, max: 9.0, step: 0.1, unit: '', showIf: 'mode', showIfValue: 2 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '定律模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '第一定律' },
          { value: 1, label: '第二定律' },
          { value: 2, label: '第三定律' },
        ],
      },
    ],
  },
  'anim-satellite': {
    title: '人造卫星宇宙速度与入轨演示',
    knowledgeId: 'mechanics-6-3',
    Component: lazy(() => import('@/features/mechanics/gravitation/SatelliteAnimation')),
    defaultParams: { r: 7.0, mode: 0, v0: 7.9, isLaunched: 0, showChart: 1, showCompare: 1 } as const,
    paramMeta: [
      { key: 'r', label: '轨道半径 r', min: 6.37, max: 22.0, step: 0.1, unit: '×10⁶ m', showIf: 'mode', showIfValue: 0 },
      { key: 'v0', label: '发射速度 v₀', min: 5.0, max: 12.5, step: 0.1, unit: 'km/s', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/gravitation/SatelliteSidebar')),
  },
})
