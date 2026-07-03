import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 热学 · 分子动理论 =====
export const thermodynamicsKinematicsAnimations = defineAnimations({
  'anim-brownian-motion': {
    title: '分子热运动与布朗运动',
    knowledgeId: 'thermodynamics-1-1',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotion')),
    controlsMode: 'timed',
    defaultParams: {
      mode: 0,
      temperature: 300,
      particleD: 5,
      showTrajectory: 1,
      showMolecules: 0,
    } as const,
    paramMeta: [
      { key: 'temperature', label: '温度 T', min: 273, max: 373, step: 1, unit: 'K' },
      { key: 'particleD', label: '微粒直径 d', min: 1, max: 10, step: 0.5, unit: 'μm' },
    ],
    controlMeta: [
      { type: 'toggle', key: 'showTrajectory', label: '显示追踪轨迹', group: '显示辅助' },
      { type: 'toggle', key: 'showMolecules', label: '显示微观分子', group: '显示辅助',
        showIf: 'mode', showIfValue: 1 },
      { type: 'segmented', key: 'mode', label: '演示模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础：宏观布朗运动' }, { value: 1, label: '进阶：微观碰撞机制' }] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '蓝色小球为液体分子，橙色箭头为瞬时合力。' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/BrownianMotionCenterExtra')),
  },

  'anim-intermolecular-forces': {
    title: '分子间作用力',
    knowledgeId: 'thermodynamics-1-3',
    Component: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      r: 2.0,
      autoRelease: 0,
    } as const,
    paramMeta: [
      { key: 'r', label: '分子间距 r', min: 0.5, max: 10, step: 0.1, unit: 'r₀' },
    ],
    controlMeta: [
      { type: 'toggle', key: 'autoRelease', label: '自动释放动画', group: '显示辅助' },
      { type: 'tip', group: '教学提示', showIf: 'autoRelease', showIfValue: 1,
        content: '分子将根据当前合力自主加速运动。' },
      { type: 'segmented', key: 'mode', label: '演示模式', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础：力的合成分解' }, { value: 1, label: '进阶：力与势能关联' }] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '右侧图表切换为 E_p-r 曲线，观察势阱。' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/kinematics/IntermolecularForcesCenterExtra')),
    centerExtraMode: 'mode',
  },
})
