import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 热学 · 气体实验三定律 =====
export const thermodynamicsGasLawsAnimations = defineAnimations({
  'anim-gas-laws': {
    title: '气体实验三定律',
    knowledgeId: 'thermodynamics-2-1',
    Component: lazy(() => import('@/features/thermodynamics/gasLaws/GasLawsAnimation')),
    defaultParams: {
      mode: 0,
      T: 300,
      V: 5e-3,
    } as const,
    paramMeta: [
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K' },
      { key: 'V', label: '体积 V', min: 1e-4, max: 1e-2, step: 1e-4, unit: 'm³' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/gasLaws/GasLawsSidebar')),
  },

  // ===== 热学 · 理想气体状态方程（Clapeyron 方程扩展）=====
  'anim-clapeyron': {
    title: '理想气体状态方程',
    knowledgeId: 'thermodynamics-2-2',
    Component: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronAnimation')),
    defaultParams: {
      mode: 0,
      V: 5e-3,
      T: 300,
    } as const,
    paramMeta: [
      { key: 'V', label: '体积 V', min: 1e-4, max: 1e-2, step: 1e-4, unit: 'm³' },
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', label: '演示模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '进阶模式' }] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '拖动 T 或 V，观察压强 P 自动约束变化' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '拖动 T 或 V，状态点在等温线族间跃迁' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronCenterExtra')),
    centerExtraMode: 'mode',
  },
})
