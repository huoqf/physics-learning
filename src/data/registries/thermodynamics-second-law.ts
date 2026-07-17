import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const thermodynamicsSecondLawAnimations = defineAnimations({
  'anim-second-law': {
    title: '热力学第二定律（方向性与熵增）',
    knowledgeId: 'thermodynamics-3-2',
    controlsMode: 'timed',
    Component: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawAnimation')),
    defaultParams: {
      scene: 0,
      partitionOpened: 0,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'scene', label: '演示场景', resetOnChange: true,
        options: [{ value: 0, label: '热量传导方向' }, { value: 1, label: '气体自由膨胀' }] },
      { type: 'toggle', key: 'partitionOpened', label: '抽去隔板', showIf: 'scene', showIfValue: 1, group: '气体膨胀控制' },
      { type: 'tip', showIf: 'scene', showIfValue: 0,
        content: '克劳修斯表述：热量不能自发地从低温物体传向高温物体。在无外界干预时，自发热传导过程是单向熵增的。' },
      { type: 'tip', showIf: 'scene', showIfValue: 1,
        content: '玻尔兹曼表述（微观意义）：宏观自发过程的方向性源于微观态数 Ω 的压倒性优势，孤立系统的熵 S = k ln Ω 总是增加的。' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawCenterExtra')),
    centerLayout: 'splitV',
  },
})
