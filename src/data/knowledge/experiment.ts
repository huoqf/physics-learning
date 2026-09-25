import type { KnowledgeNode } from '../types'

export const experimentKnowledge: KnowledgeNode[] = [
  // ── 占位：实验专题（预留后续开发） ─────────────────────────────────────────
  {
    id: 'experiment-1-1',
    title: '力学实验基础',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-mechanics-experiment-base'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'experiment-1-2',
    title: '电学实验基础（测定电源电动势与内阻）',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-experiment-er'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'experiment-3-1',
    title: '测量金属丝的电阻率',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-experiment-resistivity'],
    problemIds: ['prob-2023-quanguo-23'],
    prerequisites: ['experiment-1-2'],
  },
]
