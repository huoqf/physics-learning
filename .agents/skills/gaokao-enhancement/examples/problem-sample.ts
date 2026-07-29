import type { Problem } from '@/data/types'

/**
 * 高考物理真题标准数据范例
 * 供 Agent 开发录入真题时按需参考与复用
 */
export const sampleGaokaoProblem: Problem = {
  id: 'prob-2024-quanguo-21',
  year: 2024,
  province: '全国新课标卷',
  source: '2024年高考全国新课标卷第21题',
  title: '板块模型与临界相对滑动分析',
  
  // 1. 题目原文（必须 100% 对齐原卷，使用 LaTeX 渲染公式）
  content: `如图所示，质量 $m_1 = 1\\text{ kg}$ 的长木板置于光滑水平面上，木板左端放有一质量 $m_2 = 2\\text{ kg}$ 的滑块。已知滑块与木板间的动摩擦因数 $\\mu_1 = 0.2$。现给木板一水平向右的初速度 $v_0 = 6\\text{ m/s}$，求：\n(1) 滑块与木板相对静止时的共同速度；\n(2) 木板需要的最小长度 $L_{min}$。`,
  
  // 2. 方案 B 真题高清图片资源路径（可选）
  images: ['/images/problems/2024_quanguo_21.svg'],
  
  difficulty: 4,
  knowledgeIds: ['kn-block-board'],
  masterModelId: 'model-block-board',
  tags: ['高考压轴', '板块模型', '临界受力'],
  
  // 3. 真题-动画双向联动预设参数
  targetAnimation: {
    animId: 'anim-block-board',
    presetParams: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    presetDescription: '载入2024全国新课标卷第21题参数',
  },
  
  // 4. 采分点步骤拆解
  steps: [
    {
      id: 'step-1',
      description: '受力分析与临界加速度判断',
      keyCondition: '滑块与木板恰好不相对滑动时，静摩擦力达到最大值 f_max = μ1*m1*g',
      scorePoints: 3,
      formula: 'a_{\\text{max}} = \\mu_1 g = 0.2 \\times 10 = 2\\text{ m/s}^2',
      explanation: '当系统加速度超过 a_max 时，两者发生相对滑动。',
    },
    {
      id: 'step-2',
      description: '动量守恒求共同速度',
      keyCondition: '系统水平方向不受外力，动量守恒',
      scorePoints: 4,
      formula: 'm_1 v_0 = (m_1 + m_2) v_{\\text{共}} \\implies v_{\\text{共}} = 2\\text{ m/s}',
      explanation: '带入数值计算得相对静止时的共同速度为 2 m/s。',
    },
  ],
}
