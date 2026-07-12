import type { KnowledgeNode } from './types'
import {
  mechanicsKnowledge,
  electricityKnowledge,
  thermodynamicsKnowledge,
  opticsKnowledge,
  modernPhysicsKnowledge,
  vibrationKnowledge,
  waveOpticsKnowledge,
  nuclearKnowledge,
  experimentKnowledge,
} from './knowledge'

export const knowledgeTree: KnowledgeNode[] = [
  ...mechanicsKnowledge,
  ...electricityKnowledge,
  ...thermodynamicsKnowledge,
  ...opticsKnowledge,
  ...modernPhysicsKnowledge,
  ...vibrationKnowledge,
  ...waveOpticsKnowledge,
  ...nuclearKnowledge,
  ...experimentKnowledge,
]

export const knowledgeIndex: Record<string, KnowledgeNode> = {}

knowledgeTree.forEach(node => {
  knowledgeIndex[node.id] = node
})

export function getKnowledgeNode(id: string): KnowledgeNode | undefined {
  return knowledgeIndex[id]
}
