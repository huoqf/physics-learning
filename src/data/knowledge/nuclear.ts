import type { KnowledgeNode } from '../types'

export const nuclearKnowledge: KnowledgeNode[] = [
  {
    id: 'nuclear-1-1',
    title: '原子核的组成与天然放射',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-decay'],
    problemIds: [],
    prerequisites: ['modern-1-3'], // 依赖原子的核式结构模型
  },
  {
    id: 'nuclear-1-2',
    title: '原子核衰变与半衰期',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-half-life'],
    problemIds: [],
    prerequisites: ['nuclear-1-1'],
  },
  {
    id: 'nuclear-1-3',
    title: '核反应、结合能与质量亏损',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-reaction'],
    problemIds: [],
    prerequisites: ['nuclear-1-2'],
  },
  {
    id: 'nuclear-1-4',
    title: '重核裂变与轻核聚变',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-reaction'],
    problemIds: [],
    prerequisites: ['nuclear-1-3'],
  },
]
