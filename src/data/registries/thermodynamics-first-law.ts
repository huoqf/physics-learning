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
      { key: 'W', label: '外界做功 W', min: -500, max: 500, step: 10, unit: 'J',
        hideIf: 'mode', hideIfValue: 1 },
      { key: 'Q', label: '热源供热量 Q', min: -500, max: 500, step: 10, unit: 'J',
        hideIf: 'mode', hideIfValue: 1 },
    ],
    controlMeta: [
      // §1 模型选择
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '沙箱探索' }, { value: 1, label: '循环热机' }] },
      // §4 显示辅助
      { type: 'toggle', key: 'adiabatic', label: '绝热气缸', group: '显示辅助',
        hideIf: 'mode', hideIfValue: 1,
        onChangeSideEffect: { setParams: { Q: 0 } } },
      // §6 教学提示
      { type: 'tip', group: '教学提示',
        content: '沙箱探索：手动调节 W/Q 观察气缸与能量变化。绝热气缸下 Q 恒为 0。' },
      { type: 'tip', group: '教学提示',
        content: '循环热机：点击下方播放，自动运行等压膨胀→等容加热→等压压缩→等容冷却循环。' },
    ],
    centerLayout: 'splitH',
    CenterExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawCenterExtra')),
  },
})
