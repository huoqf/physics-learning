import type { KnowledgeNode } from '../types'

export const vibrationKnowledge: KnowledgeNode[] = [
  // ── 占位：机械振动与波（预留后续开发） ─────────────────────────────────────
  {
    id: 'vibration-1-1',
    title: '简谐运动',
    chapter: '机械振动与波 第1章 机械振动',
    module: 'vibration',
    importance: 'gaokao',
    animationIds: ['anim-simple-harmonic'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'vibration-1-2',
    title: '单摆',
    chapter: '机械振动与波 第1章 机械振动',
    module: 'vibration',
    importance: 'gaokao',
    animationIds: ['anim-simple-pendulum'],
    problemIds: [],
    prerequisites: ['vibration-1-1'],
  },
  {
    id: 'vibration-2-1',
    title: '机械波的形成与传播',
    chapter: '机械振动与波 第2章 机械波',
    module: 'vibration',
    importance: 'gaokao',
    animationIds: ['anim-mechanical-wave'],
    problemIds: [],
    prerequisites: ['vibration-1-1'],
  },
  {
    id: 'vibration-2-2',
    title: '波的干涉与衍射',
    chapter: '机械振动与波 第2章 机械波',
    module: 'vibration',
    importance: 'gaokao',
    animationIds: ['anim-wave-diffraction', 'anim-wave-interference'],
    problemIds: [],
    prerequisites: ['vibration-2-1'],
  },
]
