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
]
