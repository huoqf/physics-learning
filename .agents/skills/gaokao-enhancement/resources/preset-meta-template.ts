import type { ControlMeta, ParamMeta } from '@/data/types'

/**
 * 动画注册表中添加高考真题预设与临界刻度的模板代码
 * 供 Agent 扩展已有 93 个物理动画注册时直接引入与套用
 */

/** 高考真题预设 ControlMeta 示例 */
export const gaokaoExamPresetsMeta: ControlMeta[] = [
  {
    type: 'preset',
    label: '📋 2024全国新课标卷第21题（板块相对滑动）',
    description: 'm1=1kg, m2=2kg, μ1=0.2, v0=6m/s',
    params: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    restartOnApply: true,
  },
  {
    type: 'preset',
    label: '📋 2023北京卷第18题（临界不脱离）',
    description: 'm1=1.5kg, m2=1.5kg, μ1=0.4, v0=8m/s',
    params: { m1: 1.5, m2: 1.5, mu1: 0.4, v0: 8 },
    restartOnApply: true,
  },
]

/** 高考临界刻度 ParamMeta 示例 */
export const gaokaoCriticalParamMeta: ParamMeta[] = [
  {
    key: 'v0',
    label: '初速度 v0',
    min: 0,
    max: 12,
    unit: 'm/s',
    marks: [
      { value: 0, label: '0' },
      { value: 4.5, label: '临界: 恰好滑脱', variant: 'critical' },
      { value: 8, label: '推荐' },
    ],
  },
]
