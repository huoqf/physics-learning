import { lazy } from 'react'
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
    },
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
    },
    paramMeta: [
      { key: 'V', label: '体积 V', min: 1e-4, max: 1e-2, step: 1e-4, unit: 'm³' },
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronCenterExtra')),
    centerExtraMode: 'mode',
  },
})
