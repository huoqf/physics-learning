import type { KnowledgeNode } from '../types'

export const opticsKnowledge: KnowledgeNode[] = [
  {
    id: 'optics-1-1',
    title: '光的反射定律',
    chapter: '光学 几何光学',
    module: 'optics',
    importance: 'core',
    animationIds: ['anim-reflection'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'optics-1-2',
    title: '光的折射定律',
    chapter: '光学 几何光学',
    module: 'optics',
    importance: 'gaokao',
    animationIds: ['anim-refraction'],
    problemIds: [],
    prerequisites: ['optics-1-1'],
  },
  {
    id: 'optics-1-3',
    title: '全反射与临界角',
    chapter: '光学 几何光学',
    module: 'optics',
    importance: 'gaokao',
    animationIds: ['anim-total-reflection'],
    problemIds: [],
    prerequisites: ['optics-1-2'],
  },
  {
    id: 'optics-2-1',
    title: '薄透镜成像规律',
    chapter: '光学 几何光学',
    module: 'optics',
    importance: 'gaokao',
    animationIds: ['anim-thin-lens'],
    problemIds: [],
    prerequisites: ['optics-1-2'],
  },
]
