import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 交变电流（[M4-1]）=====
export const electromagnetismAcAnimations = defineAnimations({
  'anim-ac-generation': {
    title: '交变电流产生与图像',
    knowledgeId: 'electricity-5-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/ACGeneration')),
    defaultParams: {
      mode: 0,
      B: 0.5, S: 0.04, omega: 2, N: 100, initialPhase: 0,
      showVelocityDecomp: 0, showCoilNormal: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented', key: 'mode', label: '实验模式', group: '模型选择', resetOnChange: true,
        options: [
          { value: 0, label: '基础：正弦发生' },
          { value: 1, label: '进阶：任意初相' },
        ],
        onChangeSideEffect: {
          resetParams: ['initialPhase', 'N'],
        },
      },
      {
        type: 'toggle', key: 'showVelocityDecomp', label: '速度分解矢量', group: '显示辅助',
      },
      {
        type: 'toggle', key: 'showCoilNormal', label: '线圈法线轴', group: '显示辅助',
      },
      {
        type: 'tip', group: '教学提示', variant: 'info', showIf: 'mode', showIfValue: 0,
        content: '线圈在匀强磁场中匀速旋转，磁通量 Φ = BS·cos(ωt)，感应电动势 e = NBSω·sin(ωt)。',
      },
      {
        type: 'tip', group: '教学提示', variant: 'info', showIf: 'mode', showIfValue: 1,
        content: '调节初始倾角 θ₀ 改变起始位置：θ₀=0° 为中性面起始（e=0），θ₀=90° 为最大电动势面起始。',
      },
    ],
    paramMeta: [
      { key: 'B', label: '磁感应强度 B', min: 0.1, max: 2.0, step: 0.1, unit: 'T' },
      { key: 'omega', label: '角速度 ω', min: 0.5, max: 10, step: 0.5, unit: 'rad/s' },
      { key: 'initialPhase', label: '初始倾角 θ₀', min: 0, max: 360, step: 15, unit: '°', showIf: 'mode', showIfValue: 1, description: 'θ₀=0° 为中性面起始，θ₀=90° 为最大电动势面起始' },
      { key: 'N', label: '线圈匝数 N', min: 10, max: 500, step: 10, unit: '匝', showIf: 'mode', showIfValue: 1, description: '匝数影响峰值 Em=NBSω，不影响磁通量 Φ' },
    ],
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
    controlMeta: [
      { type: 'segmented', key: 'mode', label: '实验模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础：变压变流' }, { value: 1, label: '进阶：负载因果链' }] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '调节 U₁、n₁、n₂，观察四只电表读数与变压变流规律 U₂/U₁ = n₂/n₁。' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1, variant: 'warning',
        content: '拖动负载电阻 R，观察副边电流 I₂ → 输出功率 P_out → 输入功率 P_in → 原边电流 I₁ 的多米诺因果链。' },
    ],
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
