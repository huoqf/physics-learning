import type { KnowledgeNode } from '../types'

export const modernPhysicsKnowledge: KnowledgeNode[] = [
  {
    id: 'modern-1-1',
    title: '黑体辐射与能量子',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'modern-1-2',
    title: '光电效应与光的波粒二象性',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: ['anim-photoelectric'],
    problemIds: [],
    prerequisites: ['modern-1-1'],
  },
  {
    id: 'modern-1-3',
    title: '原子的核式结构模型',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'modern-1-4',
    title: '玻尔原子理论与能级跃迁',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: ['anim-bohr-theory'],
    problemIds: [],
    prerequisites: ['modern-1-2', 'modern-1-3'],
  },
]
