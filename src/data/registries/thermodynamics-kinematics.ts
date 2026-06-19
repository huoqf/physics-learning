import { lazy } from 'react'
import { defineAnimations } from '../defineAnimations'

// ===== 热学 · 分子动理论 =====
export const thermodynamicsKinematicsAnimations = defineAnimations({
  'anim-brownian-motion': {
    title: '分子热运动与布朗运动',
    knowledgeId: 'thermodynamics-1-1',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotion')),
    defaultParams: {
      mode: 0,
      temperature: 300,
      particleD: 5,
      showTrajectory: 1,
      showMolecules: 0,
    },
    paramMeta: [
      { key: 'temperature', label: '温度 T', min: 273, max: 373, step: 1, unit: 'K' },
      { key: 'particleD', label: '微粒直径 d', min: 1, max: 10, step: 0.5, unit: 'μm' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionCenterExtra')),
  },

  'anim-intermolecular-forces': {
    title: '分子间作用力',
    knowledgeId: 'thermodynamics-1-3',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesAnimation')),
    defaultParams: {
      mode: 0,
      r: 2.0,
      autoRelease: 0,
    },
    paramMeta: [
      { key: 'r', label: '分子间距 r', min: 0.5, max: 10, step: 0.1, unit: 'r₀' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesCenterExtra')),
    centerExtraMode: 'mode',
  },
})
