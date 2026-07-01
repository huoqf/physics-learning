import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsReflectionAnimations = defineAnimations({
  'anim-reflection': {
    title: '光的反射定律',
    knowledgeId: 'optics-1-1',
    Component: lazy(() => import('@/features/optics/reflection/ReflectionAnimation')),
    defaultParams: {
      theta1: 45,
      advancedMode: 0,
      mirrorRotation: 0,
      showNormal: 1,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', label: '观察模式', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '平面镜旋转进阶' }] },
      { type: 'toggle', key: 'showNormal', label: '法线与刻度盘' },
      { type: 'tip', content: '拖动滑块观察反射角始终等于入射角' },
      { type: 'tip', showIf: 'advancedMode', showIfValue: 1, content: '保持入射光不动，旋转镜面观察反射光偏转 2Δα' },
    ],
    paramMeta: [
      { key: 'theta1', label: '入射角 θ₁', min: 0, max: 90, step: 1, unit: '°' },
      {
        key: 'mirrorRotation',
        label: '平面镜旋转 Δα',
        min: -45,
        max: 45,
        step: 1,
        unit: '°',
        showIf: 'advancedMode',
        showIfValue: 1,
      },
    ],
  },
})
