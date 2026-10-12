import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { DOUBLE_SLIT_DEFAULT_PARAMS } from '@/physics/optics'
import { defineAnimations } from '../defineAnimations'

export const opticsInterferenceAnimations = defineAnimations({
  'anim-double-slit-interference': {
    title: '光的双缝干涉',
    knowledgeId: 'wave-optics-1-1',
    Component: lazy(() => import('@/features/optics/double-slit-interference/DoubleSlitInterferenceAnimation')),
    controlsMode: 'loop' as const,
    defaultParams: DOUBLE_SLIT_DEFAULT_PARAMS,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '实验模式',
        resetOnChange: false,
        options: [
          { value: 0, label: '理论演示：相干波前与光强分布' },
          { value: 1, label: '高考实验：光具座装配与测微目镜' },
        ],
      },
      {
        type: 'segmented',
        key: 'currentFringe',
        group: '分划板十字丝对准',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 1, label: '对准第 1 条亮纹 (读出 x₁)' },
          { value: 4, label: '对准第 4 条亮纹 (读出 x₄)' },
        ],
      },
      {
        type: 'preset',
        label: '🔴 经典红光实验 (650nm)',
        description: 'd=0.30mm, L=0.8m，条纹清晰宽大，适合目视读数',
        params: { mode: 1, wavelength: 650, slitDistance: 0.3, screenDistance: 0.8, targetFringe: 4, currentFringe: 1, handwheelOffset: 0 },
      },
      {
        type: 'preset',
        label: '🟢 灵敏绿光实验 (532nm)',
        description: 'd=0.30mm, L=0.9m，人眼敏感波长，对比条纹疏密',
        params: { mode: 1, wavelength: 532, slitDistance: 0.3, screenDistance: 0.9, targetFringe: 4, currentFringe: 4, handwheelOffset: 0 },
      },
      {
        type: 'tip',
        content: '操作指引：转动测量头手轮使分划板十字丝对准亮纹中心；可切换不同波长对比条纹间距。',
      },
    ],
    paramMeta: [
      {
        key: 'wavelength',
        label: '光的波长 λ',
        min: 400,
        max: 700,
        step: 1,
        unit: 'nm',
        group: '基本参数',
      },
      {
        key: 'slitDistance',
        label: '双缝间距 d',
        min: 0.1,
        max: 0.5,
        step: 0.01,
        unit: 'mm',
        group: '基本参数',
      },
      {
        key: 'screenDistance',
        label: '缝屏距离 L',
        min: 0.5,
        max: 2.0,
        step: 0.1,
        unit: 'm',
        group: '基本参数',
      },
      {
        key: 'handwheelOffset',
        label: '手轮微调偏移',
        min: -0.5,
        max: 0.5,
        step: 0.005,
        unit: 'mm',
        group: '测微手轮调节',
        showIf: 'mode',
        showIfValue: 1,
      },
    ],
  },

  'anim-thin-film-interference': {
    title: '薄膜干涉与增透膜',
    knowledgeId: 'wave-optics-1-5',
    Component: lazy(() => import('@/features/optics/thin-film-interference/ThinFilmInterferenceAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      wavelength: 550,
      filmThickness: 100,
      n_film: 1.38,
      wedgeAngle_mrad: 0.3,
      defect: 1, // 劈尖模式默认展示高考高频考点：局部凹坑 (0=平整, 1=凹陷, 2=凸起)
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型模式',
        resetOnChange: true,
        options: [
          { value: 0, label: '增透膜原理' },
          { value: 1, label: '空气劈尖干涉' },
          { value: 2, label: '牛顿环' },
        ],
      },
      {
        type: 'segmented',
        key: 'defect',
        group: '工件表面状态',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '表面平整' },
          { value: 1, label: '局部凹坑（向薄端弯）' },
          { value: 2, label: '局部凸起（向厚端弯）' },
        ],
      },
      {
        type: 'preset',
        label: '🔍 工件表面凹坑检测',
        description: '劈尖干涉条纹向薄端（左侧）弯曲，指示局部存在凹坑',
        params: { mode: 1, wavelength: 600, wedgeAngle_mrad: 0.3, defect: 1 },
      },
      {
        type: 'preset',
        label: '✨ 550nm 理想增透膜',
        description: 'd = λ/(4n) = 99.6 nm，反射光强近乎为零，透射率最大',
        params: { mode: 0, wavelength: 550, filmThickness: 99.6, n_film: 1.38, defect: 0 },
      },
      {
        type: 'tip',
        content: '观察重点：同一干涉条纹对应空气膜等厚度处。工件表面凹凸会导致条纹弯曲变形。',
      },
    ],
    paramMeta: [
      {
        key: 'wavelength',
        label: '入射光波长 λ',
        min: 400,
        max: 700,
        step: 5,
        unit: 'nm',
        group: '光学参数',
      },
      {
        key: 'filmThickness',
        label: '薄膜厚度 d',
        min: 40,
        max: 400,
        step: 2,
        unit: 'nm',
        group: '薄膜参数',
        showIf: 'mode',
        showIfValue: 0,
        marks: [
          { value: 99.6, label: '临界: 增透极小', variant: 'critical' },
          { value: 199.3, label: '增反极大' },
        ],
      },
      {
        key: 'n_film',
        label: '薄膜折射率 n',
        min: 1.2,
        max: 2.0,
        step: 0.02,
        group: '薄膜参数',
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        key: 'wedgeAngle_mrad',
        label: '劈尖倾角 α',
        min: 0.1,
        max: 1.0,
        step: 0.05,
        unit: 'mrad',
        group: '劈尖参数',
        showIf: 'mode',
        showIfValue: 1,
      },
    ],
  },
})

