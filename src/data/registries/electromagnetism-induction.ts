import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
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
      magnetX: 160,
      magnetSpeed: 0,
      magnetPole: 1,
      resistance: 50,
      dR_dt: 0,
      circuitSwitch: 1,
      hasIronCore: 1,
      subCircuitSwitch: 1,
      primaryCoilX: 220,
      primaryCoilSpeed: 0,
      rodX: 200,
      rodSpeed: 0,
    } as const,
    paramMeta: [],
  },
  'anim-faraday-law': {
    title: '法拉第电磁感应定律',
    knowledgeId: 'electricity-4-3',
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
    knowledgeId: 'electricity-4-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/LenzsLaw')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/LenzsLawSidebarExtra')),
    defaultParams: {
      magnetSpeed: 2,
      magnetPole: 1,
      coilN: 10,
      motionMode: 1,
      currentStep: 0,
      showLines: 1,
      showEquivalentPoles: 1,
    } as const,
    paramMeta: [],
  },
  'anim-cutting-emf': {
    title: '导体切割磁感线',
    knowledgeId: 'electricity-4-4',
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
