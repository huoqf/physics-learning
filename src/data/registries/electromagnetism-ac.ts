import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 交变电流（[M4-1]）=====
export const electromagnetismAcAnimations = defineAnimations({
  'anim-ac-generation': {
    title: '交变电流产生与图像',
    knowledgeId: 'electricity-5-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/ACGeneration')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/ACGenerationSidebarExtra')),
    defaultParams: {
      mode: 0,
      B: 0.5, S: 0.04, omega: 2, N: 100, initialPhase: 0,
      showVelocityDecomp: 0, showCoilNormal: 0,
    } as const,
    paramMeta: [],
  },
  'anim-ac-values': {
    title: '有效值与峰值关系',
    knowledgeId: 'electricity-5-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/ACValues')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/ACValuesSidebarExtra')),
    defaultParams: {
      mode: 0,
      waveform: 0,
      Im: 5,
      R: 10,
      Idc: 3,
      duty: 0.5,
    } as const,
    paramMeta: [],
  },
  'anim-transformer': {
    title: '变压器原理',
    knowledgeId: 'electricity-5-3',
    Component: lazy(() => import('@/features/electromagnetism/induction/Transformer')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/TransformerSidebarExtra')),
    defaultParams: { mode: 0, n1: 100, n2: 200, U1: 220, R: 50 } as const,
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
    SidebarExtra: lazy(() => import('@/features/electromagnetism/induction/PowerTransmissionSidebarExtra')),
    defaultParams: {
      mode: 0,              // 0=基础: 高压输电优越性, 1=进阶: 动态负载与稳压
      scenario: 0,          // 0=跨省大电网, 1=近郊小供电
      P1: 100,              // kW 发电功率
      U2: 11,               // kV 输电电压（配平：U4≈220V）
      r: 10,                // Ω 线路总电阻
      k: 0.02,              // 降压变压器变比 k = n4/n3（U4=220V 配平）
      N: 10,                // 用户并联户数（进阶模式）
      showIdeal: 0,         // 0/1 显示理想无损耗对比
      peakLoad: 0,          // 0/1 一键触发傍晚用电高峰
    } as const,
    paramMeta: [
      // 基础模式只显示 U2（核心变量）
      { key: 'U2', label: '输电电压 U₂', min: 2, max: 50, step: 1, unit: 'kV' },
      // 场景预设模式下显示 P1 和 r（近郊小供电）
      { key: 'P1', label: '发电功率 P₁', min: 100, max: 500, step: 50, unit: 'kW', showIf: 'scenario', showIfValue: 1 },
      { key: 'r', label: '线路电阻 r', min: 2, max: 50, step: 2, unit: 'Ω', showIf: 'scenario', showIfValue: 1 },
      // 进阶模式参数
      { key: 'N', label: '用户户数 N', min: 10, max: 1000, step: 10, unit: '户', showIf: 'mode', showIfValue: 1 },
      { key: 'k', label: '降压变比 k=n₄/n₃', min: 0.01, max: 0.1, step: 0.005, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
  },
})
