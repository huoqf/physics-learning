import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

export const opticsThinLensAnimations = defineAnimations({
  'anim-thin-lens': {
    title: '薄透镜成像规律',
    knowledgeId: 'optics-2-1',
    Component: lazy(() => import('@/features/optics/thin-lens/ThinLensAnimation')),
    SidebarExtra: lazy(() => import('@/features/optics/thin-lens/ThinLensSidebar')),
    defaultParams: {
      mode: 0,
      isConcave: 0,
      u: 30,
      f: 10,
      L: 50,
    } as const,
    paramMeta: [
      { key: 'u', label: '物距 u', min: 1, max: 80, step: 0.5, unit: 'cm',
        showIf: 'mode', showIfValue: 0 },
      { key: 'f', label: '焦距 f', min: 5, max: 20, step: 0.5, unit: 'cm' },
      { key: 'L', label: '物屏距离 L', min: 41, max: 100, step: 1, unit: 'cm',
        showIf: 'mode', showIfValue: 1 },
    ],
  },
})
