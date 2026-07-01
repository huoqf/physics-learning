import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 恒定电流（[M4-1]）=====
export const electromagnetismDcCircuitsAnimations = defineAnimations({
  'anim-ohm-law': {
    title: '欧姆定律',
    knowledgeId: 'electricity-2-1',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLaw')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLawCenterExtra')),
    controlMeta: [
      { type: 'number', key: 'U', label: '电源电压 U', min: 0, max: 10, step: 0.1, unit: 'V' },
      { type: 'number', key: 'R', label: '定值电阻 R', min: 5, max: 50, step: 1, unit: 'Ω',
        hideIf: 'mode', hideIfValue: 1 },
      { type: 'toggle', key: 'showChart', label: '显示 U-I 实时图表', group: '显示辅助' },
      { type: 'segmented', key: 'mode', label: '观察模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础：定值电阻' }, { value: 1, label: '进阶：小灯泡伏安特性' }] },
    ],
    defaultParams: { U: 2, R: 10, mode: 0, showChart: 1 } as const,
  },
  'anim-circuit-analysis': {
    title: '串并联电路及电路动态分析',
    knowledgeId: 'electricity-2-2',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysis')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysisSidebar')),
    controlMeta: [
      { type: 'number', key: 'R2', label: '滑动变阻器 R₂', min: 0, max: 100, step: 1, unit: 'Ω' },
      { type: 'toggle', key: 'showChart', label: '显示分配对比柱状图' },
      { type: 'segmented', key: 'subMode', label: '连接方式', resetOnChange: true, showIf: 'mode', showIfValue: 0,
        options: [{ value: 0, label: '串联电路' }, { value: 1, label: '并联电路' }] },
      { type: 'segmented', key: 'mode', label: '观察模式', resetOnChange: true,
        options: [{ value: 0, label: '基础：串/并联分配' }, { value: 1, label: '进阶：混联动态电路' }] },
    ],
    defaultParams: { U: 12, R1: 20, R2: 10, R3: 30, mode: 0, subMode: 0, showChart: 1 } as const,
  },
  'anim-closed-circuit': {
    title: '闭合电路欧姆定律',
    knowledgeId: 'electricity-2-3',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuit')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuitCenterExtra')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuitSidebar')),
    controlMeta: [
      { type: 'number', key: 'R', label: '外电阻 R (滑动变阻器)', min: 0.1, max: 20, step: 0.1, unit: 'Ω' },
      { type: 'number', key: 'r', label: '电源内阻 r', min: 1, max: 5, step: 0.1, unit: 'Ω' },
      { type: 'toggle', key: 'highlightLoss', label: '内能损耗视觉高亮' },
      { type: 'segmented', key: 'mode', label: '观察模式', resetOnChange: true,
        options: [{ value: 0, label: '基础：U-I关系' }, { value: 1, label: '进阶：输出功率与效率' }] },
    ],
    defaultParams: { EMF: 6, r: 2, R: 10, mode: 1, highlightLoss: 0 } as const,
  },
})
