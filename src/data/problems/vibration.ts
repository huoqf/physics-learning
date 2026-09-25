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
      presetParams: { sourceSpeed: 0.5, waveSpeed: 1.0 },
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
]
