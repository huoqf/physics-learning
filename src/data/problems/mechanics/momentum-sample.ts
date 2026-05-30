import { Problem } from '../../types'

export const momentumProblems: Problem[] = [
  {
    id: 'prob-m8-1',
    year: 2023,
    province: '全国甲',
    title: '动量定理 — 冲击力计算',
    content:
      '一质量为 $m = 0.4\\,\\text{kg}$ 的篮球从 $h = 1.25\\,\\text{m}$ 高处自由下落，与地面碰撞后反弹至 $h\' = 0.8\\,\\text{m}$。已知碰撞时间 $\\Delta t = 0.1\\,\\text{s}$，求篮球受到地面的平均冲击力。（$g = 10\\,\\text{m/s}^2$）',
    difficulty: 3,
    knowledgeIds: ['mechanics-8-3', 'mechanics-8-2'],
    steps: [
      {
        id: 'prob-m8-1-step-1',
        description: '求碰撞前后的速度',
        formula:
          '$$v_1 = \\sqrt{2gh} = \\sqrt{2 \\times 10 \\times 1.25} = 5\\,\\text{m/s}$$（向下）\n$$v_2 = \\sqrt{2gh\'} = \\sqrt{2 \\times 10 \\times 0.8} = 4\\,\\text{m/s}$$（向上）',
        explanation: '由自由落体公式求碰撞前速度，由竖直上抛公式求反弹速度。',
        knowledgeId: 'mechanics-8-2'
      },
      {
        id: 'prob-m8-1-step-2',
        description: '应用动量定理',
        formula:
          '$$\\text{取向上为正方向}$$\n$$(F - mg)\\Delta t = mv_2 - m(-v_1) = m(v_1 + v_2)$$\n$$(F - 0.4 \\times 10) \\times 0.1 = 0.4 \\times (5 + 4)$$\n$$F - 4 = 36$$\n$$F = 40\\,\\text{N}$$',
        explanation:
          '动量定理：合外力的冲量等于动量的变化量。注意速度方向，碰撞前向下为负。',
        knowledgeId: 'mechanics-8-3'
      }
    ]
  },
  {
    id: 'prob-m8-2',
    year: 2022,
    province: '全国乙',
    title: '动量守恒 — 反冲运动',
    content:
      '一质量为 $M = 100\\,\\text{kg}$ 的静止小船漂浮在水面上，船上一质量为 $m = 50\\,\\text{kg}$ 的人以相对船的速度 $v = 4\\,\\text{m/s}$ 水平向后跳离小船。求：\n(1) 人跳离后船的速度；\n(2) 若人跳离时船头距岸 $s = 10\\,\\text{m}$，求人落水点距岸的距离。',
    difficulty: 3,
    knowledgeIds: ['mechanics-8-4', 'mechanics-8-1'],
    steps: [
      {
        id: 'prob-m8-2-step-1',
        description: '分析动量守恒条件',
        explanation:
          '人和船组成的系统在水平方向不受外力（忽略水的阻力），水平方向动量守恒。',
        knowledgeId: 'mechanics-8-4'
      },
      {
        id: 'prob-m8-2-step-2',
        description: '建立动量守恒方程',
        formula:
          '$$\\text{设船的速度为 } V \\text{（向前为正）}$$\n$$\\text{人对地的速度} = v_{\\text{人对船}} + V = -4 + V$$\n$$0 = m(-4 + V) + MV$$\n$$0 = 50(V - 4) + 100V$$\n$$150V = 200$$\n$$V = \\frac{4}{3} \\approx 1.33\\,\\text{m/s}$$',
        explanation:
          '注意：题目给的是相对船的速度，需要转换到地面参考系。人向后跳，相对船速度为负。',
        knowledgeId: 'mechanics-8-4'
      },
      {
        id: 'prob-m8-2-step-3',
        description: '求人落水点距岸距离',
        formula:
          '$$v_{\\text{人对地}} = V - 4 = \\frac{4}{3} - 4 = -\\frac{8}{3}\\,\\text{m/s}$$\n$$t = \\frac{s}{|v_{\\text{人对地}}|} = \\frac{10}{8/3} = \\frac{30}{8} = 3.75\\,\\text{s}$$\n$$d = s + Vt = 10 + \\frac{4}{3} \\times 3.75 = 10 + 5 = 15\\,\\text{m}$$',
        explanation:
          '人向后跳，船向前运动。人落水时，船已向前移动了一段距离，所以人落水点距岸大于初始距离。',
        knowledgeId: 'mechanics-8-1'
      }
    ]
  },
  {
    id: 'prob-m8-3',
    year: 2021,
    province: '北京',
    title: '动量守恒 — 碰撞问题',
    content:
      '一质量为 $m_1 = 2\\,\\text{kg}$ 的小球以 $v_1 = 5\\,\\text{m/s}$ 的速度与静止的质量为 $m_2 = 3\\,\\text{kg}$ 的小球发生正碰。已知碰撞后 $m_1$ 的速度为 $v_1\' = 1\\,\\text{m/s}$，方向不变。求：\n(1) 碰撞后 $m_2$ 的速度；\n(2) 判断碰撞类型（弹性/非弹性）。',
    difficulty: 3,
    knowledgeIds: ['mechanics-8-4', 'mechanics-8-5'],
    steps: [
      {
        id: 'prob-m8-3-step-1',
        description: '应用动量守恒求 $v_2\'$',
        formula:
          '$$m_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'$$\n$$2 \\times 5 + 0 = 2 \\times 1 + 3v_2\'$$\n$$v_2\' = \\frac{10 - 2}{3} = \\frac{8}{3} \\approx 2.67\\,\\text{m/s}$$',
        explanation: '碰撞过程动量守恒，已知三个量可求第四个量。',
        knowledgeId: 'mechanics-8-4'
      },
      {
        id: 'prob-m8-3-step-2',
        description: '计算碰撞前后动能',
        formula:
          '$$E_{k\\text{前}} = \\frac{1}{2}m_1v_1^2 = \\frac{1}{2} \\times 2 \\times 25 = 25\\,\\text{J}$$\n$$E_{k\\text{后}} = \\frac{1}{2}m_1v_1\'^2 + \\frac{1}{2}m_2v_2\'^2 = \\frac{1}{2} \\times 2 \\times 1 + \\frac{1}{2} \\times 3 \\times \\frac{64}{9} = 1 + \\frac{32}{3} \\approx 11.67\\,\\text{J}$$',
        explanation: '分别计算碰撞前后的总动能，比较判断是否守恒。',
        knowledgeId: 'mechanics-8-5'
      },
      {
        id: 'prob-m8-3-step-3',
        description: '判断碰撞类型',
        formula: '$$E_{k\\text{前}} > E_{k\\text{后}}$$',
        explanation:
          '碰撞后动能减少，说明有机械能损失，属于非弹性碰撞。若为完全非弹性碰撞，两球会粘在一起运动。',
        knowledgeId: 'mechanics-8-5'
      }
    ]
  },
  {
    id: 'prob-m8-4',
    year: 2023,
    province: '全国乙',
    title: '弹性碰撞 — 一维弹性碰撞',
    content:
      '一质量为 $m_1 = 1\\,\\text{kg}$ 的小球以 $v_1 = 6\\,\\text{m/s}$ 的速度与静止的质量为 $m_2 = 2\\,\\text{kg}$ 的小球发生弹性正碰。求碰撞后两球的速度。',
    difficulty: 4,
    knowledgeIds: ['mechanics-8-5', 'mechanics-8-4'],
    steps: [
      {
        id: 'prob-m8-4-step-1',
        description: '建立动量守恒和动能守恒方程',
        formula:
          '$$m_1v_1 = m_1v_1\' + m_2v_2\'$$\n$$\\frac{1}{2}m_1v_1^2 = \\frac{1}{2}m_1v_1\'^2 + \\frac{1}{2}m_2v_2\'^2$$',
        explanation: '弹性碰撞同时满足动量守恒和动能守恒。',
        knowledgeId: 'mechanics-8-5'
      },
      {
        id: 'prob-m8-4-step-2',
        description: '利用弹性碰撞的相对速度关系',
        formula:
          '$$v_1 - v_2 = -(v_1\' - v_2\')$$\n$$6 - 0 = v_2\' - v_1\'$$\n$$v_2\' = v_1\' + 6$$',
        explanation: '弹性碰撞中，分离速度等于接近速度。这是弹性碰撞的重要推论。',
        knowledgeId: 'mechanics-8-5'
      },
      {
        id: 'prob-m8-4-step-3',
        description: '联立求解',
        formula:
          '$$1 \\times 6 = 1 \\times v_1\' + 2(v_1\' + 6)$$\n$$6 = 3v_1\' + 12$$\n$$v_1\' = -2\\,\\text{m/s}$$\n$$v_2\' = -2 + 6 = 4\\,\\text{m/s}$$',
        explanation:
          '$v_1\' = -2\\,\\text{m/s}$ 表示碰撞后 $m_1$ 反向运动。这符合物理直觉：轻球撞重球会反弹。',
        knowledgeId: 'mechanics-8-4'
      }
    ]
  }
]
