import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { SANDBOX_ENERGY_LIMIT } from '@/physics/firstLaw'

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
      // 沙箱 W、Q 上限由气缸热容（nCv = 0.5 J/K）与初温 300 K 决定：
      // ΔT = (Q+W)/nCv，|W|、|Q| ≤ 50 J 时末态 T ∈ [100, 500] K，全程物理可行。
      { key: 'W', label: '外界做功 W', min: -SANDBOX_ENERGY_LIMIT, max: SANDBOX_ENERGY_LIMIT, step: 10, unit: 'J',
        hideIf: 'mode', hideIfValue: 1 },
      { key: 'Q', label: '热源供热量 Q', min: -SANDBOX_ENERGY_LIMIT, max: SANDBOX_ENERGY_LIMIT, step: 10, unit: 'J',
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
        content: '沙箱探索：W、Q 先按等容换热、再按绝热做功依次施加。气缸热容 nC_V = 0.5 J/K，故 ±50 J 即为物理可行范围。' },
      { type: 'tip', group: '教学提示',
        content: '绝热气缸 Q ≡ 0，此时 ΔU = W：压缩则升温、膨胀则降温，绝热不等于等温！' },
      { type: 'tip', group: '教学提示',
        content: '循环热机：点击下方播放，自动运行等压膨胀→等容加热→等压压缩→等容冷却循环。' },
    ],
    centerLayout: 'splitH',
    CenterExtra: lazy(() => import('@/features/thermodynamics/firstLaw/FirstLawCenterExtra')),
  },
})
