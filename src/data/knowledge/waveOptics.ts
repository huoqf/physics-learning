import type { KnowledgeNode } from '../types'

export const waveOpticsKnowledge: KnowledgeNode[] = [
  // ── 占位：波动光学（预留后续开发） ─────────────────────────────────────────
  {
    id: 'wave-optics-1-1',
    title: '光的干涉',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'wave-optics-1-2',
    title: '光的衍射',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: [],
    problemIds: [],
    prerequisites: ['wave-optics-1-1'],
  },
]
