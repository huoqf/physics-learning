import type { Problem } from '../types'

export const thermodynamicsProblems: Problem[] = [
  {
    id: 'prob-gas-boyle-micro',
    year: 2024,
    province: '基础巩固',
    source: '气体实验三定律随堂巩固',
    title: '等温压缩过程压强增大的微观解释（玻意耳定律）',
    content:
      '一定质量的理想气体发生等温压缩时，下列关于压强增大的微观原因解释正确的是（　　）\n' +
      'A. 气体分子的平均动能增大\n' +
      'B. 分子的碰撞频率不变，每个分子对器壁的撞击力变大\n' +
      'C. 每个分子撞击器壁的平均冲力不变，但分子的数密度增大，单位时间内撞击器壁的次数增多\n' +
      'D. 气体分子在单位时间内与器壁发生碰撞的总次数减少',
    difficulty: 1,
    questionType: 'choice',
    verified: false,
    knowledgeIds: ['thermodynamics-2-1'],
    tags: ['玻意耳定律', '气体压强微观解释', '等温变化'],
    targetAnimation: {
      animId: 'anim-gas-laws',
      presetParams: { mode: 0, T: 300, V: 2.5e-3 },
      presetDescription: '载入等温压缩工况（T = 300 K），观察分子数密度增大时器壁碰撞频率的变化',
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation: '温度是分子平均动能的唯一标志，等温过程温度 $T$ 不变，故分子平均动能不变。A 项错误。',
      },
      B: {
        label: 'B 项',
        isCorrect: false,
        explanation: '分子平均动能不变则单次撞击器壁的平均冲力不变；体积减小时分子数密度增大，碰撞频率随之增大而非不变。B 项错误。',
      },
      C: {
        label: 'C 项',
        isCorrect: true,
        explanation: '温度不变说明分子的平均动能不变，每个分子撞击器壁的平均冲力不变；体积变小说明分子的数密度（单位体积内的分子数）增大，单位时间内撞击单位面积器壁的次数增多，从而导致宏观压强增大。C 项正确。',
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation: '体积减小时分子数密度增大且温度不变，单位时间内撞击器壁的总次数增多而非减少。D 项错误。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '由等温条件判断单分子平均动能与单次平均冲力',
        keyCondition: '温度 T 恒定 ⟹ 分子平均动能恒定',
        scorePoints: 2,
        explanation: '理想气体等温变化中温度不变，分子平均速率不变，每个分子撞击器壁的平均冲力不变。',
      },
      {
        id: 'step-2',
        description: '由体积减小判断分子数密度与单位时间碰撞次数变化',
        keyCondition: '体积 V 减小 ⟹ 数密度 n = N/V 增大',
        scorePoints: 2,
        formula: '$$p V = C \\quad (T = \\text{常数})$$',
        explanation: '单位体积内分子数增大，单位时间内撞击单位面积器壁的次数增多，故宏观压强增大，选 C。',
      },
    ],
  },
  {
    id: 'prob-gas-gay-lussac-micro',
    year: 2024,
    province: '基础巩固',
    source: '气体实验三定律随堂巩固',
    title: '等压膨胀过程温度与数密度的微观平衡（盖-吕萨克定律）',
    content:
      '一定质量的理想气体发生等压膨胀时，随着温度的升高，气体分子撞击器壁的平均冲力变大，为了维持压强不变，则（　　）\n' +
      'A. 气体分子的平均动能应当减小\n' +
      'B. 单位体积内的分子数（数密度）应该减少，从而降低撞击频率\n' +
      'C. 气体分子与器壁碰撞的频数应当保持恒定\n' +
      'D. 气体分子的总数应当减少',
    difficulty: 1,
    questionType: 'choice',
    verified: false,
    knowledgeIds: ['thermodynamics-2-1'],
    tags: ['盖-吕萨克定律', '气体压强微观解释', '等压变化'],
    targetAnimation: {
      animId: 'anim-gas-laws',
      presetParams: { mode: 1, T: 450, V: 5e-3 },
      presetDescription: '载入等压变化工况（T = 450 K），观察升温膨胀后分子数密度的降低',
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation: '温度升高时，气体分子的平均动能必然增大。A 项错误。',
      },
      B: {
        label: 'B 项',
        isCorrect: true,
        explanation: '温度升高使每个分子撞击器壁的平均冲力变大；要使宏观压强（单位面积上单位时间承受的总冲力）保持不变，必须通过膨胀增大体积来减小分子数密度，降低单位时间内的碰撞频率。B 项正确。',
      },
      C: {
        label: 'C 项',
        isCorrect: false,
        explanation: '若碰撞频数恒定而单次平均冲力变大，宏观压强将会增大，无法维持等压过程。C 项错误。',
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation: '题目研究的对象是一定质量的理想气体，封闭气体分子的总数保持不变。D 项错误。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '分析升温对分子平均撞击冲力的影响',
        keyCondition: '压强由单次平均冲力与单位面积碰撞频数共同决定',
        scorePoints: 2,
        explanation: '温度升高，分子平均动能变大，每次撞击器壁的平均冲力增大。',
      },
      {
        id: 'step-2',
        description: '结合等压条件确定体积与分子数密度变化',
        keyCondition: '压强 p 恒定 ⟹ 碰撞频数必须降低',
        scorePoints: 2,
        formula: '$$\\frac{V}{T} = C \\quad (p = \\text{常数})$$',
        explanation: '体积增大导致单位体积内的分子数（数密度）减少，碰撞频数降低以抵消单次冲力的增加，选 B。',
      },
    ],
  },
  {
    id: 'prob-gas-charles-kelvin',
    year: 2024,
    province: '基础巩固',
    source: '气体实验三定律随堂巩固',
    title: '等容变化中摄氏温度与热力学温度换算（查理定律）',
    content:
      '一定质量的理想气体发生等容变化。若气体的温度从 $27\\,^\\circ\\text{C}$ 升高到 $127\\,^\\circ\\text{C}$，其压强变为原来的（　　）\n' +
      'A. $127/27$ 倍\n' +
      'B. $3/4$ 倍\n' +
      'C. $4/3$ 倍\n' +
      'D. $27/127$ 倍',
    difficulty: 1,
    questionType: 'choice',
    verified: false,
    knowledgeIds: ['thermodynamics-2-1'],
    tags: ['查理定律', '热力学温度', '等容变化'],
    targetAnimation: {
      animId: 'anim-gas-laws',
      presetParams: { mode: 2, T: 400, V: 5e-3 },
      presetDescription: '载入等容变化工况（T = 400 K），对比初态 300 K 与末态 400 K 的压强比值',
    },
    optionExplanations: {
      A: {
        label: 'A 项',
        isCorrect: false,
        explanation: '直接用摄氏温度比值 $127/27$ 计算属于典型易错点，查理定律要求使用热力学温度 $T$。A 项错误。',
      },
      B: {
        label: 'B 项',
        isCorrect: false,
        explanation: '温度升高发生等容变化时压强应增大，且分子与分母倒置。B 项错误。',
      },
      C: {
        label: 'C 项',
        isCorrect: true,
        explanation: '将摄氏温度换算为热力学温度：$T_1 = 27 + 273 = 300\\,\\text{K}$，$T_2 = 127 + 273 = 400\\,\\text{K}$。由查理定律 $\\frac{p_2}{p_1} = \\frac{T_2}{T_1} = \\frac{400}{300} = \\frac{4}{3}$。C 项正确。',
      },
      D: {
        label: 'D 项',
        isCorrect: false,
        explanation: '既未换算为热力学温度，又颠倒了末初态比值。D 项错误。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '将摄氏温度换算为热力学温度',
        keyCondition: 'T(K) = t(°C) + 273',
        scorePoints: 2,
        formula: '$$T_1 = 27 + 273 = 300\\,\\text{K}, \\quad T_2 = 127 + 273 = 400\\,\\text{K}$$',
        explanation: '气体实验定律中的温度必须采用热力学温标（开尔文）。',
      },
      {
        id: 'step-2',
        description: '应用查理定律求解压强比值',
        keyCondition: '等容过程压强 p 与热力学温度 T 成正比',
        scorePoints: 2,
        formula: '$$\\frac{p_2}{p_1} = \\frac{T_2}{T_1} = \\frac{400}{300} = \\frac{4}{3}$$',
        explanation: '末态压强变为原来的 $4/3$ 倍，选 C。',
      },
    ],
  },
]
