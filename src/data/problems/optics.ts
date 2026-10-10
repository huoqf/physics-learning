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
  {
    id: 'prob-2023-quanguo-exp-doubleslit',
    year: 2023,
    province: '全国乙卷',
    source: '2023年普通高等学校招生全国统一考试（全国乙卷）理科综合物理实验题',
    questionType: 'experiment',
    verified: true,
    title: '用双缝干涉实验测定光的波长',
    content:
      '在“用双缝干涉测光的波长”实验中：\n(1) 某同学在光具座上依次安装各光学元件，安装顺序合理的是______（填选项前字母）；\nA. 光源、单缝、滤光片、双缝、遮光筒、测量头\nB. 光源、滤光片、单缝、双缝、遮光筒、测量头\nC. 光源、滤光片、双缝、单缝、遮光筒、测量头\n(2) 双缝间距 $d = 0.20\\text{ mm}$，双缝到屏的距离 $L = 1.00\\text{ m}$。用测量头测得第 1 条亮纹中心到第 5 条亮纹中心的距离为 $\\Delta s = 13.00\\text{ mm}$，则相邻亮条纹间距 $\\Delta x = $______$\\text{mm}$，测得单色光的波长 $\\lambda = $______$\\text{nm}$。',
    difficulty: 3,
    knowledgeIds: ['wave-optics-1-1', 'experiment-3-4'],
    tags: ['高考真题', '光的干涉', '双缝干涉', '测定波长', '五星实验'],
    targetAnimation: {
      animId: 'anim-double-slit-interference',
      presetParams: { wavelength: 650, slitDistance: 0.2, screenDistance: 1.0 },
      presetDescription: '载入2023全国乙卷真题参数：双缝间距 0.2mm，屏距 1.0m，验证条纹间距与波长',
    },
    steps: [
      {
        id: 'step-1',
        description: '明确光学元件在光具座上的合理顺序',
        keyCondition: '先滤出单色光，再产生线光源，最后分光产生相干光',
        scorePoints: 2,
        explanation: '白炽光源发出的白光先通过滤光片获得单色光，再通过单缝获得相干所需的线光源，接着通过双缝分为两束振动完全相同的相干光在遮光筒内干涉，最后在毛玻璃屏上成像由测量头观察。故合理顺序为 B。',
      },
      {
        id: 'step-2',
        description: '计算相邻亮条纹间距 Δx',
        keyCondition: '第 1 条到第 5 条亮纹之间共包含 (5 - 1) = 4 个条纹间距',
        scorePoints: 2,
        formula: '$$\\Delta x = \\frac{\\Delta s}{n - 1} = \\frac{13.00\\text{ mm}}{5 - 1} = 3.25\\text{ mm}$$',
        explanation: '利用多条纹平均法可以显著减小单次对准测量带来的偶然误差。',
      },
      {
        id: 'step-3',
        description: '应用条纹间距公式计算光的波长 λ',
        keyCondition: '由 Δx = (L/d)λ 变形得到 λ = (d/L)Δx',
        scorePoints: 3,
        formula: '$$\\lambda = \\frac{d}{L}\\Delta x = \\frac{0.20 \\times 10^{-3}\\text{ m}}{1.00\\text{ m}} \\times 3.25 \\times 10^{-3}\\text{ m} = 6.50 \\times 10^{-7}\\text{ m} = 650\\text{ nm}$$',
        explanation: '代入标准 SI 单位进行运算，求得单色光波长为 650 nm（对应红光）。',
      },
    ],
  },
  {
    id: 'prob-2022-zhejiang-polarization',
    year: 2022,
    province: '浙江卷',
    source: '2022年6月浙江省普通高校招生选考科目考试物理第6题',
    questionType: 'choice',
    verified: true,
    title: '光的偏振现象与立体电影原理',
    content:
      '下列关于光的偏振现象及其应用的说法中，正确的是（　　）\n\nA. 机械横波和纵波都能发生偏振现象，光波由于是电磁波故也能发生偏振\nB. 太阳光、白炽灯光是自然光，其光矢量在垂直于传播方向的平面内沿各个方向振动的强度是均匀的\nC. 观看立体电影时，观众戴的 3D 眼镜两镜片透振方向相互平行\nD. 摄影师在拍摄水底游鱼时，在相机镜头前安装偏振滤光片，是为了增大水面反射光的透射',
    difficulty: 2,
    knowledgeIds: ['wave-optics-1-3'],
    tags: ['高考真题', '光的偏振', '横波', '3D眼镜', '防眩光'],
    targetAnimation: {
      animId: 'anim-polarization',
      presetParams: { mode: 0, polarizerAngle: 45, analyzerAngle: 135 },
      presetDescription: '载入两偏振片垂直正交消光情境：起偏45°与检偏135°夹角90°透射为零',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。偏振是横波特有的现象，只有横波能发生偏振，纵波不会发生偏振。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。自然光是大量原子无规则自发辐射产生的，光振动沿各个方向对称均匀分布。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。3D 眼镜的两镜片透振方向互相垂直（正交），以便左眼和右眼分别接收对应画面的偏振光形成立体视觉。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。拍摄水底时旋转偏振镜是为了滤除水面强烈的反射偏振眩光，从而让水底反射的光能够清晰进入镜头。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '波的偏振特异性判据',
        keyCondition: '光的偏振现象有力地证明了光是横波',
        scorePoints: 2,
        explanation: '纵波的振动方向与波的传播方向在同一直线上，具有轴对称性，因此不会发生偏振；只有振动方向与传播方向垂直的横波才会发生偏振。',
      },
      {
        id: 'step-2',
        description: '偏振片应用场景辨析',
        keyCondition: '3D 眼镜两镜片偏振方向正交；相机偏振滤镜消除反射杂光',
        scorePoints: 2,
        explanation: '立体电影通过两架放映机分别投射透振方向互相垂直的偏振光，观众佩戴正交偏振镜实现双眼分像；水面反射光为部分偏振光，调节偏振镜使其透振方向垂直于反射光的偏振方向即可消光消除反光。',
      },
    ],
  },
]
