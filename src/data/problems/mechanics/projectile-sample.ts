import { Problem } from '../../types'

export const projectileProblems: Problem[] = [
  {
    id: 'prob-m5-1',
    year: 2023,
    province: '全国甲',
    title: '平抛运动 — 基本参数计算',
    content:
      '一物体从高度 $h = 20\\,\\text{m}$ 处以水平初速度 $v_0 = 10\\,\\text{m/s}$ 做平抛运动。求：\n(1) 物体落地时间；\n(2) 水平射程；\n(3) 落地时速度的大小和方向。（$g = 10\\,\\text{m/s}^2$）',
    difficulty: 2,
    knowledgeIds: ['mechanics-5-2', 'mechanics-2-1'],
    steps: [
      {
        id: 'prob-m5-1-step-1',
        description: '求落地时间',
        formula: '$$h = \\frac{1}{2}gt^2 \\Rightarrow t = \\sqrt{\\frac{2h}{g}} = \\sqrt{\\frac{2 \\times 20}{10}} = 2\\,\\text{s}$$',
        explanation: '竖直方向为自由落体运动，由位移公式求时间。',
        knowledgeId: 'mechanics-5-2'
      },
      {
        id: 'prob-m5-1-step-2',
        description: '求水平射程',
        formula: '$$x = v_0 t = 10 \\times 2 = 20\\,\\text{m}$$',
        explanation: '水平方向为匀速直线运动，射程等于初速度乘以时间。',
        knowledgeId: 'mechanics-5-2'
      },
      {
        id: 'prob-m5-1-step-3',
        description: '求落地速度',
        formula:
          '$$v_y = gt = 10 \\times 2 = 20\\,\\text{m/s}$$\n$$v = \\sqrt{v_0^2 + v_y^2} = \\sqrt{100 + 400} = 10\\sqrt{5} \\approx 22.36\\,\\text{m/s}$$\n$$\\tan\\theta = \\frac{v_y}{v_0} = \\frac{20}{10} = 2 \\Rightarrow \\theta \\approx 63.4°$$',
        explanation:
          '落地速度为水平分速度和竖直分速度的矢量和，方向用与水平面的夹角表示。',
        knowledgeId: 'mechanics-5-2'
      }
    ]
  },
  {
    id: 'prob-m5-2',
    year: 2022,
    province: '全国乙',
    title: '平抛运动 — 与斜面结合',
    content:
      '一物体从倾角 $\\theta = 37°$ 的斜面顶端以水平初速度 $v_0 = 5\\,\\text{m/s}$ 做平抛运动，最终落在斜面上。求：\n(1) 物体在空中飞行的时间；\n(2) 物体落地点与抛出点的距离。（$g = 10\\,\\text{m/s}^2$，$\\sin 37° = 0.6$，$\\cos 37° = 0.8$）',
    difficulty: 4,
    knowledgeIds: ['mechanics-5-2', 'mechanics-2-1'],
    steps: [
      {
        id: 'prob-m5-2-step-1',
        description: '利用斜面条件建立关系',
        formula:
          '$$\\tan\\theta = \\frac{y}{x} = \\frac{\\frac{1}{2}gt^2}{v_0t} = \\frac{gt}{2v_0}$$',
        explanation:
          '物体落在斜面上时，位移与水平方向的夹角等于斜面倾角。这是平抛+斜面问题的关键。',
        knowledgeId: 'mechanics-5-2'
      },
      {
        id: 'prob-m5-2-step-2',
        description: '求解飞行时间',
        formula:
          '$$t = \\frac{2v_0\\tan\\theta}{g} = \\frac{2 \\times 5 \\times 0.75}{10} = 0.75\\,\\text{s}$$',
        explanation: '将已知量代入，注意 $\\tan 37° = \\sin 37° / \\cos 37° = 0.6 / 0.8 = 0.75$。',
        knowledgeId: 'mechanics-5-2'
      },
      {
        id: 'prob-m5-2-step-3',
        description: '求落地点距离',
        formula:
          '$$x = v_0t = 5 \\times 0.75 = 3.75\\,\\text{m}$$\n$$y = \\frac{1}{2}gt^2 = \\frac{1}{2} \\times 10 \\times 0.75^2 = 2.8125\\,\\text{m}$$\n$$s = \\sqrt{x^2 + y^2} = \\sqrt{3.75^2 + 2.8125^2} \\approx 4.69\\,\\text{m}$$',
        explanation: '或用 $s = x / \\cos\\theta = 3.75 / 0.8 = 4.69\\,\\text{m}$。',
        knowledgeId: 'mechanics-2-1'
      }
    ]
  },
  {
    id: 'prob-m5-3',
    year: 2021,
    province: '北京',
    title: '圆周运动 — 竖直面内圆周运动',
    content:
      '一质量为 $m = 0.5\\,\\text{kg}$ 的小球用长 $L = 0.4\\,\\text{m}$ 的轻绳系住，在竖直面内做圆周运动。求：\n(1) 小球能通过最高点的最小速度；\n(2) 若在最高点速度为 $v = 3\\,\\text{m/s}$，求绳的拉力。（$g = 10\\,\\text{m/s}^2$）',
    difficulty: 4,
    knowledgeIds: ['mechanics-5-4', 'mechanics-5-5'],
    steps: [
      {
        id: 'prob-m5-3-step-1',
        description: '分析最高点临界条件',
        formula: '$$mg = m\\frac{v_{\\min}^2}{L} \\Rightarrow v_{\\min} = \\sqrt{gL} = \\sqrt{10 \\times 0.4} = 2\\,\\text{m/s}$$',
        explanation:
          '最高点最小速度时，绳的拉力恰好为零，重力完全提供向心力。若速度小于此值，小球无法完成圆周运动。',
        knowledgeId: 'mechanics-5-5'
      },
      {
        id: 'prob-m5-3-step-2',
        description: '求最高点绳的拉力',
        formula:
          '$$T + mg = m\\frac{v^2}{L}$$\n$$T = m\\frac{v^2}{L} - mg = 0.5 \\times \\frac{9}{0.4} - 0.5 \\times 10 = 11.25 - 5 = 6.25\\,\\text{N}$$',
        explanation:
          '最高点时，绳的拉力和重力都向下，合力提供向心力。$v = 3\\,\\text{m/s} > v_{\\min}$，所以绳有拉力。',
        knowledgeId: 'mechanics-5-5'
      }
    ]
  },
  {
    id: 'prob-m5-4',
    year: 2023,
    province: '全国乙',
    title: '向心力 — 圆锥摆',
    content:
      '一质量为 $m$ 的小球用长为 $L$ 的轻绳悬挂，在水平面内做匀速圆周运动，绳与竖直方向的夹角为 $\\theta$。求：\n(1) 小球做圆周运动的角速度 $\\omega$；\n(2) 绳的拉力 $T$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-5-5', 'mechanics-3-5'],
    steps: [
      {
        id: 'prob-m5-4-step-1',
        description: '受力分析',
        formula:
          '$$\\text{竖直方向: } T\\cos\\theta = mg$$\n$$\\text{水平方向: } T\\sin\\theta = m\\omega^2 r$$',
        explanation:
          '小球受重力 $mg$ 和绳的拉力 $T$。竖直方向平衡，水平方向合力提供向心力。圆周运动半径 $r = L\\sin\\theta$。',
        knowledgeId: 'mechanics-3-5'
      },
      {
        id: 'prob-m5-4-step-2',
        description: '求解角速度',
        formula:
          '$$T = \\frac{mg}{\\cos\\theta}$$\n$$\\frac{mg}{\\cos\\theta} \\cdot \\sin\\theta = m\\omega^2 L\\sin\\theta$$\n$$\\omega = \\sqrt{\\frac{g}{L\\cos\\theta}}$$',
        explanation: '由竖直方向方程求出 $T$，代入水平方向方程消去 $T$，解出 $\\omega$。',
        knowledgeId: 'mechanics-5-5'
      },
      {
        id: 'prob-m5-4-step-3',
        description: '绳的拉力',
        formula: '$$T = \\frac{mg}{\\cos\\theta}$$',
        explanation: '由竖直方向平衡条件直接得到。$\\theta$ 越大，$\\cos\\theta$ 越小，拉力越大。',
        knowledgeId: 'mechanics-5-5'
      }
    ]
  }
]
