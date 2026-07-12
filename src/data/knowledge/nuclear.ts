import type { KnowledgeNode } from '../types'

export const nuclearKnowledge: KnowledgeNode[] = [
  // ── 占位：核物理（预留后续开发） ───────────────────────────────────────────
  {
    id: 'nuclear-1-1',
    title: '原子核的组成',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'nuclear-1-2',
    title: '放射性衰变',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: ['nuclear-1-1'],
  },
  {
    id: 'nuclear-1-3',
    title: '核反应与质能方程',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: ['nuclear-1-2'],
  },
]
