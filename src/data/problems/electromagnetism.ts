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
  {
    id: 'prob-2021-zhejiang-02',
    year: 2021,
    province: '浙江卷',
    source: '2021年1月浙江省普通高校招生选考科目考试物理试题第2题',
    questionType: 'choice',
    verified: true,
    title: '麦克斯韦电磁场理论与电磁波的基本性质',
    content:
      '关于电磁波与信息时代，下列说法正确的是（　　）\n\nA. 麦克斯韦预言并用实验证实了电磁波的存在\nB. 变化的电场一定产生变化的磁场\nC. 频率越高的电磁波在真空中的传播速度越大\nD. 周期性变化的电场周围会产生周期性变化的磁场',
    difficulty: 2,
    knowledgeIds: ['electricity-6-2'],
    tags: ['高考真题', '麦克斯韦电磁场理论', '电磁波', '赫兹实验'],
    targetAnimation: {
      animId: 'anim-em-wave',
      presetParams: { fEM: 100 },
      presetDescription: '载入麦克斯韦空间正交立体电磁波波动与同相传播仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。麦克斯韦建立了电磁场理论并预言了电磁波的存在，德国物理学家赫兹通过实验首次证实了电磁波的存在。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。均匀变化的电场产生稳定的恒定磁场，只有周期性或非均匀变化的电场才会产生变化的磁场。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。所有电磁波在真空中传播速度均相同，等于光速 c ≈ 3.0×10⁸ m/s，与电磁波的频率无关。',
      },
      D: {
        label: 'D',
        isCorrect: true,
        explanation: '正确。根据麦克斯韦电磁场理论，周期性变化的电场产生同频率周期性变化的磁场，进而在空间形成电磁波。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '辨析物理学史与实验证实',
        keyCondition: '麦克斯韦预言电磁波，赫兹证实电磁波',
        scorePoints: 1,
        explanation: '麦克斯韦提出预言，赫兹完成实验证实。',
      },
      {
        id: 'step-2',
        description: '判断电磁场激发机制',
        keyCondition: '均匀变化产生恒定场，周期性变化产生周期性场',
        scorePoints: 2,
        explanation: '均匀变化产生恒定场，周期性变化才能激发出周期性变化的场并向外传播电磁波。',
      },
    ],
  },
  {
    id: 'prob-2020-zhejiang-03',
    year: 2020,
    province: '浙江卷',
    source: '2020年7月浙江省普通高校招生选考科目考试物理试题',
    questionType: 'choice',
    verified: true,
    title: '收音机 LC 接收回路调谐与电谐振选台',
    content:
      '某收音机接收回路为 LC 振荡电路。若要从接收较高频率的电台转为接收较低频率的电台，下列调节方法正确的是（　　）\n\nA. 增大可变电容器极板的正对面积\nB. 增大可变电容器两极板间的距离\nC. 抽出螺线管中的铁芯\nD. 减少螺线管的线圈匝数',
    difficulty: 3,
    knowledgeIds: ['electricity-6-3'],
    tags: ['高考真题', '电磁波接收', '调谐', '电谐振', '可变电容器'],
    targetAnimation: {
      animId: 'anim-em-spectrum',
      presetParams: { band: 0, radioMode: 1 },
      presetDescription: '载入无线电发射天线辐射与接收回路调谐电谐振仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: true,
        explanation: '正确。电谐振调谐满足 f = 1/(2π√(LC))。接收较低频率需要减小固有频率 f，即增大 L 或增大 C。由电容决定式 C = εrS/(4πkd) 可知，增大极板正对面积 S 使电容 C 增大，固有频率减小，能选出低频电台。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。增大极板间距 d 会使电容 C 减小，导致固有频率 f 增大，只能接收更高频率的电台。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。抽出铁芯会使线圈自感系数 L 减小，固有频率 f 增大，不能接收较低频率。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。减少匝数使自感系数 L 减小，固有频率 f 增大，无法选出较低频率电台。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '明确调谐选台的电谐振条件',
        keyCondition: '接收电台时发生电谐振：f = 1/(2π√(LC))',
        scorePoints: 2,
        explanation: '要接收较低频率电台，需使 LC 回路固有频率 f 减小，即增大 L 或增大 C。',
      },
      {
        id: 'step-2',
        description: '根据结构决定式判断参数调节',
        keyCondition: 'C = εrS/(4πkd)',
        scorePoints: 3,
        explanation: '增大正对面积 S 可增大电容 C，使回路固有频率降低，实现选择较低频率电台。',
      },
    ],
  },
]
