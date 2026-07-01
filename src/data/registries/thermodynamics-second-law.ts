import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const thermodynamicsSecondLawAnimations = defineAnimations({
  'anim-second-law': {
    title: '热力学第二定律（方向性与熵增）',
    knowledgeId: 'thermodynamics-3-2',
    Component: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawAnimation')),
    defaultParams: {
      scene: 0,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'scene', label: '演示场景', resetOnChange: true,
        options: [{ value: 0, label: '热量传导方向' }, { value: 1, label: '气体自由膨胀' }] },
      { type: 'tip', content: '点击「逆向倒带」观察在无外界干预下，分子是否会自动退回有序状态。' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawCenterExtra')),
  },
})
