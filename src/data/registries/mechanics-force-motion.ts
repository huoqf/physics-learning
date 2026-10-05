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
  mode: 0, v0: 5, theta: 0, m: 2, env1: 0, env2: 0, env3: 0, showDecomposition: 0,
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
      return configs.map((cfg) => {
        let marks: { value: number; label: string }[] | undefined
        if (cfg.key === 'theta') {
          if (mode === 3) {
            marks = [
              { value: 0, label: '0°' },
              { value: 45, label: '45°(最大射程)' },
              { value: 90, label: '90°(竖直上抛)' },
            ]
          }
        } else if (cfg.key === 'env2' && mode === 6) {
          marks = [
            { value: 0, label: '轻绳' },
            { value: 1, label: '轻杆' },
          ]
        } else if (cfg.key === 'env3' && mode === 9) {
          marks = [
            { value: 0, label: '恒功率启动' },
            { value: 1, label: '电磁阻力单杆' },
          ]
        }

        return {
          key: cfg.key,
          label: cfg.label,
          min: cfg.min,
          max: cfg.max,
          step: cfg.step,
          unit: cfg.unit,
          marks,
        }
      })
    },

    controlMeta: [
      { type: 'modeGrid', key: 'mode', group: '模型选择',
        modes: FORCE_MOTION_MODES, resetOnChange: true,
        onChangeSideEffect: (v) => ({ setParams: PARAMS_FOR_MODE[v] ?? PARAMS_FOR_MODE[0] }),
      },
      {
        type: 'toggle',
        key: 'showDecomposition',
        label: '📐 正交分解合外力 (切向Ft / 法向Fn)',
        group: '教学分析',
      },
      {
        type: 'preset',
        label: '📋 2024新课标卷真题（斜抛轨迹与射程）',
        group: '高考经典考题预设',
        params: { mode: 3, v0: 8, theta: 45, m: 1, env1: 9.8, showDecomposition: 1 },
      },
      {
        type: 'preset',
        label: '📋 竖直圆周绳模型临界（恰好过最高点）',
        group: '高考经典考题预设',
        params: { mode: 6, v0: 9.9, m: 1, env1: 2, env2: 0, showDecomposition: 1 },
      },
      {
        type: 'preset',
        label: '📋 汽车恒功率启动与收尾速度模型',
        group: '高考经典考题预设',
        params: { mode: 9, v0: 2, m: 2, env1: 120, env2: 15, env3: 0, showDecomposition: 0 },
      },
      {
        type: 'preset',
        label: '📋 电磁感应单杆恒力启动收尾速度',
        group: '高考经典考题预设',
        params: { mode: 9, v0: 0, m: 1, env1: 20, env2: 4, env3: 1, showDecomposition: 0 },
      },
      {
        type: 'tip',
        group: '力与运动因果决策导图',
        content: '• F合=0 ➔ 匀速直线/静止（牛一平衡态）\n• F合恒定同向 ➔ 匀加速直线；反向 ➔ 匀减速直线（刹车陷阱）\n• F合恒定成夹角 ➔ 匀变速曲线（轨迹弯向合力侧）\n• F合时刻垂直v ➔ 速率不变仅变向（向心力）\n• F合=-kx ➔ 简谐往复；F合随v自适应减小 ➔ 收尾极值',
      },
    ],
  },
})
