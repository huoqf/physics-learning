import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const thermodynamicsSecondLawAnimations = defineAnimations({
  'anim-second-law': {
    title: '热力学第二定律（方向性与熵增）',
    knowledgeId: 'thermodynamics-3-2',
    Component: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawAnimation')),
    defaultParams: {
      scene: 0,
    },
    SidebarExtra: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/secondLaw/SecondLawCenterExtra')),
  },
})
