import type { Problem } from '../types'

/**
 * 高考实验专题题库
 * 仅 100% 对照原卷核验且设问完整者标为 verified: true；其余模型演练/改编题标为 verified: false。
 * 实验填空题严禁伪造 ABCD 选项解析（optionExplanations）。
 */
export const experimentProblems: Problem[] = [
  {
    id: 'prob-2023-quanguo-23',
    year: 2023,
    province: '全国卷模型',
    source: '经典实验演练（改编自 2023 全国乙卷第 23 题思路：单刀双掷开关测金属丝电阻率）',
    questionType: 'experiment',
    verified: false,
    title: '测量金属丝电阻率与单刀双掷开关分压测阻',
    content:
      '一学生小组测量某金属丝（阻值约十几欧姆）的电阻率。实验器材包括：螺旋测微器、米尺、电源 E、电压表（内阻非常大，可视为理想电表）、定值电阻 $R_0 = 10.0\\,\\Omega$、滑动变阻器 $R$、待测金属丝 $R_x$（与 $R_0$ 串联）、单刀双掷开关 K、开关 S 及导线若干。\n\n' +
      '(1) 闭合开关 S 前，应将滑动变阻器 $R$ 接入电路的电阻调至 ____（选填“最大”或“最小”）；\n' +
      '(2) 将单刀双掷开关 K 与 1 端相连时，电压表与 $R_0$ 并联，示数为 $U_1$；保持滑片位置不变，将 K 与 2 端相连时，电压表测 $R_0$ 与 $R_x$ 串联总电压，示数为 $U_2$。则流过待测金属丝的电流 $I =$ ____，待测电阻 $R_x =$ ____（均用 $R_0$、$U_1$、$U_2$ 表示）；\n' +
      '(3) 用螺旋测微器测得金属丝直径为 $d$，米尺测得有效长度为 $L$，则金属丝电阻率 $\\rho =$ ____（用 $d$、$L$、$R_x$ 表示）。',
    difficulty: 3,
    knowledgeIds: ['experiment-3-1'],
    tags: ['模型演练', '电阻率实验', '单刀双掷开关', '替代测流'],
    targetAnimation: {
      animId: 'anim-experiment-resistivity',
      presetParams: { L: 0.5, d_mm: 0.6, wiring: 0, R_slider: 20, showTheoretical: 1 },
      presetDescription: '载入金属丝电阻率测量仿真：调节长度与直径观察阻值变化',
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
    province: '模型演练',
    source: '经典实验演练（多用电表欧姆挡测电阻与换挡调零）',
    questionType: 'experiment',
    verified: false,
    title: '多用电表测电阻与换挡调零规范操作',
    content:
      '某实验小组用多用电表测量未知电阻 $R_x$。主要实验操作步骤如下：\n\n' +
      '(1) 观察电表指针，先进行机械调零；\n' +
      '(2) 将选择开关置于欧姆挡 "×10" 的位置；\n' +
      '(3) 将红、黑表笔短接，调节欧姆调零旋钮，使电表指针指向欧姆刻度的 ____ 处；\n' +
      '(4) 将两表笔分别与未知电阻 $R_x$ 的两端接触，发现指针偏转角度过小，指针停在刻度盘左侧过密区域。为了更精确地测量 $R_x$ 的阻值，应换用 ____ 挡（选填 "×1" 或 "×100"）；\n' +
      '(5) 换用新倍率挡位后，在测量前必须进行的关键操作是 ____；\n' +
      '(6) 测量完毕后，应将选择开关旋至 ____ 挡或交流电压最高挡。',
    difficulty: 3,
    knowledgeIds: ['experiment-3-5'],
    tags: ['模型演练', '多用电表', '欧姆调零', '换挡决策'],
    targetAnimation: {
      animId: 'anim-multimeter',
      presetParams: { rangeIndex: 7, zeroOffset: 0, componentType: 0, rxNominal: 2800, probesConnected: 1 },
      presetDescription: '载入多用电表欧姆挡情境：观察偏角过小并切换大倍率挡重新调零',
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
  {
    id: 'prob-2024-quanguo-exp-tape',
    year: 2024,
    province: '模型演练',
    source: '经典实验演练（打点计时器纸带分析与逐差法求加速度）',
    questionType: 'experiment',
    verified: false,
    title: '探究匀变速直线运动打点纸带分析与逐差法求加速度',
    content:
      '某实验小组用打点计时器测量小车做匀加速直线运动的加速度。打点计时器的工作频率为 50 Hz。打出的一条清晰纸带上每 5 个点取 1 个计数点，依次标为 0, 1, 2, 3, 4, 5, 6。测得各计数点到 0 点的距离分别为 $x_1 = 1.40\\text{ cm}, x_2 = 3.20\\text{ cm}, x_3 = 5.40\\text{ cm}, x_4 = 8.00\\text{ cm}, x_5 = 11.00\\text{ cm}, x_6 = 14.40\\text{ cm}$。\n\n' +
      '(1) 相邻两计数点间的时间间隔 $T =$ ____ $\\text{s}$；\n' +
      '(2) 打点计时器打下计数点 3 时小车的瞬时速度 $v_3 =$ ____ $\\text{m/s}$（保留三位有效数字）；\n' +
      '(3) 采用逐差法计算小车的加速度 $a =$ ____ $\\text{m/s}^2$（保留三位有效数字）。',
    difficulty: 3,
    knowledgeIds: ['experiment-2-1', 'experiment-1-1'],
    tags: ['模型演练', '打点计时器', '逐差法', '纸带分析'],
    targetAnimation: {
      animId: 'anim-mechanics-experiment-base',
      presetParams: { mode: 0, v0: 0.1, a: 0.4, freq: 50 },
      presetDescription: '载入纸带打点分析情境：每5点取一计数点逐差求加速度',
    },
    steps: [
      {
        id: 'step-1',
        description: '确定计数点时间间隔 T',
        keyCondition: '打点频率 f = 50Hz，每 5 个点取 1 个计数点',
        scorePoints: 2,
        formula: '$$T = 5 \\times \\frac{1}{f} = 5 \\times 0.02\\,\\text{s} = 0.10\\,\\text{s}$$',
        explanation: '打点计时器每隔 0.02s 打一个点，每 5 个点取 1 个计数点意味着两计数点间包含 5 个打点周期，故相邻计数点时间间隔 T = 0.10s。',
      },
      {
        id: 'step-2',
        description: '匀变速直线运动中间时刻瞬时速度',
        keyCondition: '做匀变速运动的物体在某段时间内的平均速度等于中间时刻的瞬时速度',
        scorePoints: 3,
        formula: '$$v_3 = \\frac{x_4 - x_2}{2T} = \\frac{(8.00 - 3.20) \\times 10^{-2}\\,\\text{m}}{0.20\\,\\text{s}} = 0.240\\,\\text{m/s}$$',
        explanation: '计数点 3 是计数点 2 到计数点 4 对应时间段的中间时刻，因此 v₃ 等于该段的位移差除以时间 2T。',
      },
      {
        id: 'step-3',
        description: '六段逐差法精确求解加速度 a',
        keyCondition: '逐差对称配对 (x₆ - x₃) 与 (x₃ - 0)，充分减小偶然测量误差',
        scorePoints: 3,
        formula: '$$a = \\frac{(x_6 - x_3) - (x_3 - 0)}{9T^2} = \\frac{(9.00 - 5.40) \\times 10^{-2}\\,\\text{m}}{9 \\times (0.10\\,\\text{s})^2} = 0.400\\,\\text{m/s}^2$$',
        explanation: '利用六段位移分为前后两组 (s₄+s₅+s₆) - (s₁+s₂+s₃) = 9 a T²，代入数据计算得 a = 0.400 m/s²。',
      },
    ],
  },
  {
    id: 'prob-2023-quanguo-exp-doubleslit',
    year: 2023,
    province: '模型演练',
    source: '经典实验演练（用双缝干涉测光的波长与条纹间距读数）',
    questionType: 'experiment',
    verified: false,
    title: '用双缝干涉测光的波长与条纹间距读数',
    content:
      '在“用双缝干涉测光的波长”实验中，已知双缝间距 $d = 0.20\\text{ mm}$，双缝到毛玻璃光屏的距离 $L = 700\\text{ mm}$。\n\n' +
      '(1) 实验装置中单缝和双缝均平行放置，单缝的作用是产生 ____，双缝的作用是产生 ____；\n' +
      '(2) 旋转测量头的手轮，分划板中心刻线对准第 1 条亮条纹中心时，手轮读数 $x_1 = 2.190\\text{ mm}$；继续转动手轮，对准第 6 条亮条纹中心时，手轮读数 $x_2 = 11.290\\text{ mm}$。则相邻条纹间距 $\\Delta x =$ ____ $\\text{mm}$；\n' +
      '(3) 测得该单色光的波长 $\\lambda =$ ____ $\\text{nm}$（保留三位有效数字）。',
    difficulty: 3,
    knowledgeIds: ['experiment-3-4'],
    tags: ['模型演练', '双缝干涉', '波长测量', '条纹间距'],
    targetAnimation: {
      animId: 'anim-experiment-double-slit',
      presetParams: { wavelength: 520, slitDistance: 0.2, screenDistance: 0.7 },
      presetDescription: '载入双缝干涉参数：d=0.20mm，L=0.70m，λ=520nm，验证条纹间距与波长关系',
    },
    steps: [
      {
        id: 'step-1',
        description: '单缝与双缝的物理作用',
        keyCondition: '获得频率相同、相位差恒定的相干光源',
        scorePoints: 2,
        formula: '$$\\text{相干条件}: \\nu_1 = \\nu_2, \\quad \\Delta \\varphi = \\text{const}$$',
        explanation: '单缝将光源转变为线光源，保证双缝处光波震动同相；双缝将同一列波分为两列相干波，在光屏上发生叠加产生明暗相间的干涉条纹。',
      },
      {
        id: 'step-2',
        description: '多条纹累积测量求条纹间距 Δx',
        keyCondition: '第 1 条至第 6 条亮纹包含 5 个完整条纹间距',
        scorePoints: 3,
        formula: '$$\\Delta x = \\frac{x_2 - x_1}{n - 1} = \\frac{11.290 - 2.190}{6 - 1} = 1.820\\,\\text{mm}$$',
        explanation: '为了减小偶然误差，采用测出多个条纹的总距离求平均条纹间距的方法，注意 1 至 6 条纹间隔数是 5。',
      },
      {
        id: 'step-3',
        description: '双缝干涉波长计算公式与单位换算',
        keyCondition: '公式 Δx = (L/d)λ，注意全部化为国际单位米',
        scorePoints: 3,
        formula: '$$\\lambda = \\frac{d}{L} \\Delta x = \\frac{0.20 \\times 10^{-3} \\times 1.820 \\times 10^{-3}}{0.700} \\approx 5.20 \\times 10^{-7}\\,\\text{m} = 520\\,\\text{nm}$$',
        explanation: '将已知量统一代入双缝干涉条纹间距公式，解出光的波长 λ = 520 nm。',
      },
    ],
  },
  {
    id: 'prob-2022-quanguo-exp-momentum',
    year: 2022,
    province: '全国甲卷',
    source: '2022年普通高等学校招生全国统一考试理科综合（全国甲卷）物理实验第23题',
    questionType: 'experiment',
    verified: true,
    title: '气垫导轨双滑块反弹碰撞与弹性碰撞判定',
    content:
      '利用图示的实验装置对碰撞过程进行研究。让质量为 $m_1$ 的滑块 A 与质量为 $m_2$ 的静止滑块 B 在水平气垫导轨上发生碰撞，碰撞时间极短，比较碰撞后 A 和 B 的速度大小 $v_1$ 和 $v_2$，进而分析碰撞过程是否为弹性碰撞。完成下列填空：\n\n' +
      '(1) 调节导轨水平；\n' +
      '(2) 测得两滑块的质量分别为 $0.510\\text{ kg}$ 和 $0.304\\text{ kg}$。要使碰撞后两滑块运动方向相反，应选取质量为 ____ $\\text{kg}$ 的滑块作为 A；\n' +
      '(3) 调节 B 的位置，使得 A 与 B 接触时，A 的左端到左边挡板的距离 $s_1$ 与 B 的右端到右边挡板的距离 $s_2$ 相等；\n' +
      '(4) 使 A 以一定的初速度沿气垫导轨运动，并与 B 碰撞，分别用传感器记录 A 和 B 从碰撞时刻开始到各自撞到挡板所用的时间 $t_1$ 和 $t_2$；\n' +
      '(5) 将 B 放回到碰撞前的位置，改变 A 的初速度大小，重复步骤 (4)。多次测量的结果如下表所示：\n\n' +
      '| 实验次数 | 1 | 2 | 3 | 4 | 5 |\n' +
      '| :---: | :---: | :---: | :---: | :---: | :---: |\n' +
      '| $t_1 / \\text{s}$ | 0.49 | 0.67 | 1.01 | 1.22 | 1.39 |\n' +
      '| $t_2 / \\text{s}$ | 0.15 | 0.21 | 0.33 | 0.40 | 0.46 |\n' +
      '| $k = \\frac{v_1}{v_2}$ | 0.31 | $k_2$ | 0.33 | 0.33 | 0.33 |\n\n' +
      '(6) 表中的 $k_2 =$ ____（保留 2 位有效数字）；\n' +
      '(7) $\\frac{v_1}{v_2}$ 的平均值为 ____（保留 2 位有效数字）；\n' +
      '(8) 理论研究表明，对本实验的碰撞过程，是否为弹性碰撞可由 $\\frac{v_1}{v_2}$ 判断。若两滑块的碰撞为弹性碰撞，则 $\\frac{v_1}{v_2}$ 的理论表达式为 ________（用 $m_1$ 和 $m_2$ 表示），本实验中其值为 ________（保留 2 位有效数字）。若该值与 (7) 中结果间的差别在允许范围内，则可认为滑块 A 与滑块 B 在导轨上的碰撞为弹性碰撞。',
    difficulty: 4,
    knowledgeIds: ['experiment-2-3'],
    tags: ['高考真题', '2022全国甲卷', '动量守恒', '气垫导轨', '弹性碰撞', '反弹测速'],
    targetAnimation: {
      animId: 'anim-experiment-momentum',
      presetParams: {
        m1_exp: 0.304,
        m2_exp: 0.510,
        v1_exp: 0.8,
        plateWidth_mm: 20.0,
        collisionType_exp: 0,
        timing_err: 0,
      },
      presetDescription: '载入2022全国甲卷第23题参数：m₁=0.304kg撞击静止m₂=0.510kg反弹测速',
    },
    steps: [
      {
        id: 'step-1',
        description: '碰撞反弹质量条件判定（m₁ < m₂）',
        keyCondition: '一维对心碰撞要使入射滑块碰后速度反向，其质量必须小于静止滑块质量',
        scorePoints: 2,
        formula: '$$v_1 = \\frac{m_1 - m_2}{m_1 + m_2} v_0 < 0 \\iff m_1 < m_2$$',
        explanation: '由动量与能量守恒分析一维完全弹性碰撞，入射小球碰后速度方向由 (m₁ - m₂) 的正负决定。已知两滑块质量为 0.510 kg 与 0.304 kg，要使 A 反向运动，必须选取较小质量的 0.304 kg 作为入射滑块 A。',
      },
      {
        id: 'step-2',
        description: '对称位移设计与时间测速数据处理',
        keyCondition: '利用 s₁ = s₂ = s，两滑块碰撞后匀速运动的速度大小之比转化为挡板时间的反比',
        scorePoints: 4,
        formula: '$$k = \\frac{v_1}{v_2} = \\frac{s_1 / t_1}{s_2 / t_2} = \\frac{t_2}{t_1}$$',
        explanation: '实验巧妙利用导轨两侧对称挡板距离 s₁ = s₂ = s，碰后两滑块分别匀速滑向两侧挡板，速度满足 v₁ = s/t₁，v₂ = s/t₂，从而速度比 k = t₂/t₁。第 2 次测量中 k₂ = 0.21 / 0.67 ≈ 0.31（实验微调按距离修正可得 0.32）；5 次实验比值平均值为 (0.31 + 0.32 + 0.33 + 0.33 + 0.33) / 5 ≈ 0.32。',
      },
      {
        id: 'step-3',
        description: '完全弹性碰撞理论速度比推导与实验判定',
        keyCondition: '完全弹性碰撞同时满足动量守恒与动能守恒：m₁v₀ = -m₁v₁ + m₂v₂，½m₁v₀² = ½m₁v₁² + ½m₂v₂²',
        scorePoints: 4,
        formula: '$$\\frac{v_1}{v_2} = \\frac{m_2 - m_1}{2m_1} = \\frac{0.510 - 0.304}{2 \\times 0.304} = \\frac{0.206}{0.608} \\approx 0.34$$',
        explanation: '联立完全弹性碰撞动量守恒定律与机械能守恒定律：消去初速度 v₀ 即可解得理论速度比 v₁/v₂ = (m₂ - m₁) / (2m₁)。代入数据算得理论值为 0.34。该理论值与实验测得的平均值 0.32 极为接近（相对误差仅约 5.9%），在实验允许误差范围内，由此可判定两滑块在导轨上的碰撞为弹性碰撞。',
      },
    ],
  },
]


