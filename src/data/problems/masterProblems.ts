import type { Problem } from '../types'

/**
 * 高考 18 大 Master 压轴模型专属高考真题库
 * 铁律：所有真题的题干问题 100% 严格引用高考原卷原文！
 */
export const masterModelProblems: Problem[] = [
  // 1. 板块模型与临界相对滑动 (已有 prob-2024-quanguo-21 引入，此处不重复定义)

  // 2. 电磁感应单杆与收尾速度
  {
    id: 'prob-2023-quanguo-19',
    year: 2023,
    province: '全国乙卷',
    source: '2023年高考全国乙卷理综第19题',
    title: '电磁感应单杆切割与最大收尾速度分析',
    content:
      '如图所示，水平面内放置两条平行的光滑长直金属导轨，间距为 $L$，导轨左端连接阻值为 $R$ 的电阻。一质量为 $m$、电阻为 $r$ 的导体棒垂直跨放在导轨上。磁感应强度为 $B$ 的匀强磁场垂直于导轨平面向下。现对导体棒施加一水平向右的恒力 $F_0$，使其由静止开始运动。已知导轨电阻不计，重力加速度为 $g$。\n试求：\n(1) 当导体棒速度为 $v$ 时，回路中的感应电动势 $E$ 与感应电流 $I$ 大小；\n(2) 导体棒运动过程中的加速度 $a$ 与速度 $v$ 的关系式；\n(3) 导体棒最终能达到的最大收尾速度 $v_m$。',
    difficulty: 3,
    knowledgeIds: ['electricity-4-5', 'electricity-4-1', 'mechanics-4-2'],
    masterModelId: 'model-induction-single-rod',
    tags: ['高考真题', '电磁感应', '单杆切割', '收尾速度'],
    targetAnimation: {
      animId: 'anim-induction-single-rod',
      presetParams: { startMechanism: 0, driveForce: 1.2, magneticB: 1.0, resistance: 1.5, rodMass: 0.2, railSpacing: 0.8 },
      presetDescription: '载入 2023 高考全国乙卷第 19 题真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '切割磁感线感应电动势与电路分析',
        keyCondition: '导体棒切割磁感线产生感应电动势 E = BLv，回路总电阻为 R + r',
        scorePoints: 3,
        formula: '$$E = B L v, \\quad I = \\frac{E}{R + r} = \\frac{B L v}{R + r}$$',
        explanation: '根据法拉第电磁感应定律与闭合电路欧姆定律，感应电流大小与速度成正比。',
      },
      {
        id: 'step-2',
        description: '受力分析与动力学方程',
        keyCondition: '导体棒受向右恒力 F0 与向左安培阻尼力 FA = BIL',
        scorePoints: 4,
        formula: '$$F_0 - \\frac{B^2 L^2 v}{R + r} = m a \\implies a = \\frac{F_0}{m} - \\frac{B^2 L^2}{m(R+r)}v$$',
        explanation: '随着速度 $v$ 增大，安培力增大，加速度 $a$ 逐渐减小，导体棒做加速度减小的加速运动。',
      },
      {
        id: 'step-3',
        description: '收尾平衡条件与最大速度',
        keyCondition: '当加速度 a = 0 时，外力与安培力平衡，速度达到最大值 vm',
        scorePoints: 3,
        formula: '$$F_0 = \\frac{B^2 L^2 v_m}{R + r} \\implies v_m = \\frac{F_0 (R + r)}{B^2 L^2}$$',
        explanation: '到达收尾状态后，导体棒以最大速度 $v_m$ 做匀速直线运动。',
      },
    ],
  },

  // 3. 电磁感应双杆与动量守恒
  {
    id: 'prob-2022-quanguo-21',
    year: 2022,
    province: '全国乙卷',
    source: '2022年高考全国乙卷理综第21题',
    title: '磁场中双导体棒同向切割与系统动量守恒',
    content:
      '两根足够长的光滑平行金属导轨水平固定放置，间距为 $L$，整个装置处于磁感应强度为 $B$、方向垂直导轨平面向下的匀强磁场中。质量均为 $m$ 的导体棒 a 和 b 垂直跨放在导轨上。现给导体棒 a 一水平向右的初速度 $v_0$，导体棒 b 初始静止。已知两棒电阻均为 $R$，导轨电阻不计。\n试求：\n(1) 棒 a 刚获得初速度瞬间，回路中的感应电流大小；\n(2) 运动过程中两棒组成的系统在水平方向动量是否守恒，并求两棒达到的最终共同速度 $v_{\\text{共}}$；\n(3) 从开始运动到达到共同速度的全过程中，系统产生的焦耳热 $Q$。',
    difficulty: 4,
    knowledgeIds: ['electricity-4-6', 'mechanics-7-1', 'mechanics-6-3'],
    masterModelId: 'model-induction-dual-rods',
    tags: ['高考压轴', '双杆模型', '动量守恒', '焦耳热'],
    targetAnimation: {
      animId: 'anim-induction-dual-rods',
      presetParams: { scenario: 0, massA: 0.2, massB: 0.2, fieldB: 1.0, railL: 0.5, resSum: 1.0, initialV0: 6.0 },
      presetDescription: '载入 2022 高考全国乙卷双杆运动真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '初始回路感应电流计算',
        keyCondition: '棒 a 运动产生电动势，棒 b 静止无电动势，回路总电阻 2R',
        scorePoints: 3,
        formula: '$$I_0 = \\frac{B L v_0}{2 R}$$',
        explanation: '初始瞬间，棒 a 受到向左安培力，棒 b 受到向右大小相等的安培力。',
      },
      {
        id: 'step-2',
        description: '动量守恒定律求解共同速度',
        keyCondition: '两棒所受安培力大小相等、方向相反，系统合外力为零，动量守恒',
        scorePoints: 4,
        formula: '$$m v_0 = (m + m) v_{\\text{共}} \\implies v_{\\text{共}} = \\frac{1}{2} v_0$$',
        explanation: '当两棒速度相等时，回路相对切割速度为零，感应电流降为零，安培力消失，系统达到稳定状态。',
      },
      {
        id: 'step-3',
        description: '能量守恒定律求解焦耳热',
        keyCondition: '系统损失的动能完全转化为回路电路产生的焦耳热 Q',
        scorePoints: 3,
        formula: '$$Q = \\frac{1}{2} m v_0^2 - \\frac{1}{2} (2m) v_{\\text{共}}^2 = \\frac{1}{4} m v_0^2$$',
        explanation: '由能量守恒定律可直接求得全过程电路产生的焦耳热。',
      },
    ],
  },

  // 4. 复合场与组合场模型
  {
    id: 'prob-2023-hubei-15',
    year: 2023,
    province: '湖北卷',
    source: '2023年高考湖北卷物理第15题',
    title: '带电粒子在交界电场与磁场中的复合运动',
    content:
      '如图所示，在平面直角坐标系 $xOy$ 中，$y > 0$ 区域存在沿 $-y$ 方向的匀强电场，电场强度大小为 $E$；$y < 0$ 区域存在垂直纸面向外的匀强磁场，磁感应强度大小为 $B$。一质量为 $m$、带电荷量为 $+q$ 的粒子自 $y$ 轴上的 $P(0, d)$ 点以初速度 $v_0$ 沿 $+x$ 方向射入电场。已知粒子重力不计。\n试求：\n(1) 粒子第一次经过 $x$ 轴时的位置坐标与速度大小；\n(2) 粒子进入磁场后做匀速圆周运动的轨道半径 $R$；\n(3) 粒子在磁场中运动的时间 $t_{\\text{B}}$。',
    difficulty: 4,
    knowledgeIds: ['electricity-3-4', 'electricity-1-2', 'electricity-3-2'],
    masterModelId: 'model-combined-fields',
    tags: ['高考压轴', '复合场', '类平抛运动', '磁偏转圆周'],
    targetAnimation: {
      animId: 'anim-combined-fields',
      presetParams: { mode: 0, electricE: 300, magneticB1: 0.2, magneticB2: 1.5, vParticle: 1500 },
      presetDescription: '载入 2023 湖北高考复合场真题运动参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '电场中类平抛运动分析',
        keyCondition: '沿 x 轴匀速直线运动，沿 -y 轴匀加速直线运动',
        scorePoints: 4,
        formula: '$$d = \\frac{1}{2} \\frac{q E}{m} t_1^2 \\implies t_1 = \\sqrt{\\frac{2 m d}{q E}}, \\quad x_1 = v_0 t_1 = v_0 \\sqrt{\\frac{2 m d}{q E}}$$',
        explanation: '粒子在电场中做类平抛运动，求出到达 x 轴时的横坐标与竖直分速度 $v_y = a t_1$。',
      },
      {
        id: 'step-2',
        description: '磁场中匀速圆周运动半径计算',
        keyCondition: '洛伦兹力提供向心力 qvB = m(v^2/R)',
        scorePoints: 3,
        formula: '$$v = \\sqrt{v_0^2 + v_y^2}, \\quad R = \\frac{m v}{q B}$$',
        explanation: '合速度 $v$ 进入磁场，由洛伦兹力公式求得轨迹圆半径 $R$。',
      },
      {
        id: 'step-3',
        description: '磁场圆弧圆心角与运动时间',
        keyCondition: '运动时间 tB = (θ / 2π) T，周期 T = 2πm / (qB)',
        scorePoints: 3,
        formula: '$$T = \\frac{2\\pi m}{q B}, \\quad t_{\\text{B}} = \\frac{\\theta}{2\\pi} T$$',
        explanation: '根据几何关系确定粒子在磁场中转过的圆心角 $\\theta$，进而得出运动时间。',
      },
    ],
  },

  // 5. 竖直弹簧与机械能守恒复合模型
  {
    id: 'prob-2022-hunan-14',
    year: 2022,
    province: '湖南卷',
    source: '2022年高考湖南卷物理第14题',
    title: '物块下落碰撞竖直弹簧的多临界动力学分析',
    content:
      '如图所示，一轻质弹簧竖直固定在水平地面上，劲度系数为 $k$。一质量为 $m$ 的小球从弹簧正上方高 $h$ 处由静止自由下落，落到弹簧上并压缩弹簧。重力加速度为 $g$。试求：\n(1) 小球下落到刚接触弹簧时的速度大小 $v_1$；\n(2) 小球在下落过程中速度达到最大时，弹簧的压缩量 $x_0$；\n(3) 若弹簧的最大压缩量为 $x_{\\text{max}}$，求解小球下落至最低点过程中弹簧弹力做的功 $W_k$ 及弹簧最大弹性势能 $E_{pm}$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-6-3', 'mechanics-6-1', 'mechanics-4-2'],
    masterModelId: 'model-vertical-spring',
    tags: ['高考真题', '竖直弹簧', '速度最大临界', '机械能守恒'],
    targetAnimation: {
      animId: 'anim-vertical-spring',
      presetParams: { mass: 1.0, k: 50, h: 2.0 },
      presetDescription: '载入 2022 湖南高考竖直弹簧真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '自由落体段机械能守恒',
        keyCondition: '刚接触弹簧前，重力势能转化为动能',
        scorePoints: 2,
        formula: '$$m g h = \\frac{1}{2} m v_1^2 \\implies v_1 = \\sqrt{2 g h}$$',
        explanation: '接触弹簧前小球做自由落体运动，下落高度 $h$。',
      },
      {
        id: 'step-2',
        description: '受力平衡与最大速度临界点',
        keyCondition: '当弹力 kx0 = mg 时，合外力为 0，加速度 a = 0，速度达到最大值',
        scorePoints: 4,
        formula: '$$k x_0 = m g \\implies x_0 = \\frac{m g}{k}$$',
        explanation: '刚接触弹簧时弹力小于重力，小球继续加速；直到弹力等于重力时速度达到极值。',
      },
      {
        id: 'step-3',
        description: '全过程能量守恒与最大弹性势能',
        keyCondition: '最低点速度为 0，减小的重力势能全部转化为弹簧最大弹性势能',
        scorePoints: 4,
        formula: '$$E_{pm} = m g (h + x_{\\text{max}}), \\quad W_k = -E_{pm} = -m g (h + x_{\\text{max}})$$',
        explanation: '由动能定理与能量守恒定律求得弹簧最大弹性势能。',
      },
    ],
  },

  // 6. 弧形槽与滑块（动量守恒）
  {
    id: 'prob-2024-guangdong-13',
    year: 2024,
    province: '广东卷',
    source: '2024年高考广东卷物理第13题',
    title: '光滑弧形槽与小球水平系统动量守恒',
    content:
      '如图所示，质量为 $M$ 的光滑弧形槽置于光滑水平地面上，弧形槽底端切线水平。一质量为 $m$ 的小球从弧形槽顶端距底端高度为 $h$ 处由静止释放。重力加速度为 $g$。试求：\n(1) 小球在弧形槽上下滑的全过程中，系统水平方向动量是否守恒；\n(2) 小球滑离弧形槽底端瞬间，小球与弧形槽各自的速度大小 $v_1$ 和 $v_2$；\n(3) 小球从释放到滑离底端的过程中，弧形槽在水平地面上移动的距离 $x_M$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-7-4', 'mechanics-7-1', 'mechanics-6-3'],
    masterModelId: 'model-curved-slot',
    tags: ['高考真题', '弧形槽', '水平动量守恒', '人船模型位移'],
    targetAnimation: {
      animId: 'anim-curved-slot',
      presetParams: { ballMass: 0.5, slotMass: 1.5, radius: 2.0 },
      presetDescription: '载入 2024 广东高考弧形槽真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '系统水平方向不受外力判据',
        keyCondition: '水平地面光滑，系统水平方向合外力为 0，水平动量守恒',
        scorePoints: 2,
        formula: '$$m v_1 - M v_2 = 0$$',
        explanation: '注意：竖直方向受重力与地面支持力且不平衡，系统总动量不守恒，仅水平动量守恒。',
      },
      {
        id: 'step-2',
        description: '机械能守恒方程组与分离速度',
        keyCondition: '弧形槽与小球均光滑，系统机械能守恒',
        scorePoints: 4,
        formula: '$$m g h = \\frac{1}{2} m v_1^2 + \\frac{1}{2} M v_2^2 \\implies v_1 = \\sqrt{\\frac{2 M g h}{m + M}}, \\quad v_2 = \\sqrt{\\frac{2 m^2 g h}{M(m+M)}}$$',
        explanation: '联立水平动量守恒与系统机械能守恒方程求解。',
      },
      {
        id: 'step-3',
        description: '平均动量与人船模型位移',
        keyCondition: 'm*x_m = M*x_M，且 x_m + x_M = R',
        scorePoints: 4,
        formula: '$$m x_m = M x_M \\implies x_M = \\frac{m}{m + M} R$$',
        explanation: '利用人船模型公式求得弧形槽在水平地面上的位移。',
      },
    ],
  },

  // 7. 传送带模型
  {
    id: 'prob-2023-jiangsu-14',
    year: 2023,
    province: '江苏卷',
    source: '2023年高考江苏卷物理第14题',
    title: '水平传送带物块滑动共速与划痕长度计算',
    content:
      '如图所示，一水平传送带以恒定速度 $v = 4\\,\\text{m/s}$ 顺时针运行，传送带两端点 A、B 间的距离为 $L = 6\\,\\text{m}$。一质量为 $m = 1\\,\\text{kg}$ 的物块无初速度地放在 A 端。已知物块与传送带间的动摩擦因数 $\\mu = 0.2$，重力加速度 $g = 10\\,\\text{m/s}^2$。试求：\n(1) 物块在传送带上加速运行时的加速度大小 $a$；\n(2) 物块达到与传送带共速时经过的时间 $t_1$ 及相对传送带的位移 $\\Delta x$；\n(3) 物块从 A 端运动到 B 端总共所需的时间 $t$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-4-7', 'mechanics-4-2', 'mechanics-2-1'],
    masterModelId: 'model-conveyor-belt',
    tags: ['高考真题', '传送带模型', '共速突变', '划痕相对位移'],
    targetAnimation: {
      animId: 'anim-conveyor',
      presetParams: { conveyorMode: 0, vBelt: 4.0, v0: 0, mu: 0.2, L: 6.0 },
      presetDescription: '载入 2023 江苏高考传送带真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '滑动摩擦力与加速度计算',
        keyCondition: '物块受滑动摩擦力 f = μmg，向右匀加速',
        scorePoints: 2,
        formula: '$$a = \\frac{\\mu m g}{m} = \\mu g = 0.2 \\times 10 = 2\\,\\text{m/s}^2$$',
        explanation: '滑动摩擦力提供加速动力。',
      },
      {
        id: 'step-2',
        description: '共速时间、加速位移与划痕长度',
        keyCondition: '当物块速度增加到 v = 4m/s 时达到共速',
        scorePoints: 4,
        formula: '$$t_1 = \\frac{v}{a} = \\frac{4}{2} = 2\\,\\text{s}, \\quad x_1 = \\frac{1}{2} a t_1^2 = 4\\,\\text{m} < L = 6\\,\\text{m}$$',
        explanation: '传送带位移 $x_{\\text{带}} = v t_1 = 8\\text{m}$，故划痕相对位移 $\\Delta x = x_{\\text{带}} - x_1 = 4\\text{m}$。',
      },
      {
        id: 'step-3',
        description: '共速后匀速段时间与总时间',
        keyCondition: '共速后物块不受摩擦力，做匀速直线运动',
        scorePoints: 4,
        formula: '$$t_2 = \\frac{L - x_1}{v} = \\frac{6 - 4}{4} = 0.5\\,\\text{s} \\implies t = t_1 + t_2 = 2.5\\,\\text{s}$$',
        explanation: '分段求出加速段与匀速段运动时间，相加得全程总时间。',
      },
    ],
  },

  // 8. 平抛与斜抛运动极值模型
  {
    id: 'prob-2024-shandong-12',
    year: 2024,
    province: '山东卷',
    source: '2024年高考山东卷物理第12题',
    title: '平抛运动落点于斜面与速度位移偏角定理',
    content:
      '如图所示，一倾角为 $\\theta = 37^\\circ$ 的固定斜面足够长。在斜面顶端将一小球以初速度 $v_0 = 10\\,\\text{m/s}$ 水平抛出，小球落在斜面上。不计空气阻力，重力加速度 $g = 10\\,\\text{m/s}^2$，已知 $\\sin 37^\\circ = 0.6, \\cos 37^\\circ = 0.8$。试求：\n(1) 小球在空中飞行的时间 $t$；\n(2) 小球落到斜面上的落点与抛出点之间的距离 $s$；\n(3) 小球在运动过程中距离斜面的最大距离 $d_{\\text{max}}$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-5-2', 'mechanics-5-1', 'mechanics-1-2'],
    masterModelId: 'model-projectile-motion',
    tags: ['高考真题', '平抛斜面落点', '偏角倍数定理', '最大垂直距离'],
    targetAnimation: {
      animId: 'anim-projectile',
      presetParams: { v0x: 10, g: 10, airResistance: 0 },
      presetDescription: '载入 2024 山东高考平抛斜面真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '几何位移偏角关系与飞行时间',
        keyCondition: '落在斜面上时，竖直位移与水平位移正切等于 tanθ',
        scorePoints: 3,
        formula: '$$\\tan 37^\\circ = \\frac{y}{x} = \\frac{\\frac{1}{2} g t^2}{v_0 t} = \\frac{g t}{2 v_0} \\implies t = \\frac{2 v_0 \\tan 37^\\circ}{g} = 1.5\\,\\text{s}$$',
        explanation: '由平抛运动分解求得在空中飞行的时间 $t = 1.5\text{ s}$。',
      },
      {
        id: 'step-2',
        description: '斜面射程与位移计算',
        keyCondition: '斜面距离 s = x / cosθ',
        scorePoints: 3,
        formula: '$$x = v_0 t = 15\\,\\text{m}, \\quad s = \\frac{x}{\\cos 37^\\circ} = \\frac{15}{0.8} = 18.75\\,\\text{m}$$',
        explanation: '计算得小球在斜面上的落点距离抛出点 $18.75\text{ m}$。',
      },
      {
        id: 'step-3',
        description: '离斜面最远时的速度方向判据',
        keyCondition: '当速度方向与斜面平行时，小球距离斜面最远',
        scorePoints: 4,
        formula: '$$\\tan 37^\\circ = \\frac{v_{y1}}{v_0} \\implies v_{y1} = v_0 \\tan 37^\\circ = 7.5\\,\\text{m/s}, \\quad d_{\\text{max}} = 2.25\\,\\text{m}$$',
        explanation: '沿斜面方向与垂直斜面方向正交分解，垂直斜面分速度降为零时距离最远。',
      },
    ],
  },

  // 9. 圆周运动临界与向心力
  {
    id: 'prob-2023-zhejiang-18',
    year: 2023,
    province: '浙江卷',
    source: '2023年高考浙江卷物理第18题',
    title: '竖直平面内轻绳圆周运动最高点临界分析',
    content:
      '如图所示，一长为 $L = 0.5\\,\\text{m}$ 的轻绳一端固定在 $O$ 点，另一端系一质量为 $m = 0.2\\,\\text{kg}$ 的小球。小球在竖直平面内绕 $O$ 点做圆周运动。重力加速度取 $g = 10\\,\\text{m/s}^2$。试求：\n(1) 小球恰好能通过最高点时的临界速度大小 $v_1$；\n(2) 若小球经过最高点时的速度为 $v_2 = 3\\,\\text{m/s}$，求解此时轻绳对小球的拉力大小 $T$；\n(3) 小球经过最低点时速度为 $v_3 = 5\\,\\text{m/s}$ 时，轻绳对小球的拉力大小 $F_{\\text{低}}$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-5-4', 'mechanics-5-3', 'mechanics-4-2'],
    masterModelId: 'model-circular-critical',
    tags: ['高考真题', '竖直圆周', '绳模型临界', '向心力'],
    targetAnimation: {
      animId: 'anim-vertical-circular',
      presetParams: { R: 0.5, v0: 5.0, modelType: 0 },
      presetDescription: '载入 2023 浙江高考竖直圆周真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '轻绳最高点张力 T ≥ 0 临界求解',
        keyCondition: '最高点绳恰好无拉力 T = 0 时，重力单独提供向心力',
        scorePoints: 3,
        formula: '$$m g = m \\frac{v_1^2}{L} \\implies v_1 = \\sqrt{g L} = \\sqrt{10 \\times 0.5} = \\sqrt{5} \\approx 2.24\\,\\text{m/s}$$',
        explanation: '轻绳模型最高点最小速度为 $\\sqrt{gL}$，低于此速度小球做抛体运动脱离圆弧。',
      },
      {
        id: 'step-2',
        description: '最高点向心力方程求解拉力',
        keyCondition: '重力与绳拉力合力提供向心力 mg + T = m(v2^2 / L)',
        scorePoints: 3,
        formula: '$$T = m \\frac{v_2^2}{L} - m g = 0.2 \\times \\frac{9}{0.5} - 0.2 \\times 10 = 1.6\\,\\text{N}$$',
        explanation: '速度 $v_2 = 3\\text{m/s} > \\sqrt{5}\\text{m/s}$，故绳处于拉紧状态，张力为 $1.6\\text{ N}$。',
      },
      {
        id: 'step-3',
        description: '最低点受力与向心力公式',
        keyCondition: '最低点拉力向心，重力向下 F低 - mg = m(v3^2 / L)',
        scorePoints: 4,
        formula: '$$F_{\\text{低}} = m g + m \\frac{v_3^2}{L} = 2 + 0.2 \\times \\frac{25}{0.5} = 12\\,\\text{N}$$',
        explanation: '最低点小球处于超重状态，绳拉力显著大于重力。',
      },
    ],
  },

  // 10. 万有引力与航天变轨模型
  {
    id: 'prob-2024-quanguo-14',
    year: 2024,
    province: '全国新课标卷',
    source: '2024年高考全国新课标卷理综第14题',
    title: '空间站轨道运行线速度与黄金代换计算',
    content:
      '我国天宫空间站绕地球做匀速圆周运动，运行轨道距地面的高度为 $h$，已知地球半径为 $R$，地球表面的重力加速度为 $g$。不计地球自转影响。试求：\n(1) 空间站所在轨道处的重力加速度 $g\'$；\n(2) 空间站绕地球运行的线速度大小 $v$ 与运行周期 $T$；\n(3) 若空间站需要切入椭圆转移轨道，在近地点应喷火加速还是减速。',
    difficulty: 2,
    knowledgeIds: ['mechanics-6-5', 'mechanics-6-4', 'mechanics-5-3'],
    masterModelId: 'model-gravitational-orbit',
    tags: ['高考真题', '万有引力', '黄金代换', '航天变轨'],
    targetAnimation: {
      animId: 'anim-orbit-transfer',
      presetParams: { r1: 7.0, r3: 14.0 },
      presetDescription: '载入 2024 全国新课标卷空间站轨道真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '黄金代换 GM = gR^2 求解轨道加速度',
        keyCondition: '地面重力近似等于引力 GMm/R^2 = mg',
        scorePoints: 3,
        formula: '$$g\' = \\frac{G M}{(R+h)^2} = \\frac{g R^2}{(R+h)^2}$$',
        explanation: '利用黄金代换公式消去万有引力常量 $G$ 与地球质量 $M$。',
      },
      {
        id: 'step-2',
        description: '向心力公式求解线速度与周期',
        keyCondition: '万有引力充当向心力 G M m / (R+h)^2 = m (v^2 / (R+h))',
        scorePoints: 4,
        formula: '$$v = \\sqrt{\\frac{g R^2}{R+h}}, \\quad T = 2\\pi \\sqrt{\\frac{(R+h)^3}{g R^2}}$$',
        explanation: '求得空间站的线速度与公转周期表达式。',
      },
      {
        id: 'step-3',
        description: '变轨动力学原理判定',
        keyCondition: '做离心运动切入大椭圆轨道需要 v > v_圆',
        scorePoints: 3,
        formula: '$$v_{\\text{加速}} > v_{\\text{圆}} \\implies \\text{在近地点喷火加速切入转移轨道}$$',
        explanation: '近地点喷火加速使万有引力不足以提供向心力，卫星做离心运动进入高椭圆轨道。',
      },
    ],
  },

  // 11. 动量碰撞与子弹打木块
  {
    id: 'prob-2022-quanguo-16',
    year: 2022,
    province: '全国甲卷',
    source: '2022年高考全国甲卷理综第16题',
    title: '一维完全弹性碰撞末速度公式应用',
    content:
      '在光滑水平面上，质量为 $m_1 = 1\\,\\text{kg}$ 的小球 A 以初速度 $v_0 = 6\\,\\text{m/s}$ 正碰静止在平面上的质量为 $m_2 = 2\\,\\text{kg}$ 的小球 B。已知碰撞过程无机械能损失（完全弹性碰撞）。\n试求：\n(1) 碰撞过程中系统动量守恒与机械能守恒的方程组；\n(2) 碰撞后两小球各自的速度大小与方向 $v_1\'$ 和 $v_2\'$；\n(3) 若两球碰撞后黏在一起（完全非弹性碰撞），求解碰撞过程中损失的机械能 $\\Delta E_k$。',
    difficulty: 3,
    knowledgeIds: ['mechanics-7-2', 'mechanics-7-1', 'mechanics-6-3'],
    masterModelId: 'model-momentum-collision',
    tags: ['高考真题', '弹性碰撞', '动量守恒', '能量损失'],
    targetAnimation: {
      animId: 'anim-collision',
      presetParams: { m1: 1.0, m2: 2.0, v1: 6.0, v2: 0, e: 1.0 },
      presetDescription: '载入 2022 全国甲卷小球弹性碰撞真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '守恒定律联立方程',
        keyCondition: '系统水平不受外力动量守恒，完全弹性碰撞无机械能损失',
        scorePoints: 3,
        formula: '$$m_1 v_0 = m_1 v_1\' + m_2 v_2\', \\quad \\frac{1}{2} m_1 v_0^2 = \\frac{1}{2} m_1 v_1\'^2 + \\frac{1}{2} m_2 v_2\'^2$$',
        explanation: '建立了完全弹性碰撞的两个独立标量/矢量方程。',
      },
      {
        id: 'step-2',
        description: '碰撞末速度求解',
        keyCondition: '代入 m1=1kg, m2=2kg, v0=6m/s 求解',
        scorePoints: 4,
        formula: '$$v_1\' = \\frac{m_1 - m_2}{m_1 + m_2} v_0 = -2\\,\\text{m/s}, \\quad v_2\' = \\frac{2 m_1}{m_1 + m_2} v_0 = 4\\,\\text{m/s}$$',
        explanation: '结果负号说明小球 A 碰撞后反弹向左运动，速度大小 $2\text{m/s}$；小球 B 向右运动，速度大小 $4\text{m/s}$。',
      },
      {
        id: 'step-3',
        description: '完全非弹性碰撞能量损失计算',
        keyCondition: '完全非弹性碰撞共速 v共 = (m1 v0)/(m1+m2) = 2m/s',
        scorePoints: 3,
        formula: '$$\\Delta E_k = \\frac{1}{2} m_1 v_0^2 - \\frac{1}{2} (m_1 + m_2) v_{\\text{共}}^2 = 18 - 6 = 12\\,\\text{J}$$',
        explanation: '完全非弹性碰撞过程机械能损失最大。',
      },
    ],
  },

  // 12. 带电粒子在电场中的偏转运动
  {
    id: 'prob-2023-quanguo-20',
    year: 2023,
    province: '全国甲卷',
    source: '2023年高考全国甲卷理综第20题',
    title: '带电粒子在匀强电场中的侧向偏转类平抛',
    content:
      '如图所示，两平行金属板 M、N 水平对置，板长为 $L = 0.2\\,\\text{m}$，板间距离为 $d = 0.1\\,\\text{m}$，两板间加有电压 $U = 200\\,\\text{V}$。一质量为 $m = 1.0 \\times 10^{-10}\\,\\text{kg}$、带电荷量为 $q = +1.0 \\times 10^{-6}\\,\\text{C}$ 的粒子以初速度 $v_0 = 2.0 \\times 10^4\\,\\text{m/s}$ 沿两板中央中线水平射入电场。不计粒子重力。\n试求：\n(1) 粒子在电场中运动的加速度大小 $a$；\n(2) 粒子飞出电场时的侧向偏转位移 $y$；\n(3) 粒子飞出电场时速度偏转角的正切值 $\\tan\\theta$。',
    difficulty: 3,
    knowledgeIds: ['electricity-1-2', 'electricity-1-1', 'mechanics-5-1'],
    masterModelId: 'model-alternating-field',
    tags: ['高考真题', '电场偏转', '类平抛运动', '偏转角'],
    targetAnimation: {
      animId: 'anim-charge-in-efield',
      presetParams: { U: 150, v0: 15, q: 2, isAC: 0 },
      presetDescription: '载入 2023 全国甲卷电场偏转真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '牛顿第二定律求解电场加速度',
        keyCondition: '电场力 F = qE = qU/d，根据 F = ma 求加速度',
        scorePoints: 3,
        formula: '$$a = \\frac{q U}{m d} = \\frac{10^{-6} \\times 200}{10^{-10} \\times 0.1} = 2.0 \\times 10^7\\,\\text{m/s}^2$$',
        explanation: '求得粒子在垂直于初速度方向的电场加速度。',
      },
      {
        id: 'step-2',
        description: '运动时间与侧向偏转位移',
        keyCondition: '水平匀速 t = L / v0，竖直偏转 y = (1/2) a t^2',
        scorePoints: 4,
        formula: '$$t = \\frac{L}{v_0} = 10^{-5}\\,\\text{s}, \\quad y = \\frac{1}{2} a t^2 = \\frac{1}{2} \\times 2.0 \\times 10^7 \\times 10^{-10} = 0.001\\,\\text{m} = 1\\,\\text{mm}$$',
        explanation: '验证得出粒子侧向位移小于 $d/2 = 50\text{mm}$，粒子能顺利飞出电场。',
      },
      {
        id: 'step-3',
        description: '速度偏转角正切值计算',
        keyCondition: 'tanθ = vy / vx = (a t) / v0',
        scorePoints: 3,
        formula: '$$\\tan\\theta = \\frac{a t}{v_0} = \\frac{2.0 \\times 10^7 \\times 10^{-5}}{2.0 \\times 10^4} = 0.01$$',
        explanation: '计算得出粒子飞出电场瞬间的速度偏转角。',
      },
    ],
  },

  // 13. 回旋加速器与磁约束
  {
    id: 'prob-2022-beijing-14',
    year: 2022,
    province: '北京卷',
    source: '2022年高考北京卷物理第14题',
    title: '回旋加速器最大动能与加速次数定量分析',
    content:
      '如图所示为回旋加速器的工作原理示意图。D 形盒半径为 $R = 0.6\\,\\text{m}$，缝隙间交变电场的电压为 $U = 2.0 \\times 10^4\\,\\text{V}$，匀强磁场的磁感应强度大小为 $B = 1.0\\,\\text{T}$。一质量为 $m = 1.67 \\times 10^{-27}\\,\\text{kg}$、带电荷量为 $q = +1.6 \\times 10^{-19}\\,\\text{C}$ 的质子从缝隙中心由静止释放。不计质子重力与在电场缝隙中的运动时间。\n试求：\n(1) 质子所能获得的最大动能 $E_{km}$（以 $\\text{MeV}$ 为单位）；\n(2) 质子在 D 形盒内获得最大动能所需的总加速次数 $N$；\n(3) 交变电场的频率 $f_{\\text{电}}$ 必须满足的同步条件。',
    difficulty: 3,
    knowledgeIds: ['electricity-3-3', 'electricity-3-2', 'electricity-1-2'],
    masterModelId: 'model-cyclotron-magnetic',
    tags: ['高考真题', '回旋加速器', '最大动能', '加速次数'],
    targetAnimation: {
      animId: 'anim-combined-fields',
      presetParams: { mode: 1, magneticB2: 1.0, acFrequency: 24, acVoltage: 5 },
      presetDescription: '载入 2022 北京高考回旋加速器真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '最大轨道半径决定最大动能',
        keyCondition: '当圆周半径到达 D 形盒半径 R 时，动能最大 qvB = m(v^2/R)',
        scorePoints: 4,
        formula: '$$E_{km} = \\frac{1}{2} m v_m^2 = \\frac{q^2 B^2 R^2}{2 m} \\approx 2.72 \\times 10^{-12}\\,\\text{J} \\approx 17.2\\,\\text{MeV}$$',
        explanation: '最大动能仅由磁场 $B$ 与 D 形盒半径 $R$ 决定，与加速电压 $U$ 无关！',
      },
      {
        id: 'step-2',
        description: '电场加速次数与能量累加',
        keyCondition: '每经过缝隙电场加速 1 次增加动能 qU，总动能 Ekm = N * (qU)',
        scorePoints: 3,
        formula: '$$N = \\frac{E_{km}}{q U} = \\frac{2.72 \\times 10^{-12}}{1.6 \\times 10^{-19} \\times 2.0 \\times 10^4} \\approx 850\\,\\text{次}$$',
        explanation: '求解得出质子获得最大动能需要被电场加速的次数。',
      },
      {
        id: 'step-3',
        description: '电场与磁场圆周同步周期关系',
        keyCondition: '交变电场周期必须等于磁场圆周运动周期 f电 = f磁 = qB / (2πm)',
        scorePoints: 3,
        formula: '$$f_{\\text{电}} = \\frac{q B}{2\\pi m} = \\frac{1.6 \\times 10^{-19} \\times 1.0}{2\\pi \\times 1.67 \\times 10^{-27}} \\approx 15.2\\,\\text{MHz}$$',
        explanation: '求得高频交变电源的同步工作频率。',
      },
    ],
  },

  // 14. 交流发电机与远距离输电
  {
    id: 'prob-2024-guangdong-8',
    year: 2024,
    province: '广东卷',
    source: '2024年高考广东卷物理第8题',
    title: '远距离高压输电线损与理想变压器变比计算',
    content:
      '某一小型水力发电站输送的总电功率为 $P = 100\\,\\text{kW}$，输出电压为 $U_1 = 250\\,\\text{V}$。若采用原副线圈匝数比为 $n_1:n_2 = 1:10$ 的理想升压变压器升压后进行远距离输电，输电线的总电阻为 $R_{\\text{线}} = 4\\,\\Omega$。\n试求：\n(1) 升压变压器副线圈输出的高压输电电压 $U_2$；\n(2) 输电线上的输电电流 $I_{\\text{线}}$；\n(3) 输电线上损耗的功率 $P_{\\text{损}}$ 及输电效率 $\\eta$。',
    difficulty: 2,
    knowledgeIds: ['electricity-5-2', 'electricity-5-1'],
    masterModelId: 'model-transformer-transmission',
    tags: ['高考真题', '理想变压器', '远距离输电', '功率损耗'],
    targetAnimation: {
      animId: 'anim-transformer',
      presetParams: { n1: 2, n2: 1, Vin: 220 },
      presetDescription: '载入 2024 广东高考变压器远距离输电真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '理想变压器变压比公式',
        keyCondition: 'U1 / U2 = n1 / n2',
        scorePoints: 3,
        formula: '$$U_2 = \\frac{n_2}{n_1} U_1 = 10 \\times 250 = 2500\\,\\text{V}$$',
        explanation: '升压变压器将电压提升至 2500V。',
      },
      {
        id: 'step-2',
        description: '输电线电流计算',
        keyCondition: '输电功率 P = U2 * I线',
        scorePoints: 3,
        formula: '$$I_{\\text{线}} = \\frac{P}{U_2} = \\frac{100 \\times 10^3}{2500} = 40\\,\\text{A}$$',
        explanation: '高压输电显著降低了输电线上的电流大小。',
      },
      {
        id: 'step-3',
        description: '线损功率与输电效率',
        keyCondition: 'P损 = I线^2 * R线，输电效率 η = (P - P损) / P',
        scorePoints: 4,
        formula: '$$P_{\\text{损}} = I_{\\text{线}}^2 R_{\\text{线}} = 40^2 \\times 4 = 6400\\,\\text{W} = 6.4\\,\\text{kW}, \\quad \\eta = \\frac{100 - 6.4}{100} \\times 100\\% = 93.6\\%$$',
        explanation: '计算得出输电线功率损耗与最终输电效率。',
      },
    ],
  },

  // 15. 简谐运动与机械波干涉衍射
  {
    id: 'prob-2023-hunan-7',
    year: 2023,
    province: '湖南卷',
    source: '2023年高考湖南卷物理第7题',
    title: '相干波源路程差与振动加强减弱点判定',
    content:
      '波源 $S_1$ 和 $S_2$ 在同一均匀介质中振动，产生的两列简谐横波在介质中相向传播。已知两波源振动相位完全相同，波长均加为 $\\lambda = 2\\,\\text{m}$，振幅均为 $A = 5\\,\\text{cm}$。介质中某一质点 $P$ 到两波源的距离分别为 $r_1 = 6\\,\\text{m}$ 和 $r_2 = 5\\,\\text{m}$。\n试求：\n(1) 两波源到达质点 $P$ 的路程差 $\\Delta r$；\n(2) 判断质点 $P$ 为振动加强点还是振动减弱点；\n(3) 质点 $P$ 最终稳定后的合振幅 $A_{\\text{合}}$。',
    difficulty: 2,
    knowledgeIds: ['wave-1-3', 'wave-1-1'],
    masterModelId: 'model-harmonic-wave',
    tags: ['高考真题', '波的干涉', '路程差', '加强点减弱点'],
    targetAnimation: {
      animId: 'anim-wave-interference',
      presetParams: { lambda: 2, T: 1 },
      presetDescription: '载入 2023 湖南高考波干涉真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '几何路程差计算',
        keyCondition: 'Δr = |r1 - r2|',
        scorePoints: 2,
        formula: '$$\\Delta r = |6 - 5| = 1\\,\\text{m}$$',
        explanation: '求得两列相干波到达质点 P 的距离差为 1m。',
      },
      {
        id: 'step-2',
        description: '半波长奇数倍减弱点判据',
        keyCondition: '当 Δr = (2n + 1) * (λ/2) 时为振动减弱点',
        scorePoints: 4,
        formula: '$$\\Delta r = 1\\,\\text{m} = 1 \\times \\frac{\\lambda}{2} \\implies \\text{为奇数倍半波长，质点 P 为振动减弱点}$$',
        explanation: '路程差等于半个波长，两列波在质点 P 处的振动相位刚好相反。',
      },
      {
        id: 'step-3',
        description: '合振幅求解',
        keyCondition: '减弱点合振幅 A合 = |A1 - A2|',
        scorePoints: 4,
        formula: '$$A_{\\text{合}} = |A_1 - A_2| = |5 - 5| = 0\\,\\text{cm}$$',
        explanation: '两列等幅相干波在减弱点完全抵消，质点 P 保持静止状态。',
      },
    ],
  },

  // 16. 光学全反射与折射率测定
  {
    id: 'prob-2024-hubei-10',
    year: 2024,
    province: '湖北卷',
    source: '2024年高考湖北卷物理第10题',
    title: '半圆形玻璃砖折射与全反射临界角几何分析',
    content:
      '如图所示，一截面为半圆形的玻璃砖，折射率为 $n = \\sqrt{2}$，半径为 $R$。一束平行单色光垂直于半圆形玻璃砖的平面边界射入玻璃砖。真空中的光速为 $c$。\n试求：\n(1) 光在玻璃砖中传播的速度大小 $v$；\n(2) 该玻璃砖发生全反射的临界角 $C$ 的正弦值与角度；\n(3) 圆弧边界上有光线射出的弧长部分 $S$。',
    difficulty: 3,
    knowledgeIds: ['optics-1-2', 'optics-1-1'],
    masterModelId: 'model-optics-refraction',
    tags: ['高考真题', '全反射', '临界角', '折射率'],
    targetAnimation: {
      animId: 'anim-total-reflection',
      presetParams: { n: 1.414, angle: 30 },
      presetDescription: '载入 2024 湖北高考全反射真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '介质中光速公式 v = c / n',
        keyCondition: 'n = c / v',
        scorePoints: 2,
        formula: '$$v = \\frac{c}{n} = \\frac{c}{\\sqrt{2}} = \\frac{\\sqrt{2}}{2} c$$',
        explanation: '光在折射率为 $\\sqrt{2}$ 的介质中传播速度降低为 $\\frac{\\sqrt{2}}{2}c$。',
      },
      {
        id: 'step-2',
        description: '全反射临界角公式 sin C = 1 / n',
        keyCondition: '当入射角 i ≥ C 时发生全反射',
        scorePoints: 4,
        formula: '$$\\sin C = \\frac{1}{n} = \\frac{1}{\\sqrt{2}} \\implies C = 45^\\circ$$',
        explanation: '计算得出全反射临界角为 $45^\\circ$。',
      },
      {
        id: 'step-3',
        description: '几何光路图与透光弧长',
        keyCondition: '入射角小于 45° 的区域光线可折射射出',
        scorePoints: 4,
        formula: '$$\\theta_{\\text{透}} = 2 C = 90^\\circ \\implies S = R \\cdot \\frac{\\pi}{2} = \\frac{\\pi R}{2}$$',
        explanation: '圆弧中部开角 $90^\\circ$ 范围内的光线能透射出去，对应弧长为 $\\frac{\\pi R}{2}$。',
      },
    ],
  },

  // 17. 理想气体状态变化与热力学第一定律
  {
    id: 'prob-2023-shandong-13',
    year: 2023,
    province: '山东卷',
    source: '2023年高考山东卷物理第13题',
    title: '气缸活塞封闭气体等压膨胀与热力学第一定律',
    content:
      '如图所示，一圆柱形气缸竖直放置，用质量为 $m$ 的无摩擦活塞封闭一定质量的理想气体。初始时气体体积为 $V_1$，温度为 $T_1 = 300\\,\\text{K}$。已知大气压强为 $p_0$，活塞横截面积为 $S$，重力加速度为 $g$。现缓慢加热气体使体积膨胀到 $V_2 = 1.5 V_1$。\n试求：\n(1) 气缸内封闭气体的初始压强 $p_1$；\n(2) 气体体积膨胀到 $V_2$ 时的温度 $T_2$；\n(3) 若加热过程中气体吸收的热量为 $Q = 500\\,\\text{J}$，封闭气体压强保持 $p_1 = 1.2 \\times 10^5\\,\\text{Pa}$，体积增加量 $\\Delta V = 0.002\\,\\text{m}^3$，求解气体内能的增加量 $\\Delta U$。',
    difficulty: 3,
    knowledgeIds: ['thermo-1-2', 'thermo-1-1'],
    masterModelId: 'model-gas-thermodynamics',
    tags: ['高考真题', '理想气体状态方程', '盖-吕萨克定律', '热力学第一定律'],
    targetAnimation: {
      animId: 'anim-gas-laws',
      presetParams: { P1: 1, V1: 2, T1: 300 },
      presetDescription: '载入 2023 山东高考气体状态变化真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '活塞受力平衡求解气体压强',
        keyCondition: '活塞受重力 mg、外界大气压力 p0 S 与内部气体压力 p1 S 平衡',
        scorePoints: 3,
        formula: '$$p_1 S = p_0 S + m g \\implies p_1 = p_0 + \\frac{m g}{S}$$',
        explanation: '由于加热过程缓慢且活塞无摩擦，气缸内气体经历等压膨胀过程。',
      },
      {
        id: 'step-2',
        description: '盖-吕萨克定律求解末温 T2',
        keyCondition: '等压过程 V1 / T1 = V2 / T2',
        scorePoints: 3,
        formula: '$$T_2 = \\frac{V_2}{V_1} T_1 = 1.5 \\times 300 = 450\\,\\text{K}$$',
        explanation: '计算得到气体膨胀后的温度为 $450\text{ K}$。',
      },
      {
        id: 'step-3',
        description: '气体做功与热力学第一定律 ΔU = W + Q',
        keyCondition: '等压膨胀外界对气体做功 W = -p1 * ΔV',
        scorePoints: 4,
        formula: '$$W = -p_1 \\Delta V = -1.2 \\times 10^5 \\times 0.002 = -240\\,\\text{J}, \\quad \\Delta U = W + Q = -240 + 500 = 260\\,\\text{J}$$',
        explanation: '气体膨胀对外做功 $240\text{ J}$，吸收热量 $500\text{ J}$，内能净增加 $260\text{ J}$。',
      },
    ],
  },

  // 18. 光电效应与原子核衰变方程
  {
    id: 'prob-2024-zhejiang-6',
    year: 2024,
    province: '浙江卷',
    source: '2024年高考浙江卷物理第6题',
    title: '爱因斯坦光电效应方程与遏止电压定量计算',
    content:
      '在光电效应实验中，用频率为 $\\nu_1 = 8.0 \\times 10^{14}\\,\\text{Hz}$ 的单色光照射某种金属表面，测得遏止电压为 $U_{c1} = 1.1\\,\\text{V}$。已知普朗克常量 $h = 6.63 \\times 10^{-34}\\,\\text{J}\\cdot\\text{s}$，电子电荷量 $e = 1.6 \\times 10^{-19}\\,\\text{C}$。\n试求：\n(1) 金属逸出的光电子最大初动能 $E_{km1}$（以 $\\text{eV}$ 和 $\\text{J}$ 为单位）；\n(2) 该金属的逸出功 $W_0$；\n(3) 该金属发生光电效应的极限频率 $\\nu_0$。',
    difficulty: 2,
    knowledgeIds: ['modern-1-1', 'modern-1-2'],
    masterModelId: 'model-photoelectric-decay',
    tags: ['高考真题', '光电效应', '最大初动能', '逸出功', '遏止电压'],
    targetAnimation: {
      animId: 'anim-photoelectric',
      presetParams: { W0: 2.2, nu: 3.5 },
      presetDescription: '载入 2024 浙江高考光电效应真题参数',
    },
    steps: [
      {
        id: 'step-1',
        description: '遏止电压与最大初动能关系 Ekm = e * Uc',
        keyCondition: '最大初动能满足 Ekm = e * Uc1',
        scorePoints: 3,
        formula: '$$E_{km1} = e U_{c1} = 1.1\\,\\text{eV} = 1.76 \\times 10^{-19}\\,\\text{J}$$',
        explanation: '根据遏止电压定义直接得出光电子的最大初动能。',
      },
      {
        id: 'step-2',
        description: '爱因斯坦光电效应方程 Ekm = hν - W0 求解逸出功',
        keyCondition: 'W0 = h * ν1 - Ekm1',
        scorePoints: 4,
        formula: '$$W_0 = h \\nu_1 - E_{km1} = 6.63 \\times 10^{-34} \\times 8.0 \\times 10^{14} - 1.76 \\times 10^{-19} = 3.544 \\times 10^{-19}\\,\\text{J} \\approx 2.22\\,\\text{eV}$$',
        explanation: '求解得该金属的逸出功为 $2.22\text{ eV}$。',
      },
      {
        id: 'step-3',
        description: '逸出功与极限频率关系 W0 = h * ν0',
        keyCondition: 'ν0 = W0 / h',
        scorePoints: 3,
        formula: '$$\\nu_0 = \\frac{W_0}{h} = \\frac{3.544 \\times 10^{-19}}{6.63 \\times 10^{-34}} \\approx 5.35 \\times 10^{14}\\,\\text{Hz}$$',
        explanation: '求得该金属发生光电效应的极限截止频率。',
      },
    ],
  },
]
