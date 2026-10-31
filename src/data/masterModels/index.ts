import { masterModels } from './models'
import type { MasterModel } from './types'

export type { MasterModel, MasterModelQuickFormula } from './types'
export { masterModels } from './models'
export { getModelsByKnowledgeId, getModelsByProblem, getProblemMasterModel } from './mapping'

/**
 * Master 模型条目总数 —— **唯一真源**，由数组长度派生。
 *
 * 任何 UI 文案（导航、首页入口、专区标题、真题解析点拨）都必须引用本常量，
 * 严禁再手写「18 大模型」这类字面数字：历史上模型已从 18 增到 20，
 * 而文案散落 10+ 处全部停留在 18，形成系统性失真（与 ANIMATION_COUNT 同类问题）。
 * 守卫：tests/data/masterModelCount.test.ts
 */
export const MASTER_MODEL_COUNT = masterModels.length

/** 专区统一称谓，如「高考 20 大 Master 压轴模型」 */
export const MASTER_MODEL_SERIES_LABEL = `高考 ${MASTER_MODEL_COUNT} 大 Master 压轴模型`

export const masterModelIndex: Record<string, MasterModel> = {}
masterModels.forEach((m) => {
  masterModelIndex[m.id] = m
})

export function getMasterModelById(id: string): MasterModel | undefined {
  return masterModelIndex[id]
}

export function getMasterModelsByCategory(category: string): MasterModel[] {
  if (category === 'all') return masterModels
  return masterModels.filter((m) => m.category === category)
}

export function getMasterModelByKnowledgeId(knowledgeId: string): MasterModel | undefined {
  return masterModels.find((m) => m.knowledgeId === knowledgeId || m.knowledgeIds?.includes(knowledgeId))
}
