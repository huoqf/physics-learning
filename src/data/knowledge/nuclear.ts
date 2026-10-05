import type { KnowledgeNode } from '../types'

export const nuclearKnowledge: KnowledgeNode[] = [
  {
    id: 'nuclear-1-1',
    title: '原子核的组成与天然放射',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-decay'],
    problemIds: ['prob-2024-quanguo-nuclear-decay', 'prob-2023-zhejiang-magnetic-decay'],
    gaokaoFrequency: '5年7考 / 射线与磁场轨迹',
    prerequisites: ['modern-1-3'], // 依赖原子的核式结构模型
  },
  {
    id: 'nuclear-1-2',
    title: '原子核衰变与半衰期',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-half-life'],
    problemIds: ['prob-2024-quanguo-nuclear-decay', 'prob-2023-beijing-carbon-halflife'],
    gaokaoFrequency: '5年6考 / 半衰期计算',
    prerequisites: ['nuclear-1-1'],
  },
  {
    id: 'nuclear-1-3',
    title: '核反应、结合能与质量亏损',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-reaction'],
    problemIds: ['prob-2024-shandong-fusion-binding'],
    gaokaoFrequency: '5年8考 / 质能方程与结合能',
    prerequisites: ['nuclear-1-2'],
  },
  {
    id: 'nuclear-1-4',
    title: '重核裂变与轻核聚变',
    chapter: '核物理',
    module: 'nuclear',
    importance: 'gaokao',
    animationIds: ['anim-nuclear-reaction'],
    problemIds: ['prob-2024-shandong-fusion-binding'],
    gaokaoFrequency: '5年9考 / 聚变裂变方程',
    prerequisites: ['nuclear-1-3'],
  },
]
