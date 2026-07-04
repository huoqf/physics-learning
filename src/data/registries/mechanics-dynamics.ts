import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { GRAVITY } from '@/physics/constants'

export const mechanicsDynamicsAnimations = defineAnimations({
  'anim-spring-force': {
    title: '弹力演示',
    knowledgeId: 'mechanics-3-2',
    Component: lazy(() => import('@/features/mechanics/dynamics/SpringForceAnimation')),
    // mode=0 胡克定律：简谐振动（依赖 time）→ 'timed'（完整控制栏）
    // mode=1 绳与弹簧瞬时切断：由左屏"剪断细绳"开关触发 → 'pause-only'（仅暂停/继续按钮）
    controlsMode: (params) => params.mode === 1 ? 'pause-only' : 'timed',
    defaultParams: { k: 100, m: 1, mode: 0, isCut: 0 } as const,
    maxTime: 5,
    paramMeta: [
      { key: 'k', label: '劲度系数 k', min: 10, max: 200, step: 5, unit: 'N/m', showIf: 'mode', showIfValue: 0 },
      { key: 'm', label: '质量 m', min: 1.0, max: 3.0, step: 0.1, unit: 'kg' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '胡克定律演示' },
          { value: 1, label: '绳与弹簧瞬时切断' },
        ],
      },
      {
        type: 'toggle',
        key: 'isCut',
        label: '剪断细绳',
        group: '操作交互',
        trueValue: 1,
        falseValue: 0,
        showIf: 'mode',
        showIfValue: 1,
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        content: 'F-x 物理图像的斜率代表弹簧的劲度系数 k。图线与 x 轴围成的三角形面积表示弹性势能 Ep。',
      },
      {
        type: 'tip',
        group: '受力与加速度分析',
        showIf: 'mode',
        showIfValue: 1,
        content: '【剪断瞬间受力与加速度精炼解析】\n' +
          '1. 细绳拉力可突变为 0（绳断裂）；弹簧形变无法瞬间恢复，其弹力保持不变。\n' +
          '2. 左侧悬挂：剪绳瞬时，B球仅受重力，a_B = g ↓；A球受弹簧拉力 2mg↑ 与重力 mg↓，合力为 mg↑，a_A = g ↑。\n' +
          '3. 右侧悬挂：剪绳瞬时，C球受重力 mg↓ 与弹簧拉力 mg↓，合力为 2mg↓，a_C = 2g ↓；D球受重力 mg↓ 与弹簧拉力 mg↑ 平衡，合力为 0，a_D = 0。',
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/SpringForceCenterExtra')),
  },
  'anim-gravity-basic': {
    title: '重力与重心',
    knowledgeId: 'mechanics-3-1',
    Component: lazy(() => import('@/features/mechanics/dynamics/GravityBasicAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      latitude: 45,
      omegaScale: 80,
      suspendPoint: 0,
      showWeight: 0,
      weightX: 25,
      weightY: 25,
      weightMass: 1.2,
      showLines: 1,
    } as const,
    paramMeta: [
      { key: 'latitude', label: '地理纬度 φ', min: 0, max: 90, step: 1, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'omegaScale', label: '自转向心力放大', min: 1, max: 150, step: 5, unit: '倍', showIf: 'mode', showIfValue: 0 },
      { key: 'weightMass', label: '配重相对质量 M', min: 0.2, max: 2.0, step: 0.1, unit: '倍', showIf: 'showWeight', showIfValue: 1 },
      { key: 'weightX', label: '配重位置 X', min: -55, max: 55, step: 2, unit: '', showIf: 'showWeight', showIfValue: 1 },
      { key: 'weightY', label: '配重位置 Y', min: -40, max: 40, step: 2, unit: '', showIf: 'showWeight', showIfValue: 1 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '地球自转重力分解' },
          { value: 1, label: '悬挂法重心实验' },
        ],
      },
      {
        type: 'number', key: 'latitude', label: '纬度 φ', min: 0, max: 90, step: 1, unit: '°',
        showIf: 'mode', showIfValue: 0
      },
      {
        type: 'number', key: 'omegaScale', label: '离心力放大倍数', min: 10, max: 300, step: 10, unit: '×',
        showIf: 'mode', showIfValue: 0
      },
      {
        type: 'tip', content: '真实地球自转产生的离心力仅为引力的约 0.0034，为便于观察已放大显示。',
        showIf: 'mode', showIfValue: 0
      },
      {
        type: 'toggle', key: 'showWeight', label: '启用黄铜配重',
        showIf: 'mode', showIfValue: 1
      },
      {
        type: 'toggle', key: 'showLines', label: '显示悬挂铅垂虚线',
        showIf: 'mode', showIfValue: 1
      },
      {
        type: 'segmented', key: 'suspendPoint', label: '悬挂孔选择', group: '子模式',
        showIf: 'mode', showIfValue: 1, resetOnChange: true,
        options: [{ value: 0, label: 'A1' }, { value: 1, label: 'A2' }, { value: 2, label: 'A3' }]
      },
    ],
  },
  'anim-friction': {
    title: '摩擦力演示',
    knowledgeId: 'mechanics-3-3',
    Component: lazy(() => import('@/features/mechanics/dynamics/FrictionAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      m: 5,
      mu: 0.3,
      angle: 15,
      g: GRAVITY,
      F_applied: 15,
      M: 10,
      mu_1: 0.3,
      mu_2: 0.2,
      advancedMode: 1,
    } as const,
    paramMeta: [
      { key: 'm', label: '滑块质量 m', min: 1, max: 20, step: 0.5, unit: 'kg' },
      { key: 'mu', label: '动摩擦系数 μ', min: 0, max: 1, step: 0.05, unit: '', showIf: 'mode', showIfValue: 0 },
      { key: 'F_applied', label: '外拉力 F', min: 0, max: 40, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 'M', label: '斜面质量 M', min: 2, max: 30, step: 0.5, unit: 'kg', showIf: 'mode', showIfValue: 1 },
      { key: 'angle', label: '斜面倾角 θ', min: 0, max: 80, step: 1, unit: '°', showIf: 'mode', showIfValue: 1 },
      { key: 'mu_1', label: '斜面摩擦系数 μ₁', min: 0, max: 1, step: 0.05, unit: '', showIf: 'mode', showIfValue: 1 },
      { key: 'mu_2', label: '地面摩擦系数 μ₂', min: 0, max: 1, step: 0.05, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
    sceneLayout: {
      mode: 'visibleArea',
      designWidth: 700,
      designHeight: 400,
      refMagnitudes: {
        appliedForce: 40,
        friction: 40,
        normalForce: 40,
        gravity: 40,
        force: 40,
      },
    },
    controlMeta: [
      // §1 模型选择
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '水平拉力模型' },
          { value: 1, label: '斜面倾角模型' },
        ],
      },
      // §4 显示辅助
      { type: 'storeToggle', label: '显示受力分析图', storeKey: 'toggleVectors', stateKey: 'showVectors', group: '显示辅助' },
      // §5 快捷预设
      {
        type: 'preset', label: '🌍 地球 g=9.8', group: '快捷预设',
        params: { g: 9.8 }, showIf: 'mode', showIfValue: 0
      },
      {
        type: 'preset', label: '🌙 月球 g=1.63', group: '快捷预设',
        params: { g: 1.63 }, showIf: 'mode', showIfValue: 0
      },
      {
        type: 'preset', label: '🔴 火星 g=3.72', group: '快捷预设',
        params: { g: 3.72 }, showIf: 'mode', showIfValue: 0
      },
      {
        type: 'preset', label: '🪐 木星 g=24.79', group: '快捷预设',
        params: { g: 24.79 }, showIf: 'mode', showIfValue: 0
      },
      // §6 斜面摩擦力教学提示
      {
        type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '物块静止或匀速下滑时，水平方向无加速度，地面与斜面体间无摩擦力。'
      },
      {
        type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '物块加速或减速运动时，水平方向产生加速度，地面摩擦力必定存在，方向与物块水平加速度方向相同。'
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/FrictionCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-vector-addition': {
    title: '力的合成与分解',
    knowledgeId: 'mechanics-3-4',
    Component: lazy(() => import('@/features/mechanics/dynamics/VectorAdditionAnimation')),
    controlsMode: 'param' as const,
    defaultParams: { f1: 10, f2: 8, angle: 60, mode: 0 } as const,
    paramMeta: [
      { key: 'f1', label: '力 F₁ / 待分解力', min: 1, max: 20, step: 0.5, unit: 'N' },
      { key: 'f2', label: '力 F₂', min: 1, max: 20, step: 0.5, unit: 'N' },
      { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '平行四边形' },
          { value: 1, label: '三角形' },
          { value: 2, label: '正交分解' },
        ],
      },
    ],
  },
  'anim-equilibrium': {
    title: '共点力平衡',
    knowledgeId: 'mechanics-3-5',
    Component: lazy(() => import('@/features/mechanics/dynamics/EquilibriumAnimation')),
    controlsMode: 'param' as const,
    defaultParams: { m: 2.0, theta1: 45, theta2: 45, mode: 0 } as const,
    paramMeta: [
      { key: 'm', label: '砝码质量 m', min: 0.5, max: 5.0, step: 0.1, unit: 'kg' },
      { key: 'theta1', label: '左挂绳夹角 θ₁', min: 10, max: 85, step: 1, unit: '°' },
      { key: 'theta2', label: '右挂绳夹角 θ₂', min: 10, max: 85, step: 1, unit: '°' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '基础悬挂' },
          { value: 1, label: '平行四边形' },
          { value: 2, label: '正交分解' },
          { value: 3, label: '封闭三角形' },
        ],
      },
    ],
  },
  'anim-newton-second': {
    title: '牛顿第二定律',
    knowledgeId: 'mechanics-4-2',
    Component: lazy(() => import('@/features/mechanics/dynamics/NewtonSecondAnimation')),
    defaultParams: { F: 10, m: 2, mu: 0, advancedMode: 0, modelIdx: 0, k: 2, F0: 15, omega: 1.5 } as const,
    paramMeta: [
      { key: 'F', label: '拉力 F', min: 0, max: 50, step: 1, unit: 'N', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
      { key: 'mu', label: '动摩擦系数 μ', min: 0, max: 0.5, step: 0.05, unit: '', showIf: 'modelIdx', showIfValue: 0 },
    ],
    sceneLayout: {
      mode: 'visibleArea',
      designWidth: 700,
      designHeight: 400,
    },
    controlMeta: [
      {
        type: 'segmented', key: 'advancedMode', label: '观察模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '进阶模式' }]
      },
      {
        type: 'segmented', key: 'modelIdx', label: '变力模型', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [
          { value: 0, label: '线性递增力 F=k·t' },
          { value: 1, label: '正弦周期力 F=F₀sin(ωt)' },
        ]
      },
      {
        type: 'number', key: 'k', label: '力增加斜率 k', min: 1, max: 5, step: 0.5, unit: 'N/s',
        showIf: 'modelIdx', showIfValue: 0
      },
      {
        type: 'number', key: 'F0', label: '力最大幅值 F₀', min: 5, max: 25, step: 1, unit: 'N',
        showIf: 'modelIdx', showIfValue: 1
      },
      {
        type: 'number', key: 'omega', label: '力变化频率 ω', min: 0.5, max: 3, step: 0.1, unit: 'rad/s',
        showIf: 'modelIdx', showIfValue: 1
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/NewtonSecondCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-weightlessness': {
    title: '超重与失重',
    knowledgeId: 'mechanics-4-4',
    Component: lazy(() => import('@/features/mechanics/dynamics/WeightlessnessAnimation')),
    defaultParams: { a: 2, g: GRAVITY, m: 50, advancedMode: 0, modelIdx: 0 } as const,
    paramMeta: [
      { key: 'a', label: '电梯加速度 a', min: -10, max: 10, step: 0.5, unit: 'm/s²', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm', label: '质量 m', min: 20, max: 100, step: 5, unit: 'kg' },
    ],
    controlMeta: [
      {
        type: 'segmented', key: 'advancedMode', label: '观察模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }]
      },
      {
        type: 'segmented', key: 'modelIdx', label: '电梯运行情景', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [
          { value: 0, label: '升降变速电梯 (启动-匀速-制动)' },
          { value: 1, label: '钢索突然断裂 (静止-坠落-缓冲)' },
        ]
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/WeightlessnessCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-connected-bodies': {
    title: '连接体问题',
    knowledgeId: 'mechanics-4-5',
    Component: lazy(() => import('@/features/mechanics/dynamics/ConnectedBodiesAnimation')),
    defaultParams: { m1: 2, m2: 3, F: 15, mu: 0.1, advancedMode: 0, analysisView: 0, connectionType: 0 } as const,
    paramMeta: [
      { key: 'm1', label: '质量 m₁', min: 1, max: 10, step: 0.5, unit: 'kg' },
      { key: 'm2', label: '质量 m₂', min: 1, max: 10, step: 0.5, unit: 'kg' },
      { key: 'F', label: '拉力 F', min: 0, max: 30, step: 1, unit: 'N' },
      { key: 'mu', label: '动摩擦系数 μ', min: 0, max: 0.6, step: 0.05, unit: '' },
    ],
    controlMeta: [
      {
        type: 'segmented', key: 'advancedMode', label: '观察模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }]
      },
      {
        type: 'segmented', key: 'connectionType', label: '连接传动介质', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '编制细绳' }, { value: 1, label: '轻质弹簧' }]
      },
      {
        type: 'segmented', key: 'analysisView', label: '受力分析视图', group: '显示辅助',
        options: [
          { value: 0, label: '普通受力视图' },
          { value: 1, label: '整体法分析系统' },
          { value: 2, label: '隔离法分析物体 m₁' },
          { value: 3, label: '隔离法分析物体 m₂' },
        ]
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/ConnectedBodiesCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-gravity': {
    title: '万有引力定律',
    knowledgeId: 'mechanics-6-2',
    Component: lazy(() => import('@/features/mechanics/dynamics/GravityAnimation')),
    controlsMode: 'param' as const,
    defaultParams: { m1: 1000, m2: 10, r: 5, mode: 0, preset: 0, showChart: 1 } as const,
    paramMeta: [
      { key: 'm1', label: '质量 m₁', min: 100, max: 5000, step: 100, unit: '', showIf: 'mode', showIfValue: 0 },
      { key: 'm2', label: '质量 m₂', min: 1, max: 100, step: 1, unit: '', showIf: 'mode', showIfValue: 0 },
      { key: 'r', label: '距离 r', min: 1.5, max: 18, step: 0.1, unit: '', showIf: 'mode', showIfValue: 0 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '比例验证' },
          { value: 1, label: '天体探索' },
        ],
      },
      {
        type: 'tip', content: '您可以通过左侧参数滑块调节质量与距离，也可以在画面中鼠标拖拽天体实时改变间距。',
        showIf: 'mode', showIfValue: 0
      },
      {
        type: 'tip', content: '在真实天体尺度下，系统参数已绑定真实物理数值。',
        showIf: 'mode', showIfValue: 1
      },
      { type: 'toggle', key: 'showChart', label: '显示平方反比 F-r 曲线' },
      {
        type: 'segmented', key: 'preset', label: '天体系统', group: '子模式',
        showIf: 'mode', showIfValue: 1, resetOnChange: true,
        options: [
          { value: 1, label: '地月系统' },
          { value: 2, label: '太阳-地球' },
          { value: 3, label: '同步卫星-地球' },
          { value: 4, label: '宇航员-空间站' },
        ]
      },
    ],
  },
})
