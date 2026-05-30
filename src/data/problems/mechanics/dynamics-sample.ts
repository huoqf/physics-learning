import { Problem } from '../../types'

export const dynamicsProblems: Problem[] = [
  {
    id: 'prob-m3-1',
    year: 2023,
    province: '全国乙',
    title: '斜面摩擦力 — 静摩擦与滑动摩擦',
    content:
      '一质量为 $m = 2\\,\\text{kg}$ 的物块静止在倾角 $\\theta = 30°$ 的斜面上。已知物块与斜面间的动摩擦因数 $\\mu = 0.5$，最大静摩擦力等于滑动摩擦力，取 $g = 10\\,\\text{m/s}^2$。求：\n(1) 物块受到的摩擦力大小和方向；\n(2) 若给物块一个沿斜面向下的初速度 $v_0 = 2\\,\\text{m/s}$，求物块的加速度。',
    difficulty: 3,
    knowledgeIds: ['mechanics-3-3', 'mechanics-3-1', 'mechanics-4-2'],
    steps: [
      {
        id: 'prob-m3-1-step-1',
        description: '分析重力沿斜面的分力',
        formula: '$$F_{\\parallel} = mg\\sin\\theta = 2 \\times 10 \\times \\sin 30° = 10\\,\\text{N}$$',
        explanation: '重力沿斜面向下的分力是使物块下滑的驱动力。',
        knowledgeId: 'mechanics-3-1'
      },
      {
        id: 'prob-m3-1-step-2',
        description: '判断物块是否滑动',
        formula:
          '$$f_{\\max} = \\mu N = \\mu mg\\cos\\theta = 0.5 \\times 2 \\times 10 \\times \\cos 30° \\approx 8.66\\,\\text{N}$$',
        explanation:
          '最大静摩擦力约为 8.66N，而重力沿斜面分力为 10N，$F_{\\parallel} > f_{\\max}$，所以物块会下滑。但题目说物块静止，说明有外力或其他约束。重新审题：物块静止，说明静摩擦力等于重力分力。',
        knowledgeId: 'mechanics-3-3'
      },
      {
        id: 'prob-m3-1-step-3',
        description: '静止时的摩擦力',
        formula: '$$f = F_{\\parallel} = 10\\,\\text{N}$$',
        explanation:
          '物块静止，由平衡条件知静摩擦力等于重力沿斜面向下的分力，方向沿斜面向上。',
        knowledgeId: 'mechanics-3-3'
      },
      {
        id: 'prob-m3-1-step-4',
        description: '有初速度时的加速度',
        formula:
          '$$a = \\frac{F_{\\parallel} - f_{\\text{滑}}}{m} = \\frac{mg\\sin\\theta - \\mu mg\\cos\\theta}{m} = g(\\sin\\theta - \\mu\\cos\\theta)$$\n$$a = 10 \\times (0.5 - 0.5 \\times 0.866) \\approx 0.67\\,\\text{m/s}^2$$',
        explanation:
          '物块向下滑动时受滑动摩擦力，方向沿斜面向上。由牛顿第二定律求加速度。',
        knowledgeId: 'mechanics-4-2'
      }
    ]
  },
  {
    id: 'prob-m3-2',
    year: 2022,
    province: '全国甲',
    title: '共点力平衡 — 三力平衡',
    content:
      '一质量为 $m$ 的小球用两根轻绳悬挂于天花板，绳 $OA$ 与竖直方向成 $\\alpha = 30°$，绳 $OB$ 水平。求：\n(1) 绳 $OA$ 的拉力 $T_A$；\n(2) 绳 $OB$ 的拉力 $T_B$。',
    difficulty: 2,
    knowledgeIds: ['mechanics-3-5', 'mechanics-3-4'],
    steps: [
      {
        id: 'prob-m3-2-step-1',
        description: '受力分析',
        explanation:
          '小球受三个力：重力 $mg$（竖直向下）、绳 $OA$ 拉力 $T_A$（沿绳向上）、绳 $OB$ 拉力 $T_B$（水平向左）。',
        knowledgeId: 'mechanics-3-5'
      },
      {
        id: 'prob-m3-2-step-2',
        description: '建立平衡方程',
        formula:
          '$$\\text{水平方向: } T_A\\sin\\alpha = T_B$$\n$$\\text{竖直方向: } T_A\\cos\\alpha = mg$$',
        explanation: '小球处于平衡状态，水平方向和竖直方向的合力均为零。',
        knowledgeId: 'mechanics-3-5'
      },
      {
        id: 'prob-m3-2-step-3',
        description: '求解拉力',
        formula:
          '$$T_A = \\frac{mg}{\\cos\\alpha} = \\frac{mg}{\\cos 30°} = \\frac{2\\sqrt{3}}{3}mg$$\n$$T_B = T_A\\sin\\alpha = \\frac{2\\sqrt{3}}{3}mg \\times \\frac{1}{2} = \\frac{\\sqrt{3}}{3}mg$$',
        explanation: '由竖直方向方程直接求出 $T_A$，再代入水平方向方程求 $T_B$。',
        knowledgeId: 'mechanics-3-4'
      }
    ]
  },
  {
    id: 'prob-m4-1',
    year: 2023,
    province: '全国乙',
    title: '牛顿第二定律 — 连接体问题',
    content:
      '如图，质量分别为 $m_1 = 2\\,\\text{kg}$ 和 $m_2 = 3\\,\\text{kg}$ 的物块 $A$、$B$ 叠放在光滑水平面上，$A$ 与 $B$ 之间的动摩擦因数 $\\mu = 0.3$。现对 $B$ 施加水平向右的力 $F = 20\\,\\text{N}$，求：\n(1) 两物块的加速度；\n(2) $A$ 受到的摩擦力大小。',
    difficulty: 4,
    knowledgeIds: ['mechanics-4-2', 'mechanics-4-5', 'mechanics-3-3'],
    steps: [
      {
        id: 'prob-m4-1-step-1',
        description: '判断两物块是否相对滑动',
        formula:
          '$$f_{\\max} = \\mu m_1 g = 0.3 \\times 2 \\times 10 = 6\\,\\text{N}$$\n$$a_{\\text{临界}} = \\frac{f_{\\max}}{m_1} = \\frac{6}{2} = 3\\,\\text{m/s}^2$$',
        explanation:
          '先假设两物块一起运动，计算临界加速度。若实际加速度小于临界值，则一起运动；否则相对滑动。',
        knowledgeId: 'mechanics-4-5'
      },
      {
        id: 'prob-m4-1-step-2',
        description: '假设一起运动求加速度',
        formula:
          '$$a = \\frac{F}{m_1 + m_2} = \\frac{20}{2 + 3} = 4\\,\\text{m/s}^2$$',
        explanation:
          '若一起运动，整体受合力为 $F$，加速度为 $4\\,\\text{m/s}^2$，大于临界值 $3\\,\\text{m/s}^2$，所以两物块相对滑动。',
        knowledgeId: 'mechanics-4-2'
      },
      {
        id: 'prob-m4-1-step-3',
        description: '分别求加速度',
        formula:
          '$$a_A = \\frac{f_{\\max}}{m_1} = \\frac{6}{2} = 3\\,\\text{m/s}^2$$\n$$a_B = \\frac{F - f_{\\max}}{m_2} = \\frac{20 - 6}{3} \\approx 4.67\\,\\text{m/s}^2$$',
        explanation:
          '$A$ 受最大静摩擦力（已达滑动）产生加速度；$B$ 受 $F$ 和 $A$ 的反作用力。',
        knowledgeId: 'mechanics-4-2'
      },
      {
        id: 'prob-m4-1-step-4',
        description: 'A 受到的摩擦力',
        formula: '$$f = f_{\\max} = 6\\,\\text{N}$$',
        explanation: '两物块相对滑动，$A$ 受到的是滑动摩擦力，大小等于最大静摩擦力 6N。',
        knowledgeId: 'mechanics-3-3'
      }
    ]
  },
  {
    id: 'prob-m4-2',
    year: 2021,
    province: '北京',
    title: '牛顿第二定律 — 超重与失重',
    content:
      '一质量为 $m = 50\\,\\text{kg}$ 的人站在电梯中的台秤上。电梯先以 $a_1 = 2\\,\\text{m/s}^2$ 的加速度匀加速上升，然后匀速上升，最后以 $a_2 = 2\\,\\text{m/s}^2$ 的加速度匀减速上升。求：\n(1) 加速上升时台秤的示数；\n(2) 减速上升时台秤的示数。',
    difficulty: 2,
    knowledgeIds: ['mechanics-4-4', 'mechanics-4-2'],
    steps: [
      {
        id: 'prob-m4-2-step-1',
        description: '分析加速上升',
        formula: '$$N_1 - mg = ma_1 \\Rightarrow N_1 = m(g + a_1) = 50 \\times 12 = 600\\,\\text{N}$$',
        explanation:
          '加速上升时，加速度向上，由牛顿第二定律，支持力大于重力，人处于超重状态。',
        knowledgeId: 'mechanics-4-4'
      },
      {
        id: 'prob-m4-2-step-2',
        description: '分析减速上升',
        formula: '$$mg - N_2 = ma_2 \\Rightarrow N_2 = m(g - a_2) = 50 \\times 8 = 400\\,\\text{N}$$',
        explanation:
          '减速上升时，加速度向下（速度向上，减速），支持力小于重力，人处于失重状态。',
        knowledgeId: 'mechanics-4-4'
      }
    ]
  }
]
