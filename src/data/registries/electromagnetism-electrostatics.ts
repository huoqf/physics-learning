import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 静电场（[M4-1]）=====
export const electromagnetismElectrostaticsAnimations = defineAnimations({
  'anim-coulomb-law': {
    title: '库仑定律',
    knowledgeId: 'electricity-1-1',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/CoulombLaw')),
    defaultParams: { q1: 2, q2: -3, r: 4, mode: 0, q3: 1 },
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
    defaultParams: { mode: 0, q: 5, chargeConfig: 0, qTest: 1.0, rTest: 3, showFieldLines: 1 },
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
    defaultParams: { E: 10, q: 5, m: 200, v0: 20, t: 0 },
    paramMeta: [
      { key: 'E', label: '电场强度 E', min: 1, max: 30, step: 1, unit: '×10³ N/C' },
      { key: 'q', label: '电量 q', min: 0.5, max: 10, step: 0.5, unit: 'μC' },
      { key: 'm', label: '质量 m', min: 50, max: 500, step: 10, unit: 'mg' },
      { key: 'v0', label: '初速度 v₀', min: 5, max: 40, step: 1, unit: 'm/s' },
    ],
  },
  'anim-capacitor': {
    title: '平行板电容器',
    knowledgeId: 'electricity-1-4',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/Capacitor')),
    defaultParams: { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 },
    paramMeta: [
      { key: 'connected', label: '电源状态', min: 0, max: 1, step: 1, unit: '1=接电源 0=断开' },
      { key: 'S', label: '正对面积 S', min: 20, max: 200, step: 10, unit: 'cm²' },
      { key: 'd', label: '板间距 d', min: 1, max: 10, step: 0.5, unit: 'mm' },
      { key: 'epsilon_r', label: '相对介电常数 εᵣ', min: 1, max: 8, step: 0.5, unit: '' },
      { key: 'U', label: '电源电压 U', min: 1, max: 50, step: 1, unit: 'V' },
    ],
  },
  'anim-field-lines': {
    title: '电场线与等势面',
    knowledgeId: 'electricity-1-5',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/FieldLines')),
    defaultParams: { q1: 5, q2: -5, distance: 8, mode: 1 },
    paramMeta: [
      { key: 'q1', label: '电荷量 q₁', min: -10, max: 10, step: 1, unit: 'μC' },
      { key: 'q2', label: '电荷量 q₂', min: -10, max: 10, step: 1, unit: 'μC' },
      { key: 'distance', label: '电荷间距 d', min: 3, max: 15, step: 1, unit: 'cm' },
    ],
  },
  'anim-electric-potential': {
    title: '电势与等势面',
    knowledgeId: 'electricity-1-6',
    Component: lazy(() => import('@/features/electromagnetism/electrostatics/ElectricPotential')),
    defaultParams: { q: 5, rTest: 5 },
    paramMeta: [
      { key: 'q', label: '电荷量 q', min: -10, max: 10, step: 1, unit: 'μC' },
      { key: 'rTest', label: '试探点距离 r', min: 2, max: 10, step: 0.5, unit: 'cm' },
    ],
  },
})
