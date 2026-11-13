import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { GRAVITY } from '@/physics/constants'
import { getBoardTimeline } from '@/physics/blockBoard'
import { getConveyorCriticalTimes } from '@/physics/conveyor'
import { getLightWeightMutationCriticalTimes, getSpringForceCriticalTimes } from '@/physics/dynamics/spring-force'
import { alignCriticalTime } from '@/utils/criticalTime'

export const mechanicsDynamicsAnimations = defineAnimations({
  'anim-spring-force': {
    title: '弹力演示',
    knowledgeId: 'mechanics-3-2',
    Component: lazy(() => import('@/features/mechanics/dynamics/SpringForceAnimation')),
    controlsMode: 'timed',
    criticalTimes: (p) => getSpringForceCriticalTimes(p, 5),
    defaultParams: { mode: 0, k: 100, m: 1.5, kAtoms: 120, kRope: 150 } as const,
    maxTime: 5,
    paramMeta: [
      { key: 'm', label: '质量 m', min: 0.5, max: 3.0, step: 0.1, unit: 'kg' },
      { key: 'k', label: '弹簧劲度 k', min: 10, max: 200, step: 5, unit: 'N/m', showIf: 'mode', showIfValue: 0 },
      { key: 'kAtoms', label: '等效晶格刚度 k_e', min: 50, max: 300, step: 10, unit: 'N/m', showIf: 'mode', showIfValue: 1 },
      { key: 'kRope', label: '等效细绳刚度 k_e', min: 50, max: 300, step: 10, unit: 'N/m', showIf: 'mode', showIfValue: 2 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '胡克定律' },
          { value: 1, label: '桌面支持力' },
          { value: 2, label: '绳子拉力' },
        ],
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        content: 'F-x 物理图像的斜率负值代表弹簧的回复力系数 -k。图线与 x 轴围成的直角三角形面积表示弹性势能 Ep。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '地面对物体的支持力 FN 本质是弹力。当物体放置在桌面上时，桌面发生微小弹性形变，产生垂直于支撑面朝上的弹力 FN = mg。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
        content: '细绳对物体的拉力 T 本质是弹力。当重物悬挂在绳下时，细绳被拉伸形变，产生沿着绳子收缩方向的拉力 T = mg。',
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/SpringForceCenterExtra')),
  },
  'anim-light-weight-mutation': {
    title: '轻质物体突变模型',
    knowledgeId: 'mechanics-4-9',
    Component: lazy(() => import('@/features/mechanics/dynamics/LightWeightMutationAnimation')),
    controlsMode: 'timed',
    maxTime: 3,
    criticalTimes: (p) => getLightWeightMutationCriticalTimes(p, 3),
    defaultParams: { m: 1 } as const,
    paramMeta: [
      { key: 'm', label: '质量 m', min: 1.0, max: 3.0, step: 0.1, unit: 'kg' },
    ],
    controlMeta: [
      {
        // 只留判据，不给答案：四球加速度的具体数值由右屏公式体系逐条给出，
        // 左屏若先写出来，学生就不必看动画了（§2.6.5 第 C1/C2 档）。
        type: 'tip',
        group: '核心结论',
        content: '剪断瞬间：绳的拉力可突变为 0，弹簧的弹力因形变来不及恢复而不突变。',
      },
      {
        type: 'tip',
        group: '操作说明',
        content: '先看哪根绳的拉力瞬间归零，再看弹簧下挂的球为什么仍有加速度；旁侧加速度对比图同步刷新。',
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
      { key: 'omegaScale', label: '自转向心力放大倍数', min: 1, max: 150, step: 5, unit: '×', showIf: 'mode', showIfValue: 0 },
      { key: 'weightMass', label: '配重相对质量 M', min: 0.2, max: 2.0, step: 0.1, unit: '倍', showIf: 'showWeight', showIfValue: 1 },
      { key: 'weightX', label: '配重位置 X', min: -55, max: 55, step: 2, unit: '', showIf: 'showWeight', showIfValue: 1 },
      { key: 'weightY', label: '配重位置 Y', min: -40, max: 40, step: 2, unit: '', showIf: 'showWeight', showIfValue: 1 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '自转重力分解' },
          { value: 1, label: '悬挂法重心实验' },
        ],
      },
      {
        type: 'number', key: 'latitude', label: '纬度 φ', min: 0, max: 90, step: 1, unit: '°',
        showIf: 'mode', showIfValue: 0
      },
      // omegaScale 的唯一真源在 paramMeta（自转向心力放大倍数 1–150×），
      // 此处不再重复声明，避免同一参数出现两个量程不一致的滑块。
      {
        type: 'tip', content: '真实地球自转所需的向心力约为万有引力的 0.0034 倍（赤道处最大），为便于观察已放大显示。',
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
      mode: 'transform',
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
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '水平拉力模型' },
          { value: 1, label: '斜面倾角模型' },
        ],
      },
      // §4 显示辅助
      { type: 'storeToggle', label: '显示受力分析图', storeKey: 'toggleVectors', stateKey: 'showVectors', group: '显示辅助' },
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
  'anim-inclined-plane': {
    title: '斜面模型',
    knowledgeId: 'mechanics-4-6',
    Component: lazy(() => import('@/features/mechanics/dynamics/InclinedPlaneAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/InclinedPlaneCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed' as const,
    defaultParams: {
      theta: 30,
      mu: 0.3,
      m: 2.0,
      showDecomposition: 0,
      mode: 0,
    } as const,
    paramMeta: [
      { key: 'theta', label: '斜面倾角 θ', min: 0, max: 85, step: 1, unit: '°' },
      { key: 'mu', label: '动摩擦因数 μ', min: 0.0, max: 1.0, step: 0.05, unit: '' },
      { key: 'm', label: '滑块质量 m', min: 1.0, max: 5.0, step: 0.5, unit: 'kg' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '实验模式',
        resetOnChange: true,
        options: [
          { value: 0, label: '自由释放分析' },
          { value: 1, label: '寻找临界极限' },
        ],
      },
      {
        type: 'toggle',
        key: 'showDecomposition',
        label: '正交分解辅助线',
        group: '显示辅助',
      },
    ],
  },
  'anim-conveyor': {
    title: '传送带模型',
    knowledgeId: 'mechanics-4-7',
    Component: lazy(() => import('@/features/mechanics/dynamics/ConveyorAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/ConveyorChart')),
    controlsMode: 'timed' as const,
    maxTime: 12, // 观察窗口，须与 ConveyorAnimation 取景时长一致
    criticalTimes: (p) => getConveyorCriticalTimes(p, 12), // 共速/离开，见 physics/conveyor.ts
    defaultParams: { conveyorMode: 0, vBelt: 3.0, v0: 0, mu: 0.2, L: 6, x0Ratio: 0, showSyncLine: 1, showScratch: 1 } as const,
    paramMeta: [
      { key: 'vBelt', label: '传送带速度 v带', min: -5, max: 5, step: 0.5, unit: 'm/s', importance: 'core' },
      { key: 'v0', label: '物块初速度 v₀', min: -2, max: 6, step: 0.5, unit: 'm/s', importance: 'core' },
      { key: 'mu', label: '摩擦因数 μ', min: 0.1, max: 0.6, step: 0.05, unit: '' },
      { key: 'L', label: '传送带长度 L', min: 4, max: 10, step: 0.5, unit: 'm' },
    ],
    // 分组顺序即渲染顺序（ControlPanel 只把 tip 下沉、其余保持声明序），故「模型选择」必须先于「快捷预设」
    controlMeta: [
      {
        type: 'segmented',
        key: 'conveyorMode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '水平传送带' },
          { value: 1, label: '倾斜传送带' },
        ],
        /*
         * 切模型＝换场景，必须同时换上该场景跑得起来的标准初态：水平带的
         * v带=3、μ=0.2 搬到 15° 斜面，μg·cosθ < g·sinθ，物块第一帧就判离场。
         */
        onChangeSideEffect: (value: number) =>
          value === 1
            ? { setParams: { vBelt: -2.0, v0: 0.0, mu: 0.15, L: 8.0, x0Ratio: 1 } }
            : { setParams: { vBelt: 3.0, v0: 0.0, mu: 0.2, L: 6.0, x0Ratio: 0 } },
      },
      {
        // 初始位置只对倾斜带有定义（水平带恒从左端放上）。高考只考两个端点，
        // 故用两档分段：滑杆的中间值会造出「物块停在半截」这种没法算的伪场景。
        type: 'segmented',
        key: 'x0Ratio',
        label: '物块放置位置',
        group: '模型选择',
        resetOnChange: true,
        showIf: 'conveyorMode',
        showIfValue: 1,
        options: [
          { value: 1, label: '顶端（下滑）' },
          { value: 0, label: '底端（上滑）' },
        ],
      },
      {
        type: 'preset',
        label: '水平带-放上加速',
        group: '典型工况',
        params: { conveyorMode: 0, vBelt: 3.0, v0: 0.0, mu: 0.2, L: 6.0, x0Ratio: 0 },
      },
      {
        type: 'preset',
        label: '水平带-减速共速',
        group: '典型工况',
        params: { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6.0, x0Ratio: 0 },
      },
      {
        type: 'preset',
        label: '水平带-反向折返',
        group: '典型工况',
        params: { conveyorMode: 0, vBelt: -2.0, v0: 4.0, mu: 0.2, L: 6.0, x0Ratio: 0 },
      },
      /*
       * 倾斜带的 v带 **负值 = 皮带沿斜面向下运行**（x 正方向沿斜面向上）。
       * 「下滑」类题的皮带必须向下走，否则摩擦方向反了，既不会有 v-t 折点，
       * 也不可能共速；放顶端（x0Ratio=1）同样是题设：物块从静止释放下滑。
       */
      {
        type: 'preset',
        label: '倾斜带-下滑加速(折点)',
        group: '典型工况',
        params: { conveyorMode: 1, vBelt: -2.0, v0: 0.0, mu: 0.15, L: 8.0, x0Ratio: 1 },
      },
      {
        type: 'preset',
        label: '倾斜带-下滑同步',
        group: '典型工况',
        params: { conveyorMode: 1, vBelt: -2.0, v0: 0.0, mu: 0.35, L: 8.0, x0Ratio: 1 },
      },
      {
        type: 'preset',
        label: '倾斜带-上滑加速',
        group: '典型工况',
        params: { conveyorMode: 1, vBelt: 3.0, v0: 0.0, mu: 0.35, L: 8.0, x0Ratio: 0 },
      },
      { type: 'toggle', key: 'showSyncLine', label: '显示共速分段线', group: '显示辅助' },
      { type: 'toggle', key: 'showScratch', label: '显示相对划痕与生热', group: '显示辅助' },
      {
        type: 'tip',
        group: '教学提示',
        content: '摩擦力阻碍的是相对运动：先看 v物 - v带 的正负，再决定摩擦力方向；达到共速前后必须分段讨论。',
        variant: 'primary',
      },
      {
        type: 'tip',
        group: '倾斜带提示',
        showIf: 'conveyorMode',
        showIfValue: 1,
        content:
          '倾角固定 15°，tan15°≈0.27：μ<0.27 共速后仍会相对滑动（v-t 图出现折点），μ≥0.27 才能随带同步。v带 为负表示皮带向下运行。',
        variant: 'warning',
      },
    ],
  },
  'anim-vector-addition': {
    title: '力的合成与分解',
    knowledgeId: 'mechanics-3-4',
    Component: lazy(() => import('@/features/mechanics/dynamics/VectorAdditionAnimation')),
    controlsMode: 'param' as const,
    defaultParams: { f1: 10, f2: 8, angle: 60, phi: 0, mode: 0 } as const,
    paramMeta: [
      { key: 'f1', label: '力 F₁ / 待分解力', min: 1, max: 20, step: 0.5, unit: 'N' },
      { key: 'f2', label: '力 F₂', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 'f2', label: '力 F₂', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 1 },
      { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°', hideIf: 'mode', hideIfValue: 2 },
      { key: 'angle', label: '偏角 θ', min: 0, max: 360, step: 5, unit: '°', showIf: 'mode', showIfValue: 2 },
      { key: 'phi', label: 'F₁ 方向角 φ', min: -180, max: 180, step: 5, unit: '°', hideIf: 'mode', hideIfValue: 2 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '平行四边形' },
          { value: 1, label: '三角形' },
          { value: 2, label: '正交分解' },
        ],
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        content: '平行四边形定则：以 F₁ 为基准，F₂ 与 F₁ 的夹角为 θ（0°~180°）。可拖拽 F₁、F₂ 端点调整力的大小与方向。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '三角形定则：将 F₂ 平移至 F₁ 末端，合力为从起点到终点的封闭边。θ 仍为 F₁ 与 F₂ 的夹角。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
        content: '正交分解：θ 为待分解力与 x 轴正方向 of 偏角，范围 0°~360°。',
      },
    ],
  },
  'anim-orthogonal-decomposition': {
    title: '正交分解与建系优化',
    knowledgeId: 'mechanics-3-method-1',
    Component: lazy(() => import('@/features/mechanics/dynamics/OrthogonalDecompositionAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      f1: 6,
      theta1: 30,
      f2: 5,
      theta2: 120,
      f3: 4,
      theta3: 250,
      axisAngle: 0,
      theta: 30,
      m: 1.5,
      axisSelect: 0,
    } as const,
    paramMeta: [
      { key: 'f1', label: '力 F₁ 大小', min: 1, max: 8, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 'theta1', label: 'F₁ 方向角 θ₁', min: 0, max: 360, step: 5, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'f2', label: '力 F₂ 大小', min: 1, max: 8, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 'theta2', label: 'F₂ 方向角 θ₂', min: 0, max: 360, step: 5, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'f3', label: '力 F₃ 大小', min: 1, max: 8, step: 0.5, unit: 'N', showIf: 'mode', showIfValue: 0 },
      { key: 'theta3', label: 'F₃ 方向角 θ₃', min: 0, max: 360, step: 5, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'axisAngle', label: '坐标系旋转角 θ_axis', min: 0, max: 90, step: 5, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'theta', label: '斜面倾角 θ', min: 15, max: 75, step: 5, unit: '°', showIf: 'mode', showIfValue: 1 },
      { key: 'm', label: '物块质量 m', min: 0.5, max: 3.0, step: 0.1, unit: 'kg', showIf: 'mode', showIfValue: 1 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '多力合成与建系' },
          { value: 1, label: '斜面平衡建系' },
        ],
      },
      {
        type: 'segmented',
        key: 'axisSelect',
        label: '直角坐标系方案',
        group: '建系方案',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '沿斜面建系' },
          { value: 1, label: '水平竖直建系' },
        ],
      },
      {
        type: 'preset',
        group: '建系优化',
        label: '对齐 F₁',
        showIf: 'mode',
        showIfValue: 0,
        params: (current) => {
          const theta1 = current.theta1 ?? 30
          const bestAxis = Math.round(((theta1 % 90) + 90) % 90)
          return { axisAngle: bestAxis }
        },
      },
      {
        type: 'preset',
        group: '建系优化',
        label: '对齐 F₂',
        showIf: 'mode',
        showIfValue: 0,
        params: (current) => {
          const theta2 = current.theta2 ?? 120
          const bestAxis = Math.round(((theta2 % 90) + 90) % 90)
          return { axisAngle: bestAxis }
        },
      },
      {
        type: 'preset',
        group: '建系优化',
        label: '对齐 F₃',
        showIf: 'mode',
        showIfValue: 0,
        params: (current) => {
          const theta3 = current.theta3 ?? 250
          const bestAxis = Math.round(((theta3 % 90) + 90) % 90)
          return { axisAngle: bestAxis }
        },
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        content: '点击"对齐"按钮可自动旋转坐标轴，使选中的力完全落在坐标轴上，另一个轴的投影分量归 0。也可拖动箭头改变力的大小与方向，观察投影分矢量变化。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '切换不同的"直角坐标系方案"，观察各力在坐标轴上的投影分解，体验参考坐标系的建立。',
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
      mode: 'transform',
      designWidth: 700,
      designHeight: 400,
    },
    controlMeta: [
      {
        type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '进阶模式' }]
      },
      {
        type: 'segmented', key: 'modelIdx', label: '变力模型', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [
          // 只留模型名，F=k·t 与 F=F₀sin(ωt) 由右屏公式体系给出
          { value: 0, label: '线性递增力' },
          { value: 1, label: '正弦周期力' },
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
        type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }]
      },
      {
        type: 'segmented', key: 'modelIdx', label: '电梯运行情景', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [
          { value: 0, label: '升降变速电梯' },
          { value: 1, label: '钢索突然断裂' },
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
        type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }]
      },
      {
        type: 'segmented', key: 'connectionType', label: '连接传动介质', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '编制细绳' }, { value: 1, label: '轻质弹簧' }]
      },
      {
        type: 'segmented', key: 'analysisView', label: '受力分析视图', group: '显示辅助',
        options: [
          { value: 0, label: '普通受力' },
          { value: 1, label: '整体法' },
          { value: 2, label: '隔离 m₁' },
          { value: 3, label: '隔离 m₂' },
        ]
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/ConnectedBodiesCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-system-isolated': {
    title: '方法论：整体法与隔离法',
    knowledgeId: 'mechanics-4-method-1',
    Component: lazy(() => import('@/features/mechanics/dynamics/SystemIsolatedMethodologyAnimation')),
    defaultParams: { modelType: 0, analysisView: 0, activeObject: 0, m1: 2, m2: 4, F: 15, theta: 30, mu: 0.15 } as const,
    paramMeta: [
      { key: 'm1', label: '质量 m₁/m', min: 1, max: 10, step: 0.5, unit: 'kg' },
      { key: 'm2', label: '质量 m₂/斜面 M', min: 1, max: 10, step: 0.5, unit: 'kg' },
      { key: 'F', label: '推拉力 F', min: 0, max: 30, step: 1, unit: 'N' },
      { key: 'theta', label: '斜面倾角 θ', min: 15, max: 60, step: 5, unit: '°' },
      { key: 'mu', label: '动摩擦因数 μ', min: 0, max: 0.6, step: 0.05, unit: '' },
    ],
    controlMeta: [
      {
        type: 'segmented', key: 'modelType', label: '模型类型', group: '模型选择', resetOnChange: true,
        options: [
          { value: 0, label: '同加速连接体' },
          { value: 1, label: '叠放静力学' },
          { value: 2, label: '系统牛二定律' },
        ]
      },
      {
        type: 'segmented', key: 'analysisView', label: '受力分析视角', group: '分析视角',
        options: [
          { value: 0, label: '整体法分析' },
          { value: 1, label: '隔离法分析' },
        ]
      },
      {
        type: 'segmented', key: 'activeObject', label: '隔离研究对象', group: '分析视角',
        showIf: 'analysisView', showIfValue: 1,
        options: [
          { value: 0, label: '滑块 (m₁)' },
          { value: 1, label: '斜面 (M)' },
        ]
      },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/SystemIsolatedMethodologyCenterExtra')),
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
          { value: 3, label: '同步卫星' },
          { value: 4, label: '空间站' },
        ]
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 板块模型 — 滑块冲上木板的双体耦合运动
  // ═══════════════════════════════════════════════════════════════════════════
  'anim-block-board': {
    title: '板块模型',
    knowledgeId: 'mechanics-4-8',
    Component: lazy(() => import('@/features/mechanics/dynamics/BlockBoardAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/dynamics/BlockBoardChart')),
    centerLayout: 'splitV',
    controlsMode: 'timed',
    maxTime: 8,
    criticalTimes: (p) => {
      /*
       * 时刻只留一个真源：直接取物理层的阶段分界（getBoardTimeline）。
       * 这里曾经自己重写了一遍 a1/a2/tSync/tFall 的解析解，还顺手把 g 写成 9.8 ——
       * 与 physics/blockBoard.ts 是两份实现，改一处漏一处就会让标记落在动画里
       * 根本不存在的事件时刻上。
       */
      const timeline = getBoardTimeline({ m: p.m, M: p.M, mu1: p.mu1, mu2: p.mu2, v0: p.v0, L: p.L })
      // 谁先发生谁才是真正的临界事件：默认参数下 tFall≈0.6 s 远早于 tSync≈1.7 s，
      // 旧实现无条件标注「恰好滑动共速」，等于给了一个永远到不了的时刻。
      // 对齐方向随事件性质走：共速是相变点（定格要在之后），滑离是离场点（要在之前）。
      const events = [
        { time: timeline.tSync, label: '恰好滑动共速', align: 'after' as const },
        { time: timeline.tFall, label: '滑块滑离木板', align: 'before' as const },
      ]
        .filter((e) => Number.isFinite(e.time) && e.time > 0)
        .sort((a, b) => a.time - b.time)
      const first = events[0]
      if (!first) return []
      const time = alignCriticalTime(first.time, first.align)
      // 对齐后落到 0 或超出观察窗口就没有定格价值，宁可不出标记
      if (time <= 0 || time > 8 /* = maxTime */) return []
      return [{ time, label: first.label, variant: 'critical' as const, autoPause: true }]
    },
    defaultParams: {
      m: 1,
      M: 3,
      mu1: 0.3,
      mu2: 0.05,
      v0: 5,
      L: 2.5,
    } as const,
    paramMeta: [
      { key: 'm', label: '滑块质量 m', min: 1, max: 3, step: 0.5, unit: 'kg', importance: 'core' },
      { key: 'M', label: '木板质量 M', min: 2, max: 6, step: 0.5, unit: 'kg', importance: 'core' },
      {
        key: 'mu1', label: '板面摩擦因数 μ₁', min: 0.2, max: 0.5, step: 0.05,
        importance: 'core',
        marks: [{ value: 0.3, label: '推荐', variant: 'recommended' }],
      },
      { key: 'mu2', label: '地面摩擦因数 μ₂', min: 0, max: 0.2, step: 0.02, importance: 'advanced' },
      {
        key: 'v0',
        label: '初速度 v₀',
        min: 2,
        max: 8,
        step: 0.5,
        unit: 'm/s',
        importance: 'core',
        marks: [
          { value: 4.8, label: '临界: 恰滑至右端', variant: 'critical' },
          { value: 5, label: '推荐', variant: 'recommended' },
        ],
      },
    ],
    // 分组顺序即渲染顺序（ControlPanel 只把 tip 下沉、其余保持声明序），故「场景配置」必须先于「快捷预设」
    controlMeta: [
      {
        type: 'segmented',
        key: 'L',
        label: '木板长度',
        group: '场景配置',
        resetOnChange: true,
        options: [
          { value: 1.5, label: '短 (1.5m)' },
          { value: 2.5, label: '中 (2.5m)' },
          { value: 4.0, label: '长 (4.0m)' },
        ],
      },
      // 原「高考考点」tip 已删除：共速判断、解题三步、临界条件、共速后行为
      // 四条右屏 gaokaoPoints 已逐条给出（quantities/dynamics/blockBoard.ts L84-87）。
    ],
  },
})
