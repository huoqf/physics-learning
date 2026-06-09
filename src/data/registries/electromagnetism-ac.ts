import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 交变电流（[M4-1]）=====
export const electromagnetismAcAnimations = defineAnimations({
  'anim-ac-generation': {
    title: '交变电流产生与图像',
    knowledgeId: 'electricity-5-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/ACGeneration')),
    defaultParams: { B: 0.5, S: 0.04, omega: 2, N: 100, initialPhase: 0 },
    paramMeta: [
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 2, step: 0.1, unit: 'T' },
      { key: 'S', label: '线圈面积 S', min: 0.01, max: 0.1, step: 0.01, unit: 'm²' },
      { key: 'omega', label: '角速度 ω', min: 0.5, max: 10, step: 0.5, unit: 'rad/s' },
      { key: 'N', label: '匝数 N', min: 1, max: 500, step: 10, unit: '匝' },
      { key: 'initialPhase', label: '初始位置', min: 0, max: 1, step: 1, unit: '0=中性面 1=最大值面' },
    ],
  },
  'anim-ac-values': {
    title: '有效值与峰值关系',
    knowledgeId: 'electricity-5-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/ACValues')),
    defaultParams: { V_peak: 311, R: 100, f: 2, U_dc: 220, isTesting: 0 },
    paramMeta: [
      { key: 'V_peak', label: '峰值电压 Vm', min: 50, max: 500, step: 10, unit: 'V' },
      { key: 'f', label: '频率 f', min: 0.5, max: 20, step: 0.5, unit: 'Hz' },
      { key: 'U_dc', label: '直流电压 Udc', min: 0, max: 350, step: 1, unit: 'V' },
      { key: 'R', label: '负载电阻 R', min: 10, max: 500, step: 10, unit: 'Ω' },
    ],
  },
  'anim-transformer': {
    title: '变压器原理',
    knowledgeId: 'electricity-5-3',
    Component: lazy(() => import('@/features/electromagnetism/induction/Transformer')),
    defaultParams: { n1: 100, n2: 200, U1: 220, R: 50 },
    paramMeta: [
      { key: 'n1', label: '原线圈匝数 n₁', min: 10, max: 500, step: 10, unit: '匝' },
      { key: 'n2', label: '副线圈匝数 n₂', min: 10, max: 500, step: 10, unit: '匝' },
      { key: 'U1', label: '输入电压 U₁', min: 10, max: 500, step: 10, unit: 'V' },
      { key: 'R', label: '负载电阻 R', min: 5, max: 200, step: 5, unit: 'Ω' },
    ],
  },
  'anim-power-transmission': {
    title: '远距离输电',
    knowledgeId: 'electricity-5-4',
    Component: lazy(() => import('@/features/electromagnetism/induction/PowerTransmission')),
    defaultParams: { P_send: 100000, U_trans: 10000, R_line: 10 },
    paramMeta: [
      { key: 'P_send', label: '输送功率 P', min: 10000, max: 500000, step: 10000, unit: 'W' },
      { key: 'U_trans', label: '输电电压 U', min: 1000, max: 50000, step: 1000, unit: 'V' },
      { key: 'R_line', label: '输电线电阻 R', min: 1, max: 50, step: 1, unit: 'Ω' },
    ],
  },
})
