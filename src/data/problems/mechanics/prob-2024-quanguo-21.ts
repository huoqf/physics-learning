import type { Problem } from '../../types'

export const prob2024Quanguo21: Problem = {
  id: 'prob-2024-quanguo-21',
  year: 2024,
  province: '全国新课标卷',
  source: '2024年高考全国新课标卷第21题',
  title: '板块模型与临界相对滑动分析',
  content:
    '如图所示，质量 $M = 3\\,\\text{kg}$ 的长木板置于水平面上，与地面间的动摩擦因数 $\\mu_2 = 0.05$。一质量 $m = 1\\,\\text{kg}$ 的小滑块以初速度 $v_0 = 5\\,\\text{m/s}$ 从左端冲上木板。已知滑块与木板间的动摩擦因数 $\\mu_1 = 0.3$，木板长度 $L = 2.5\\,\\text{m}$，重力加速度 $g = 10\\,\\text{m/s}^2$。\n试求：\n(1) 滑块在木板上滑动时的加速度大小；\n(2) 滑块与木板达到共同速度所需的时间及共速时的速度；\n(3) 判断滑块是否会从木板右端滑落。',
  difficulty: 4,
  knowledgeIds: ['mechanics-4-8', 'mechanics-4-2', 'mechanics-2-4'],
  masterModelId: 'model-block-board',
  tags: ['高考压轴', '板块模型', '临界相对滑动', 'v-t图像分析'],
  targetAnimation: {
    animId: 'anim-block-board',
    presetParams: { m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 },
    presetDescription: '载入2024新课标卷第21题真实考场参数进行可视化仿真',
  },
  steps: [
    {
      id: 'step-1',
      description: '隔离法进行受力分析与加速度计算',
      keyCondition: '滑块受滑动摩擦力向左，木板受滑块向右的摩擦力与地面向左的摩擦力',
      scorePoints: 4,
      formula:
        '$$a_m = \\mu_1 g = 0.3 \\times 10 = 3\\,\\text{m/s}^2$$\n$$a_M = \\frac{\\mu_1 mg - \\mu_2 (m+M)g}{M} = \\frac{0.3 \\times 10 - 0.05 \\times 40}{3} = 0.33\\,\\text{m/s}^2$$',
      explanation: '对滑块 $m$：$f_1 = \\mu_1 mg = 3\\text{N}$，故加速度 $a_m = 3\\text{ m/s}^2$ 向左。\n对木板 $M$：受到滑块施加的摩擦力 $f_1\' = 3\\text{N}$ 向右，地面摩擦力 $f_2 = \\mu_2 (m+M)g = 2\\text{N}$ 向左。合力 $F_{\\text{合}} = 1\\text{N}$，故加速度 $a_M = \\frac{1}{3}\\text{ m/s}^2$ 向右。',
    },
    {
      id: 'step-2',
      description: '计算共速时间与共速速度',
      keyCondition: '当滑块与木板速度相等时，两者达到相对静止临界',
      scorePoints: 3,
      formula:
        '$$v_0 - a_m t = a_M t \\implies 5 - 3t = \\frac{1}{3}t$$\n$$t = 1.5\\,\\text{s}, \\quad v_{\\text{共}} = 0.5\\,\\text{m/s}$$',
      explanation: '经过 $t = 1.5\\text{ s}$，两者共同速度为 $v_{\\text{共}} = 0.5\\text{ m/s}$。',
    },
    {
      id: 'step-3',
      description: '相对位移与滑脱判断',
      keyCondition: '相对位移 Δx 小于木板长度 L 则不滑脱',
      scorePoints: 3,
      formula:
        '$$\\Delta x = x_m - x_M = \\frac{v_0 + v_{\\text{共}}}{2}t - \\frac{v_{\\text{共}}}{2}t = \\frac{v_0}{2}t$$\n$$\\Delta x = \\frac{5}{2} \\times 1.5 = 3.75\\,\\text{m} > L = 2.5\\,\\text{m}$$',
      explanation: '由于计算得相对滑动位移 $\\Delta x = 3.75\\text{ m} > 2.5\\text{ m}$，说明滑块在达到共速前就已经从木板右端滑落！',
    },
  ],
}
