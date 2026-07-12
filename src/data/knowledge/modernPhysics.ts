import type { KnowledgeNode } from '../types'

export const modernPhysicsKnowledge: KnowledgeNode[] = [
  // ── 近代物理初步 ──────────────────────────────────────────────────────────
  {
    id: 'modern-1-1',
    title: '原子结构与玻尔理论',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: ['anim-bohr-theory'],
    problemIds: [],
    prerequisites: ['optics-2-1'],
  },
  {
    id: 'modern-1-2',
    title: '光电效应与光的波粒二象性',
    chapter: '近代物理初步',
    module: 'modern-physics',
    importance: 'gaokao',
    animationIds: ['anim-photoelectric'],
    problemIds: [],
    prerequisites: [],
  },
]
