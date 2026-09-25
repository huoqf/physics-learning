import type { Problem } from '../types'

/**
 * 光学高考真题库（100% 官方原卷逐字核验）
 */
export const opticsGaokaoProblems: Problem[] = [
  {
    id: 'prob-2021-shandong-07',
    year: 2021,
    province: '山东卷',
    source: '2021年普通高等学校招生全国统一考试（山东卷）物理第7题',
    questionType: 'choice',
    verified: true,
    title: '薄膜干涉与工件表面平整度检测',
    content:
      '利用薄膜干涉可以检查精密工件表面的平整程度。如图所示，将一块平整的标准样板放在待测工件表面上，并在其一端垫入薄片，形成一个空气劈尖。用单色光垂直照射样板，从样板上方观察到明暗相间的干涉条纹。下列说法正确的是（　　）\n\nA. 干涉条纹是由样板的上表面和工件的下表面反射的光叠加形成的\nB. 干涉条纹是由样板的下表面和工件的上表面反射的光叠加形成的\nC. 若观察到的条纹向劈尖薄端弯曲，说明该处工件表面有凸起\nD. 若观察到的条纹向劈尖薄端弯曲，说明该处工件表面有凹陷',
    difficulty: 3,
    knowledgeIds: ['wave-optics-1-5'],
    tags: ['高考真题', '薄膜干涉', '等厚干涉', '平整度检测'],
    targetAnimation: {
      animId: 'anim-thin-film-interference',
      presetParams: { mode: 1, wavelength: 600, wedgeAngle_mrad: 0.3, defect: 1 },
      presetDescription: '载入2021山东卷真题情境：观察局部凹坑导致条纹向薄端弯曲',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。薄膜干涉中的薄膜是样板与工件之间的“空气薄膜”，反射光来自空气薄膜的上表面（样板下表面）和空气薄膜的下表面（工件上表面）。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。两束相干反射光分别产生于样板下表面与工件上表面。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。若条纹向劈尖薄端弯曲，表明此处空气膜厚度比两侧平整处更大，工件表面凹陷。',
      },
      D: {
        label: 'D',
        isCorrect: true,
        explanation: '正确。等厚干涉中同一条条纹对应相同的空气膜厚度。当工件表面有局部凹坑时，该处空气层变厚，要达到与未凹陷处相同的厚度，必须跑到原先厚度较小的地方（即劈尖更薄的尖端方向），故条纹向薄端弯曲。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '明确相干反射光产生界面（空气薄膜边界）',
        keyCondition: '劈尖干涉的薄膜是样板与工件间的空气层',
        scorePoints: 3,
        explanation: '单色光垂直入射时，在空气薄层的上界面（标准样板下表面）和下界面（工件上表面）分别发生反射，两束反射光频率相同、相位差恒定，形成薄膜干涉。',
      },
      {
        id: 'step-2',
        description: '应用等厚线判据推导条纹弯曲方向',
        keyCondition: '同一条明纹或暗纹对应的空气膜厚度 d 处处相等',
        scorePoints: 3,
        formula: '$$2d = \\begin{cases} (k + \\frac{1}{2})\\lambda & (\\text{亮纹}) \\\\[4pt] k\\lambda & (\\text{暗纹}) \\end{cases}$$',
        explanation: '工件表面局部凹下处，空气膜厚度增加。为保证光程差相等（即膜厚相同），该条纹只能向空气膜原本较薄的劈棱端弯曲；反之，若局部凸起则向厚端弯曲。即“凹向薄端，凸向厚端”。',
      },
    ],
  },
]
