import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsTotalInternalReflectionAnimations = defineAnimations({
  'anim-total-reflection': {
    title: '全反射与临界角',
    knowledgeId: 'optics-1-3',
    Component: lazy(() => import('@/features/optics/total-internal-reflection/TIRAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      theta1: 30,
      depth: 2,
      n: 1.33,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'mode', resetOnChange: true,
        options: [{ value: 0, label: '单光束变角' }, { value: 1, label: '水下点光源' }] },
      { type: 'tip', showIf: 'mode', showIfValue: 0, content: '增大入射角，观察折射光渐暗直至全反射' },
      { type: 'tip', showIf: 'mode', showIfValue: 1, content: '拖动深度，观察俯视图中透光圆面积变化' },
      { type: 'tip', content: '折射率越大，临界角越小，全反射越容易发生' },
    ],
    paramMeta: [
      { key: 'theta1', label: '入射角 i', min: 0, max: 90, step: 1, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'depth', label: '光源深度 h', min: 0.5, max: 5, step: 0.1, unit: 'm', showIf: 'mode', showIfValue: 1 },
      { key: 'n', label: '介质折射率 n', min: 1.01, max: 2.0, step: 0.01 },
    ],
  },
})
