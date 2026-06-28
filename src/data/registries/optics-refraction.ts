import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const opticsRefractionAnimations = defineAnimations({
  'anim-refraction': {
    title: '光的折射定律',
    knowledgeId: 'optics-1-2',
    Component: lazy(() => import('@/features/optics/refraction/RefractionAnimation')),
    SidebarExtra: lazy(() => import('@/features/optics/refraction/RefractionSidebar')),
    defaultParams: {
      theta1: 45,
      n: 1.5,
      advancedMode: 0,
      glassThickness: 20,
    } as const,
    paramMeta: [
      { key: 'theta1', label: '入射角 θ₁', min: 0, max: 90, step: 1, unit: '°' },
      { key: 'n', label: '玻璃折射率 n', min: 1.2, max: 1.9, step: 0.01 },
      { key: 'glassThickness', label: '玻璃砖厚度 d', min: 10, max: 40, step: 1, unit: 'mm', showIf: 'advancedMode', showIfValue: 1 },
    ],
  },
})
