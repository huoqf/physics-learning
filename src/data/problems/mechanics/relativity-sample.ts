import type { Problem } from '../../types'

export const relativityProblems: Problem[] = [
  {
    id: 'prob-m6-rel-1',
    year: 2025,
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'choice',
    verified: false,
    title: '狭义相对论时空观 — 参考系与固有量判断',
    content:
      '一艘宇宙飞船以速度 $v = 0.6c$ 相对于地面匀速飞行。飞船中点处的激光灯向船头和船尾同时发出一束光脉冲，船内还安装有一台竖直放置的光钟，其光脉冲往返一次的固有周期为 $\\Delta \\tau = 2.0\\,\\text{s}$。下列说法正确的是（　　）\n' +
      'A. 地面观察者测得光脉冲同时到达船头与船尾\n' +
      'B. 地面观察者测得飞船光钟走完一个周期的时间大于 $2.0\\,\\text{s}$\n' +
      'C. 地面观察者测得飞船内光钟两反光镜之间的垂直高度会缩短\n' +
      'D. 飞船上的宇航员看到地面时钟比飞船时钟走得更快',
    difficulty: 2,
    knowledgeIds: ['mechanics-6-6'],
    tags: ['相对论时空观', '同时的相对性', '固有时'],
    targetAnimation: {
      animId: 'anim-relativity',
      presetParams: { beta: 0.6, m0: 1.0, mode: 0, showGeometry: 0 },
      presetDescription: '载入 β = 0.60 动钟变慢双参考系对照动画，定格于完整周期终点 t = 2.50 s',
      criticalT: 2.5,
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation:
          '在飞船参考系中光同时到达船头与船尾；但在地面参考系中，船尾迎向光脉冲、船头远离光脉冲且光速恒为 $c$，因此光先到船尾、后到船头，同时具有相对性。',
        animParams: { beta: 0.6, mode: 1, showGeometry: 0 },
      },
      B: {
        label: 'B 项',
        isCorrect: true,
        explanation:
          '光脉冲发射与返回发生在飞船的同一地点，故 $\\Delta \\tau = 2.0\\,\\text{s}$ 为固有时（最短时间）。地面参考系测得的时间为 $\\Delta t = \\gamma \\Delta \\tau = 1.25 \\times 2.0\\,\\text{s} = 2.5\\,\\text{s} > 2.0\\,\\text{s}$。',
        animParams: { beta: 0.6, mode: 0, showGeometry: 1 },
      },
      C: {
        label: 'C 项',
        isCorrect: false,
        explanation:
          '长度收缩只发生在平行于相对运动速度的方向上，光钟反光镜间距垂直于飞船航向，因此在地面参考系中高度不变。',
        animParams: { beta: 0.6, mode: 1, showGeometry: 0 },
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation:
          '惯性系之间的时间延缓是相互的：在飞船参考系看来，地面时钟相对自己运动，因此飞船上的观察者测得地面时钟也变慢。',
        animParams: { beta: 0.6, mode: 0, showGeometry: 0, observerFrame: 1 },
      },
    },
    steps: [
      {
        id: 'prob-m6-rel-1-step-1',
        description: '定事件和参考系，找准固有时与固有长',
        keyCondition: '同地发生的事件时间间隔才是固有时',
        formula: '$$\\Delta \\tau = 2.0\\,\\text{s}, \\quad \\gamma = \\frac{1}{\\sqrt{1 - 0.6^2}} = 1.25$$',
        explanation:
          '按“定事件和参考系 → 找固有时/固有长”流程：光钟脉冲发射与返回在飞船内同一位置发生，飞船系测得的是固有时 $\\Delta \\tau$。',
        knowledgeId: 'mechanics-6-6',
      },
      {
        id: 'prob-m6-rel-1-step-2',
        description: '判方向、选关系并比较大小，检查低速极限',
        keyCondition: '垂直运动方向不尺缩；v ≪ c 时 γ → 1',
        formula: '$$\\Delta t = \\gamma \\Delta \\tau = 1.25 \\times 2.0\\,\\text{s} = 2.5\\,\\text{s} > \\Delta \\tau$$',
        explanation:
          '时间延缓使地面系时间更长；垂直运动方向长度不变；若取低速极限 $v \\ll c$，则 $\\gamma \\to 1$，$\\Delta t \\to \\Delta \\tau$。',
        knowledgeId: 'mechanics-6-6',
      },
    ],
  },
  {
    id: 'prob-m6-rel-2',
    year: 2025,
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'choice',
    verified: false,
    title: '动尺收缩与时间延缓 — 方向性与数量比较',
    content:
      '某高速列车或星际飞船静止时的固有长度为 $L_0 = 100\\,\\text{m}$、固有宽度为 $D_0 = 10\\,\\text{m}$。当它以 $v = \\frac{\\sqrt{3}}{2}c$（即 $\\beta \\approx 0.866$）沿长度方向高速掠过地面观测站时，地面观测站同时测得其首尾两端位置。关于地面测得的数据及宇宙射线 $\\mu$ 子现象，下列说法正确的是（　　）\n' +
      'A. 地面测得飞船长度为 $50\\,\\text{m}$，宽度为 $5\\,\\text{m}$\n' +
      'B. 地面测得飞船长度为 $50\\,\\text{m}$，宽度仍为 $10\\,\\text{m}$\n' +
      'C. 地面测得飞船长度为 $200\\,\\text{m}$，宽度为 $10\\,\\text{m}$\n' +
      'D. 大气层中的 $\\mu$ 子在自身静止系中测得大气层厚度比地面测得的更厚',
    difficulty: 2,
    knowledgeIds: ['mechanics-6-6'],
    tags: ['动尺收缩', 'μ子寿命', '方向性'],
    targetAnimation: {
      animId: 'anim-relativity',
      presetParams: { beta: 0.866, m0: 1.0, mode: 1, showGeometry: 0 },
      presetDescription: '载入 β = 0.866（γ = 2）动尺收缩对比，观察长度减半而横向高度不变',
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation:
          '宽度垂直于运动方向，不会发生长度收缩，因此地面测得宽度仍为 $10\\,\\text{m}$。',
        animParams: { beta: 0.866, mode: 1, showGeometry: 0 },
      },
      B: {
        label: 'B 项',
        isCorrect: true,
        explanation:
          '当 $\\beta = \\frac{\\sqrt{3}}{2}$ 时 $\\gamma = 2$。沿运动方向尺缩为 $L = L_0 / \\gamma = 50\\,\\text{m}$，垂直运动方向尺寸不变，仍为 $10\\,\\text{m}$。',
        animParams: { beta: 0.866, mode: 1, showGeometry: 0 },
      },
      C: {
        label: 'C 项',
        isCorrect: false,
        explanation:
          '运动物体沿运动方向的观测长度总是小于固有长度（随物之尺最长），应除以 $\\gamma$ 而非乘以 $\\gamma$。',
        animParams: { beta: 0.866, mode: 1, showGeometry: 0 },
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation:
          '在 $\\mu$ 子自身静止系中，地球大气层在高速运动，因此大气层沿运动方向的厚度因尺缩效应而变薄，使 $\\mu$ 子能够在固有寿命内抵达地面。',
        animParams: { beta: 0.95, mode: 1, showGeometry: 0 },
      },
    },
    steps: [
      {
        id: 'prob-m6-rel-2-step-1',
        description: '确定参考系与固有长度并计算洛伦兹因子',
        keyCondition: '飞船静止系长度 L₀ 最长；地面须同时测首尾',
        formula: '$$\\gamma = \\frac{1}{\\sqrt{1 - (\\sqrt{3}/2)^2}} = 2$$',
        explanation:
          '飞船固有长度 $L_0 = 100\\,\\text{m}$ 为最长，地面参考系以同时测首尾的方式测量运动飞船长度。',
        knowledgeId: 'mechanics-6-6',
      },
      {
        id: 'prob-m6-rel-2-step-2',
        description: '判断收缩方向、求解长度并对比大小',
        keyCondition: '尺缩只发生在平行于运动速度的方向',
        formula: '$$L = \\frac{L_0}{\\gamma} = \\frac{100}{2} = 50\\,\\text{m}, \\quad D = D_0 = 10\\,\\text{m}$$',
        explanation:
          '沿运动方向收缩为原长的一半，垂直方向宽度保持不变；若令 $v \\ll c$，则 $\\gamma \\to 1$，$L \\to L_0$。',
        knowledgeId: 'mechanics-6-6',
      },
    ],
  },
  {
    id: 'prob-m6-rel-3',
    year: 2025,
    province: '基础巩固',
    source: '基础模型巩固演练',
    questionType: 'choice',
    verified: false,
    title: '牛顿力学的局限性 — 适用范围与低速回归',
    content:
      '关于牛顿力学的适用范围、局限性以及相对论和量子力学的关系，下列说法正确的是（　　）\n' +
      'A. 相对论和量子力学完全推翻了牛顿力学，使牛顿力学在一切领域都失去价值\n' +
      'B. 牛顿力学适用于宏观、低速（$v \\ll c$）、弱引力的物体运动\n' +
      'C. 研究原子内部电子的运动规律时，牛顿力学依然可以精确给出能级结果\n' +
      'D. 即使在高速粒子加速器中（如 $v = 0.9c$），动钟变慢与相对论修正仍可忽略',
    difficulty: 1,
    knowledgeIds: ['mechanics-6-6'],
    tags: ['牛顿力学局限性', '低速回归', '适用边界'],
    targetAnimation: {
      animId: 'anim-relativity',
      presetParams: { beta: 0.01, m0: 1.0, mode: 2, showGeometry: 0 },
      presetDescription: '载入牛顿力学局限性视图与经典低速极限，观察 γ ≈ 1 及三大理论边界',
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation:
          '科学理论的发展是继承与拓展：相对论和量子力学并未推翻牛顿力学，牛顿力学在宏观低速弱引力条件下依然极其精确。',
        animParams: { beta: 0.01, mode: 2, showGeometry: 0 },
      },
      B: {
        label: 'B 项',
        isCorrect: true,
        explanation:
          '牛顿力学适用于宏观、低速（$v \\ll c$）、弱引力条件；高速需狭义相对论，微观需量子力学，强引力需广义相对论。',
        animParams: { beta: 0.01, mode: 2, showGeometry: 0 },
      },
      C: {
        label: 'C 项',
        isCorrect: false,
        explanation:
          '原子内部属于微观尺度领域，电子运动表现出显著的量子化与波动性，必须使用量子力学描述。',
        animParams: { beta: 0.01, mode: 2, showGeometry: 0 },
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation:
          '当 $v = 0.9c$ 时，$\\gamma \\approx 2.29$，相对偏差超过 $129\\%$，相对论时间延缓与能量修正十分显著，不能再用经典公式近似。',
        animParams: { beta: 0.9, mode: 2, showGeometry: 0, newtonChartType: 1 },
      },
    },
    steps: [
      {
        id: 'prob-m6-rel-3-step-1',
        description: '对照适用条件并检查低速极限',
        keyCondition: '牛顿力学适用三条件：宏观、低速、弱引力',
        formula: '$$v \\ll c \\implies \\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}} \\approx 1 + \\frac{v^2}{2c^2} \\to 1$$',
        explanation:
          '低速极限下，洛伦兹因子 $\\gamma \\to 1$，相对论的时间延缓、长度收缩及动能公式全部平滑退化为牛顿力学表达式，说明新理论把牛顿力学包容为低速宏观下的近似特例。',
        knowledgeId: 'mechanics-6-6',
      },
    ],
  },
]
