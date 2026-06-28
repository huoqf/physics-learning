import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 恒定电流（[M4-1]）=====
export const electromagnetismDcCircuitsAnimations = defineAnimations({
  'anim-ohm-law': {
    title: '欧姆定律',
    knowledgeId: 'electricity-2-1',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLaw')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLawCenterExtra')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLawSidebar')),
    defaultParams: { U: 2, R: 10, mode: 0, showChart: 1 } as const,
  },
  'anim-circuit-analysis': {
    title: '串并联电路及电路动态分析',
    knowledgeId: 'electricity-2-2',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysis')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysisSidebar')),
    defaultParams: { U: 12, R1: 20, R2: 10, R3: 30, mode: 0, subMode: 0, showChart: 1 } as const,
  },
  'anim-closed-circuit': {
    title: '闭合电路欧姆定律',
    knowledgeId: 'electricity-2-3',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuit')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuitCenterExtra')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuitSidebar')),
    defaultParams: { EMF: 6, r: 2, R: 10, mode: 1, highlightLoss: 0 } as const,
  },
})
