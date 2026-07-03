import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { FORCE_MOTION_MAX_TIME } from '@/features/mechanics/force-motion/forceMotionLayout'

export const mechanicsForceMotionAnimations = defineAnimations({
  'anim-force-motion-topic': {
    title: '力与运动专题',
    knowledgeId: 'mechanics-5x-1',
    Component: lazy(() => import('@/features/mechanics/force-motion/ForceMotionTopic')),
    defaultParams: {
      mode: 0,
      v0: 5,
      theta: 0,
      m: 2,
      env1: 0,
      env2: 0,
      env3: 0,
    } as const,
    paramMeta: [],
    // 长时观察：收尾速度（mode 9）需要 5τ 才能看到位移线性段；
    // 恒力加速（mode 1/2）30s 处位移会贴顶变水平线造成「卡住」错觉。
    // 60s（FORCE_MOTION_MAX_TIME）足够覆盖典型物理观察过程，且不会让时间轴
    // 尾部空白过多。同常量也被 ForceMotionTopic 用于生成图表 domainPoints，
    // 单一来源避免播放上限与图表定标范围不一致。
    maxTime: FORCE_MOTION_MAX_TIME,
    controlMeta: [
      { type: 'tip', group: '教学提示', content: '选择模式后调节参数，点击播放观察小球运动、矢量箭头与三图表同步变化。' },
    ],
    SidebarExtra: lazy(() => import('@/features/mechanics/force-motion/ForceMotionSidebar')),
  },
})
