import type { KnowledgeNode } from '../types'

export const waveOpticsKnowledge: KnowledgeNode[] = [
  {
    id: 'wave-optics-1-1',
    title: '光的干涉',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: ['anim-double-slit-interference'],
    problemIds: [],
    prerequisites: ['optics-1-2'], // 依赖光的折射定律
  },
  {
    id: 'wave-optics-1-2',
    title: '光的衍射',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: ['anim-diffraction'],
    problemIds: [],
    prerequisites: ['wave-optics-1-1'],
  },
  {
    id: 'wave-optics-1-3',
    title: '光的偏振',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: ['anim-polarization'],
    problemIds: [],
    prerequisites: ['wave-optics-1-2'],
  },
  {
    id: 'wave-optics-1-4',
    title: '激光的特性与应用',
    chapter: '波动光学',
    module: 'wave-optics',
    importance: 'gaokao',
    animationIds: ['anim-laser'],
    problemIds: [],
    prerequisites: ['wave-optics-1-3'],
  },
]
