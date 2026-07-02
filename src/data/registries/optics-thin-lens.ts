import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsThinLensAnimations = defineAnimations({
  'anim-thin-lens': {
    title: '薄透镜成像规律',
    knowledgeId: 'optics-2-1',
    Component: lazy(() => import('@/features/optics/thin-lens/ThinLensAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      isConcave: 0,
      u: 30,
      f: 10,
      L: 50,
    } as const,
    controlMeta: [
      { type: 'segmented', key: 'mode', label: '观察模式', resetOnChange: true,
        options: [{ value: 0, label: '凸透镜基础成像' }, { value: 1, label: '共轭法测焦距' }] },
      { type: 'toggle', key: 'isConcave', label: '凹透镜', showIf: 'mode', showIfValue: 0 },
      { type: 'tip', showIf: 'mode', showIfValue: 0, content: '凹透镜始终成正立缩小虚像' },
      { type: 'tip', showIf: 'mode', showIfValue: 0, content: '将蜡烛移近焦点 F，观察像的变化' },
      { type: 'tip', showIf: 'mode', showIfValue: 1, content: '固定蜡烛与光屏，拖动透镜寻找两个成像位置' },
    ],
    paramMeta: [
      { key: 'u', label: '物距 u', min: 1, max: 80, step: 0.5, unit: 'cm',
        showIf: 'mode', showIfValue: 0 },
      { key: 'f', label: '焦距 f', min: 5, max: 20, step: 0.5, unit: 'cm' },
      { key: 'L', label: '物屏距离 L', min: 41, max: 100, step: 1, unit: 'cm',
        showIf: 'mode', showIfValue: 1 },
    ],
  },
})
