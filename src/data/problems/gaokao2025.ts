import type { Problem } from '../types'

/**
 * 2025 年全国卷（理综）物理真题
 *
 * **核验方式与局限（务必先读）**：
 * - 来源为 2025 年普通高等学校招生全国统一考试「理科综合能力测试·物理试题」的网络文档版，
 *   经学科网 / 人人文库 / 公众号原卷版三个独立来源交叉核对题干文字与选项，逐字一致。
 * - **非考试院官方 PDF 逐字核验**。若后续获得官方原卷，请以原卷为准复核括号、标点与单位写法。
 * - 该卷正文在网络文档版中被重编号为 1~12，本文件按卷首说明「第 14~18 题只有一项符合题目要求」
 *   还原为原卷题号 14~17。
 * - **只收录题干与四个选项均完整无缺的题目**。原卷其余题目（如正方形磁场中电子偏转 t₁/t₂/t₃ 比较、
 *   理想气体三状态压强比较、人浪波长、金属圆环转动、橡皮筋测劲度系数、伏安法测电阻、电容器键盘、
 *   圆弧轨道与弹簧分离压轴题）在网络文档版中存在公式符号或选项残缺，**一律不收**——
 *   残缺题干一旦入库就再也无法被下游发现。
 *
 * **动画绑定说明**：这 4 道均为概念辨析型选择题，其中 3 道与现有仿真模型不同构，故不设
 * `targetAnimation`（详见各题 note），避免为凑联动把题目挂到语义不符的动画上。
 */
export const gaokao2025Problems: Problem[] = [
  {
    id: 'prob-2025-quanguo-14',
    year: 2025,
    province: '全国卷',
    source: '2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第14题',
    questionType: 'choice',
    verified: true,
    title: 'CR450 动车组匀减速进站的加速度求解',
    content:
      '我国自主研发的 CR450 动车组试验时的速度可达 450 km/h。若以 120 m/s 的初速度在平直轨道上行驶的 CR450 动车组，匀减速运行 14.4 km 后停止，则减速运动中其加速度的大小为（　　）\n\nA. 0.1 m/s²\nB. 0.5 m/s²\nC. 1.0 m/s²\nD. 1.5 m/s²',
    difficulty: 2,
    knowledgeIds: ['mechanics-2-1'],
    tags: ['高考真题', '匀变速直线运动', '速度位移关系'],
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation:
          '错误。0.1 m/s² 对应位移 120²/(2×0.1) = 72 km，远超题给的 14.4 km，是把速度位移关系中的平方漏算或单位换算错误（如把 14.4 km 当成 1440 m）的典型结果。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation:
          '正确。匀减速到停止，末速度为零，由 v² − v₀² = 2ax 得 0 − 120² = 2a × 1.44×10⁴，解得 a = −0.5 m/s²，加速度大小为 0.5 m/s²。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation:
          '错误。1.0 m/s² 会使制动距离缩短到 7.2 km，与题意不符；该值来自把 14.4 km 误作 7.2 km，或对速度位移公式整体漏除 2。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。1.5 m/s² 对应的制动距离约 4.8 km，与题给 14.4 km 不符。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '锁定「匀减速到停止」这一运动学特征，选择不含时间的速度位移关系式',
        keyCondition: '末速度 v = 0；已知 v₀ = 120 m/s、x = 14.4 km = 1.44×10⁴ m',
        scorePoints: 6,
        formula: 'v^2 - v_0^2 = 2ax',
        explanation:
          '题目给出初速度与位移、未给时间，用 v² − v₀² = 2ax 最直接，避免先求时间再求加速度的两步运算。代入 0 − 120² = 2a × 1.44×10⁴，得 a = −0.5 m/s²。加速度为负表示方向与速度相反，题目问的是「大小」，故答 0.5 m/s²。',
      },
    ],
  },
  {
    id: 'prob-2025-quanguo-15',
    year: 2025,
    province: '全国卷',
    source: '2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第15题',
    questionType: 'choice',
    verified: true,
    title: '椭圆轨道卫星的引力与速度随距离的变化',
    content:
      '“天都一号”通导技术试验卫星测距试验成功，标志着我国在深空轨道精密测量领域取得了技术新突破。“天都一号”在环月椭圆轨道上运行时（　　）\n\nA. 受月球引力大小保持不变\nB. 相对月球的速度大小保持不变\nC. 离月球越近，其相对月球的速度越大\nD. 离月球越近，其所受月球的引力越小',
    difficulty: 2,
    knowledgeIds: ['mechanics-6-1', 'mechanics-6-2', 'mechanics-6-3'],
    tags: ['高考真题', '椭圆轨道', '开普勒第二定律', '万有引力'],
    targetAnimation: {
      animId: 'anim-kepler',
      presetParams: { a: 4.5, e: 0.6, mass: 36, mode: 0 },
      presetDescription: '载入椭圆轨道，观察近月点速度最大、远月点速度最小（开普勒第二定律面积定律）',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation:
          '错误。椭圆轨道上卫星到月球的距离 r 不断变化，由 F = GMm/r² 可知引力和距离的平方成反比，不可能保持不变。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation:
          '错误。只有圆轨道上速度大小才恒定。椭圆轨道上卫星做变速运动：近月点最快、远月点最慢。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation:
          '正确。由开普勒第二定律（面积定律），卫星与月球连线在相等时间内扫过相等面积，故离月球越近（r 越小）速度越大；等价地看机械能守恒：r 减小、引力势能 −GMm/r 减小，动能必然增大。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。由 F = GMm/r²，r 越小引力越大，方向说反了。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '先判定轨道类型：椭圆 ⇒ 距离变化 ⇒ 引力与速度都在变',
        keyCondition: '椭圆轨道 r 随位置变化；只有圆轨道才有「引力大小不变、速度大小不变」',
        scorePoints: 6,
        explanation:
          'A、B 两个选项的共同错误是把椭圆轨道当成圆轨道处理。抓住「椭圆 ⇒ r 变」即可同时排除 A、B。',
      },
      {
        id: 'step-2',
        description: '用开普勒第二定律（或机械能守恒）判定近月点速度最大',
        keyCondition: '面积定律：相等时间扫过相等面积 ⇒ 近日点（近月点）速度最大',
        scorePoints: 3,
        formula: 'F = G\\frac{Mm}{r^2}',
        explanation:
          '离月球越近 r 越小，由 F = GMm/r² 引力越大，D 错；由面积定律或机械能守恒，r 小时势能小、动能大，速度越大，C 对。',
      },
    ],
  },
  {
    id: 'prob-2025-quanguo-16',
    year: 2025,
    province: '全国卷',
    source: '2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第16题',
    questionType: 'choice',
    verified: true,
    title: '撑杆跳高中助跑动能转化为重力势能的最大高度',
    content:
      '如图，撑杆跳高运动中，运动员经过助跑、撑杆起跳，最终越过横杆。若运动员起跳前助跑速度为 10 m/s，则理论上运动员助跑获得的动能可使其重心提升的最大高度为（重力加速度取 10 m/s²）（　　）\n\nA. 4 m\nB. 5 m\nC. 6 m\nD. 7 m',
    difficulty: 2,
    knowledgeIds: ['mechanics-7-5'],
    tags: ['高考真题', '机械能守恒', '动能与重力势能转化'],
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。4 m 对应 v² = 2×10×4 = 80，即初速度约 8.9 m/s，与题给 10 m/s 不符。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation:
          '正确。以地面为零势能面，理论上重心升至最高点时速度为零，动能全部转化为重力势能：½mv² = mgh，得 h = v²/(2g) = 100/20 = 5 m。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。6 m 对应初速度约 11.0 m/s；该选项来自误把 h = v²/g 漏除 2。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。7 m 与题给条件无对应关系，属量级误判。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '识别「理论上最大高度」的隐含条件：最高点速度为零，全部动能转为重力势能',
        keyCondition: '「理论上」= 忽略撑杆形变储能、空气阻力与运动员自身做功，机械能守恒',
        scorePoints: 6,
        formula: '\\frac{1}{2}mv^2 = mgh',
        explanation:
          '只有把「理论上」读成「机械能守恒、到最高点速度为零」，才能用 ½mv² = mgh 一步求解。质量 m 在等式两边约去，h = v²/(2g) = 10²/(2×10) = 5 m。这一步同时是本题唯一的得分点与唯一失分点：漏掉「速度为零」条件就会写成 ½mv² = mgh + ½mv\'² 而无解。',
      },
    ],
  },
  {
    id: 'prob-2025-quanguo-17',
    year: 2025,
    province: '全国卷',
    source: '2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第17题',
    questionType: 'choice',
    verified: true,
    title: '匀强电场中正电荷运动轨迹与电势变化的辨析',
    content:
      '匀强电场中，一带正电的点电荷仅在电场力的作用下以某一初速度开始运动，则运动过程中，其（　　）\n\nA. 所处位置电势一定不断降低\nB. 所处位置的电势一定不断升高\nC. 轨迹可能是与电场线平行的直线\nD. 轨迹可能是与电场线垂直的直线',
    difficulty: 3,
    knowledgeIds: ['electricity-1-2', 'electricity-1-3'],
    tags: ['高考真题', '匀强电场', '电势', '轨迹判断'],
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation:
          '错误。若初速度方向与电场力（即电场方向）相反，电荷先减速到零再反向加速；减速阶段沿电场线反方向运动，电势升高。故「一定降低」不成立。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation:
          '错误。若初速度与电场力同向，电荷一直加速，沿电场线方向运动，电势不断降低。故「一定升高」也不成立。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation:
          '正确。当初速度方向与电场线共线（同向或反向）时，恒定电场力与速度始终共线，电荷做匀变速直线运动，轨迹与电场线平行。这是「轨迹是直线」的唯一情形。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation:
          '错误。若初速度垂直于电场线，则电场力恒定且垂直于初速度，运动为类平抛，轨迹是抛物线而非直线。匀强电场中恒力不可能让带电粒子做「与电场线垂直的直线运动」——垂直方向上没有力来维持其不偏转。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '抓住「匀强电场 + 仅受电场力」⇒ 恒力场，等价于重力场中的抛体问题',
        keyCondition: '加速度恒定 a = qE/m，方向沿电场线；轨迹形状只由「初速度与 a 的夹角」决定',
        scorePoints: 6,
        explanation:
          '把匀强电场类比重力场：力恒定、方向固定，于是轨迹只有三种可能——初速度与力共线（直线，匀变速）、垂直（抛物线，类平抛）、成一般夹角（抛物线）。这一句就把 C、D 同时锁定：C 对，D 错。',
      },
      {
        id: 'step-2',
        description: '电势变化要看「是否单向前进」，不能凭「正电荷」直接下结论',
        keyCondition: '正电荷沿电场线方向运动时电势降低；反向减速阶段电势反而升高',
        scorePoints: 3,
        explanation:
          'A、B 的错误根源是把「正电荷受力方向沿电场线」直接等同于「电势单调变化」。只要存在往返（初速度与力反向），电势就先升后降，两个「一定」都不成立。',
      },
    ],
  },
]
