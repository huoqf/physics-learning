import type { KnowledgeNode } from '../types'
import { DOUBLE_SLIT_DEFAULT_PARAMS } from '@/physics/optics'
import { SIMPLE_PENDULUM_DEFAULT_PARAMS } from '@/physics/experimentPendulum'

export const experimentKnowledge: KnowledgeNode[] = [
  // ── 力学实验专题 ─────────────────────────────────────────────────────────────
  {
    id: 'experiment-1-1',
    title: '力学实验基础与纸带/光电门分析',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-mechanics-experiment-base'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'experiment-2-1',
    title: '探究加速度与力、质量的关系',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-mechanics-experiment-base'],
    problemIds: ['prob-2024-quanguo-exp-tape'],
    prerequisites: ['experiment-1-1'],
  },
  {
    id: 'experiment-2-2',
    title: '验证机械能守恒定律',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-mechanics-experiment-base', 'anim-free-fall'],
    animationParams: {
      mode: 0,
      v0: 0,
      a: 9.8,
      freq: 50,
    },
    problemIds: [],
    prerequisites: ['experiment-1-1'],
    coverageNote:
      '覆盖度声明：本节点借用「打点纸带/自由落体」原理动画，只演示纸带点迹与运动学量的测量。实验必需的「选取第 1、2 点间距约 2 mm 的纸带」「逐点比对 mgh 与 ½mv²」「因阻力导致 ΔEₖ 略小于 ΔEₚ 的误差归因」三个环节尚未实现。',
  },
  {
    id: 'experiment-2-3',
    title: '验证动量守恒定律',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-momentum-conservation'],
    animationParams: {
      advancedMode: 2,
      m1_exp: 0.4,
      m2_exp: 0.2,
      v1_exp: 0.8,
      plateWidth_mm: 20.0,
      collisionType_exp: 0,
      timing_err: 0,
    },
    problemIds: ['prob-2022-quanguo-exp-momentum'],
    prerequisites: ['experiment-1-1'],
  },
  {
    id: 'experiment-2-4',
    title: '用单摆测重力加速度',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-simple-pendulum'],
    animationParams: {
      ...SIMPLE_PENDULUM_DEFAULT_PARAMS,
      mode: 3,
    },
    problemIds: [],
    prerequisites: ['experiment-1-1'],
  },

  // ── 电学实验专题 ─────────────────────────────────────────────────────────────
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
  {
    id: 'experiment-3-2',
    title: '描绘小灯泡的伏安特性曲线',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-experiment-bulb-va'],
    problemIds: [],
    prerequisites: ['experiment-1-2'],
  },
  {
    id: 'experiment-3-5',
    title: '多用电表的使用与内部原理',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-multimeter'],
    problemIds: ['prob-2024-quanguo-exp-multimeter'],
    prerequisites: ['experiment-1-2'],
  },

  // ── 光学实验专题 ─────────────────────────────────────────────────────────────
  {
    id: 'experiment-3-3',
    title: '测定玻璃的折射率（插针法）',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-experiment-refraction', 'anim-refraction'],
    problemIds: [],
    prerequisites: [],
  },
  {
    id: 'experiment-3-4',
    title: '用双缝干涉测光的波长',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-double-slit-interference'],
    animationParams: {
      ...DOUBLE_SLIT_DEFAULT_PARAMS,
      mode: 1,
    },
    problemIds: ['prob-2023-quanguo-exp-doubleslit'],
    prerequisites: [],
  },

  // ── 热学实验专题 ─────────────────────────────────────────────────────────────
  {
    id: 'experiment-4-1',
    title: '用油膜法估测油酸分子的大小',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-oil-film-experiment'],
    problemIds: [],
    prerequisites: [],
  },
]

