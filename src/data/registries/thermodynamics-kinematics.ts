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
      showMolecules: 1,
    },
    paramMeta: [
      { key: 'temperature', label: '温度 T', min: 273, max: 373, step: 1, unit: 'K' },
      { key: 'particleD', label: '微粒直径 d', min: 1, max: 10, step: 0.5, unit: 'μm' },
    ],
    SidebarExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionSidebar')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionCenterExtra')),
    centerExtraMode: 'mode',
  },
})
