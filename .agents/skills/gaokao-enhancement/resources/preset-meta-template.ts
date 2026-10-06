import type { ControlMeta, ParamMeta } from '@/data/types'

/**
 * 动画注册表中添加高考真题预设与临界刻度的模板代码
 * 供 Agent 扩展已有 93 个物理动画注册时直接引入与套用
 */

/** 典型物理情境预设 ControlMeta 示例（必须置于 segmented 模式与 toggle 开关之后） */
export const gaokaoExamPresetsMeta: ControlMeta[] = [
  {
    type: 'preset',
    label: '⚡ 临界滑脱工况 (m1=1kg, v0=6m/s)',
    description: '板块间摩擦力达到最大静摩擦力临界状态',
    group: '典型情境预设',
    params: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    restartOnApply: true,
  },
  {
    type: 'preset',
    label: '⚡ 一同减速工况 (μ1=0.4, v0=8m/s)',
    description: '两物块保持相对静止一同减速滑行',
    group: '典型情境预设',
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
