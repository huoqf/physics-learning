import { KnowledgeNode } from './types'

export const knowledgeTree: KnowledgeNode[] = []

export const knowledgeIndex: Record<string, KnowledgeNode> = {}

export function getKnowledgeNode(id: string): KnowledgeNode | undefined {
  return knowledgeIndex[id]
}
