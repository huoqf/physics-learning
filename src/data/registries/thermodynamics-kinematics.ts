import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 热学 · 第1章 分子动理论 =====
export const thermodynamicsKinematicsAnimations = defineAnimations({
  // 1. 分子热运动与布朗运动
  'anim-brownian-motion': {
    title: '分子热运动与布朗运动',
    knowledgeId: 'thermodynamics-1-1',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotion')),
    controlsMode: 'loop',
    centerLayout: 'splitH',
    defaultParams: {
      mode: 1,
      temperature: 300,
      particleD: 5,
      showTrajectory: 1,
      showMolecules: 1,
    } as const,
    paramMeta: [
      { key: 'temperature', label: '系统温度 T', min: 273, max: 373, step: 1, unit: 'K' },
      { key: 'particleD', label: '微粒直径 d', min: 1, max: 10, step: 0.5, unit: 'μm' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '宏观追踪：花粉折线' },
          { value: 1, label: '微观机制：分子撞击与合力' },
        ],
      },
      { type: 'toggle', key: 'showTrajectory', label: '显示微粒轨迹追踪', group: '显示辅助' },
      {
        type: 'toggle',
        key: 'showMolecules',
        label: '显示微观碰撞分子',
        group: '显示辅助',
        showIf: 'mode',
        showIfValue: 1,
      },
      {
        type: 'preset',
        label: '常温大微粒（较平稳）',
        group: '高考典型情境',
        params: { temperature: 293, particleD: 8 },
      },
      {
        type: 'preset',
        label: '高温微小颗粒（极剧烈）',
        group: '高考典型情境',
        params: { temperature: 360, particleD: 1.5 },
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '微粒越小、温度越高，各方向受分子撞击的不平衡性越显著，布朗运动越剧烈。',
      },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionCenterExtra')),
  },

  // 2. 阿伏伽德罗常数与微观估算
  'anim-micro-quantities': {
    title: '阿伏伽德罗常数与微观估算',
    knowledgeId: 'thermodynamics-1-2',
    Component: lazy(() => import('@/features/thermodynamics/microQuantities')),
    controlsMode: 'param',
    defaultParams: {
      substanceIdx: 0,
      inputMode: 0,
      inputValue: 18,
    } as const,
    paramMeta: [
      { key: 'inputValue', label: '样本输入量', min: 0.05, max: 100, step: 0.05, unit: 'g (体积模式下为 cm³)' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'substanceIdx',
        label: '物质种类',
        group: '物质参数',
        options: [
          { value: 0, label: '水 H₂O' },
          { value: 1, label: '金 Au' },
          { value: 2, label: '铁 Fe' },
          { value: 3, label: '铜 Cu' },
          { value: 4, label: '氧气 O₂' },
        ],
      },
      {
        type: 'segmented',
        key: 'inputMode',
        label: '量纲模式',
        group: '测量维度',
        options: [
          { value: 0, label: '宏观质量模式 (g)' },
          { value: 1, label: '宏观体积模式 (cm³)' },
        ],
      },
      {
        type: 'preset',
        label: '1 滴水 (约 0.05g)',
        group: '微观估算预设',
        params: { substanceIdx: 0, inputMode: 0, inputValue: 0.05 },
      },
      {
        type: 'preset',
        label: '1 mol 纯铁 (56g)',
        group: '微观估算预设',
        params: { substanceIdx: 2, inputMode: 0, inputValue: 56 },
      },
      {
        type: 'preset',
        label: '标况气体 22.4L (约32g O₂)',
        group: '微观估算预设',
        params: { substanceIdx: 4, inputMode: 0, inputValue: 32 },
      },
      {
        type: 'tip',
        group: '教学要点',
        content: '固体/液体用球体模型估算分子直径；气体分子间隙极大，计算得到的是分子平均间距。',
      },
    ],
  },

  // 3. 分子间作用力与分子势能
  'anim-intermolecular-forces': {
    title: '分子间作用力与分子势能',
    knowledgeId: 'thermodynamics-1-3',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesAnimation')),
    controlsMode: 'param',
    defaultParams: {
      r: 2.0,
    } as const,
    paramMeta: [
      { key: 'r', label: '分子间距 r', min: 0.5, max: 4.0, step: 0.01, unit: 'r₀' },
    ],
    controlMeta: [
      {
        type: 'preset',
        label: '平衡位置 r = r₀ (F合=0, Ep极小)',
        group: '特征间距预设',
        params: { r: 1.0 },
      },
      {
        type: 'preset',
        label: '斥力区间 r = 0.7 r₀ (F斥强, Ep陡增)',
        group: '特征间距预设',
        params: { r: 0.7 },
      },
      {
        type: 'preset',
        label: '引力极值 r ≈ 1.11 r₀ (Ep反弯拐点)',
        group: '特征间距预设',
        params: { r: 1.11 },
      },
      {
        type: 'preset',
        label: '远距离 r = 3.0 r₀ (相互作用弱, Ep→0)',
        group: '特征间距预设',
        params: { r: 3.0 },
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '拖拽分子或滑动滑块，上下两图实时同步指示分子力与势能对应的物理状态。',
      },
    ],
  },

  // 4. 气体分子运动的统计规律
  'anim-maxwell-distribution': {
    title: '气体分子运动的统计规律',
    knowledgeId: 'thermodynamics-1-4',
    Component: lazy(() => import('@/features/thermodynamics/maxwellDistribution')),
    controlsMode: 'loop',
    defaultParams: {
      temperature1: 300,
      temperature2: 600,
      showCompare: 1,
    } as const,
    paramMeta: [
      { key: 'temperature1', label: '研究温度 T₁', min: 100, max: 1000, step: 20, unit: 'K' },
      { key: 'temperature2', label: '对比温度 T₂', min: 100, max: 1000, step: 20, unit: 'K' },
    ],
    controlMeta: [
      { type: 'toggle', key: 'showCompare', label: '显示 T₂ 对比曲线', group: '显示辅助' },
      {
        type: 'preset',
        label: '常温与高温对照 (300K vs 600K)',
        group: '典型对比',
        params: { temperature1: 300, temperature2: 600, showCompare: 1 },
      },
      {
        type: 'preset',
        label: '低温与极温对照 (150K vs 800K)',
        group: '典型对比',
        params: { temperature1: 150, temperature2: 800, showCompare: 1 },
      },
      {
        type: 'tip',
        group: '高考规律',
        content: '“中间多、两头少”；温度升高时，峰值右移、峰高降低、曲线展宽平坦，总面积严格恒为 1。',
      },
    ],
  },

  // 5. 学生实验：用油膜法估测油酸分子的大小
  'anim-oil-film-experiment': {
    title: '学生实验：用油膜法估测油酸分子的大小',
    knowledgeId: 'thermodynamics-1-5',
    Component: lazy(() => import('@/features/thermodynamics/oilFilmExperiment')),
    controlsMode: 'param',
    defaultParams: {
      step: 3,
      ratio: 500,
      dropsPerMl: 80,
      powderDensity: 0,
    } as const,
    paramMeta: [
      { key: 'ratio', label: '溶液稀释比 1:N', min: 200, max: 1000, step: 50, unit: '' },
      { key: 'dropsPerMl', label: '1 mL 滴数', min: 40, max: 120, step: 5, unit: '滴' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'step',
        label: '实验步骤流程',
        group: '实验阶段',
        options: [
          { value: 0, label: '步骤1: 溶液配制' },
          { value: 1, label: '步骤2: 滴管滴液' },
          { value: 2, label: '步骤3: 油膜铺展' },
          { value: 3, label: '步骤4: 方格描摹计算' },
        ],
      },
      {
        type: 'segmented',
        key: 'powderDensity',
        label: '痱子粉厚度（误差变量）',
        group: '操作细节与误差',
        options: [
          { value: 0, label: '正常均匀' },
          { value: 1, label: '偏厚 (阻碍扩散, d偏大)' },
          { value: 2, label: '偏薄 (利于充分展开)' },
        ],
      },
      {
        type: 'preset',
        label: '人教版教材标准配比 (1:500, 80滴/mL)',
        group: '高考标准操作',
        params: { step: 3, ratio: 500, dropsPerMl: 80, powderDensity: 0 },
      },
      {
        type: 'preset',
        label: '高浓度配比 (1:200, 50滴/mL)',
        group: '高考标准操作',
        params: { step: 3, ratio: 200, dropsPerMl: 50, powderDensity: 0 },
      },
      {
        type: 'tip',
        group: '数格规则',
        content: '凡是超过半格的算一格，不足半格的舍去；油酸单分子层厚度通常约为 10⁻⁹ m (约 1 nm / 十几埃)，球形小分子(如水)则约为几埃(10⁻¹⁰ m)。',
      },
    ],
  },
})
