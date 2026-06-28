import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 静电场（[M4-1]）=====
export const electromagnetismElectrostaticsAnimations = defineAnimations({
  'anim-coulomb-law': {
    title: '库仑定律',
    knowledgeId: 'electricity-1-1',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/CoulombLaw')),
    defaultParams: { q1: 2, q2: -3, r: 4, mode: 0, q3: 1 } as const,
    paramMeta: [
      { key: 'q1', label: '电量 Q₁', min: -5, max: 5, step: 0.5, unit: 'μC' },
      { key: 'q2', label: '电量 Q₂', min: -5, max: 5, step: 0.5, unit: 'μC' },
      { key: 'r', label: '间距 r', min: 1, max: 8, step: 0.5, unit: 'cm', showIf: 'mode', showIfValue: 0 },
      { key: 'q3', label: '电量 Q₃', min: -5, max: 5, step: 0.5, unit: 'μC', showIf: 'mode', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/CoulombLawSidebar')),
  },
  'anim-electric-field': {
    title: '电场强度与比值定义法',
    knowledgeId: 'electricity-1-2',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/ElectricField')),
    defaultParams: { mode: 0, q: 5, chargeConfig: 0, qTest: 1.0, rTest: 3, showFieldLines: 1 } as const,
    paramMeta: [
      { key: 'q', label: '源电电量 Q', min: -10, max: 10, step: 0.5, unit: 'μC', showIf: 'mode', showIfValue: 0 },
      { key: 'qTest', label: '试探电量 q', min: -2, max: 2, step: 0.2, unit: 'μC' },
      { key: 'rTest', label: '试探距离 r', min: 1, max: 6, step: 0.1, unit: 'cm' },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/ElectricFieldSidebar')),
  },
  'anim-charge-in-efield': {
    title: '带电粒子在匀强电场中运动',
    knowledgeId: 'electricity-1-3',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/ChargeInEField')),
    defaultParams: { U: 200, v0: 20, q: 5, freq: 50, isAC: 0, useGravity: 0 } as const,
    paramMeta: [
      { key: 'U', label: '板间电压 U', min: 50, max: 500, step: 10, unit: 'V' },
      { key: 'v0', label: '射入初速 v₀', min: 10, max: 40, step: 1, unit: 'm/s' },
      { key: 'q', label: '电荷量 q', min: 1, max: 10, step: 0.5, unit: 'μC' },
      { key: 'freq', label: '交变频率 f', min: 10, max: 100, step: 5, unit: 'Hz', showIf: 'isAC', showIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/ChargeInEFieldSidebar')),
  },
  'anim-capacitor': {
    title: '平行板电容器',
    knowledgeId: 'electricity-1-4',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/Capacitor')),
    defaultParams: { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 } as const,
    paramMeta: [
      { key: 'S', label: '正对面积 S', min: 50, max: 200, step: 10, unit: 'cm²' },
      { key: 'd', label: '板间距 d', min: 2, max: 10, step: 0.5, unit: 'mm' },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/CapacitorSidebar')),
  },
  'anim-field-lines': {
    title: '电场线与等势面关系',
    knowledgeId: 'electricity-1-5',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/FieldLines')),
    defaultParams: {
      topology: 2,
      qSource: 5,
      showFieldLines: 1,
      showEquipotentials: 1,
      probeX: 350,
      probeY: 150,
      probeStartX: 350,
      probeStartY: 150,
      isDragging: 0,
    } as const,
    paramMeta: [
      { key: 'qSource', label: '场源电量 Q', min: 1, max: 10, step: 0.5, unit: 'μC' },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/FieldLinesSidebar')),
  },
  'anim-electric-potential': {
    title: '电势与电势差',
    knowledgeId: 'electricity-1-6',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/ElectricPotential')),
    defaultParams: {
      baseEField: 150,
      qProbe: 1.0,
      zeroRef: 0,
      drawMode: 0,
      phiA: 0,
      phiB: 0,
      slopeK: 0,
      hoverX: 0.5,
    } as const,
    paramMeta: [
      { key: 'baseEField', label: '基准电场', min: 0, max: 300, step: 10, unit: 'V/m' },
      { key: 'qProbe', label: '试探电荷 q', min: -2.0, max: 2.0, step: 0.2, unit: 'μC' },
    ],
    SidebarExtra: lazy(() => import('@/features/electromagnetism/electrostatics/ElectricPotentialSidebar')),
  },
})
