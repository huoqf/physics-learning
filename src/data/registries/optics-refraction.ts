import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsRefractionAnimations = defineAnimations({
  'anim-refraction': {
    title: '光的折射定律',
    knowledgeId: 'optics-1-2',
    Component: lazy(() => import('@/features/optics/refraction/RefractionAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      theta1: 45,
      n: 1.5,
      advancedMode: 0,
      glassThickness: 20,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', resetOnChange: true,
        options: [{ value: 0, label: '基础折射' }, { value: 1, label: '双界面并进与侧移' }] },
      { type: 'tip', content: '增大入射角，观察折射角随之增大' },
      { type: 'tip', content: '折射率越大，光线偏折越明显' },
    ],
    paramMeta: [
      { key: 'theta1', label: '入射角 θ₁', min: 0, max: 90, step: 1, unit: '°' },
      { key: 'n', label: '玻璃折射率 n', min: 1.2, max: 1.9, step: 0.01 },
      { key: 'glassThickness', label: '玻璃砖厚度 d', min: 10, max: 40, step: 1, unit: 'mm', showIf: 'advancedMode', showIfValue: 1 },
    ],
  },
})
