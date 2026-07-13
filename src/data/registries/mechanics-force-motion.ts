import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import {
  FORCE_MOTION_MAX_TIME,
  FORCE_MOTION_MODES,
  FORCE_MOTION_PARAM_CONFIGS,
} from '@/features/mechanics/force-motion/forceMotionLayout'
import { getForceMotionDefaultEnv } from '@/physics'
import type { ParamMeta } from '@/data/types'

const FORCE_MOTION_DEFAULT_PARAMS = {
  mode: 0, v0: 5, theta: 0, m: 2, env1: 0, env2: 0, env3: 0,
} as const

// 每个模式的完整参数快照（以 defaultParams 为基础，覆盖模式专属默认值）
const PARAMS_FOR_MODE: Record<number, Record<string, number>> = {}
for (const [modeStr, configs] of Object.entries(FORCE_MOTION_PARAM_CONFIGS)) {
  const mode = Number(modeStr)
  const snapshot: Record<string, number> = {
    ...FORCE_MOTION_DEFAULT_PARAMS,
    mode,
    env1: getForceMotionDefaultEnv(mode),
  }
  for (const cfg of configs) snapshot[cfg.key] = cfg.defaultValue
  PARAMS_FOR_MODE[mode] = snapshot
}

export const mechanicsForceMotionAnimations = defineAnimations({
  'anim-force-motion-topic': {
    title: '力与运动专题',
    knowledgeId: 'mechanics-5x-1',
    Component: lazy(() => import('@/features/mechanics/force-motion/ForceMotionTopic')),
    defaultParams: FORCE_MOTION_DEFAULT_PARAMS,
    maxTime: FORCE_MOTION_MAX_TIME,

    buildParamMeta: (params): ParamMeta[] => {
      const mode = Math.round(params.mode ?? 0)
      const configs = FORCE_MOTION_PARAM_CONFIGS[mode] ?? FORCE_MOTION_PARAM_CONFIGS[0]
      return configs.map((cfg) => ({
        key: cfg.key,
        label: cfg.label,
        min: cfg.min,
        max: cfg.max,
        step: cfg.step,
        unit: cfg.unit,
      }))
    },

    controlMeta: [
      { type: 'modeGrid', key: 'mode', group: '模型选择',
        modes: FORCE_MOTION_MODES, resetOnChange: true,
        onChangeSideEffect: (v) => ({ setParams: PARAMS_FOR_MODE[v] ?? PARAMS_FOR_MODE[0] }),
      },
      { type: 'tip', group: '教学提示',
        content: '选择模式后调节参数，点击播放观察小球运动、矢量箭头与三图表同步变化。' },
    ],
  },
})
