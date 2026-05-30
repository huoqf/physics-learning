import { Problem } from '../../types'

export const energyProblems: Problem[] = [
  {
    id: 'prob-m7-1',
    year: 2023,
    province: '全国甲',
    title: '动能定理 — 恒力做功求末速度',
    content:
      '一质量为 $m = 2\\,\\text{kg}$ 的物块静止在光滑水平面上，受到水平恒力 $F = 10\\,\\text{N}$ 的作用。求物块运动 $s = 5\\,\\text{m}$ 时的速度。',
    difficulty: 2,
    knowledgeIds: ['mechanics-7-3', 'mechanics-7-1'],
    steps: [
      {
        id: 'prob-m7-1-step-1',
        description: '计算恒力做的功',
        formula: '$$W = Fs = 10 \\times 5 = 50\\,\\text{J}$$',
        explanation: '恒力做功等于力的大小乘以位移。',
        knowledgeId: 'mechanics-7-1'
      },
      {
        id: 'prob-m7-1-step-2',
        description: '应用动能定理',
        formula:
          '$$W = \\Delta E_k = \\frac{1}{2}mv^2 - 0$$\n$$50 = \\frac{1}{2} \\times 2 \\times v^2$$\n$$v = \\sqrt{50} = 5\\sqrt{2} \\approx 7.07\\,\\text{m/s}$$',
        explanation: '由动能定理，合外力做的功等于动能的变化量。',
        knowledgeId: 'mechanics-7-3'
      }
    ]
  },
  {
    id: 'prob-m7-2',
    year: 2022,
    province: '全国乙',
    title: '动能定理 — 斜面+水平面综合',
    content:
      '一质量为 $m = 1\\,\\text{kg}$ 的物块从倾角 $\\theta = 37°$ 的斜面顶端由静止滑下，斜面高 $h = 2\\,\\text{m}$，然后进入水平面继续滑行。已知物块与斜面、水平面间的动摩擦因数均为 $\\mu = 0.25$，求物块在水平面上滑行的最大距离。（$\\sin 37° = 0.6$，$\\cos 37° = 0.8$，$g = 10\\,\\text{m/s}^2$）',
    difficulty: 4,
    knowledgeIds: ['mechanics-7-3', 'mechanics-3-3', 'mechanics-7-1'],
    steps: [
      {
        id: 'prob-m7-2-step-1',
        description: '分析全过程受力与做功',
        formula:
          '$$W_G = mgh = 1 \\times 10 \\times 2 = 20\\,\\text{J}$$\n$$W_{f1} = -\\mu mg\\cos\\theta \\cdot \\frac{h}{\\sin\\theta} = -0.25 \\times 1 \\times 10 \\times 0.8 \\times \\frac{2}{0.6} \\approx -6.67\\,\\text{J}$$',
        explanation: '重力做正功，斜面上摩擦力做负功。斜面长度 $L = h/\\sin\\theta$。',
        knowledgeId: 'mechanics-7-1'
      },
      {
        id: 'prob-m7-2-step-2',
        description: '应用动能定理于全过程',
        formula:
          '$$W_G + W_{f1} + W_{f2} = 0 - 0 = 0$$\n$$20 - 6.67 - \\mu mg s_2 = 0$$\n$$s_2 = \\frac{13.33}{0.25 \\times 1 \\times 10} \\approx 5.33\\,\\text{m}$$',
        explanation:
          '初末速度均为零，动能变化为零。水平面上摩擦力 $f_2 = \\mu mg$，做功 $W_{f2} = -\\mu mg s_2$。',
        knowledgeId: 'mechanics-7-3'
      }
    ]
  },
  {
    id: 'prob-m7-3',
    year: 2023,
    province: '全国乙',
    title: '机械能守恒 — 单摆问题',
    content:
      '一长为 $L = 1\\,\\text{m}$ 的轻绳悬挂一质量为 $m = 0.5\\,\\text{kg}$ 的小球，将小球拉至与竖直方向成 $\\theta = 60°$ 处由静止释放。求：\n(1) 小球到达最低点时的速度；\n(2) 最低点时绳的拉力。（$g = 10\\,\\text{m/s}^2$）',
    difficulty: 3,
    knowledgeIds: ['mechanics-7-5', 'mechanics-5-5'],
    steps: [
      {
        id: 'prob-m7-3-step-1',
        description: '判断机械能守恒条件',
        explanation:
          '小球运动过程中只有重力做功（绳的拉力始终与速度垂直，不做功），所以机械能守恒。',
        knowledgeId: 'mechanics-7-5'
      },
      {
        id: 'prob-m7-3-step-2',
        description: '求最低点速度',
        formula:
          '$$mgL(1 - \\cos\\theta) = \\frac{1}{2}mv^2$$\n$$v = \\sqrt{2gL(1 - \\cos 60°)} = \\sqrt{2 \\times 10 \\times 1 \\times 0.5} = \\sqrt{10} \\approx 3.16\\,\\text{m/s}$$',
        explanation: '以最低点为重力势能零点，由机械能守恒列方程求解。',
        knowledgeId: 'mechanics-7-5'
      },
      {
        id: 'prob-m7-3-step-3',
        description: '求最低点绳的拉力',
        formula:
          '$$T - mg = m\\frac{v^2}{L}$$\n$$T = mg + m\\frac{v^2}{L} = 0.5 \\times 10 + 0.5 \\times \\frac{10}{1} = 10\\,\\text{N}$$',
        explanation:
          '最低点时，绳的拉力与重力的合力提供向心力。注意：拉力大于重力（向心力向上）。',
        knowledgeId: 'mechanics-5-5'
      }
    ]
  },
  {
    id: 'prob-m7-4',
    year: 2021,
    province: '全国甲',
    title: '机械能守恒 — 弹簧系统',
    content:
      '一质量为 $m = 2\\,\\text{kg}$ 的物块从高度 $h = 1\\,\\text{m}$ 处自由下落到竖直放置的轻弹簧上，弹簧劲度系数 $k = 200\\,\\text{N/m}$。求弹簧的最大压缩量。（$g = 10\\,\\text{m/s}^2$）',
    difficulty: 4,
    knowledgeIds: ['mechanics-7-5', 'mechanics-3-2'],
    steps: [
      {
        id: 'prob-m7-4-step-1',
        description: '确定研究对象与过程',
        explanation:
          '取物块和弹簧为系统，从物块开始下落到弹簧压缩至最短的过程中，只有重力和弹簧弹力做功，系统机械能守恒。',
        knowledgeId: 'mechanics-7-5'
      },
      {
        id: 'prob-m7-4-step-2',
        description: '建立机械能守恒方程',
        formula:
          '$$mg(h + x) = \\frac{1}{2}kx^2$$\n$$2 \\times 10 \\times (1 + x) = \\frac{1}{2} \\times 200 \\times x^2$$\n$$20 + 20x = 100x^2$$\n$$5x^2 - x - 1 = 0$$',
        explanation:
          '以弹簧原长位置为重力势能零点、弹性势能零点。物块下降总高度为 $h + x$，重力势能减少转化为弹性势能。',
        knowledgeId: 'mechanics-7-5'
      },
      {
        id: 'prob-m7-4-step-3',
        description: '求解最大压缩量',
        formula:
          '$$x = \\frac{1 + \\sqrt{1 + 20}}{10} = \\frac{1 + \\sqrt{21}}{10} \\approx 0.56\\,\\text{m}$$',
        explanation: '解一元二次方程，取正根（压缩量必须为正）。',
        knowledgeId: 'mechanics-3-2'
      }
    ]
  }
]
