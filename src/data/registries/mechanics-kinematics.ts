import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { GRAVITY } from '@/physics/constants'

export const mechanicsKinematicsAnimations = defineAnimations({
  'anim-velocity': {
    title: '速度演示',
    knowledgeId: 'mechanics-1-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/VelocityAnimation')),
    controlsMode: 'timed',
    defaultParams: {
      v: 8, t: 0, scene: 0, deltaT: 2, totalDuration: 10, advancedMode: 0,
      modelIdx: 0, modelK: 1, modelV0: 0, modelA: 5, modelOmega: 2,
      modelA1: 2, modelVMax: 6, modelA3: 3, modelT1: 3, modelT2Dur: 2,
      modelTStop: 2, modelA5: 3,
    } as const,
    paramMeta: [
      { key: 'v', label: '速度 v', min: 1, max: 20, step: 0.5, unit: 'm/s' },
      { key: 'deltaT', label: '时间微元 Δt', min: 0.001, max: 1, step: 0.001, unit: 's',
        showIf: 'advancedMode', showIfValue: 1, group: '进阶参数' },
    ],
    controlMeta: [
      // §1 模型选择
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础模式', value: 0 }, { label: '进阶模式', value: 1 }] },
      // §2 子模式
      { type: 'segmented', key: 'scene', label: '生活场景', group: '子模式',
        options: [{ label: '公交车进站', value: 0 }, { label: '百米短跑', value: 1 }],
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'segmented', key: 'deltaT', label: '时间间隔 Δt', group: '子模式',
        options: [
          { label: '2s', value: 2 },
          { label: '1s', value: 1 },
          { label: '0.2s', value: 0.2 },
          { label: '0.02s', value: 0.02 },
        ],
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'segmented', key: 'modelIdx', label: '运动模型', group: '子模式',
        options: [
          { label: '变加速（F递增）', value: 0 },
          { label: '简谐振动', value: 1 },
          { label: '往返多阶段', value: 2 },
        ],
        showIf: 'advancedMode', showIfValue: 1 },
      // §6 教学提示
      { type: 'tip', group: '教学提示', content: '调小 Δt 观察平均速度如何趋近瞬时速度',
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'tip', group: '教学提示', content: '拖拽 Δt→0 观察割线与切线重合',
        showIf: 'advancedMode', showIfValue: 1 },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/kinematics/VelocityCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-acceleration': {
    title: '加速度演示',
    knowledgeId: 'mechanics-1-4',
    Component: lazy(() => import('@/features/mechanics/kinematics/AccelerationAnimation')),
    defaultParams: {
      vA: 200, aB: 5, deltaT: 1,
    } as const,
    paramMeta: [
      { key: 'vA', label: '飞机速度 vₐ', min: 100, max: 300, step: 10, unit: 'm/s' },
      { key: 'aB', label: '跑车加速度 aᵦ', min: 2, max: 10, step: 0.5, unit: 'm/s²' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'deltaT', label: '观测时间微元 Δt', group: '子模式',
        options: [
          { label: '1.0s', value: 1.0 },
          { label: '0.5s', value: 0.5 },
          { label: '0.1s', value: 0.1 },
        ] },
      { type: 'preset', label: '经典对比：vₐ=300, aᵦ=10', group: '快捷预设',
        params: { vA: 300, aB: 10 }, restartOnApply: true },
      { type: 'tip', group: '教学提示', content: '调小 Δt 观察速度变化的精细程度' },
    ],
  },
  'anim-chase-meeting': {
    title: '追及相遇模型',
    knowledgeId: 'mechanics-2-5',
    Component: lazy(() => import('@/features/mechanics/kinematics/AccelerationCenterExtra')),
    defaultParams: {
      chaseMode: 0,
      vA: 35, deltaX0: 80, t0: 1, aB: 6, vMax: 40,
      vL: 200, aB_meet: 2,
    } as const,
    paramMeta: [
      // 追及模式参数
      { key: 'vA', label: '轿车速度 vₐ', min: 10, max: 50, step: 1, unit: 'm/s',
        showIf: 'chaseMode', showIfValue: 0 },
      { key: 'deltaX0', label: '初始车距 Δx₀', min: 10, max: 200, step: 5, unit: 'm',
        showIf: 'chaseMode', showIfValue: 0 },
      { key: 't0', label: '反应时间 t₀', min: 0, max: 3, step: 0.1, unit: 's',
        showIf: 'chaseMode', showIfValue: 0 },
      { key: 'aB', label: '警车加速度 aᵦ', min: 1, max: 8, step: 0.5, unit: 'm/s²',
        showIf: 'chaseMode', showIfValue: 0 },
      { key: 'vMax', label: '最高时速 vₘₐₓ', min: 20, max: 60, step: 1, unit: 'm/s',
        showIf: 'chaseMode', showIfValue: 0 },
      // 相遇模式参数
      { key: 'vA', label: '甲车速度 vₐ', min: 5, max: 50, step: 1, unit: 'm/s',
        showIf: 'chaseMode', showIfValue: 1 },
      { key: 'vL', label: '两地距离 L', min: 50, max: 500, step: 10, unit: 'm',
        showIf: 'chaseMode', showIfValue: 1 },
      { key: 'aB_meet', label: '乙车加速度 aᵦ', min: 0, max: 10, step: 0.5, unit: 'm/s²',
        showIf: 'chaseMode', showIfValue: 1 },
    ],
    controlMeta: [
      // §1 模型选择
      { type: 'segmented', key: 'chaseMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '追及模式', value: 0 }, { label: '相遇模式', value: 1 }] },
      // 追及模式预设
      { type: 'preset', label: '高速追击：vₐ=35, Δx₀=80', group: '快捷预设',
        params: { vA: 35, deltaX0: 80, t0: 1, aB: 6, vMax: 50 }, restartOnApply: true,
        showIf: 'chaseMode', showIfValue: 0 },
      { type: 'preset', label: '近距离反应：vₐ=20, Δx₀=30', group: '快捷预设',
        params: { vA: 20, deltaX0: 30, t0: 0.5, aB: 5, vMax: 40 }, restartOnApply: true,
        showIf: 'chaseMode', showIfValue: 0 },
      // 相遇模式预设
      { type: 'preset', label: '经典相遇：vₐ=20, L=200', group: '快捷预设',
        params: { vA: 20, vL: 200, aB_meet: 2 }, restartOnApply: true,
        showIf: 'chaseMode', showIfValue: 1 },
      { type: 'preset', label: '高速对开：vₐ=30, L=300', group: '快捷预设',
        params: { vA: 30, vL: 300, aB_meet: 3 }, restartOnApply: true,
        showIf: 'chaseMode', showIfValue: 1 },
      // 教学提示
      { type: 'tip', group: '教学提示', content: '调整反应时间和加速度，观察共速时刻与最大间距的关系',
        showIf: 'chaseMode', showIfValue: 0 },
      { type: 'tip', group: '教学提示', content: '调整速度和距离，观察两车相遇的临界条件',
        showIf: 'chaseMode', showIfValue: 1 },
    ],
    controlsMode: 'timed',
  },
  'anim-uniform-acceleration': {
    title: '匀变速直线运动',
    knowledgeId: 'mechanics-2-1',
    Component: lazy(() => import('@/features/mechanics/kinematics/UniformAccelerationAnimation')),
    defaultParams: { v0: 0, a: 1.5, t: 0, advancedMode: 0, areaMode: 1, splitN: 0, flashPeriod: 1 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0, max: 20, step: 0.1, unit: 'm/s' },
      { key: 'a', label: '加速度 a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础模式', value: 0 }, { label: '进阶模式', value: 1 }] },
      { type: 'segmented', key: 'areaMode', group: '显示辅助',
        label: 'v-t 图位移面积展示',
        options: [
          { label: '合并梯形', value: 0 },
          { label: '拆分公式', value: 1 },
          { label: '等效割补', value: 2 },
        ],
        onChangeSideEffect: (v) =>
          v === 1 ? undefined : { setParams: { splitN: 0 } },
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'segmented', key: 'splitN', label: '微元切割份数', group: '显示辅助',
        options: [
          { label: '连续', value: 0 },
          { label: '4', value: 4 },
          { label: '8', value: 8 },
          { label: '16', value: 16 },
          { label: '32', value: 32 },
        ],
        showIf: 'areaMode', showIfValue: 1 },
      { type: 'preset', label: '经典逐差验证', group: '教学场景预设',
        params: { v0: 2, a: 2, flashPeriod: 1.0 }, restartOnApply: true,
        showIf: 'advancedMode', showIfValue: 1 },
      { type: 'preset', label: '高频打点计时', group: '教学场景预设',
        params: { v0: 0, a: 4, flashPeriod: 0.5 }, restartOnApply: true,
        showIf: 'advancedMode', showIfValue: 1 },
      { type: 'preset', label: '减速折返频闪', group: '教学场景预设',
        params: { v0: 8, a: -2, flashPeriod: 1.0 }, restartOnApply: true,
        showIf: 'advancedMode', showIfValue: 1 },
      { type: 'tip', group: '教学提示', showIf: 'advancedMode', showIfValue: 0,
        content: (p) => {
          if (p.areaMode === 2) return '等效割补：利用中间时刻速度 v(t/2) 围成的等效矩形替代原梯形面积。'
          if (p.areaMode === 1) return '拆分公式：将面积拆分为矩形位移 v₀t 与三角形位移 ½at²。'
          return '合并梯形：以整体梯形面积 S = ½(v₀+v_t)t 直接代表总位移。'
        } },
      { type: 'tip', group: '教学提示', showIf: 'advancedMode', showIfValue: 1,
        content: '频闪实验模式：聚焦打点计时器频闪现象，三屏联动处理逐差法数据。' },
    ],
    CenterExtra: lazy(() => import('@/features/mechanics/kinematics/UniformAccelerationCenterExtra')),
    centerExtraMode: 'advancedMode',
  },
  'anim-free-fall': {
    title: '自由落体运动',
    knowledgeId: 'mechanics-2-2',
    Component: lazy(() => import('@/features/mechanics/kinematics/FreeFallWrapper')),
    defaultParams: { v0: 0, g: GRAVITY, pressure: 0, objectA: 0, objectB: 0, advancedMode: 0, dripPeriod: 0.5, latitude: 45, altitude: 0, t: 0 } as const,
    controlsMode: 'timed',
    paramMeta: [
      { key: 'pressure', label: '管内气压', min: 0, max: 1, step: 0.01, unit: 'atm', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'dripPeriod', label: '滴水周期 T', min: 0.2, max: 2, step: 0.1, unit: 's', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'latitude', label: '纬度', min: 0, max: 90, step: 1, unit: '°', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'altitude', label: '海拔', min: 0, max: 10, step: 0.1, unit: 'km', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '牛顿管实验', value: 0 }, { label: '滴水法测g', value: 1 }] },
      { type: 'segmented', key: 'objectA', label: '物体A', group: '物体选择',
        options: [{ label: '铁球', value: 0 }, { label: '硬币', value: 1 }],
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'segmented', key: 'objectB', label: '物体B', group: '物体选择',
        options: [{ label: '羽毛', value: 0 }, { label: '纸片', value: 1 }],
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'preset', label: '🌍 地球 g=9.8', group: '环境重力场',
        params: { g: 9.8 }, showIf: 'advancedMode', showIfValue: 0 },
      { type: 'preset', label: '🌙 月球 g=1.63', group: '环境重力场',
        params: { g: 1.63 }, showIf: 'advancedMode', showIfValue: 0 },
      { type: 'preset', label: '🔴 火星 g=3.72', group: '环境重力场',
        params: { g: 3.72 }, showIf: 'advancedMode', showIfValue: 0 },
      { type: 'preset', label: '🪐 木星 g=24.79', group: '环境重力场',
        params: { g: 24.79 }, showIf: 'advancedMode', showIfValue: 0 },
      { type: 'storeToggle', label: '显示 1:3:5:7 时间切片', storeKey: 'toggleTimeSlices', stateKey: 'showTimeSlices',
        showIf: 'advancedMode', showIfValue: 0 },
      { type: 'tip', group: '教学提示', content: (p) => {
        const pressure = p.pressure ?? 0
        if (pressure <= 0.01) return '当前为真空环境，物体仅受重力，做自由落体运动'
        if (pressure <= 0.3) return '空气阻力较小，两物体下落加速度接近 g'
        return '空气阻力显著，轻质物体下落明显变慢'
      }, showIf: 'advancedMode', showIfValue: 0 },
      { type: 'tip', title: '当前环境', group: '环境状态', content: (p) => {
        const pressure = p.pressure ?? 0
        const label = pressure <= 0.01 ? '真空' : pressure >= 0.99 ? '标准大气压' : `${pressure.toFixed(2)} atm`
        const desc = pressure <= 0.01 ? '物体仅受重力' : '存在空气阻力'
        return `${label} — ${desc}`
      }, variant: 'info', showIf: 'advancedMode', showIfValue: 0 },
      { type: 'tip', title: '重力加速度 g', group: '环境状态', content: (p) => {
        const g = p.g ?? 9.8
        return `g = ${g.toFixed(3)} m/s²，由纬度和海拔自动计算`
      }, variant: 'info', showIf: 'advancedMode', showIfValue: 1 },
    ],
  },
  'anim-vertical-throw': {
    title: '竖直上抛运动',
    knowledgeId: 'mechanics-2-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/VerticalThrowAnimation')),
    controlsMode: 'timed',
    defaultParams: { v0: 15, g: GRAVITY, t: 0, advancedMode: 0, sliceDensity: 0, airResistance: 0, targetHeight: 0 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0, max: 30, step: 0.1, unit: 'm/s' },
      { key: 'sliceDensity', label: '微元切片密度', min: 0, max: 0.5, step: 0.05, unit: 's',
        showIf: 'advancedMode', showIfValue: 1 },
      { key: 'airResistance', label: '空气阻力 k', min: 0, max: 2, step: 0.1, unit: 'kg/s',
        showIf: 'advancedMode', showIfValue: 1 },
      { key: 'targetHeight', label: '目标高度线', min: 0, max: 50, step: 0.5, unit: 'm',
        showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }],
        onChangeSideEffect: { resetParams: ['airResistance'] } },
      { type: 'preset', label: '🌍 地球 g=9.8', group: '环境重力场',
        params: { g: 9.8 } },
      { type: 'preset', label: '🌙 月球 g=1.63', group: '环境重力场',
        params: { g: 1.63 } },
      { type: 'preset', label: '🔴 火星 g=3.72', group: '环境重力场',
        params: { g: 3.72 } },
      { type: 'preset', label: '🪐 木星 g=24.79', group: '环境重力场',
        params: { g: 24.79 } },
      { type: 'toggle', key: 'showVacuumCompare', label: '对比真空参考轨道', group: '显示辅助',
        showIf: 'airResistance' },
    ],
  },
  'anim-projectile': {
    title: '平抛运动',
    knowledgeId: 'mechanics-5-2',
    Component: lazy(() => import('@/features/mechanics/kinematics/ProjectileAnimation')),
    controlsMode: 'timed',
    defaultParams: { v0x: 10, g: GRAVITY, t: 0, advancedMode: 0, airResistance: 0, showVacuumCompare: 1 } as const,
    paramMeta: [
      { key: 'v0x', label: '初速度 v₀', min: 2, max: 20, step: 0.1, unit: 'm/s' },
      { key: 'airResistance', label: '空气阻力 k', min: 0, max: 0.2, step: 0.01, unit: 'kg/m', group: '进阶参数', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }] },
      { type: 'preset', label: '🌍 地球 g=9.8', group: '快捷预设', params: { g: 9.8 } },
      { type: 'preset', label: '🌙 月球 g=1.63', group: '快捷预设', params: { g: 1.63 } },
      { type: 'preset', label: '🔴 火星 g=3.72', group: '快捷预设', params: { g: 3.72 } },
      { type: 'preset', label: '🪐 木星 g=24.79', group: '快捷预设', params: { g: 24.79 } },
      { type: 'toggle', key: 'showVacuumCompare', label: '对比真空参考轨道', group: '显示辅助', showIf: 'airResistance' },
    ],
  },
  'anim-oblique-throw': {
    title: '斜抛运动',
    knowledgeId: 'mechanics-5-3',
    Component: lazy(() => import('@/features/mechanics/kinematics/ObliqueThrowAnimation')),
    controlsMode: 'timed',
    defaultParams: { v0: 15, angle: 45, g: GRAVITY, t: 0, advancedMode: 0, airResistance: 0, showVacuumCompare: 1 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 5, max: 30, step: 0.1, unit: 'm/s' },
      { key: 'angle', label: '抛射角 θ', min: 10, max: 80, step: 1, unit: '°' },
      { key: 'airResistance', label: '空气阻力 k', min: 0, max: 0.2, step: 0.01, unit: 'kg/m', group: '进阶参数', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }] },
      { type: 'preset', label: '🌍 地球 g=9.8', group: '快捷预设', params: { g: 9.8 } },
      { type: 'preset', label: '🌙 月球 g=1.63', group: '快捷预设', params: { g: 1.63 } },
      { type: 'preset', label: '🔴 火星 g=3.72', group: '快捷预设', params: { g: 3.72 } },
      { type: 'preset', label: '🪐 木星 g=24.79', group: '快捷预设', params: { g: 24.79 } },
      { type: 'toggle', key: 'showVacuumCompare', label: '对比真空参考轨道', group: '显示辅助', showIf: 'airResistance' },
    ],
  },
  'anim-kinematics-advanced': {
    title: '运动学图像扩展',
    knowledgeId: 'mechanics-2-4',
    Component: lazy(() => import('@/features/mechanics/kinematics/KinematicsAdvancedAnimation')),
    defaultParams: {
      v0: 4.0,
      a: 2.0,
      t: 0,
      chartMode: 0,
      showAux: 1,
      showVectors: 1,
    } as const,
    paramMeta: [
      { key: 'v0', label: '初速度 v₀', min: 0.0, max: 10.0, step: 0.1, unit: 'm/s' },
      { key: 'a', label: '加速度 a', min: -4.0, max: 4.0, step: 0.1, unit: 'm/s²' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'chartMode', label: '函数图象模式切换', resetOnChange: true,
        options: [{ value: 0, label: 'v²-x模式' }, { value: 1, label: 'x/t-t模式' }] },
      { type: 'toggle', key: 'showAux', label: '显示斜率/截距解析辅助线' },
      { type: 'storeToggle', label: '显示速度与加速度箭头', storeKey: 'toggleVectors', stateKey: 'showVectors' },
    ],
  },
})

