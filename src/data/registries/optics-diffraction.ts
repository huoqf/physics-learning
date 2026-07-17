import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsDiffractionAnimations = defineAnimations({
  'anim-diffraction': {
    title: '光的衍射与泊松亮斑',
    knowledgeId: 'wave-optics-1-2',
    Component: lazy(() => import('@/features/optics/diffraction/DiffractionAnimation')),
    controlsMode: 'timed' as const,
    defaultParams: {
      mode: 0,
      wavelength: 650,
      obstacleSize: 0.1,
      screenDistance: 1.0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '实验模式',
        group: '模式选择',
        resetOnChange: true,
        options: [
          { label: '单缝衍射', value: 0 },
          { label: '圆孔衍射', value: 1 },
          { label: '泊松亮斑', value: 2 },
        ],
      },
      {
        type: 'tip',
        content: '单缝衍射：中央条纹最宽最亮，往两侧迅速变窄变暗。缝宽越窄，条纹越宽。',
      },
      {
        type: 'tip',
        content: '圆孔衍射：明暗相间的同心圆环，中央为艾里斑。孔径越小，艾里斑越大。',
      },
      {
        type: 'tip',
        content: '泊松亮斑：光绕过微小圆板，在阴影的正中心发生相长干涉，形成一个极小的亮斑。',
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
        group: '实验参数',
      },
      {
        key: 'obstacleSize',
        label: '缝宽/孔径/圆板直径',
        min: 0.04,
        max: 0.25,
        step: 0.01,
        unit: 'mm',
        group: '实验参数',
      },
      {
        key: 'screenDistance',
        label: '缝屏距离 L',
        min: 0.5,
        max: 2.0,
        step: 0.1,
        unit: 'm',
        group: '实验参数',
      },
    ],
  },
})
