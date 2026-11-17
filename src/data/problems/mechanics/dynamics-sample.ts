import { Problem } from '../../types'

export const dynamicsProblems: Problem[] = [
  {
    id: 'prob-m3-1',
    year: 2023,
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'calculation',
    verified: false,
    title: '斜面摩擦力 — 静摩擦与滑动摩擦',
    content:
      '一质量为 $m = 2\\,\\text{kg}$ 的物块静止在倾角 $\\theta = 30^\\circ$ 的斜面上。已知物块与斜面间的动摩擦因数 $\\mu = 0.8$，最大静摩擦力等于滑动摩擦力，取 $g = 10\\,\\text{m/s}^2$。求：\n(1) 物块静止时受到的摩擦力大小和方向；\n(2) 若给物块一个沿斜面向下的初速度 $v_0 = 2\\,\\text{m/s}$，求物块下滑过程中的加速度大小和方向。',
    difficulty: 3,
    knowledgeIds: ['mechanics-3-3', 'mechanics-3-1', 'mechanics-4-2'],
    steps: [
      {
        id: 'prob-m3-1-step-1',
        description: '分析重力沿斜面的分力',
        formula: '$$F_{\\parallel} = mg\\sin\\theta = 2 \\times 10 \\times \\sin 30^\\circ = 10\\,\\text{N}$$',
        explanation: '重力沿斜面向下的分力有使物块下滑的趋势。',
        knowledgeId: 'mechanics-3-1'
      },
      {
        id: 'prob-m3-1-step-2',
        description: '校验静止平衡条件',
        formula:
          '$$f_{\\max} = \\mu N = \\mu mg\\cos\\theta = 0.8 \\times 2 \\times 10 \\times \\cos 30^\\circ \\approx 13.86\\,\\text{N}$$',
        explanation:
          '最大静摩擦力约为 13.86 N，大于重力沿斜面向下的分力 10 N（$F_{\\parallel} < f_{\\max}$），因此物块能够稳定静止在斜面上。',
        knowledgeId: 'mechanics-3-3'
      },
      {
        id: 'prob-m3-1-step-3',
        description: '静止时的静摩擦力',
        formula: '$$f = F_{\\parallel} = 10\\,\\text{N}$$',
        explanation:
          '物块静止，由平衡条件知静摩擦力等于重力沿斜面向下的分力，大小 10 N，方向沿斜面向上。',
        knowledgeId: 'mechanics-3-3'
      },
      {
        id: 'prob-m3-1-step-4',
        description: '有向下初速度时的加速度',
        formula:
          '$$a = \\frac{f_{\\text{滑}} - F_{\\parallel}}{m} = g(\\mu\\cos\\theta - \\sin\\theta) = 10 \\times (0.8 \\times \\frac{\\sqrt{3}}{2} - 0.5) \\approx 1.93\\,\\text{m/s}^2$$',
        explanation:
          '物块沿斜面向下滑动时受沿斜面向上的滑动摩擦力，由于 $f_{\\text{滑}} > F_{\\parallel}$，物块沿斜面向下做匀减速直线运动，加速度大小约 $1.93\\,\\text{m/s}^2$，方向沿斜面向上。',
        knowledgeId: 'mechanics-4-2'
      }
    ]
  },
  {
    id: 'prob-m3-2',
    year: 2022,
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'calculation',
    verified: false,
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
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'calculation',
    verified: false,
    title: '牛顿第二定律 — 连接体问题',
    content:
      '质量分别为 $m_1 = 2\\,\\text{kg}$ 和 $m_2 = 3\\,\\text{kg}$ 的物块 $A$、$B$ 叠放在光滑水平面上（$A$ 在 $B$ 上方），$A$ 与 $B$ 之间的动摩擦因数 $\\mu = 0.3$。现对 $B$ 施加水平向右的力 $F = 20\\,\\text{N}$（设 $g = 10\\,\\text{m/s}^2$），求：\n(1) 两物块的加速度；\n(2) $A$ 受到的摩擦力大小。',
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
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'calculation',
    verified: false,
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
  },
  {
    id: 'prob-m5x-1',
    year: 2024,
    province: '模型演练',
    source: '经典模型演练（机车恒定功率启动与动能定理）',
    questionType: 'calculation',
    verified: false,
    title: '力与运动综合 — 恒定功率启动与收尾速度及位移分析',
    content:
      '一质量为 $m = 2.0\\,\\text{kg}$ 的智能模型小车在水平平直轨道上以恒定额定功率 $P = 120\\,\\text{W}$ 行驶，运动过程中受到的阻力恒为 $f = 15\\,\\text{N}$。已知小车从初速度 $v_0 = 2.0\\,\\text{m/s}$ 开始经历时间 $t = 1.25\\,\\text{s}$ 后，速度达到 $v_1 = 7.0\\,\\text{m/s}$。\n求：\n(1) 小车最终能达到的最大收尾速度 $v_m$；\n(2) 当小车速度为 $v = 4.0\\,\\text{m/s}$ 时，小车的加速度 $a$ 大小；\n(3) 小车在这 $1.25\\,\\text{s}$ 内沿水平轨道滑行的位移 $x$。',
    difficulty: 4,
    knowledgeIds: ['mechanics-5x-1', 'mechanics-4-2', 'mechanics-7-2'],
    targetAnimation: {
      animId: 'anim-force-motion-topic',
      presetParams: { mode: 9, v0: 2, m: 2, env1: 120, env2: 15, env3: 0 },
      presetDescription: '载入机车恒功率启动与收尾速度模型参数',
    },
    steps: [
      {
        id: 'prob-m5x-1-step-1',
        description: '收尾平衡条件与最大速度求解',
        formula: '$$a = 0 \\implies F = f \\implies v_m = \\frac{P}{f} = \\frac{120}{15} = 8.0\\,\\text{m/s}$$',
        explanation: '当牵引力等于阻力时，合外力为零，加速度为零，小车速度趋近于最大收尾速度 $8.0\\,\\text{m/s}$。',
        knowledgeId: 'mechanics-5x-1',
      },
      {
        id: 'prob-m5x-1-step-2',
        description: '某一瞬时牵引力与牛顿第二定律加速度分析',
        formula: '$$F = \\frac{P}{v} = \\frac{120}{4.0} = 30\\,\\text{N}$$\n$$a = \\frac{F - f}{m} = \\frac{30 - 15}{2.0} = 7.5\\,\\text{m/s}^2$$',
        explanation: '恒功率启动过程中，牵引力随速度增大而减小，合力减小，加速度减小，做加速度减小的变加速直线运动。',
        knowledgeId: 'mechanics-4-2',
      },
      {
        id: 'prob-m5x-1-step-3',
        description: '变力做功与全程动能定理求位移',
        formula: '$$Pt - fx = \\frac{1}{2}mv_1^2 - \\frac{1}{2}mv_0^2$$\n$$120 \\times 1.25 - 15x = \\frac{1}{2} \\times 2.0 \\times (7.0^2 - 2.0^2)$$\n$$150 - 15x = 45 \\implies 15x = 105 \\implies x = 7.0\\,\\text{m}$$',
        explanation: '变力牵引过程中严禁使用匀变速直线运动规律，必须使用力的空间累积效应——动能定理求解位移。',
        knowledgeId: 'mechanics-5x-1',
      },
    ],
  },
]
