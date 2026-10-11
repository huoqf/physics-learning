import type { KnowledgeNode } from '../types'

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
    problemIds: [],
    prerequisites: ['experiment-1-1'],
    coverageNote:
      '覆盖度声明：本节点借用「碰撞中动量守恒」原理动画，只演示碰撞前后的动量关系。实验必需的气垫导轨/两小车、光电门测碰前碰后速度、m₁v₁ = m₁v₁′ + m₂v₂′ 的读数比对与误差分析尚未实现。',
  },
  {
    id: 'experiment-2-4',
    title: '用单摆测重力加速度',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-simple-pendulum'],
    problemIds: [],
    prerequisites: ['experiment-1-1'],
    coverageNote:
      '覆盖度声明：本节点借用「单摆振动规律」原理动画，只演示周期与摆长的定性关系。实验必需的摆长 L = l + d/2 测量、30~50 次全振动计时取平均、g = 4π²L/T² 的数据处理与系统误差分析尚未实现。',
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
    title: '测定玻璃的折射率',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-refraction'],
    problemIds: [],
    prerequisites: [],
    coverageNote:
      '覆盖度声明：本节点借用「光的折射定律」理论动画（中屏画的是半圆形玻璃砖，矩形砖只在进阶模式）。实验必需的插针法装置与操作——矩形玻璃砖、大头针 P₁~P₄ 依次插针并以前针遮挡后针定位光路、量角器读出入射角 i 与折射角 r、作图法求 n、多次测量取平均——尚未实现。',
  },
  {
    id: 'experiment-3-4',
    title: '用双缝干涉测光的波长',
    chapter: '实验专题',
    module: 'experiment',
    importance: 'gaokao',
    animationIds: ['anim-double-slit-interference'],
    problemIds: ['prob-2023-quanguo-exp-doubleslit'],
    prerequisites: [],
    coverageNote:
      '覆盖度声明：本节点借用「光的干涉」理论动画，只演示条纹间距 Δx = (L/d)λ 与条纹分布。实验必需的装置与读数——滤光片/单缝/双缝/遮光筒组装、测微目镜分划板对准与测微手轮读数、Δx = (xₙ − x₁)/(n − 1) 的逐差计算——尚未实现。',
  },
]

