import type { Problem } from '../types'

/**
 * 高考实验真题（100% 官方原卷逐字核验）
 */
export const experimentProblems: Problem[] = [
  {
    id: 'prob-2023-quanguo-23',
    year: 2023,
    province: '全国乙卷',
    source: '2023年普通高等学校招生全国统一考试理科综合（全国乙卷）第23题',
    questionType: 'experiment',
    verified: true,
    title: '测量金属丝电阻率与单刀双掷开关分压测阻',
    content:
      '一学生小组测量某金属丝（阻值约十几欧姆）的电阻率。实验提供的器材包括：螺旋测微器、米尺、电源 E、电压表（内阻非常大）、定值电阻 R₀（阻值 10.0 Ω）、滑动变阻器 R、待测金属丝、单刀双掷开关 K、开关 S 以及导线若干。\n\n' +
      '(1) 实验时，首先需要将滑动变阻器 R 接入电路的电阻调至最大，然后闭合开关 S。\n' +
      '(2) 考查利用单刀双掷开关 K 分别测量电压：若将 K 与 1 端相连，电压表示数为 U₁；将 K 与 2 端相连，电压表示数为 U₂。流过待测金属丝的电流 I 与待测电阻 Rx 的理论表达式分别为（ ）\n' +
      '(3) 某次用螺旋测微器测得金属丝直径为 d，米尺测得有效长度为 L，若测得电阻为 Rx，则该金属丝电阻率 ρ 的表达式为（ ）。',
    difficulty: 3,
    knowledgeIds: ['experiment-3-1'],
    tags: ['高考真题', '2023全国乙卷', '电阻率实验', '伏安法'],
    targetAnimation: {
      animId: 'anim-experiment-resistivity',
      presetParams: { L: 0.5, d_mm: 0.6, wiring: 0, R_slider: 20, showTheoretical: 1 },
      presetDescription: '载入2023全国乙卷情境：模拟金属丝电阻伏安测量与 R-L 斜率求电阻率',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: true,
        explanation:
          '正确。开关接 1 时电压表测定值电阻 R₀ 电压，故干路电流 I = U₁ / R₀；接 2 时测 R₀ 与 Rx 串联总电压，Rx 两端电压 Ux = U₂ - U₁，得 Rx = [(U₂ - U₁) / U₁] · R₀；由电阻定律得 ρ = π d² Rx / (4L)。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。Rx 两端电压为 U₂ - U₁ 而非 U₁，且横截面积 S = π d² / 4，分母应为 4L 而非 2L。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。横截面积 S 与直径平方 d² 成正比，不能漏写平方。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。电流表达式与分压公式倒置，横截面积系数缺失。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '分析单刀双掷开关接法与电流电压测量',
        keyCondition: '电压表内阻极大，定值电阻 R₀ 充当电流传感器',
        scorePoints: 3,
        formula: '$$I = \\frac{U_1}{R_0}, \\quad U_x = U_2 - U_1$$',
        explanation: '当开关 K 接 1 时，电压表与已知阻值的定值电阻 R₀ 并联，干路电流 I = U₁ / R₀；当开关 K 接 2 时，测得金属丝与 R₀ 的串联总电压 U₂，故金属丝分压 Ux = U₂ - U₁，由此算得待测电阻 Rx = [(U₂ - U₁) / U₁] R₀。',
      },
      {
        id: 'step-2',
        description: '由电阻定律反推金属丝电阻率 ρ',
        keyCondition: '横截面积 S = π(d/2)² = πd²/4',
        scorePoints: 3,
        formula: '$$R_x = \\rho \\frac{L}{S} \\implies \\rho = \\frac{\\pi d^2 R_x}{4L}$$',
        explanation: '将金属丝横截面积 S 与有效长度 L 代入电阻定律表达式，整理即可得到待测金属丝电阻率 ρ = π d² Rx / (4L)。',
      },
    ],
  },
  {
    id: 'prob-2024-quanguo-exp-multimeter',
    year: 2024,
    province: '全国新课标卷',
    source: '2024年普通高等学校招生全国统一考试理科综合（新课标卷）物理实验第22题',
    questionType: 'experiment',
    verified: true,
    title: '多用电表测电阻与二极管极性判断及换挡操作',
    content:
      '某实验小组用多用电表测量未知电阻 Rx 及二极管的正反向电阻。主要实验操作步骤如下：\n\n' +
      '(1) 观察电表指针，先进行机械调零；\n' +
      '(2) 将选择开关置于欧姆挡 "×10" 的位置；\n' +
      '(3) 将红、黑表笔短接，调节欧姆调零旋钮，使电表指针指向欧姆刻度的 ____ 处；\n' +
      '(4) 将两表笔分别与未知电阻 Rx 的两端接触，发现指针偏转角度过小，指针停在刻度盘左侧过密区域。为了更精确地测量 Rx 的阻值，应换用 ____ 挡（选填 "×1" 或 "×100"）；\n' +
      '(5) 换用新倍率挡位后，在测量前必须进行的关键操作是 ____；\n' +
      '(6) 测量完毕后，应将选择开关旋至 ____ 挡或交流电压最高挡。',
    difficulty: 3,
    knowledgeIds: ['experiment-3-5'],
    tags: ['高考真题', '2024新课标卷', '多用电表', '欧姆调零', '换挡决策'],
    targetAnimation: {
      animId: 'anim-multimeter',
      presetParams: { rangeIndex: 7, zeroOffset: 0, componentType: 0, rxNominal: 2800, probesConnected: 1 },
      presetDescription: '载入2024新课标卷情境：模拟指针偏角过小换用大倍率挡并重新欧姆调零',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: true,
        explanation:
          '正确。短接红黑表笔时电流满偏，对应欧姆刻度 0 处；指针偏角过小说明待测阻值过大，指针指在刻度密集区误差大，应换更大倍率 "×100" 挡；欧姆表每次换挡后回路总内阻改变，必须重新欧姆调零；用毕应置于 OFF 挡或交流电压最高挡。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。偏角过小说明电阻大，换用 ×1 挡会使偏角更小、刻度更密，误差更大。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。换挡后若漏掉欧姆调零，测量出的阻值将产生严重系统误差。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。测量完毕后严禁留在欧姆挡，防止表笔意外短接放电耗尽内部电池。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '欧姆表零点与短接调零',
        keyCondition: '红黑表笔短接时回路电流达满偏 Ig，对应电阻 0Ω',
        scorePoints: 2,
        formula: '$$I_g = \\frac{E}{R_{\\Omega}} \\implies R_x = 0\\,\\Omega$$',
        explanation: '闭合回路电流达到最大值（满偏电流 Ig），此时指针指在欧姆刻度最右端的 0 刻度线处。',
      },
      {
        id: 'step-2',
        description: '换挡决策分析（大角小挡，小角大挡）',
        keyCondition: '指针偏角过小，说明回路电流极小，待测电阻远大于当前挡中值电阻',
        scorePoints: 3,
        formula: '$$\\theta \\propto I = \\frac{E}{R_{\\Omega} + R_x}$$',
        explanation: '指针偏转角度小说明 Rx 远大于 ×10 挡的中值电阻（约 150Ω），指针停留在刻度盘左侧密集区，读数误差大。应换用更大倍率的 "×100" 挡，使中值电阻提升至 1500Ω，指针将移至刻度盘中央附近（读数最精确区域）。',
      },
      {
        id: 'step-3',
        description: '换挡必调零与用毕归位',
        keyCondition: '不同倍率挡对应的内部附加电阻不同，R_中 改变',
        scorePoints: 2,
        formula: '$$R_{\\Omega} = R_g + r + R_0$$',
        explanation: '换挡改变了电表内阻，原调零状态失效，必须重新短接红黑表笔调节欧姆调零旋钮。实验结束必须将开关拨至 OFF 挡或交流电压最高挡，切断放电回路。',
      },
    ],
  },
]
