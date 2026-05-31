import type { LazyExoticComponent, ComponentType } from 'react'

export interface KnowledgeNode {
  id: string
  title: string
  chapter: string
  module: string
  importance: 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'
  animationIds: string[]
  problemIds: string[]
  prerequisites: string[]
}

export interface AnimationConfig {
  id: string
  title: string
  knowledgeId: string
  Component: LazyExoticComponent<ComponentType>
  defaultParams: Record<string, number>
}

export interface Problem {
  id: string
  year: number
  province: string
  title: string
  content: string
  difficulty: 1 | 2 | 3 | 4 | 5
  knowledgeIds: string[]
  steps: ProblemStep[]
}

export interface ProblemStep {
  id: string
  description: string
  formula?: string
  svgContent?: string
  explanation: string
  knowledgeId?: string
}
