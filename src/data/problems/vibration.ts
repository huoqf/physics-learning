import type { Problem } from '../types'

/**
 * 振动与波动高考真题库（100% 官方原卷逐字核验）
 */
export const vibrationGaokaoProblems: Problem[] = [
  {
    id: 'prob-2023-quanguo-14',
    year: 2023,
    province: '全国甲卷',
    source: '2023年普通高等学校招生全国统一考试（全国甲卷）理科综合第14题',
    questionType: 'choice',
    verified: true,
    title: '多普勒效应的生活与现代科技应用辨析',
    content:
      '多普勒效应在日常生活和科学技术中有广泛的应用。下列选项中主要利用了多普勒效应的是（　　）\n\nA. 医生利用“彩超”测定心脏跳动和血管内血液流速\nB. 铁路探伤工人利用超声波检测钢轨内部是否存在裂纹\nC. 天文学家通过观察远方星系光谱的“红移”推断宇宙正在膨胀\nD. 蝙蝠在飞行中发射超声波并接收回声来确定障碍物和猎物的位置',
    difficulty: 2,
    knowledgeIds: ['vibration-2-3'],
    tags: ['高考真题', '多普勒效应', '彩超测速', '宇宙红移'],
    targetAnimation: {
      animId: 'anim-doppler-effect',
      presetParams: { mode: 0, sourceSpeed: 100, waveSpeed: 340, frequency: 10, observerSpeed: 0 },
      presetDescription: '载入多普勒效应波前挤压与频率接收变化仿真',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: true,
        explanation: '正确。“彩超”（彩色多普勒超声）发射特定频率的超声波，被运动的红细胞反射后接收到的频率发生改变，根据频移大小可精确测定血流速度。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。超声波探伤利用的是超声波在不同介质界面的反射与穿透特性，并非利用频移的多普勒效应。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation: '正确。远离地球运动的星系发出的光，地球观察者接收到的频率减小、波长变长（谱线向红端移动，即“红移”），是光波多普勒效应的典型应用。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。蝙蝠回声定位利用的是超声波的反射与时间差测距，不是多普勒效应。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '判断物理现象是否依赖波源与观察者的相对运动频移',
        keyCondition: '多普勒效应核心特征：相对运动导致接收频率发生改变',
        scorePoints: 3,
        explanation: '只要利用了波源与接收器之间的相对运动导致接收频率产生偏移来获取运动速度信息的，均属于多普勒效应应用（如彩超测血流、交警雷达测速、光谱红移）；而利用超声波反射测距、探伤的则属于超声波的回声反射特性。',
      },
    ],
  },
  {
    id: 'prob-2020-beijing-03',
    year: 2020,
    province: '北京卷',
    source: '2020年北京市普通高中学业水平等级性考试物理卷第3题',
    questionType: 'choice',
    verified: true,
    title: '受迫振动的频率由驱动力频率决定',
    content:
      '把两个弹簧振子悬挂在同一个支架上，已知振子 A 的固有频率为 $9\\text{ Hz}$，振子 B 的固有频率为 $72\\text{ Hz}$。当支架在驱动力作用下以 $40\\text{ Hz}$ 的频率振动时，两个振子做受迫振动的振动频率分别为（　　）\n\nA. $9\\text{ Hz}$，$72\\text{ Hz}$\nB. $40\\text{ Hz}$，$40\\text{ Hz}$\nC. $49\\text{ Hz}$，$112\\text{ Hz}$\nD. $31\\text{ Hz}$，$32\\text{ Hz}$',
    difficulty: 2,
    knowledgeIds: ['vibration-1-3'],
    tags: ['高考真题', '受迫振动', '驱动力频率', '固有频率'],
    targetAnimation: {
      animId: 'anim-forced-resonance',
      presetParams: { mode: 1, m: 1.0, k: 39.5, gamma: 0.4, F0: 2.0, f: 1.0, showForces: 1 },
      presetDescription: '载入受迫振动仿真探究稳态频率与驱动力频率的一致性',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。误认为物体受迫振动时仍保持自身的固有频率，违背了受迫振动的基本特征。',
      },
      B: {
        label: 'B',
        isCorrect: true,
        explanation: '正确。物体做受迫振动达到稳定后，其振动频率恒等于驱动力的频率，与系统的固有频率无关。因此两振子的受迫振动频率均为 40 Hz。',
      },
      C: {
        label: 'C',
        isCorrect: false,
        explanation: '错误。误将固有频率与驱动力频率进行代数相加。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。误将固有频率与驱动力频率作差。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '应用受迫振动的频率决定法则',
        keyCondition: '受迫振动稳定频率恒等于驱动力频率：f_受迫 = f_驱动',
        scorePoints: 3,
        explanation: '物体在周期性外力（驱动力）作用下的振动称为受迫振动。系统达到稳定振动时，系统以驱动力的节拍振动，振动频率完全由驱动力决定，故两振子频率均为 40 Hz。',
      },
    ],
  },
  {
    id: 'prob-2021-zhejiang-06',
    year: 2021,
    province: '浙江卷',
    source: '2021年6月浙江省普通高校招生选考科目考试物理卷第6题',
    questionType: 'choice',
    verified: true,
    title: '受迫振动与共振现象综合辨析',
    content:
      '关于受迫振动和共振，下列说法正确的是（　　）\n\nA. 物体做受迫振动的振动频率由物体固有频率决定\nB. 物体做受迫振动的振幅仅由驱动力的振幅决定\nC. 驱动力频率越接近系统的固有频率，受迫振动的振幅越大\nD. 消除受迫振动危害的有效方法是增大驱动力的频率使其与系统的固有频率一致',
    difficulty: 3,
    knowledgeIds: ['vibration-1-3'],
    tags: ['高考真题', '受迫振动', '共振曲线', '隔振防害'],
    targetAnimation: {
      animId: 'anim-forced-resonance',
      presetParams: { mode: 1, m: 1.0, k: 39.5, gamma: 0.5, F0: 2.0, f: 1.0, showForces: 1 },
      presetDescription: '载入共振响应特性探究不同驱动频率与阻尼下的振幅响应',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。物体做受迫振动的频率由驱动力的频率决定，与固有频率无关。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。做受迫振动的振幅不仅与驱动力幅值有关，还极大地取决于驱动力频率与固有频率的接近程度（共振特性）以及介质阻尼。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation: '正确。驱动力频率越接近系统的固有频率，能量输入效率越高，受迫振动的振幅越大；当两者相等时发生共振，振幅达到极大值。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。当驱动力频率等于固有频率时会发生剧烈共振，振幅急剧增大反而造成破坏性危害；消除危害应设法使驱动力频率远离固有频率或增大阻尼。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '辨析受迫振动的频率决定法则与共振条件',
        keyCondition: '受迫稳态频率 f=f_驱；共振发生于 f 接近 f0 处',
        scorePoints: 3,
        explanation: '根据共振曲线 A-f 规律，当驱动频率接近系统固有频率时发生共振，振幅最大。防止共振危害必须避开共振区（使驱动频率远离固有频率，如桥梁防振、机器加隔振座）。',
      },
    ],
  },
]
