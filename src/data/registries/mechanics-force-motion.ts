import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const mechanicsForceMotionAnimations = defineAnimations({
  'anim-force-motion-topic': {
    title: '力与运动专题',
    knowledgeId: 'mechanics-5x-1',
    Component: lazy(() => import('@/features/mechanics/force-motion/ForceMotionTopic')),
    defaultParams: {
      mode: 0,
      v0: 5,
      theta: 0,
      m: 2,
      env1: 0,
      env2: 0,
      env3: 0,
    },
    paramMeta: [],
    SidebarExtra: lazy(() => import('@/features/mechanics/force-motion/ForceMotionSidebar')),
  },
})
