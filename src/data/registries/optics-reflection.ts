import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const opticsReflectionAnimations = defineAnimations({
  'anim-reflection': {
    title: '光的反射定律',
    knowledgeId: 'optics-1-1',
    Component: lazy(() => import('@/features/optics/reflection/ReflectionAnimation')),
    SidebarExtra: lazy(() => import('@/features/optics/reflection/ReflectionSidebar')),
    defaultParams: {
      theta1: 45,
      advancedMode: 0,
      mirrorRotation: 0,
      showNormal: 1,
    },
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
