import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 电磁感应（[M4-1]）=====
export const electromagnetismInductionAnimations = defineAnimations({
  'anim-electromagnetic-induction': {
    title: '第一节：电磁感应现象',
    knowledgeId: 'electricity-4-1',
    Component: lazy(() => import('@/features/electromagnetism/induction/InductionPhenomenon')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      showLines: 1,
      magnetX: 160,
      magnetSpeed: 0,
      magnetPole: 1,
      resistance: 50,
      dR_dt: 0,
      circuitSwitch: 1,
      hasIronCore: 1,
      subCircuitSwitch: 1,
      primaryCoilX: 220,
      primaryCoilSpeed: 0,
      rodX: 200,
      rodSpeed: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '选择探究实验',
        group: '模型选择',
        resetOnChange: true,
        onChangeSideEffect: {
          resetParams: ['rodX', 'rodSpeed', 'magnetX', 'magnetSpeed', 'primaryCoilX', 'primaryCoilSpeed', 'dR_dt', 'resistance', 'circuitSwitch', 'hasIronCore', 'subCircuitSwitch'],
        },
        options: [
          { value: 0, label: '一：导体切割' },
          { value: 1, label: '二：磁铁穿过' },
          { value: 2, label: '三：双线圈互感' },
        ],
      },
      {
        type: 'segmented',
        key: 'magnetPole',
        label: '磁极朝向',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 1, label: '左S 右N (推荐)' },
          { value: -1, label: '左N 右S' },
        ],
      },
      {
        type: 'toggle',
        key: 'circuitSwitch',
        label: '原回路开关 (激励侧)',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 2,
      },
      {
        type: 'toggle',
        key: 'hasIronCore',
        label: '插入软铁芯',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 2,
      },
      {
        type: 'toggle',
        key: 'subCircuitSwitch',
        label: '副回路开关 (电流计侧)',
        group: '显示辅助',
      },
      {
        type: 'toggle',
        key: 'showLines',
        label: '显示磁感线',
        group: '显示辅助',
        hideIf: 'mode',
        hideIfValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        showIf: 'mode',
        showIfValue: 0,
        content: '请在左侧画布上直接左右拖拽金属棒。金属棒向右移动切割时，感应电流向上（指针右偏）；向左移动切割时，感应电流向下（指针左偏）；静止时无感应电流。',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        showIf: 'mode',
        showIfValue: 1,
        content: '正值代表磁铁自动向右穿过线圈，负值代表磁铁自动向左穿出线圈。您也可以在画布上直接拖拽磁铁进行手动穿插。',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        showIf: 'mode',
        showIfValue: 2,
        content: '点击激励侧刀闸或此处切换。闭合或断开的瞬间，磁通量发生改变，产生瞬时感应电流，随后回弹归零。',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        showIf: 'mode',
        showIfValue: 2,
        content: '软铁芯能极大地聚集磁感线。未插入铁芯时，由于磁场过度发散，感应电流非常微弱。',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        showIf: 'mode',
        showIfValue: 2,
        content: '原回路闭合时拖动滑阻。拖拽滑动的瞬间磁场变化产生感应电流，滑动越快，感应电流越大；静止时无电流。您也可以手动拖拽原线圈进行插拔。',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        content: '探究产生感应电流是否必须有"闭合回路"。断开开关后，无论如何运动或磁场如何改变，灵敏电流计都不会发生偏转。',
      },
    ],
    paramMeta: [
      { key: 'magnetSpeed', label: '自动移动速度 v', min: -5, max: 5, step: 0.1, unit: 'px/s', showIf: 'mode', showIfValue: 1 },
      { key: 'resistance', label: '滑动变阻器电阻 R', min: 5, max: 100, step: 1, unit: 'Ω', showIf: 'mode', showIfValue: 2 },
    ],
  },
  'anim-faraday-law': {
    title: '法拉第电磁感应定律',
    knowledgeId: 'electricity-4-3',
    Component: lazy(() => import('@/features/electromagnetism/induction/FaradayLaw')),
    defaultParams: {
      mode: 0,
      N: 50,
      B: 1.2,
      magnetV: 140,
      dBdt: 0.5,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '实验模式',
        group: '模型选择',
        options: [
          { value: 0, label: '基础: 磁铁变速' },
          { value: 1, label: '进阶: 匀变磁场' },
        ],
      },
    ],
    paramMeta: [
      { key: 'N', label: '线圈匝数 n', min: 1, max: 100, step: 1, unit: '匝', description: '匝数越多，单位磁通量变化产生的感应电动势越大。' },
      { key: 'B', label: '磁铁强度 B', min: 0.2, max: 2.0, step: 0.1, unit: 'T', showIf: 'mode', showIfValue: 0 },
      { key: 'magnetV', label: '磁铁运动速度 v', min: 0, max: 300, step: 10, unit: 'px/s', showIf: 'mode', showIfValue: 0, description: '磁铁相对线圈移动的速度。速度越快，穿过线圈的磁通量变化越剧烈，感应电动势峰值越高。' },
      { key: 'dBdt', label: '磁场变化率 k = ΔB/Δt', min: -1.5, max: 1.5, step: 0.1, unit: 'T/s', showIf: 'mode', showIfValue: 1, description: 'k > 0：B 从 0 线性增强（产生逆时针感应电流）；k < 0：B 从 0 线性减弱（产生顺时针感应电流）；k = 0：无感应电动势。' },
    ],
  },
  'anim-lenzs-law': {
    title: '楞次定律',
    knowledgeId: 'electricity-4-2',
    Component: lazy(() => import('@/features/electromagnetism/induction/LenzsLaw')),
    defaultParams: {
      magnetSpeed: 2,
      magnetPole: 1,
      coilN: 10,
      motionMode: 1,
      currentStep: 0,
      showLines: 1,
      showEquivalentPoles: 1,
      showHandRule: 1,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'currentStep',
        label: '探究模式',
        group: '子模式',
        options: [
          { value: 0, label: '完整' },
          { value: 1, label: '步骤1' },
          { value: 2, label: '步骤2' },
          { value: 3, label: '步骤3' },
          { value: 4, label: '步骤4' },
        ],
      },
      {
        type: 'segmented',
        key: 'magnetPole',
        label: '磁极朝向',
        group: '子模式',
        resetOnChange: true,
        options: [
          { value: 1, label: 'N极朝下 (红下)' },
          { value: -1, label: 'S极朝下 (蓝下)' },
        ],
      },
      {
        type: 'segmented',
        key: 'motionMode',
        label: '运动方式',
        group: '子模式',
        resetOnChange: true,
        options: [
          { value: 1, label: '靠近线圈 (插入)' },
          { value: 2, label: '远离线圈 (拔出)' },
        ],
      },
      {
        type: 'toggle',
        key: 'showLines',
        label: '显示背景磁感线',
        group: '显示辅助',
      },
      {
        type: 'toggle',
        key: 'showEquivalentPoles',
        label: '显示等效磁极 (来拒去留)',
        group: '显示辅助',
      },
      {
        type: 'toggle',
        key: 'showHandRule',
        label: '显示右手定则 (安培定则)',
        group: '显示辅助',
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        content: (params) => {
          const step = params.currentStep ?? 0
          if (step === 0) return '楞次定律是判断感应电流方向的普遍规律。选择分步探究，可逐步推导感应电流的方向及其能量转化。'
          if (step === 1) return '【第一步：确定原磁场方向 B原】条形磁铁的外部磁场由N极指向S极。请观察当前磁铁极性，确定在磁铁与线圈之间，原磁场方向是向上还是向下。'
          if (step === 2) return '【第二步：确定磁通量变化 ΔΦ】根据磁铁运动状态，靠近线圈时穿过线圈的磁通量增加，远离时减少。可在画布上观察穿过线圈的磁感线条数变化。'
          if (step === 3) return '【第三步：确定感应磁场方向 B感】根据楞次定律"增反减同"原则：磁通量增加，感应磁场与原磁场相反以阻碍其增加；磁通量减少，感应磁场与原磁场相同以阻碍其减少。'
          return '【第四步：确定电流方向 I感 及相对运动阻碍】安培定则：右手大拇指指向感应磁场方向，四指弯曲方向即为电流方向。来拒去留：感应电流阻碍相对运动，靠近排斥，远离吸引。能量守恒：克服安培力做功，机械能转化为电能。'
        },
      },
    ],
    paramMeta: [
      { key: 'coilN', label: '线圈匝数 N', min: 5, max: 30, step: 5, unit: '匝' },
      { key: 'magnetSpeed', label: '自动运动速度 v', min: 0.5, max: 5, step: 0.5, unit: 'm/s' },
    ],
  },
  'anim-cutting-emf': {
    title: '导体切割磁感线',
    knowledgeId: 'electricity-4-4',
    Component: lazy(() => import('@/features/electromagnetism/induction/CuttingEMF')),
    defaultParams: {
      mode: 0,
      B: 1.5,
      L: 1.0,
      v: 2.0,
      R: 2.0,
      F_ext: 2.0,
      m: 0.2,
      showForceAnalysis: 1,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '实验模式',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '基础: 恒速切割' },
          { value: 1, label: '进阶: 自由释放(变加速)' },
        ],
      },
      {
        type: 'toggle',
        key: 'showForceAnalysis',
        label: '受力矢量分析图层',
        group: '显示辅助',
      },
    ],
    paramMeta: [
      { key: 'B', label: '磁感应强度 B（负=向外⊙）', min: -3.0, max: 3.0, step: 0.1, unit: 'T' },
      { key: 'L', label: '导轨间距 L', min: 0.5, max: 2.0, step: 0.1, unit: 'm' },
      { key: 'R', label: '回路电阻 R', min: 0.5, max: 5.0, step: 0.1, unit: 'Ω' },
      { key: 'v', label: '切割速度 v', min: -5.0, max: 5.0, step: 0.2, unit: 'm/s', showIf: 'mode', showIfValue: 0 },
      { key: 'F_ext', label: '恒定外力 F外', min: 0.0, max: 5.0, step: 0.1, unit: 'N', showIf: 'mode', showIfValue: 1 },
      { key: 'm', label: '导体棒质量 m', min: 0.05, max: 1.0, step: 0.05, unit: 'kg', showIf: 'mode', showIfValue: 1 },
    ],
  },
})
