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
})
