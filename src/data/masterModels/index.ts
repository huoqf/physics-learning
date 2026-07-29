import { masterModels } from './models'
import type { MasterModel } from './types'

export type { MasterModel, MasterModelQuickFormula } from './types'
export { masterModels } from './models'

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
  return masterModels.find((m) => m.knowledgeId === knowledgeId)
}
