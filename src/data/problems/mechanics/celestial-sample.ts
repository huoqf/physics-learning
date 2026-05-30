import { Problem } from '../../types'

export const celestialProblems: Problem[] = [
  {
    id: 'prob-m6-1',
    year: 2023,
    province: '全国甲',
    title: '万有引力定律 — 天体质量计算',
    content:
      '已知地球半径 $R = 6.4 \\times 10^6\\,\\text{m}$，地球表面重力加速度 $g = 10\\,\\text{m/s}^2$，引力常量 $G = 6.67 \\times 10^{-11}\\,\\text{N}\\cdot\\text{m}^2/\\text{kg}^2$。求：\n(1) 地球的质量；\n(2) 地球的平均密度。',
    difficulty: 3,
    knowledgeIds: ['mechanics-6-2', 'mechanics-6-1'],
    steps: [
      {
        id: 'prob-m6-1-step-1',
        description: '利用地表重力求地球质量',
        formula:
          '$$\\frac{GMm}{R^2} = mg$$\n$$M = \\frac{gR^2}{G} = \\frac{10 \\times (6.4 \\times 10^6)^2}{6.67 \\times 10^{-11}} \\approx 6.14 \\times 10^{24}\\,\\text{kg}$$',
        explanation: '地球表面物体所受重力近似等于万有引力。',
        knowledgeId: 'mechanics-6-2'
      },
      {
        id: 'prob-m6-1-step-2',
        description: '计算地球平均密度',
        formula:
          '$$\\rho = \\frac{M}{V} = \\frac{M}{\\frac{4}{3}\\pi R^3} = \\frac{3g}{4\\pi GR}$$\n$$\\rho = \\frac{3 \\times 10}{4\\pi \\times 6.67 \\times 10^{-11} \\times 6.4 \\times 10^6} \\approx 5.6 \\times 10^3\\,\\text{kg/m}^3$$',
        explanation: '地球体积按球体计算，密度等于质量除以体积。',
        knowledgeId: 'mechanics-6-2'
      }
    ]
  },
  {
    id: 'prob-m6-2',
    year: 2022,
    province: '全国乙',
    title: '人造卫星 — 同步卫星参数',
    content:
      '已知地球质量 $M = 6.0 \\times 10^{24}\\,\\text{kg}$，半径 $R = 6.4 \\times 10^6\\,\\text{m}$，地球自转周期 $T = 24\\,\\text{h}$，引力常量 $G = 6.67 \\times 10^{-11}\\,\\text{N}\\cdot\\text{m}^2/\\text{kg}^2$。求地球同步卫星的：\n(1) 轨道半径；\n(2) 线速度；\n(3) 向心加速度。',
    difficulty: 3,
    knowledgeIds: ['mechanics-6-3', 'mechanics-6-2'],
    steps: [
      {
        id: 'prob-m6-2-step-1',
        description: '求轨道半径',
        formula:
          '$$\\frac{GMm}{r^2} = m\\frac{4\\pi^2}{T^2}r$$\n$$r^3 = \\frac{GMT^2}{4\\pi^2} = \\frac{6.67 \\times 10^{-11} \\times 6.0 \\times 10^{24} \\times (24 \\times 3600)^2}{4\\pi^2}$$\n$$r \\approx 4.23 \\times 10^7\\,\\text{m} \\approx 6.6R$$',
        explanation:
          '同步卫星周期等于地球自转周期，万有引力提供向心力。轨道半径约为地球半径的 6.6 倍。',
        knowledgeId: 'mechanics-6-3'
      },
      {
        id: 'prob-m6-2-step-2',
        description: '求线速度',
        formula:
          '$$v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times 4.23 \\times 10^7}{24 \\times 3600} \\approx 3.07 \\times 10^3\\,\\text{m/s} \\approx 3.07\\,\\text{km/s}$$',
        explanation: '线速度等于圆周周长除以周期。',
        knowledgeId: 'mechanics-6-3'
      },
      {
        id: 'prob-m6-2-step-3',
        description: '求向心加速度',
        formula:
          '$$a = \\frac{v^2}{r} = \\frac{(3.07 \\times 10^3)^2}{4.23 \\times 10^7} \\approx 0.22\\,\\text{m/s}^2$$',
        explanation: '向心加速度也可用 $a = \\omega^2 r = (2\\pi/T)^2 r$ 计算。',
        knowledgeId: 'mechanics-6-3'
      }
    ]
  },
  {
    id: 'prob-m6-3',
    year: 2021,
    province: '北京',
    title: '卫星变轨 — 轨道转移',
    content:
      '一卫星在半径为 $r_1$ 的圆轨道 I 上运行，速度为 $v_1$。在某点加速后进入椭圆转移轨道 II，远地点距离地心为 $r_2$，然后在远地点再次加速进入半径为 $r_2$ 的圆轨道 III。求：\n(1) 卫星在轨道 I 上的速度 $v_1$；\n(2) 卫星在椭圆轨道 II 近地点的速度 $v_{\\text{近}}$；\n(3) 卫星在轨道 III 上的速度 $v_3$。',
    difficulty: 4,
    knowledgeIds: ['mechanics-6-3', 'mechanics-6-1', 'mechanics-7-5'],
    steps: [
      {
        id: 'prob-m6-3-step-1',
        description: '圆轨道 I 的速度',
        formula: '$$\\frac{GMm}{r_1^2} = m\\frac{v_1^2}{r_1} \\Rightarrow v_1 = \\sqrt{\\frac{GM}{r_1}}$$',
        explanation: '圆轨道上万有引力提供向心力。',
        knowledgeId: 'mechanics-6-3'
      },
      {
        id: 'prob-m6-3-step-2',
        description: '椭圆轨道近地点速度',
        formula:
          '$$\\text{由开普勒第二定律: } v_{\\text{近}} r_1 = v_{\\text{远}} r_2$$\n$$\\text{由机械能守恒: } \\frac{1}{2}mv_{\\text{近}}^2 - \\frac{GMm}{r_1} = \\frac{1}{2}mv_{\\text{远}}^2 - \\frac{GMm}{r_2}$$',
        explanation:
          '椭圆轨道上角动量守恒（开普勒第二定律）和机械能守恒同时成立。',
        knowledgeId: 'mechanics-6-1'
      },
      {
        id: 'prob-m6-3-step-3',
        description: '联立求解',
        formula:
          '$$v_{\\text{近}} = \\sqrt{\\frac{2GMr_2}{r_1(r_1 + r_2)}}$$\n$$v_3 = \\sqrt{\\frac{GM}{r_2}}$$',
        explanation:
          '$v_{\\text{近}} > v_1$，因为在近地点需要加速才能进入转移轨道；$v_3 < v_{\\text{远}}$，因为在远地点需要加速才能进入高轨道。',
        knowledgeId: 'mechanics-7-5'
      }
    ]
  }
]
