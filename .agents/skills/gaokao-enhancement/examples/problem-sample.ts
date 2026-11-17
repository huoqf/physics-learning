import type { Problem } from '@/data/types'

/**
 * 试题标准数据范例（含「已核验真题」与「模型演练题」双规范）
 *
 * 铁律：
 *   1. `verified: true` 仅限已对照官方原卷逐字核验且设问/配图完整的真题；
 *   2. 模型演练/改编题必须显式写 `verified: false`，`province` 写 `'模型演练'` 或 `'全国卷模型'`，
 *      严禁虚构年份、省份与原卷题号，严禁携带 `'高考真题'` 标签；
 *   3. 必须声明 `questionType`；非 `'choice'` 题型严禁伪造 ABCD `optionExplanations`。
 */

/** 范例 A：已核验的高考原卷真题（选择题） */
export const verifiedGaokaoChoiceSample: Problem = {
  id: 'prob-2025-quanguo-15',
  year: 2025,
  province: '全国卷',
  source: '2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第15题',
  questionType: 'choice',
  verified: true,
  title: '椭圆轨道卫星的引力与速度随距离的变化',
  content:
    '“天都一号”在环月椭圆轨道上运行时（　　）\n\nA. 受月球引力大小保持不变\nB. 相对月球的速度大小保持不变\nC. 离月球越近，其相对月球的速度越大\nD. 离月球越近，其所受月球的引力越小',
  difficulty: 2,
  knowledgeIds: ['mechanics-6-1', 'mechanics-6-2'],
  tags: ['高考真题', '椭圆轨道', '开普勒第二定律'],
  targetAnimation: {
    animId: 'anim-kepler',
    presetParams: { a: 4.5, e: 0.6, mass: 36, mode: 0 },
    presetDescription: '载入2025全国卷第15题椭圆轨道，观察近月点速度变化',
  },
  optionExplanations: {
    A: { label: 'A', isCorrect: false, explanation: '错误。椭圆轨道半径 r 不断变化，万有引力大小随之变化。' },
    B: { label: 'B', isCorrect: false, explanation: '错误。近月点最快、远月点最慢。' },
    C: { label: 'C', isCorrect: true, explanation: '正确。由开普勒第二定律，离月球越近速度越大。' },
    D: { label: 'D', isCorrect: false, explanation: '错误。r 越小引力越大。' },
  },
  steps: [
    {
      id: 'step-1',
      description: '利用开普勒第二定律判断近月点速度变化',
      keyCondition: '相等时间扫过相等面积 ⇒ 近月点速度最大',
      scorePoints: 6,
      formula: 'F = G\\frac{Mm}{r^2}',
      explanation: '离月球越近，引力越大、动能越大、速度越大。',
    },
  ],
}

/** 范例 B：典型模型演练题（计算解答题，verified: false，不伪造真题卷别与题号） */
export const modelPracticeSample: Problem = {
  id: 'prob-block-board-model',
  year: 2024,
  province: '全国卷模型',
  source: '高考压轴经典母题（板块相对滑动临界模型）',
  questionType: 'calculation',
  verified: false,
  title: '板块模型与临界相对滑动分析',
  content:
    '如图所示，质量 $M = 3\\,\\text{kg}$ 的长木板置于水平面上，与地面间的动摩擦因数 $\\mu_2 = 0.05$。一质量 $m = 1\\,\\text{kg}$ 的小滑块以初速度 $v_0 = 5\\,\\text{m/s}$ 从左端冲上木板。已知滑块与木板间的动摩擦因数 $\\mu_1 = 0.3$，木板长度 $L = 2.5\\,\\text{m}$，重力加速度 $g = 10\\,\\text{m/s}^2$。\n试求：\n(1) 滑块在木板上滑动时的加速度大小；\n(2) 滑块与木板达到共同速度所需的时间及共速时的速度。',
  difficulty: 4,
  knowledgeIds: ['mechanics-4-8', 'mechanics-4-2'],
  masterModelId: 'model-block-board',
  tags: ['压轴母题', '板块模型', '临界相对滑动'],
  targetAnimation: {
    animId: 'anim-block-board',
    presetParams: { m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 },
    presetDescription: '载入板块模型临界滑脱工况参数进行可视化仿真',
  },
  steps: [
    {
      id: 'step-1',
      description: '隔离法受力分析与加速度计算',
      keyCondition: '滑块受滑动摩擦力向左，木板受滑块向右摩擦力与地面向左摩擦力',
      scorePoints: 4,
      formula: 'a_m = \\mu_1 g = 3\\,\\text{m/s}^2',
      explanation: '对滑块和木板分别应用牛顿第二定律求出加速度。',
    },
  ],
}
