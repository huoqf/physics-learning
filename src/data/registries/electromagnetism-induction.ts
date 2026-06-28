import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 电磁感应（[M4-1]）=====
export const electromagnetismInductionAnimations = defineAnimations({
  'anim-electromagnetic-induction': {
    title: '第一节：电磁感应现象',
    knowledgeId: 'electricity-4-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/InductionPhenomenon')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/InductionSidebarExtra')),
    defaultParams: {
      mode: 0,
      showLines: 1,
      magnetX: 200,
      magnetSpeed: 0,
      magnetPole: 1,
      resistance: 50,
      dR_dt: 0,
      circuitSwitch: 1,
      hasIronCore: 1,
    } as const,
    paramMeta: [],
  },
  'anim-faraday-law': {
    title: '法拉第电磁感应定律',
    knowledgeId: 'electricity-4-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/FaradayLaw')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/FaradaySidebarExtra')),
    defaultParams: {
      mode: 0,
      N: 50,
      B: 1.2,
      magnetV: 140,
      dBdt: 0.5,
    } as const,
    paramMeta: [],
  },
  'anim-lenzs-law': {
    title: '楞次定律',
    knowledgeId: 'electricity-4-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/LenzsLaw')),
    defaultParams: { magnetSpeed: 2, magnetPole: 1, coilN: 10 } as const,
    paramMeta: [
      { key: 'magnetSpeed', label: '磁铁速度', min: 0.5, max: 5, step: 0.5, unit: '' },
      { key: 'magnetPole', label: '磁极朝向', min: -1, max: 1, step: 2, unit: '1=N下 -1=S下' },
      { key: 'coilN', label: '线圈匝数 N', min: 5, max: 30, step: 5, unit: '匝' },
      { key: 'motionMode', label: '运动模式', min: -1, max: 1, step: 2, unit: '1=插入 -1=拔出' },
    ],
  },
  'anim-cutting-emf': {
    title: '导体切割磁感线',
    knowledgeId: 'electricity-4-3',
    Component: lazy(() => import('@/features/electromagnetism/induction/CuttingEMF')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/CuttingEMFSidebarExtra')),
    defaultParams: {
      mode: 0, // 0=基础: 恒速切割, 1=进阶: 自由释放(变加速)
      B: 1.5, // T（负值表示磁场方向向外⊙，正值表示向里⊗）
      L: 1.0, // m
      v: 2.0, // m/s
      R: 2.0, // Ω
      F_ext: 2.0, // N
      m: 0.2, // kg
      showForceAnalysis: 1, // 开启受力分析
    } as const,
    paramMeta: [],
  },
})
