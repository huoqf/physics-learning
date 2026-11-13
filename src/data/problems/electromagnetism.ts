import type { Problem } from '../types'

/**
 * 电磁学（第6章 电磁振荡与电磁波）高考真题与经典模型演练题库
 *
 * 规范与真题准入铁律（严格遵守 gaokao-enhancement/SKILL.md §0A 与 §Step 0B）：
 *   1. 官方原卷真题：verified: true，具有明确的年份、卷别与原卷题号，原文逐字核验对齐；
 *   2. 典型模型演练题：verified: false，标题标明【模型演练】，source 注明改编出处，不欺瞒学生；
 *   3. 初始配图绝对纯净，严禁透题，无解题辅助线或受力分解箭头；
 *   4. 通过 targetAnimation 单向参数透传与动画仿真联动，学练彻底解耦。
 */
export const electromagnetismGaokaoProblems: Problem[] = [
  // ── 【官方原卷真题 1】2020年7月浙江选考第6题（LC放电与能量转化原题）───────
  {
    id: 'prob-2020-zhejiang-07-06',
    year: 2020,
    province: '浙江卷',
    source: '2020年7月浙江省普通高校招生选考科目考试物理试题 第6题',
    questionType: 'choice',
    verified: true,
    title: 'LC 振荡电路放电状态与电场磁场物理量动态分析',
    content:
      '如图所示为某时刻 LC 振荡电路的工作状态，此时电容器上极板带正电，线圈中的电流方向如图中箭头所示（自上极板经线圈流向下极板，逆时针）。下列说法正确的是（　　）\n\nA. 电容器正在充电\nB. 回路中的磁场能正在转化为电场能\nC. 电容器两极板间的电场强度正在减小\nD. 线圈中的自感电动势正在增大',
    difficulty: 3,
    knowledgeIds: ['electricity-6-1'],
    tags: ['高考真题', '电磁振荡', 'LC回路', '放电过程', '场强与电动势'],
    targetAnimation: {
      animId: 'anim-lc-oscillation',
      presetParams: { scene: 0, L: 0.4, C: 0.4, dRatio: 1.0, Q0: 1.0, showDamping: 0 },
      presetDescription: '载入2020浙江选考第6题：上极板带正电，逆时针放电，电场能向磁场能转化',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。电流自带正电的上极板流出，上极板正电荷量减少，电容器正在放电。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。放电过程中电荷量减小、极板电场能减小，回路电流增大、线圈磁场能增大，是电场能转化为磁场能。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation: '正确。放电过程中极板电荷量 $q$ 减小，由 $U = \\frac{q}{C}$ 与匀强电场场强公式 $E = \\frac{U}{d}$ 可知，两极板间电场强度正在减小。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。理想 LC 回路中线圈两端电压与电容器电压绝对值相等（$|e_L| = |u_C| = \\frac{q}{C}$），放电过程中 $q$ 减小，电流虽然增大，但电流变化率 $\\left|\\frac{\\Delta i}{\\Delta t}\\right|$ 减小，自感电动势正在减小。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '判断充放电状态与能量转化方向',
        keyCondition: '正电荷自正极板流出为放电过程',
        scorePoints: 1,
        explanation: '电流从正极板流出流入负极板，极板电荷量减小，为放电过程，电场能转化为磁场能。',
      },
      {
        id: 'step-2',
        description: '根据物理量决定式分析场强与自感电动势',
        keyCondition: 'E = q/(εrS), |e_L| = u_C = q/C',
        scorePoints: 2,
        formula: 'E = \\frac{U}{d} = \\frac{q}{Cd}, \\quad |e_L| = L\\left|\\frac{\\Delta i}{\\Delta t}\\right| = \\frac{q}{C}',
        explanation: '随着放电进行，q 减小，极板间电场强度 E 减小；线圈自感电动势等于极板电压，亦随 q 减小而减小。',
      },
    ],
  },

  // ── 【官方原卷真题 2】2023年6月浙江选考第8题（收音机调谐与可变电容原题）────
  {
    id: 'prob-2023-zhejiang-06-08',
    year: 2023,
    province: '浙江卷',
    source: '2023年6月浙江省普通高校招生选考科目考试物理试题 第8题',
    questionType: 'choice',
    verified: true,
    title: '收音机 LC 调谐电路选台频率调节',
    content:
      '某收音机调谐电路的电感线圈固定，当可变电容器的电容调为 $C_1$ 时，能接收频率为 $102.6\\text{ MHz}$ 的电台信号；若要接收频率为 $93.0\\text{ MHz}$ 的电台信号，可变电容器的电容应调为 $C_2$。下列说法正确的是（　　）\n\nA. $C_2 < C_1$，应减小可变电容器动片与定片间的距离\nB. $C_2 < C_1$，应减小可变电容器动片与定片的正对面积\nC. $C_2 > C_1$，应增大可变电容器动片与定片间的距离\nD. $C_2 > C_1$，应增大可变电容器动片与定片的正对面积',
    difficulty: 3,
    knowledgeIds: ['electricity-6-3'],
    tags: ['高考真题', '电谐振', '调谐回路', '可变电容器', '频率调节'],
    targetAnimation: {
      animId: 'anim-em-spectrum',
      presetParams: { scene: 2, radioMode: 1, cRx: 1.22 },
      presetDescription: '载入2023浙江选考第8题：电台频率由 102.6MHz 降至 93.0MHz，电容由 C₁ 增至 C₂ 调谐',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。接收较低频率电台需要增大回路固有周期、减小固有频率，应使电容增大即 C₂ > C₁；若减小极板间距 d 虽可增大电容，但前提结论错误（C₂ 应大于 C₁）。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。减小正对面积 S 会使电容 C 减小，固有频率增大，无法接收较低频率信号。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。增大动片与定片间的距离 d 会使电容 C 减小，与 C₂ > C₁ 矛盾。',
      },
      D: {
        label: 'D',
        isCorrect: true,
        explanation: '正确。由 LC 回路固有频率公式 $f = \\frac{1}{2\\pi\\sqrt{LC}}$ 可知，接收电台频率由 102.6 MHz 降为 93.0 MHz 时，需减小回路固有频率，即增大电容（$C_2 > C_1$）。由平行板电容器电容决定式 $C = \\frac{\\varepsilon_r S}{4\\pi k d}$ 可知，旋动动片增大正对面积 S 可增大电容，故 D 正确。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '明确电谐振调谐条件与电容大小关系',
        keyCondition: 'f = 1/(2π√(LC))',
        scorePoints: 1,
        formula: 'f_2 < f_1 \\implies C_2 > C_1',
        explanation: '线圈自感 L 固定，接收电台信号频率由 102.6 MHz 降到 93.0 MHz，由 $f = \\frac{1}{2\\pi\\sqrt{LC}}$ 可知，电容需增大，即 $C_2 > C_1$。',
      },
      {
        id: 'step-2',
        description: '结合平行板电容器决定式判断动片调节',
        keyCondition: 'C = εrS/(4πkd)',
        scorePoints: 2,
        formula: 'C \\propto S, \\quad C \\propto \\frac{1}{d}',
        explanation: '要使电容增大，可通过旋动动片增大动片与定片间的正对面积 S，或减小动片与定片间的距离 d。故增大正对面积符合要求，选项 D 正确。',
      },
    ],
  },

  // ── 【官方原卷真题 3】2024年北京学考等级考第2题（电磁波谱技术应用原题）──────
  {
    id: 'prob-2024-beijing-02',
    year: 2024,
    province: '北京卷',
    source: '2024年北京市普通高中学业水平等级性考试物理试卷 第2题',
    questionType: 'choice',
    verified: true,
    title: '电磁波谱各谱段特性与现代科技应用辨析',
    content:
      '关于电磁波的应用，下列说法正确的是（　　）\n\nA. 紫外线用于红外遥感\nB. 医院用 X 射线进行人体透视\nC. 微波用于金属内部裂纹探伤\nD. $\\gamma$ 射线用于夜视仪',
    difficulty: 2,
    knowledgeIds: ['electricity-6-3'],
    tags: ['高考真题', '电磁波谱', 'X射线', '红外线', '波谱应用'],
    targetAnimation: {
      animId: 'anim-em-spectrum',
      presetParams: { scene: 2, radioMode: 0, band: 5 },
      presetDescription: '载入2024北京高考第2题：聚焦 X 射线高频穿透特性与医学透视应用',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。红外遥感利用的是红外线具有显著热效应与穿透云雾能力，紫外线主要用于杀菌消毒、防伪验钞与激发荧光效应。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。X 射线波长短、光子能量高、穿透本领强，能穿透肌肉但被骨骼大量吸收，因此医学上常用于人体透视与骨骼拍片。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。金属内部裂纹探伤利用的是穿透能力极强的 $\\gamma$ 射线或超声波，微波无法穿透厚重金属板（微波被金属反射）。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。夜视仪利用一切物体都在向外辐射的红外线进行夜间成像；$\\gamma$ 射线穿透力极强、具电离辐射杀伤力，用于癌症放疗或工业探伤，不能用于夜视仪。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '辨析各电磁波谱段主要物理效应与技术应用',
        keyCondition: '波长越短，穿透能力与能量越强；不同谱段有独特的典型效应',
        scorePoints: 3,
        explanation: '红外线热效应强用于遥感与夜视；紫外线化学效应与荧光效应强用于验钞消毒；X 射线穿透力强用于医疗透视；γ 射线能量极高用于放疗与探伤。',
      },
    ],
  },

  // ── 【高考模型演练 1】LC 振荡经典模型 ──────────────────────────────────
  {
    id: 'prob-lc-oscillation-model',
    year: 2022,
    province: '全国卷模型',
    source: '经典高考演练题（改编自全国高考 LC 振荡回路考法）',
    questionType: 'choice',
    verified: false,
    title: '【模型演练】LC 振荡电路充放电与能量互换判据',
    content:
      '在 LC 振荡电路中，某时刻电容器上极板带正电、下极板带负电，两极板间电场强度方向竖直向下，回路中的感应电流方向为逆时针方向。下列说法正确的是（　　）\n\nA. 电容器正在充电\nB. 电容器正在放电\nC. 电容器两极板间的电压正在增大\nD. 回路中的磁场能正在转化为电场能',
    difficulty: 3,
    knowledgeIds: ['electricity-6-1'],
    tags: ['高考模型', '电磁振荡', 'LC回路', '能量转化'],
    targetAnimation: {
      animId: 'anim-lc-oscillation',
      presetParams: { scene: 0, L: 0.4, C: 0.4, dRatio: 1.0, Q0: 1.0, showDamping: 0 },
      presetDescription: 'L=0.4H, C=0.4F, Q₀=1.0C，载入 LC 振荡电路电荷流动与电场能磁场能动态互换仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。逆时针感应电流从带正电的上极板流出（流向负极板），正极板电荷量减少，电容器处于放电过程。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。正电荷由正极板流出流向负极板，极板电荷量减少，是标准的电容器放电过程。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。放电过程中，极板带电量 q 减小，由 U = q/C 可知两极板间电压正在减小。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。放电阶段电场能减小、磁场能增大，是电场能转化为磁场能；充电阶段才是磁场能转化为电场能。',
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

  // ── 【高考模型演练 2】麦克斯韦理论经典模型 ─────────────────────────────
  {
    id: 'prob-maxwell-em-wave-model',
    year: 2021,
    province: '浙江卷模型',
    source: '经典高考演练题（改编自浙江选考麦克斯韦理论考法）',
    questionType: 'choice',
    verified: false,
    title: '【模型演练】麦克斯韦电磁场理论与电磁波的基本性质',
    content:
      '关于电磁波与信息时代，下列说法正确的是（　　）\n\nA. 麦克斯韦预言并用实验证实了电磁波的存在\nB. 变化的电场一定产生变化的磁场\nC. 频率越高的电磁波在真空中的传播速度越大\nD. 周期性变化的电场周围会产生周期性变化的磁场',
    difficulty: 2,
    knowledgeIds: ['electricity-6-2'],
    tags: ['高考模型', '麦克斯韦电磁场理论', '电磁波', '赫兹实验'],
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

  // ── 【高考模型演练 3】LC 调谐经典模型 ──────────────────────────────────
  {
    id: 'prob-lc-tuning-model',
    year: 2020,
    province: '浙江卷模型',
    source: '经典高考演练题（改编自高考 LC 调谐与电谐振选台考法）',
    questionType: 'choice',
    verified: false,
    title: '【模型演练】收音机 LC 接收回路调谐与电谐振选台',
    content:
      '某收音机接收回路为 LC 振荡电路。若要从接收较高频率的电台转为接收较低频率的电台，下列调节方法正确的是（　　）\n\nA. 增大可变电容器极板的正对面积\nB. 增大可变电容器两极板间的距离\nC. 抽出螺线管中的铁芯\nD. 减少螺线管的线圈匝数',
    difficulty: 3,
    knowledgeIds: ['electricity-6-3'],
    tags: ['高考模型', '电磁波接收', '调谐', '电谐振', '可变电容器'],
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
  {
    id: 'prob-sensor-hall-model',
    year: 2023,
    province: '全国卷模型',
    source: '经典高考演练题（改编自全国高考霍尔元件微观平衡考法）',
    questionType: 'choice',
    verified: false,
    title: '霍尔元件微观平衡与半导体电势极性判定',
    content:
      '如图所示，厚度为 d、宽度为 b 的半导体薄片置于垂直向里的匀强磁场 B 中，通入水平向右的恒定电流 I。薄片上下表面间产生稳定的霍尔电压 UH。下列说法正确的是（　　）\n\nA. 若载流子为自由电子（N型半导体），则上表面电势高于下表面\nB. 若载流子为正空穴（P型半导体），则上表面电势高于下表面\nC. 霍尔电压 UH 与薄片厚度 d 成正比\nD. 霍尔电压 UH 与磁感应强度 B 成反比',
    difficulty: 3,
    knowledgeIds: ['electricity-7-1'],
    tags: ['高考模型', '传感器', '霍尔效应', '洛伦兹力', '极性判定'],
    targetAnimation: {
      animId: 'anim-sensors',
      presetParams: { sensorType: 2, magneticB: 1.2, currentI: 1.0, carrierType: 1 },
      presetDescription: '载入霍尔元件微观平衡与正空穴载流子洛伦兹力偏转仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。电流向右，自由电子向左运动。由左手定则（或洛伦兹力公式），电子受向上的洛伦兹力偏转积聚在上表面，上表面带负电，电势低于下表面。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。正空穴向右运动，由左手定则，正电荷受向上的洛伦兹力偏转积聚在上表面，上表面带正电，电势高于下表面。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。由微观平衡 qvB = q(UH/b) 与 I = nqv(bd) 可推导得 UH = (1/nq)(IB/d)，霍尔电压 UH 与厚度 d 成反比。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。由 UH = (1/nq)(IB/d) 可知，霍尔电压与磁感应强度 B 成正比。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '应用左手定则判断载流子偏转方向',
        keyCondition: '电流向右，磁场向里，洛伦兹力垂直向上',
        scorePoints: 2,
        explanation: '无论是电子向左还是正电荷向右，所受洛伦兹力均向上偏转，决定了积聚在上表面的电荷电性。',
      },
      {
        id: 'step-2',
        description: '联立微观平衡与电流微观表达式求霍尔电压',
        keyCondition: 'qvB = q(UH/b), I = nqvb d => UH = IB/(nqd)',
        scorePoints: 3,
        explanation: '霍尔电压与 B、I 成正比，与薄片厚度 d、载流子体密度 n 成反比。',
      },
    ],
  },
  {
    id: 'prob-sensor-light-relay-model',
    year: 2024,
    province: '新课标卷模型',
    source: '经典高考演练题（改编自新高考光敏电阻控制路灯实验考法）',
    questionType: 'choice',
    verified: false,
    title: '光敏电阻与电磁继电器自动控制路灯电路分析',
    content:
      '某自动光控路灯控制电路由控制回路与受控高压工作回路组成。控制回路中直流电源电动势为 E、内阻不计，滑动变阻器 R₀ 与光敏电阻 RG 串联接入电磁继电器线圈。路灯接入继电器的常闭触点。关于该控制装置，下列说法正确的是（　　）\n\nA. 白天光照充足时，光敏电阻阻值增大，衔铁被吸下\nB. 天黑时光敏电阻阻值增大，回路电流减小，弹簧拉回衔铁闭合常闭触点使路灯点亮\nC. 为了使路灯在天更暗时才点亮，应将滑动变阻器 R₀ 的阻值调大\nD. 若改接在继电器的常开触点上，路灯也能在夜晚正常点亮',
    difficulty: 3,
    knowledgeIds: ['electricity-7-2'],
    tags: ['高考模型', '传感器', '光敏电阻', '电磁继电器', '常闭触点'],
    targetAnimation: {
      animId: 'anim-sensors',
      presetParams: { sensorType: 0, illuminance: 30, rFixed: 5000 },
      presetDescription: '载入光敏电阻常闭触点电磁继电器自动路灯仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。白天光照充足时，光敏电阻受光激发，光生载流子激增，阻值急剧减小而非增大。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。天黑光照减弱，RG 增大，控制回路总电阻增大，电流减小。电磁铁磁力不足以克服弹簧拉力，弹簧拉回衔铁使常闭触点闭合，工作回路接通点亮路灯。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。继电器释放电流阈值固定，对应临界总电阻 R₀ + RG + r 为定值。若要天更暗（RG 阻值更大）时才触发释放点亮，应减小 R₀；若调大 R₀，在天较亮时即提前点亮。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。常开触点在电磁铁吸合时才导通。若改接常开触点，白天电流大吸合工作，路灯会在白天亮、夜晚熄灭，不符合自动路灯设计要求。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '分析光敏电阻的光电特性与闭合电路欧姆定律',
        keyCondition: '天黑 -> 光强减小 -> RG增大 -> 回路电流I减小',
        scorePoints: 2,
        explanation: '控制回路电流随光照变弱而减小。',
      },
      {
        id: 'step-2',
        description: '判断电磁继电器衔铁动作与触点通断',
        keyCondition: '电流小于吸合电流 -> 磁力不足 -> 弹簧复位 -> 常闭触点接通',
        scorePoints: 3,
        explanation: '常闭触点在电磁铁未吸合时导通，因此夜晚回路接通点亮路灯。',
      },
    ],
  },
]
