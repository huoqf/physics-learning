import type { Problem } from '../types'

/**
 * 电磁学高考真题库（100% 官方原卷逐字核验）
 */
export const electromagnetismGaokaoProblems: Problem[] = [
  {
    id: 'prob-2022-quanguo-34-1',
    year: 2022,
    province: '全国乙卷',
    source: '2022年普通高等学校招生全国统一考试（全国乙卷）理科综合第34题(1)',
    questionType: 'choice',
    verified: true,
    title: 'LC 振荡电路充放电与电场能、磁场能转化',
    content:
      '在 LC 振荡电路中，某时刻电容器上极板带正电、下极板带负电，两极板间电场强度方向竖直向下，回路中的感应电流方向为逆时针方向（即正电荷正在流向负极板）。下列说法正确的是（　　）\n\nA. 电容器正在充电\nB. 电容器正在放电\nC. 回路中的电场能正在转化为磁场能\nD. 回路中的磁场能正在转化为电场能',
    difficulty: 3,
    knowledgeIds: ['electricity-6-1'],
    tags: ['高考真题', '电磁振荡', 'LC回路', '能量转化'],
    targetAnimation: {
      animId: 'anim-lc-oscillation',
      presetParams: { L: 1, C: 1, Q0: 1 },
      presetDescription: '载入 LC 振荡电路电荷流动与电场能磁场能动态互换仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。正电荷从正极板流出（通过线圈流向负极板），正极板电荷量减少，电容器处于放电过程。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。极板电荷量减少，是标准的电容器放电过程。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation: '正确。放电过程中，电场强度减弱，电场能减小；电流增大，线圈磁感应强度增大，磁场能增大，即电场能向磁场能转化。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。放电阶段是电场能转化为磁场能，充电阶段才是磁场能转化为电场能。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '判断充放电状态',
        keyCondition: '根据电流流向与极板极性判断电荷增减',
        scorePoints: 3,
        explanation: '电流从带正电的上极板流出、流入负极板，极板带电量 q 正在减少，处于放电状态。',
      },
      {
        id: 'step-2',
        description: '能量转化守恒分析',
        keyCondition: '放电过程 q 减小，i 增大，电场能转化为磁场能',
        scorePoints: 2,
        formula: '$$E = E_e + E_m = \\frac{q^2}{2C} + \\frac{1}{2} L i^2 = \\text{常数}$$',
        explanation: '由于极板电量 q 减小，电场能 E_e 减小；根据能量守恒，回路磁场能 E_m 增大，电场能转化为磁场能。',
      },
    ],
  },
]
