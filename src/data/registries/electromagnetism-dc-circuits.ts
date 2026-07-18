import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 恒定电流 =====
export const electromagnetismDcCircuitsAnimations = defineAnimations({
  'anim-ohm-law': {
    title: '部分电路欧姆定律与电表改装',
    knowledgeId: 'electricity-2-1',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLaw')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/OhmLawCenterExtra')),
    controlsMode: 'param' as const,
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '实验模式', resetOnChange: true,
        options: [{ value: 0, label: '伏安特性探究' }, { value: 1, label: '改装为电压表' }, { value: 2, label: '改装为电流表' }] },
      { type: 'segmented', key: 'meterMode', group: '元件类型', showIf: 'mode', showIfValue: 0,
        options: [{ value: 0, label: '定值电阻' }, { value: 1, label: '小灯泡' }] },
    ],
    paramMeta: [
      { key: 'U', label: '加在两端的电压 U', min: 0.1, max: 10, step: 0.1, unit: 'V' },
      { key: 'R', label: '定值阻值 R', min: 5, max: 50, step: 1, unit: 'Ω', showIf: 'mode', showIfValue: 0 },
      { key: 'Rs', label: '串联分压电阻 Rs', min: 500, max: 5000, step: 50, unit: 'Ω', showIf: 'mode', showIfValue: 1 },
      { key: 'Rp', label: '并联分流电阻 Rp', min: 0.1, max: 5.0, step: 0.1, unit: 'Ω', showIf: 'mode', showIfValue: 2 },
    ],
    defaultParams: { mode: 0, meterMode: 0, U: 2, R: 10, Rs: 1400, Rp: 0.5 } as const,
  },
  'anim-circuit-analysis': {
    title: '串并联电路及电路动态分析',
    knowledgeId: 'electricity-2-2',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysis')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra')),
    controlsMode: 'param' as const,
    centerExtraHeight: 'h-2/5',
    paramMeta: [
      { key: 'R2', label: '滑动变阻器 R₂', min: 0, max: 100, step: 1, unit: 'Ω' },
      { key: 'R1', label: '定值电阻 R₁', min: 5, max: 50, step: 1, unit: 'Ω' },
      { key: 'R3', label: '定值电阻 R₃', min: 5, max: 100, step: 1, unit: 'Ω', showIf: 'mode', showIfValue: 1 },
      { key: 'U', label: '电源电压 U', min: 3, max: 15, step: 0.5, unit: 'V' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础：串/并联分配' }, { value: 1, label: '进阶：混联动态电路' }] },
      { type: 'segmented', key: 'subMode', label: '连接方式', group: '模型选择', resetOnChange: true, showIf: 'mode', showIfValue: 0,
        options: [{ value: 0, label: '串联电路' }, { value: 1, label: '并联电路' }] },
      { type: 'toggle', key: 'showChart', label: '显示分配对比柱状图', group: '显示辅助' },
      { type: 'toggle', key: 'isSymbolic', label: '显示电学原理图 (符号模式)', group: '显示辅助' },
      { type: 'tip', group: '教学提示', content: (p: Record<string, number>) => {
        const R2 = p.R2 ?? 10
        return R2 === 0
          ? '当前变阻器为 0Ω (短路)。基础并联时电路总电阻趋于 0，干路电流极大；混联时并联部分短路，R₃无电流。'
          : R2 === 100
          ? '当前变阻器为 100Ω。观察当 R₂ 增大到极限（断路）时，各电表的读数逼近哪个固定数值。'
          : '拖动 R₂ 滑块，观察电荷粒子流速及导线亮度的此消彼长。右侧将同步显示"串反并同"的推导链条。'
      } },
    ],
    defaultParams: { U: 12, R1: 20, R2: 10, R3: 30, mode: 0, subMode: 0, showChart: 1, isSymbolic: 0 } as const,
  },
  'anim-closed-circuit': {
    title: '闭合电路欧姆定律与能量分析',
    knowledgeId: 'electricity-2-3',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuit')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ClosedCircuitCenterExtra')),
    controlsMode: 'param' as const,
    paramMeta: [
      { key: 'EMF', label: '电源电动势 E', min: 1, max: 12, step: 0.5, unit: 'V', importance: 'core' },
      { key: 'R', label: '滑动变阻器 R', min: 0.1, max: 20, step: 0.1, unit: 'Ω', importance: 'core' },
      { key: 'r', label: '电源内阻 r', min: 0.5, max: 5, step: 0.1, unit: 'Ω', importance: 'advanced' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '看板图像模式', resetOnChange: true,
        options: [{ value: 0, label: 'U - I 关系图线' }, { value: 1, label: '输出功率与效率' }, { value: 2, label: '全电路电势分布' }] },
      { type: 'toggle', key: 'highlightLoss', label: '内阻热耗视觉高亮', group: '显示辅助' },
    ],
    defaultParams: { EMF: 6, r: 2, R: 10, mode: 1, highlightLoss: 0 } as const,
  },
  'anim-multimeter-ohm': {
    title: '多用电表与欧姆表原理',
    knowledgeId: 'electricity-2-4',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/Multimeter')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/MultimeterCenterExtra')),
    controlsMode: 'param' as const,
    controlMeta: [
      { type: 'segmented', key: 'opMode', group: '欧姆表状态', resetOnChange: true,
        options: [{ value: 0, label: '表笔短接 (欧姆调零)' }, { value: 1, label: '接入测量 (阻值测量)' }] },
      { type: 'segmented', key: 'multiplier', group: '挡位选择', resetOnChange: true,
        options: [{ value: 1, label: '×1 挡' }, { value: 10, label: '×10 挡' }, { value: 100, label: '×100 挡' }] },
      { type: 'preset', label: '一键调零', group: '操作',
        params: (p) => ({ R_adjust: Math.round(1399 / (p.multiplier ?? 1)) }),
        showIf: 'opMode', showIfValue: 0, resetOnApply: true },
      { type: 'tip', group: '教学提示',
        showIf: 'opMode', showIfValue: 1,
        content: (p) => {
          const m = p.multiplier ?? 1
          if (m === 1) return ''
          return `当前为 ×${m} 挡，若指针未归零，请先切换到"表笔短接"模式调零。`
        } },
    ],
    buildParamMeta: (params) => {
      const multiplier = Math.round(params.multiplier ?? 1)
      const rxMax = 5000 * multiplier
      const rxStep = multiplier >= 100 ? 1000 : multiplier >= 10 ? 100 : 10
      return [
        { key: 'R_adjust', label: '调零电阻 R_Ω', min: 0, max: 2000, step: 1, unit: 'Ω' },
        { key: 'Rx', label: '待测外接电阻 Rx', min: 0, max: rxMax, step: rxStep, unit: 'Ω', showIf: 'opMode', showIfValue: 1 },
      ]
    },
    defaultParams: { opMode: 0, multiplier: 1, R_adjust: 1399, Rx: 1500 } as const,
  },
  'anim-experiment-er': {
    title: '高考实验：测定电源电动势与内阻',
    knowledgeId: 'electricity-2-5',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/ExperimentEr')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/ExperimentErCenterExtra')),
    controlsMode: 'param' as const,
    controlMeta: [
      { type: 'segmented', key: 'wiring', group: '电路接线方式', resetOnChange: true,
        options: [{ value: 0, label: '电路甲：电流表外接法' }, { value: 1, label: '电路乙：电流表内接法' }] },
      { type: 'toggle', key: 'showReal', label: '显示真实 U-I 图线', group: '显示辅助' },
    ],
    paramMeta: [
      { key: 'R_slider', label: '滑动变阻器阻值 R', min: 1, max: 50, step: 0.5, unit: 'Ω' },
    ],
    defaultParams: { wiring: 0, showReal: 0, R_slider: 10 } as const,
  },
  'anim-motor-circuit': {
    title: '非纯电阻电路与电动机',
    knowledgeId: 'electricity-2-6',
    Component: lazy(() => import('@/features/electromagnetism/dc-circuits/NonPureCircuit')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/dc-circuits/NonPureCircuitCenterExtra')),
    controlsMode: 'loop' as const,
    controlMeta: [
      { type: 'segmented', key: 'motorState', group: '电动机状态', resetOnChange: true,
        options: [{ value: 1, label: '正常旋转' }, { value: 0, label: '卡死堵转' }] },
    ],
    paramMeta: [
      { key: 'U', label: '电源电压 U', min: 2, max: 12, step: 0.2, unit: 'V' },
      { key: 'mass', label: '重物质量 m', min: 0.1, max: 1.0, step: 0.05, unit: 'kg', showIf: 'motorState', showIfValue: 1 },
    ],
    defaultParams: { motorState: 1, U: 10, mass: 0.5 } as const,
  },
})

