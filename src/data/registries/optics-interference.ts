import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsInterferenceAnimations = defineAnimations({
  'anim-double-slit-interference': {
    title: '光的双缝干涉',
    knowledgeId: 'wave-optics-1-1',
    Component: lazy(() => import('@/features/optics/double-slit-interference/DoubleSlitInterferenceAnimation')),
    controlsMode: 'loop' as const,
    defaultParams: {
      wavelength: 650,
      slitDistance: 0.2,
      screenDistance: 1.0,
    } as const,
    controlMeta: [
      { type: 'tip', content: '拖动滑块观察波长 λ、双缝间距 d、缝屏距离 L 对干涉条纹宽度的影响。' },
      { type: 'tip', content: '条纹间距 Δx = (L/d)λ，增大 L、减小 d 或换用长波长光可使条纹变宽。' },
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
        label: '📋 高考真题：工件表面凹坑检测',
        description: '劈尖干涉条纹向薄端（左侧）弯曲，对应此处表面存在凹坑',
        params: { mode: 1, wavelength: 600, wedgeAngle_mrad: 0.3, defect: 1 },
      },
      {
        type: 'preset',
        label: '📋 550nm 绿光理想增透膜',
        description: 'd = λ/(4n) = 99.6 nm，反射光强近乎为零，剩余反射光呈淡紫蓝色',
        params: { mode: 0, wavelength: 550, filmThickness: 99.6, n_film: 1.38, defect: 0 },
      },
      {
        type: 'tip',
        content: '等厚干涉核心判据：同一条纹对应空气膜厚度相同。工件表面凹陷处膜厚增大，为维持原厚度，条纹必须向劈尖薄端弯曲！',
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

