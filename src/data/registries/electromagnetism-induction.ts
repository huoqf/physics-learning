import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 电磁感应（[M4-1]）=====
export const electromagnetismInductionAnimations = defineAnimations({
  'anim-faraday-law': {
    title: '法拉第电磁感应定律',
    knowledgeId: 'electricity-4-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/FaradayLaw')),
    defaultParams: { N: 5, B: 1.2 },
    paramMeta: [
      { key: 'N', label: '线圈匝数 N', min: 1, max: 10, step: 1, unit: '匝' },
      { key: 'B', label: '磁铁强度 B', min: 0.2, max: 2.0, step: 0.1, unit: 'T' },
    ],
  },
  'anim-lenzs-law': {
    title: '楞次定律',
    knowledgeId: 'electricity-4-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/LenzsLaw')),
    defaultParams: { magnetSpeed: 2, magnetPole: 1, coilN: 10 },
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
    defaultParams: { B: 1, L: 0.5, v: 2, R: 2, theta: 90, r: 0, B_out: 0, handRule: 0 },
    paramMeta: [
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
      { key: 'L', label: '导轨宽度 L', min: 0.1, max: 2, step: 0.1, unit: 'm' },
      { key: 'v', label: '速度 v', min: -5, max: 5, step: 0.5, unit: 'm/s' },
      { key: 'R', label: '外电阻 R', min: 0.1, max: 10, step: 0.1, unit: 'Ω' },
      { key: 'theta', label: '夹角 θ', min: 0, max: 90, step: 5, unit: '°' },
      { key: 'r', label: '内阻 r', min: 0, max: 2, step: 0.1, unit: 'Ω' },
      { key: 'B_out', label: '磁场方向', min: 0, max: 1, step: 1, unit: '0=向里⊗ 1=向外⊙' },
      { key: 'handRule', label: '手指定则', min: 0, max: 2, step: 1, unit: '0=右手 1=左手 2=握拳' },
    ],
  },
})
