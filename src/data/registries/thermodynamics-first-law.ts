import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const thermodynamicsFirstLawAnimations = defineAnimations({
  'anim-first-law': {
    title: '热力学第一定律（能量守恒）',
    knowledgeId: 'thermodynamics-3-1',
    Component: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawAnimation')),
    defaultParams: {
      mode: 0,
      W: 0,
      Q: 0,
      adiabatic: 0,
      T: 300,
    },
    paramMeta: [
      { key: 'W', label: '外界做功 W', min: -500, max: 500, step: 10, unit: 'J' },
      { key: 'Q', label: '热源供热量 Q', min: -500, max: 500, step: 10, unit: 'J',
        hideIf: 'adiabatic', hideIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawCenterExtra')),
    centerExtraMode: 'mode',
  },
})
