import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const mechanicsCircularGravitationAnimations = defineAnimations({
  'anim-circular-motion': {
    title: '匀速圆周运动',
    knowledgeId: 'mechanics-5-4',
    Component: lazy(() => import('@/features/mechanics/circular/CircularMotionAnimation')),
    controlsMode: 'timed',
    defaultParams: { r: 5, omega: 1, t: 0, advancedMode: 0, showProjection: 1, showWaveform: 1 } as const,
    paramMeta: [
      { key: 'r', label: '半径 r', min: 5, max: 10, step: 0.1, unit: 'm' },
      { key: 'omega', label: '角速度 ω', min: 0.1, max: 5, step: 0.1, unit: 'rad/s' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }] },
      { type: 'toggle', key: 'showProjection', label: '简谐运动投影对比', group: '显示辅助',
        showIf: 'advancedMode', showIfValue: 1 },
      { type: 'toggle', key: 'showWaveform', label: '显示联动波形图', group: '显示辅助',
        showIf: 'advancedMode', showIfValue: 1 },
    ],
  },
  'anim-centripetal': {
    title: '向心加速度与向心力',
    knowledgeId: 'mechanics-5-5',
    Component: lazy(() => import('@/features/mechanics/circular/CentripetalAnimation')),
    // 基础匀速圆周：loop（持续旋转）；进阶竖直圆：timed（可暂停做受力分析）
    controlsMode: (params) => params.advancedMode === 1 ? 'timed' : 'loop',
    defaultParams: { r: 3, v: 3, v0: 5, m: 1, advancedMode: 0, showWaveform: 1, trackType: 0, showAcceleration: 1 } as const,
    paramMeta: [
      { key: 'r', label: '半径 r', min: 3, max: 5, step: 0.1, unit: 'm' },
      { key: 'v', label: '线速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s', hideIf: 'advancedMode', hideIfValue: 1 },
      { key: 'v0', label: '最低点初速度 v₀', min: 1, max: 15, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式 (匀速)' }, { value: 1, label: '进阶模式 (竖直圆)' }] },
      { type: 'toggle', key: 'showAcceleration', label: '显示加速度矢量', group: '显示辅助' },
      { type: 'toggle', key: 'showWaveform', label: '显示 F-a 联动图表', group: '显示辅助',
        hideIf: 'advancedMode', hideIfValue: 1 },
      { type: 'segmented', key: 'trackType', label: '轨道物理模型', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [{ value: 0, label: '单面轨 (绳模型)' }, { value: 1, label: '双面轨 (杆模型)' }] },
    ],
  },
  'anim-circular-models': {
    title: '圆盘与圆锥摆模型',
    knowledgeId: 'mechanics-5-7',
    Component: lazy(() => import('@/features/mechanics/circular/CircularModelsAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/circular/CircularModelsChart')),
    centerLayout: 'splitH',
    controlsMode: 'timed',
    defaultParams: { modelMode: 0, omega: 3.0, L: 1.0, r: 0.8, mu: 0.4 } as const,
    paramMeta: [
      { key: 'omega', label: '角速度 ω', min: 0.5, max: 8.0, step: 0.1, unit: 'rad/s', importance: 'core' },
      { key: 'L', label: '绳长 L', min: 0.5, max: 2.0, step: 0.1, unit: 'm', showIf: 'modelMode', showIfValue: 0 },
      { key: 'r', label: '半径 r', min: 0.2, max: 2.0, step: 0.1, unit: 'm', showIf: 'modelMode', showIfValue: 1 },
      { key: 'mu', label: '最大静摩擦系数 μ', min: 0.1, max: 1.0, step: 0.05, unit: '', showIf: 'modelMode', showIfValue: 1 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'modelMode',
        label: '经典模型',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '圆锥摆' },
          { value: 1, label: '水平圆盘' },
        ],
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '受力分析时不要额外画“向心力”。水平方向的合外力提供向心力：圆锥摆看拉力水平分量，圆盘看静摩擦力。',
        variant: 'primary',
      },
    ],
  },
  'anim-kepler': {
    title: '开普勒定律',
    knowledgeId: 'mechanics-6-1',
    Component: lazy(() => import('@/features/mechanics/gravitation/KeplerAnimation')),
    controlsMode: 'timed',
    defaultParams: { a: 4.5, b: 3.0, period: 10, mode: 0, a2: 7.5, b2: 6.0 } as const,
    paramMeta: [
      { key: 'a', label: '内轨半长轴 a₁', min: 2.5, max: 5.5, step: 0.1, unit: '' },
      { key: 'b', label: '内轨半短轴 b₁', min: 1.5, max: 4.5, step: 0.1, unit: '' },
      { key: 'period', label: '内轨周期 T₁', min: 5, max: 20, step: 0.5, unit: 's' },
      { key: 'a2', label: '外轨半长轴 a₂', min: 6.0, max: 10.0, step: 0.1, unit: '', showIf: 'mode', showIfValue: 2 },
      { key: 'b2', label: '外轨半短轴 b₂', min: 4.5, max: 9.0, step: 0.1, unit: '', showIf: 'mode', showIfValue: 2 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '定律模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '第一定律' },
          { value: 1, label: '第二定律' },
          { value: 2, label: '第三定律' },
        ],
      },
    ],
  },
  'anim-satellite': {
    title: '人造卫星宇宙速度与入轨演示',
    knowledgeId: 'mechanics-6-3',
    Component: lazy(() => import('@/features/mechanics/gravitation/SatelliteAnimation')),
    controlsMode: 'timed',
    defaultParams: { r: 7.0, mode: 0, v0: 7.9, isLaunched: 0, showChart: 1, showCompare: 1 } as const,
    paramMeta: [
      { key: 'r', label: '轨道半径 r', min: 6.37, max: 22.0, step: 0.1, unit: '×10⁶ m', showIf: 'mode', showIfValue: 0 },
      { key: 'v0', label: '发射速度 v₀', min: 5.0, max: 12.5, step: 0.1, unit: 'km/s', showIf: 'mode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '多圆轨道对比' }, { value: 1, label: '宇宙速度发射' }] },
      { type: 'toggle', key: 'showCompare', label: '同屏显示对比轨道', group: '显示辅助',
        showIf: 'mode', showIfValue: 0 },
      { type: 'toggle', key: 'showChart', label: '显示画中画曲线', group: '显示辅助' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '同屏显示包含近地轨道、中轨道 (GPS) 和同步轨道。可以通过调节左侧轨道半径 r 或直接在右上角画中画拖拽来进行距离调节。' },
      { type: 'segmented', key: 'v0', label: '发射速度',
        options: [
          { value: 7.9, label: '7.9' },
          { value: 10.0, label: '10.0' },
          { value: 11.2, label: '11.2' },
        ],
        showIf: 'mode', showIfValue: 1 },
      { type: 'action', label: '发射', variant: 'primary', action: 'restart', setParams: { isLaunched: 1 },
        showIf: 'mode', showIfValue: 1 },
      { type: 'action', label: '重置', variant: 'secondary', action: 'reset', setParams: { isLaunched: 0 },
        showIf: 'mode', showIfValue: 1 },
      { type: 'tip', showIf: 'mode', showIfValue: 1,
        content: '7.9=第一宇宙速度(近圆), 10.0=椭圆轨道, 11.2=第二宇宙速度(逃逸)。发射三阶段：垂直起飞→重力转弯→在轨运行。' },
    ],
  },
  'anim-binary-stars': {
    title: '双星与多星系统',
    knowledgeId: 'mechanics-6-4',
    Component: lazy(() => import('@/features/mechanics/gravitation/BinaryStarsAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/gravitation/BinaryStarsCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed',
    defaultParams: { L: 8.0, massRatio: 1.0, mode: 0 } as const,
    paramMeta: [
      { key: 'L', label: '天体总距离 L', min: 4.0, max: 10.0, step: 0.1, unit: 'm', resetOnChange: true },
      { key: 'massRatio', label: '质量比 m₁:m₂', min: 0.2, max: 5.0, step: 0.1, unit: '', showIf: 'mode', showIfValue: 0 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '天体系统模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '双星系统' },
          { value: 1, label: '三星系统 (等边三角形)' },
        ],
      },
      { type: 'storeToggle', label: '显示受力与速度矢量', storeKey: 'toggleVectors', stateKey: 'showVectors', group: '显示辅助' },
      {
        type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '【双星系统易错点】\n1. 万有引力公式中的距离是双星间距 L，而向心力公式中的半径是各自的轨道半径 r₁ 或 r₂，二者绝不能混淆。\n2. 双星做匀速圆周运动的角速度 ω 和周期 T 绝对相等。\n3. 轨道半径、线速度、向心加速度均与质量成反比：质量大的星轨道半径小、速度慢。'
      },
      {
        type: 'tip', group: '图表解读', showIf: 'mode', showIfValue: 0,
        content: '【投影规律与相位分析】\n1. 反相位置：两星位移波形相位恒定相反（相差 180°），反映连线恒过质心。\n2. 振幅成反比：位置与速度正弦投影的振幅，均实时与天体质量成反比。\n3. 简谐相位差：位置（余弦）与速度（正弦）有 90° 相位差。位移最大时速度为零，过质心时速度最大。'
      },
      {
        type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '【三星系统要点】\n1. 三颗等质量星体位于等边三角形顶点，绕质心做匀速圆周运动。\n2. 每颗星受另外两颗星的引力，其合力指向正三角形中心（质心）。\n3. 三颗星的角速度 ω、周期 T 和轨道半径 r 完全相等。'
      },
      {
        type: 'tip', group: '图表解读', showIf: 'mode', showIfValue: 1,
        content: '【三星运动与投影规律】\n1. 三相正弦波：三颗天体在 X 轴的位移与速度投影，相位互差 120°，构成稳定的对称运转。\n2. 对称等幅值：由于轨道半径和线速度大小完全恒等，三条波形曲线的幅值完全一致。\n3. 速度极值对齐：当天体经过 X 轴端点（位移极值）时，其 X 方向瞬时速度刚好过零，遵循简谐投影法则。'
      },
    ],
  },
})

