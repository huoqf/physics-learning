import { Problem } from '../../types'

export const kinematicsProblems: Problem[] = [
  {
    id: 'prob-m2-1',
    year: 2023,
    province: '全国甲',
    title: '匀变速直线运动 — v-t 图像分析',
    content:
      '一物体沿直线运动，其速度—时间图像如图所示。已知 $t=0$ 时物体位于坐标原点，求：\n(1) 物体在 $0\\sim 4\,\\text{s}$ 内的位移；\n(2) 物体在 $4\\sim 6\,\\text{s}$ 内的加速度。',
    difficulty: 2,
    knowledgeIds: ['mechanics-2-1', 'mechanics-1-3', 'mechanics-1-4'],
    steps: [
      {
        id: 'prob-m2-1-step-1',
        description: '理解 v-t 图像的物理意义',
        explanation:
          'v-t 图像中，图线与时间轴围成的面积表示位移，图线的斜率表示加速度。',
        knowledgeId: 'mechanics-1-3'
      },
      {
        id: 'prob-m2-1-step-2',
        description: '计算 0~4s 内的位移',
        formula: '$$s = \\frac{1}{2} \\times 4 \\times 8 = 16\\,\\text{m}$$',
        explanation:
          '0~4s 内图线为三角形，底为 4s，高为 8m/s，位移等于三角形面积。',
        knowledgeId: 'mechanics-2-1'
      },
      {
        id: 'prob-m2-1-step-3',
        description: '计算 4~6s 内的加速度',
        formula: '$$a = \\frac{\\Delta v}{\\Delta t} = \\frac{0 - 8}{6 - 4} = -4\\,\\text{m/s}^2$$',
        explanation:
          '4~6s 内速度从 8m/s 均匀减小到 0，加速度为斜率，负号表示方向与初速度相反。',
        knowledgeId: 'mechanics-1-4'
      }
    ]
  },
  {
    id: 'prob-m2-2',
    year: 2022,
    province: '全国乙',
    title: '追及问题 — 匀加速追匀速',
    content:
      '甲车以 $v_0 = 10\\,\\text{m/s}$ 的速度匀速行驶，乙车从静止开始以 $a = 2\\,\\text{m/s}^2$ 的加速度匀加速追赶甲车。已知两车初始相距 $s_0 = 25\\,\\text{m}$，求：\n(1) 乙车追上甲车所需的时间；\n(2) 追上时乙车的速度。',
    difficulty: 3,
    knowledgeIds: ['mechanics-2-1', 'mechanics-1-3'],
    steps: [
      {
        id: 'prob-m2-2-step-1',
        description: '建立位移方程',
        formula:
          '$$s_\\text{甲} = v_0 t + s_0 = 10t + 25$$\n$$s_\\text{乙} = \\frac{1}{2} a t^2 = t^2$$',
        explanation:
          '甲车做匀速运动，位移等于速度乘时间加初始距离；乙车从静止开始做匀加速运动。',
        knowledgeId: 'mechanics-2-1'
      },
      {
        id: 'prob-m2-2-step-2',
        description: '求解追上时间',
        formula:
          '$$s_\\text{甲} = s_\\text{乙} \\Rightarrow t^2 = 10t + 25$$\n$$t^2 - 10t - 25 = 0$$\n$$t = \\frac{10 + \\sqrt{100 + 100}}{2} = 5 + 5\\sqrt{2} \\approx 12.07\\,\\text{s}$$',
        explanation:
          '追上时两车位移相等，建立一元二次方程求解。取正根，因为时间必须为正。',
        knowledgeId: 'mechanics-2-1'
      },
      {
        id: 'prob-m2-2-step-3',
        description: '计算追上时乙车速度',
        formula: '$$v = at = 2 \\times (5 + 5\\sqrt{2}) = 10 + 10\\sqrt{2} \\approx 24.14\\,\\text{m/s}$$',
        explanation: '乙车做匀加速运动，速度等于加速度乘以时间。',
        knowledgeId: 'mechanics-1-3'
      }
    ]
  },
  {
    id: 'prob-m2-3',
    year: 2021,
    province: '北京',
    title: '自由落体运动 — 过窗问题',
    content:
      '一物体从高处自由下落，经过一层高为 $h = 2\\,\\text{m}$ 的窗户用时 $\\Delta t = 0.2\\,\\text{s}$。求物体下落到窗户上沿时的速度 $v_0$。（取 $g = 10\\,\\text{m/s}^2$）',
    difficulty: 3,
    knowledgeIds: ['mechanics-2-2', 'mechanics-2-1'],
    steps: [
      {
        id: 'prob-m2-3-step-1',
        description: '建立运动方程',
        formula: '$$h = v_0 \\Delta t + \\frac{1}{2} g (\\Delta t)^2$$',
        explanation:
          '物体经过窗户的过程可视为初速度为 $v_0$、加速度为 $g$ 的匀加速直线运动。',
        knowledgeId: 'mechanics-2-2'
      },
      {
        id: 'prob-m2-3-step-2',
        description: '代入数据求解',
        formula:
          '$$2 = v_0 \\times 0.2 + \\frac{1}{2} \\times 10 \\times (0.2)^2$$\n$$2 = 0.2v_0 + 0.2$$\n$$v_0 = \\frac{2 - 0.2}{0.2} = 9\\,\\text{m/s}$$',
        explanation: '将已知量代入位移公式，解出初速度 $v_0$。',
        knowledgeId: 'mechanics-2-1'
      }
    ]
  }
]
