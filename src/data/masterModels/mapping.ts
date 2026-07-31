import type { Problem } from '../types'
import { masterModels } from './models'
import type { MasterModel } from './types'

/**
 * 根据知识树节点 ID 查询关联的 18 大 Master 模型 (软匹配，支持多对多)
 * 优先级：
 * 1. 匹配 model.knowledgeId === knowledgeId
 * 2. 匹配 model.knowledgeIds 包含 knowledgeId
 * 3. 标签/关键词软模糊推断
 */
export function getModelsByKnowledgeId(knowledgeId: string): MasterModel[] {
  if (!knowledgeId) return []

  return masterModels.filter((model) => {
    if (model.knowledgeId === knowledgeId) return true
    if (model.knowledgeIds && model.knowledgeIds.includes(knowledgeId)) return true
    return false
  })
}

/**
 * 根据真题 Problem 查询关联的 18 大 Master 模型
 * 软推断逻辑：
 * 1. 优先读取 problem.masterModelId
 * 2. 若无 masterModelId，则根据 problem.knowledgeIds 寻找有知识点交集的模型
 */
export function getModelsByProblem(problem: Problem): MasterModel[] {
  if (!problem) return []

  if (problem.masterModelId) {
    const directModel = masterModels.find((m) => m.id === problem.masterModelId)
    if (directModel) return [directModel]
  }

  // 软交集匹配
  if (problem.knowledgeIds && problem.knowledgeIds.length > 0) {
    return masterModels.filter((m) => {
      if (problem.knowledgeIds.includes(m.knowledgeId)) return true
      if (m.knowledgeIds && m.knowledgeIds.some((kid) => problem.knowledgeIds.includes(kid))) return true
      return false
    })
  }

  return []
}

/**
 * 获取真题主要对应的 Master 模型（单个）
 */
export function getProblemMasterModel(problem: Problem): MasterModel | undefined {
  const models = getModelsByProblem(problem)
  return models[0]
}
