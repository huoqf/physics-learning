import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import {
  FORCE_MOTION_MAX_TIME,
  FORCE_MOTION_MODES,
  FORCE_MOTION_PARAM_CONFIGS,
} from '@/features/mechanics/force-motion/forceMotionLayout'
import { getForceMotionDefaultEnv } from '@/physics'
import { getForceMotionCriticalTimes } from '@/physics/forceMotion'
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
    criticalTimes: (p) => getForceMotionCriticalTimes(p, FORCE_MOTION_MAX_TIME),

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
        label: '🎯 斜抛轨迹与射程（45°最大射程）',
        group: '典型工况',
        params: { mode: 3, v0: 8, theta: 45, m: 1, env1: 9.8, showDecomposition: 1 },
      },
      {
        type: 'preset',
        label: '🪢 绳模型临界（恰好过最高点）',
        group: '典型工况',
        params: { mode: 6, v0: 9.9, m: 1, env1: 2, env2: 0, showDecomposition: 1 },
      },
      {
        type: 'preset',
        label: '🚗 恒功率启动（达到最大速度）',
        group: '典型工况',
        params: { mode: 9, v0: 2, m: 2, env1: 120, env2: 15, env3: 0, showDecomposition: 0 },
      },
      {
        type: 'preset',
        label: '⚡ 单杆电磁阻力（恒力启动收尾）',
        group: '典型工况',
        params: { mode: 9, v0: 0, m: 1, env1: 20, env2: 4, env3: 1, showDecomposition: 0 },
      },
      {
        type: 'tip',
        group: '力与运动因果决策',
        // 原 142 字决策导图压缩为操作路径：逐条 F合→运动 的结论右屏按模式给出
        // （quantities/forceMotion.ts MODE_GAOKAO_POINTS[mode]），左屏只留"怎么用这些模式"。
        content: '先定 F合 再定运动：合力为零看匀速，恒定看匀变速，始终垂直于速度看圆周——切换上方模式逐一验证。',
      },
    ],
  },
})
