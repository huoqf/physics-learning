import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
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
    } as const,
    paramMeta: [
      { key: 'W', label: '外界做功 W', min: -500, max: 500, step: 10, unit: 'J' },
      { key: 'Q', label: '热源供热量 Q', min: -500, max: 500, step: 10, unit: 'J',
        hideIf: 'adiabatic', hideIfValue: 1 },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawSidebar')),
    controlMeta: [
      { type: 'segmented', key: 'mode', label: '分析模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '进阶模式' }] },
      { type: 'tip', group: '教学提示',
        content: '拖动 W/Q 滑块，观察能量守恒天平' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawCenterExtra')),
    centerExtraMode: 'mode',
  },
})
