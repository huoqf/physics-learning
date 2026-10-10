import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const modernPhysicsAnimations = defineAnimations({
  'anim-alpha-scatter': {
    title: 'α 粒子散射实验与核式结构',
    knowledgeId: 'modern-1-3',
    Component: lazy(() => import('@/features/modern/alpha-scatter/AlphaScatterAnimation')),
    controlsMode: 'timed' as const,
    defaultParams: {
      modelType: 1,              // 0: 汤姆孙枣糕模型, 1: 卢瑟福核式模型
      impactParameter: 15,       // 碰撞参数 b (px)
      autoEmit: 1,               // 持续自动发射
      keepTrails: 0,             // 保留历史径迹
      launchTrigger: 0,
      clearTrigger: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'modelType',
        group: '原子模型假设',
        options: [
          { value: 0, label: '汤姆孙“枣糕模型”' },
          { value: 1, label: '卢瑟福“核式结构模型”' },
        ],
      },
      {
        type: 'action',
        label: '发射 α 粒子',
        action: 'launch',
        group: '操作',
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '清空粒子径迹',
        action: 'reset',
        group: '操作',
        setParams: { clearTrigger: 1 },
      },
      {
        type: 'toggle',
        key: 'autoEmit',
        label: '持续自动发射',
        group: '参数设置',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'keepTrails',
        label: '保留历史径迹',
        group: '参数设置',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        content: '实验证实：绝大多数粒子沿原方向直线穿过，少数偏转大角度，极少数反弹。',
        group: '物理规律',
      },
    ],
    paramMeta: [
      {
        key: 'impactParameter',
        label: '碰撞参数 b',
        min: 0,
        max: 40,
        step: 1,
        unit: 'px',
        group: '碰撞几何',
        marks: [
          { value: 0, label: '正对对心 (反弹)', variant: 'critical' },
          { value: 10, label: '近距偏转', variant: 'recommended' },
          { value: 30, label: '远距直穿', variant: 'zero' },
        ],
      },
    ],
  },

  'anim-bohr-theory': {
    title: '玻尔原子理论与氢光谱能级跃迁',
    knowledgeId: 'modern-1-4',
    Component: lazy(() => import('@/features/modern/bohr-theory/BohrTheoryAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,                   // 0: 玻尔原子轨道与定态跃迁, 1: 跃迁与激发机制对比, 2: 高考综合应用(辐射光电效应)
      targetLevel: 2,            // 目标能级 n (1-4)
      realScale: 0,              // 轨道半径物理比例 (0: 示意比例, 1: n² 真实比例)
      atomQuantity: 0,           // 0: 一群氢原子, 1: 单个氢原子
      excitationType: 0,         // 0: 光子照射(严苛共振), 1: 电子碰撞(传递能量)
      incidentEnergy: 10.2,      // 入射粒子能量 (eV)
      radiationPhotonIndex: 1,   // 跃迁光子索引 (0:4->3, 1:4->2, 2:4->1, 3:3->2, 4:3->1, 5:2->1)
      workFunction: 2.29,        // 金属逸出功 (eV)，默认钠 2.29 eV
      stoppingVoltage: 0.0,      // 反向遏止电压 (V)
      launchTrigger: 0,
      clearTrigger: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '学习模式',
        options: [
          { value: 0, label: '① 玻尔定态能级' },
          { value: 1, label: '② 跃迁与激发机制' },
          { value: 2, label: '③ 高考综合应用' },
        ],
      },
      // 模式 0 控制
      {
        type: 'segmented',
        key: 'realScale',
        label: '轨道半径比例',
        group: '轨道设置',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '视觉示意比例' },
          { value: 1, label: '真实物理比例 (n²)' },
        ],
      },
      // 模式 1 控制
      {
        type: 'segmented',
        key: 'atomQuantity',
        label: '原子样本数量',
        group: '激发设置',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '一群氢原子 C(n,2)' },
          { value: 1, label: '单个氢原子 (n-1)' },
        ],
      },
      {
        type: 'segmented',
        key: 'excitationType',
        label: '激发方式',
        group: '激发设置',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '光子照射 (严格共振)' },
          { value: 1, label: '实物电子碰撞 (超差即可)' },
        ],
      },
      {
        type: 'action',
        label: '发射激发粒子',
        action: 'launch',
        group: '激发操作',
        showIf: 'mode',
        showIfValue: 1,
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '重置退激光谱',
        action: 'reset',
        group: '激发操作',
        showIf: 'mode',
        showIfValue: 1,
        setParams: { clearTrigger: 1 },
      },
      // 模式 2 控制
      {
        type: 'segmented',
        key: 'radiationPhotonIndex',
        label: '选择跃迁辐射光子',
        group: '光照设置',
        showIf: 'mode',
        showIfValue: 2,
        options: [
          { value: 2, label: '4→1 (12.75 eV)' },
          { value: 4, label: '3→1 (12.09 eV)' },
          { value: 5, label: '2→1 (10.20 eV)' },
          { value: 1, label: '4→2 (2.55 eV)' },
          { value: 3, label: '3→2 (1.89 eV)' },
          { value: 0, label: '4→3 (0.66 eV)' },
        ],
      },
      {
        type: 'preset',
        label: '一键调至理论遏止电压',
        group: '电路调节',
        showIf: 'mode',
        showIfValue: 2,
        params: (p) => {
          const photonEnergies = [0.66, 2.55, 12.75, 1.89, 12.09, 10.20]
          const idx = p.radiationPhotonIndex ?? 1
          const W0 = p.workFunction ?? 2.29
          const hv = photonEnergies[idx]
          const Uc = hv >= W0 ? hv - W0 : 0
          return { stoppingVoltage: parseFloat(Uc.toFixed(2)) }
        },
        resetOnApply: false,
      },
    ],
    paramMeta: [
      // 模式 0 参数
      {
        key: 'targetLevel',
        label: '目标轨道能级 n',
        min: 1,
        max: 4,
        step: 1,
        unit: '',
        group: '定态参数',
        showIf: 'mode',
        showIfValue: 0,
      },
      // 模式 1 参数
      {
        key: 'incidentEnergy',
        label: '入射粒子能量 E_in',
        min: 8.0,
        max: 15.0,
        step: 0.1,
        unit: 'eV',
        group: '激发能量',
        showIf: 'mode',
        showIfValue: 1,
        marks: [
          { value: 10.2, label: 'n=1→2 临界', variant: 'recommended' },
          { value: 12.09, label: 'n=1→3 临界', variant: 'recommended' },
          { value: 13.6, label: '电离极限', variant: 'critical' },
        ],
      },
      // 模式 2 参数
      {
        key: 'workFunction',
        label: '阴极金属逸出功 W₀',
        min: 1.5,
        max: 4.5,
        step: 0.05,
        unit: 'eV',
        group: '金属材料',
        showIf: 'mode',
        showIfValue: 2,
        marks: [
          { value: 1.9, label: '铯 (1.90 eV)', variant: 'recommended' },
          { value: 2.29, label: '钠 (2.29 eV)', variant: 'recommended' },
          { value: 4.5, label: '钨 (4.50 eV)', variant: 'zero' },
        ],
      },
      {
        key: 'stoppingVoltage',
        label: '反向极板偏压 U',
        min: 0.0,
        max: 12.0,
        step: 0.1,
        unit: 'V',
        group: '偏压调节',
        showIf: 'mode',
        showIfValue: 2,
      },
    ],
  },

  'anim-photoelectric': {
    title: '光电效应与光的波粒二象性',
    knowledgeId: 'modern-1-2',
    Component: lazy(() => import('@/features/modern/photoelectric/PhotoelectricAnimation')),
    controlsMode: 'param' as const,
    defaultParams: {
      frequency: 6.0,        // 入射光频率 (×10^14 Hz)
      intensity: 50,         // 光源强度 (%)
      voltage: 0.0,          // 极板电压 (V)
      mode: 0,               // 0=初学, 1=通关, 2=康普顿散射
      showPhotonModel: 0,    // 0=光束模式, 1=光子微粒模式
      theta: 60,             // 康普顿散射角 (度)
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '学习模式',
        options: [
          { value: 0, label: '初学 · 光子激发入门' },
          { value: 1, label: '通关 · 伏安特性与遏止电压' },
          { value: 2, label: '进阶 · 康普顿效应与光子动量' },
        ],
      },
      {
        type: 'toggle',
        key: 'showPhotonModel',
        label: '光子微粒模型',
        group: '显示',
        trueValue: 1,
        falseValue: 0,
        hideIf: 'mode',
        hideIfValue: 2,
      },
      {
        type: 'tip',
        content: '频率决定能否产生光电子，光强决定光电流大小',
        group: '提示',
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'tip',
        content: '反向电压拦截光电子，刚好使电流归零的电压即遏止电压 Uc',
        group: '提示',
        showIf: 'mode',
        showIfValue: 1,
      },
      {
        type: 'tip',
        content: '康普顿散射证实光子具有动量 p = h/λ，散射后波长变长 Δλ = λc(1 - cos θ)',
        group: '提示',
        showIf: 'mode',
        showIfValue: 2,
      },
    ],
    paramMeta: [
      {
        key: 'theta',
        label: '散射角 θ',
        min: 0,
        max: 180,
        step: 5,
        unit: '°',
        group: '康普顿散射参数',
        showIf: 'mode',
        showIfValue: 2,
      },
      {
        key: 'frequency',
        label: '光源频率 ν',
        min: 4.0,
        max: 8.0,
        step: 0.1,
        unit: '×10¹⁴ Hz',
        group: '光源参数',
        marks: [
          { value: 5.6, label: '铯截止', variant: 'critical' },
          { value: 4.0, label: '红光', variant: 'zero' },
          { value: 7.5, label: '紫外', variant: 'recommended' },
        ],
      },
      {
        key: 'intensity',
        label: '光源强度 P',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        group: '光源参数',
      },
      {
        key: 'workFunction',
        label: '阴极逸出功 W₀',
        min: 1.5,
        max: 4.5,
        step: 0.05,
        unit: 'eV',
        group: '金属材料',
        marks: [
          { value: 1.9, label: '铯 (1.90 eV)', variant: 'recommended' },
          { value: 2.14, label: '铯默认 (2.14 eV)', variant: 'zero' },
          { value: 2.29, label: '钠 (2.29 eV)', variant: 'recommended' },
          { value: 3.3, label: '锌 (3.30 eV)', variant: 'critical' },
        ],
      },
      {
        key: 'voltage',
        label: '极板电压 U',
        min: -5.0,
        max: 5.0,
        step: 0.1,
        unit: 'V',
        group: '电路参数',
        showIf: 'mode',
        showIfValue: 1,
        marks: [
          { value: 0, label: '零偏', variant: 'zero' },
        ],
      },
    ],
  },

  'anim-nuclear-decay': {
    title: '原子核的组成与天然放射',
    knowledgeId: 'nuclear-1-1',
    Component: lazy(() => import('@/features/modern/nuclear-decay/NuclearDecayAnimation')),
    controlsMode: (params) => params.mode === 0 ? 'param' as const : 'timed' as const,
    defaultParams: {
      mode: 0,                // 0: 原子核的组成, 1: 天然放射线偏转, 2: 静止核衰变磁场径迹(高考模型)
      nuclide: 3,             // 默认 3: He-4 (alpha粒子). 0:H-1, 1:H-2, 2:H-3, 3:He-4, 4:C-12, 5:C-14, 6:U-238
      nucleonDistance: 1.2,   // 核子平均间距 (fm)
      fieldType: 0,           // 偏转介质: 0: 磁场, 1: 电场, 2: 无场
      bField: 1.5,            // 磁感应强度 (T)
      eField: 5.0,            // 电场强度 (kV/m)
      initVelocity: 4.0,      // 粒子初速度
      showObstacles: 0,       // 0: 关闭挡板, 1: 开启挡板
      decayType: 0,           // 模式2专属: 0: α 衰变 (外切圆), 1: β 衰变 (内切圆)
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '学习模式',
        resetOnChange: true,
        options: [
          { value: 0, label: '① 组成与核力' },
          { value: 1, label: '② 放射线偏转' },
          { value: 2, label: '③ 磁场衰变径迹' },
        ],
      },
      // 模式0专属控制
      {
        type: 'segmented',
        key: 'nuclide',
        label: '选择核种',
        group: '核种选择',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '氕 (¹₁H)' },
          { value: 1, label: '氘 (²₁H)' },
          { value: 2, label: '氚 (³₁H)' },
          { value: 3, label: '氦核 (⁴₂He)' },
          { value: 4, label: '碳-12 (¹²₆C)' },
          { value: 5, label: '碳-14 (¹⁴₆C)' },
          { value: 6, label: '铀-238 (²³⁸₉₂U)' },
        ],
      },
      // 模式1专属控制
      {
        type: 'segmented',
        key: 'fieldType',
        label: '外加场类型',
        group: '物理环境',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '均匀磁场 (B)' },
          { value: 1, label: '均匀电场 (E)' },
          { value: 2, label: '无外加场' },
        ],
      },
      {
        type: 'toggle',
        key: 'showObstacles',
        label: '放置障碍挡板',
        group: '物理环境',
        showIf: 'mode',
        showIfValue: 1,
        trueValue: 1,
        falseValue: 0,
      },
      // 模式2专属控制
      {
        type: 'segmented',
        key: 'decayType',
        label: '衰变模型',
        group: '高考压轴模型',
        showIf: 'mode',
        showIfValue: 2,
        resetOnChange: true,
        options: [
          { value: 0, label: 'α 衰变 (外切圆)' },
          { value: 1, label: 'β 衰变 (内切圆)' },
        ],
      },
      {
        type: 'tip',
        content: '强核力是短程引力，在 0.8~2.0 fm 表现为引力，更小表现为斥力，超出则极速归零。',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'tip',
        content: '由左手定则判断洛伦兹力方向。不同射线的电离与穿透本领呈反比。',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
      },
      {
        type: 'tip',
        content: '静止核衰变动量守恒 p₁=p₂。半径 R = p/(qB) ∝ 1/q。α 衰变同种正电荷向相反侧弯曲成外切圆；β 衰变异种电荷向同侧弯曲成内切圆。',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
      },
    ],
    paramMeta: [
      // 模式0参数
      {
        key: 'nucleonDistance',
        label: '核子间距 r',
        min: 0.6,
        max: 3.5,
        step: 0.05,
        unit: 'fm',
        showIf: 'mode',
        showIfValue: 0,
        marks: [
          { value: 0.8, label: '平衡点', variant: 'zero' },
          { value: 1.5, label: '强吸引', variant: 'recommended' },
          { value: 2.5, label: '极微弱', variant: 'critical' },
        ],
      },
      // 模式1/2参数
      {
        key: 'bField',
        label: '磁场强度 B',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        unit: 'T',
        showIf: 'mode',
        showIfValue: 2,
        marks: [
          { value: 1.5, label: '标准场强', variant: 'recommended' },
        ],
      },
      {
        key: 'bField',
        label: '磁场强度 B',
        min: -3.0,
        max: 3.0,
        step: 0.1,
        unit: 'T',
        showIf: 'fieldType',
        showIfValue: 0,
        marks: [
          { value: 0, label: '无磁场', variant: 'zero' },
        ],
      },
      {
        key: 'eField',
        label: '电场强度 E',
        min: -10.0,
        max: 10.0,
        step: 0.5,
        unit: 'kV/m',
        showIf: 'fieldType',
        showIfValue: 1,
        marks: [
          { value: 0, label: '无电场', variant: 'zero' },
        ],
      },
      {
        key: 'initVelocity',
        label: '出射初速度 v₀',
        min: 2.0,
        max: 8.0,
        step: 0.2,
        unit: 'c/10',
        showIf: 'mode',
        showIfValue: 1,
      },
    ],
  },

  'anim-nuclear-half-life': {
    title: '原子核衰变与半衰期',
    knowledgeId: 'nuclear-1-2',
    Component: lazy(() => import('@/features/modern/nuclear-decay/NuclearHalfLifeAnimation')),
    controlsMode: 'timed' as const,
    defaultParams: {
      halfLife: 4.0,          // 半衰期 (s)
      initCount: 100,         // 初始原子核个数: 50, 100, 200
      temperature: 20,        // 温度 (℃)
      pressure: 1.0,          // 压强 (atm)
      resetTrigger: 0,        // 重置触发计数器
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'initCount',
        label: '初始核数 N₀',
        group: '模拟参数',
        options: [
          { value: 50, label: '50 个 (波动大)' },
          { value: 100, label: '100 个 (适中)' },
          { value: 200, label: '200 个 (较平滑)' },
        ],
      },
      {
        type: 'action',
        label: '重新实验 (随机衰变)',
        action: 'reset',
        group: '操作',
        setParams: { resetTrigger: 1 },
      },
      {
        type: 'tip',
        content: '改变温度或压强，衰变速度完全不变！半衰期是由核内部性质决定的统计规律。',
        group: '教学提示',
      },
    ],
    paramMeta: [
      {
        key: 'halfLife',
        label: '半衰期 T',
        min: 2.0,
        max: 8.0,
        step: 0.5,
        unit: 's',
      },
      {
        key: 'temperature',
        label: '环境温度 t',
        min: 0,
        max: 100,
        step: 5,
        unit: '℃',
      },
      {
        key: 'pressure',
        label: '环境压强 p',
        min: 0.5,
        max: 5.0,
        step: 0.1,
        unit: 'atm',
      },
    ],
  },

  'anim-nuclear-reaction': {
    title: '核反应、结合能与质量亏损',
    knowledgeId: 'nuclear-1-3',
    Component: lazy(() => import('@/features/modern/nuclear-reaction/NuclearReactionAnimation')),
    controlsMode: 'timed' as const,
    defaultParams: {
      mode: 0,                   // 0: 结合能与质量亏损, 1: 核反应过程
      nuclide: 3,                // 0:氕(¹H), 1:氘(²H), 2:氚(³H), 3:氦核(⁴He), 4:碳-12(¹²C), 5:铁-56(⁵⁶Fe), 6:铀-238(²³⁸U)
      showMassDefectWeight: 0,   // 0: 不放置砝码, 1: 放置Δm砝码
      reactionType: 0,           // 0: 轻核聚变, 1: 重核单次裂变, 2: 铀核链式反应
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '学习模式',
        resetOnChange: true,
        options: [
          { value: 0, label: '① 结合能与质量亏损' },
          { value: 1, label: '② 聚变与裂变反应' },
        ],
      },
      // 模式0控制
      {
        type: 'segmented',
        key: 'nuclide',
        label: '选择核种',
        group: '原子核选择',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '氕 (¹₁H)' },
          { value: 1, label: '氘 (²₁H)' },
          { value: 2, label: '氚 (³₁H)' },
          { value: 3, label: '氦核 (⁴₂He)' },
          { value: 4, label: '碳-12 (¹²₆C)' },
          { value: 5, label: '铁-56 (⁵⁶₂₆Fe)' },
          { value: 6, label: '铀-238 (²³⁸₉₂U)' },
        ],
      },
      {
        type: 'toggle',
        key: 'showMassDefectWeight',
        label: '添加等效质量砝码',
        group: '天平交互',
        showIf: 'mode',
        showIfValue: 0,
        trueValue: 1,
        falseValue: 0,
      },
      // 模式1控制
      {
        type: 'segmented',
        key: 'reactionType',
        label: '反应类型',
        group: '核反应选择',
        showIf: 'mode',
        showIfValue: 1,
        resetOnChange: true,
        options: [
          { value: 0, label: '轻核聚变 (²H+³H)' },
          { value: 1, label: '单次裂变 (n+²³⁵U)' },
          { value: 2, label: '铀核链式反应' },
        ],
      },
      {
        type: 'tip',
        content: '质量亏损 Δm 对应的能量以光子或粒子动能的形式释放。在右盘放入 Δm 砝码可使天平重新平衡。',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'tip',
        content: '轻核聚变与重核裂变都是向着比结合能更大（即更加稳定）的方向发生反应，从而释放巨大能量。',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
      },
    ],
    paramMeta: [],
  },
})

