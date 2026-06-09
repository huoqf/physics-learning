import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 磁场（[M4-1]）=====
export const electromagnetismMagnetismAnimations = defineAnimations({
  'anim-ampere-force': {
    title: '安培力 F=BIL',
    knowledgeId: 'electricity-3-1',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/AmpereForce')),
    defaultParams: { B: 1, I: 2, L: 5, angle: 90 },
    paramMeta: [
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
      { key: 'I', label: '电流 I', min: 0.1, max: 10, step: 0.1, unit: 'A' },
      { key: 'L', label: '导线长度 L', min: 0.5, max: 10, step: 0.5, unit: 'm' },
      { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
    ],
  },
  'anim-lorentz-force': {
    title: '洛伦兹力 F=qvB',
    knowledgeId: 'electricity-3-2',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/LorentzForce')),
    defaultParams: { q: 1, v: 10, B: 1, angle: 90 },
    paramMeta: [
      { key: 'q', label: '电荷量 q', min: -5, max: 5, step: 0.1, unit: 'C' },
      { key: 'v', label: '速度 v', min: 1, max: 50, step: 1, unit: 'm/s' },
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
      { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
    ],
  },
  'anim-charge-in-bfield': {
    title: '带电粒子在磁场中运动',
    knowledgeId: 'electricity-3-3',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/ChargeInBField')),
    defaultParams: { q: 1, m: 1, v: 10, B: 1 },
    paramMeta: [
      { key: 'q', label: '电荷量 q', min: 0.1, max: 5, step: 0.1, unit: 'C' },
      { key: 'm', label: '质量 m', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
      { key: 'v', label: '速度 v', min: 1, max: 50, step: 1, unit: 'm/s' },
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
    ],
  },
})
