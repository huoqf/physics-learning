import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 恒定电流（[M4-1]）=====
export const electromagnetismDcCircuitsAnimations = defineAnimations({
  'anim-ohm-law': {
    title: '欧姆定律',
    knowledgeId: 'electricity-2-1',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLaw')),
    defaultParams: { U: 6, R: 3 },
    paramMeta: [
      { key: 'U', label: '电压 U', min: 0, max: 12, step: 0.5, unit: 'V' },
      { key: 'R', label: '电阻 R', min: 1, max: 10, step: 0.5, unit: 'Ω' },
    ],
  },
  'anim-circuit-analysis': {
    title: '串并联电路',
    knowledgeId: 'electricity-2-2',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysis')),
    defaultParams: { U: 12, R1: 4, R2: 2, mode: 0 },
    paramMeta: [
      { key: 'U', label: '电源电压 U', min: 1, max: 24, step: 1, unit: 'V' },
      { key: 'R1', label: '电阻 R₁', min: 1, max: 10, step: 1, unit: 'Ω' },
      { key: 'R2', label: '电阻 R₂', min: 1, max: 10, step: 1, unit: 'Ω' },
      { key: 'mode', label: '连接方式', min: 0, max: 1, step: 1, unit: '0=串联 1=并联' },
    ],
  },
  'anim-closed-circuit': {
    title: '闭合电路欧姆定律',
    knowledgeId: 'electricity-2-3',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuit')),
    defaultParams: { EMF: 6, r: 1, R: 5 },
    paramMeta: [
      { key: 'EMF', label: '电动势 EMF', min: 1, max: 12, step: 0.5, unit: 'V' },
      { key: 'r', label: '内阻 r', min: 0, max: 5, step: 0.5, unit: 'Ω' },
      { key: 'R', label: '外电阻 R', min: 0, max: 20, step: 0.5, unit: 'Ω' },
    ],
  },
})
