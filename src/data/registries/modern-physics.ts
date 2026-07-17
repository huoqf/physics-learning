import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const modernPhysicsAnimations = defineAnimations({
  'anim-bohr-theory': {
    title: '原子结构与玻尔理论',
    knowledgeId: 'modern-1-4',
    Component: lazy(() => import('@/features/modern/bohr-theory/BohrTheoryAnimation')),
    controlsMode: (params) => params.mode === 2 ? 'loop' : 'timed',
    defaultParams: {
      mode: 0,                   // 学习阶段: 0-科学探索历程, 1-玻尔原子模型, 2-跃迁与激发机制, 3-高考综合应用
      modelType: 1,              // 阶段一: 0-汤姆孙枣糕模型, 1-卢瑟福核式结构
      impactParameter: 15,       // 阶段一: 碰撞参数 b (px)
      targetLevel: 2,            // 阶段二: 目标能级 n (1-4)
      atomQuantity: 0,           // 阶段三: 0-一群氢原子, 1-单个氢原子
      excitationType: 0,         // 阶段三: 0-光子照射, 1-实物电子碰撞
      incidentEnergy: 10.2,      // 阶段三: 入射粒子能量 (eV)
      radiationPhotonIndex: 1,   // 阶段四: 跃迁光子索引 (0:4->3, 1:4->2, 2:4->1, 3:3->2, 4:3->1, 5:2->1)
      workFunction: 2.29,        // 阶段四: 金属逸出功 (eV)，默认钠 2.29 eV
      stoppingVoltage: 0.0,      // 阶段四: 遏止电压 (V)
      launchTrigger: 0,          // 触发粒子发射
      clearTrigger: 0,           // 触发清空
      autoEmit: 1,               // 持续自动发射
      keepTrails: 0,             // 保留历史轨迹
      realScale: 0,              // 轨道半径物理比例
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        options: [
          { value: 0, label: '① 科学史' },
          { value: 1, label: '② 玻尔模型' },
          { value: 2, label: '③ 激发机制' },
          { value: 3, label: '④ 高考综合' },
        ],
      },
      // 阶段一控制
      {
        type: 'segmented',
        key: 'modelType',
        label: '原子模型',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '汤姆孙枣糕模型' },
          { value: 1, label: '卢瑟福核式结构' },
        ],
      },
      {
        type: 'action',
        label: '发射 α 粒子',
        action: 'launch',
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '清空粒子轨迹',
        action: 'reset',
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        setParams: { clearTrigger: 1 },
      },
      {
        type: 'toggle',
        key: 'autoEmit',
        label: '持续自动发射',
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'keepTrails',
        label: '保留历史轨迹',
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        trueValue: 1,
        falseValue: 0,
      },
      // 阶段二控制
      {
        type: 'segmented',
        key: 'realScale',
        label: '轨道半径比例',
        group: '操作',
        showIf: 'mode',
        showIfValue: 1,
        options: [
          { value: 0, label: '视觉美化比例' },
          { value: 1, label: '真实物理比例 (n²)' },
        ],
      },
      // 阶段三控制
      {
        type: 'segmented',
        key: 'atomQuantity',
        label: '原子数量',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 2,
        options: [
          { value: 0, label: '一群氢原子' },
          { value: 1, label: '单个氢原子' },
        ],
      },
      {
        type: 'segmented',
        key: 'excitationType',
        label: '激发方式',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 2,
        options: [
          { value: 0, label: '光子照射 (严格能级差)' },
          { value: 1, label: '电子碰撞 (量力而行)' },
        ],
      },
      {
        type: 'action',
        label: '发射粒子',
        action: 'launch',
        group: '操作',
        showIf: 'mode',
        showIfValue: 2,
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '重置退激光谱',
        action: 'reset',
        group: '操作',
        showIf: 'mode',
        showIfValue: 2,
        setParams: { clearTrigger: 1 },
      },
      // 阶段四控制
      {
        type: 'segmented',
        key: 'radiationPhotonIndex',
        label: '选择照射光子',
        group: '子模式',
        showIf: 'mode',
        showIfValue: 3,
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
        label: '一键调至遏止电压',
        group: '操作',
        showIf: 'mode',
        showIfValue: 3,
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
      // 阶段一参数
      {
        key: 'impactParameter',
        label: '入射偏导 b',
        min: 1,
        max: 50,
        step: 1,
        unit: 'px',
        showIf: 'mode',
        showIfValue: 0,
      },
      // 阶段二参数
      {
        key: 'targetLevel',
        label: '目标能级 n',
        min: 1,
        max: 4,
        step: 1,
        unit: '',
        showIf: 'mode',
        showIfValue: 1,
      },
      // 阶段三参数
      {
        key: 'incidentEnergy',
        label: '入射能量 E_in',
        min: 8.0,
        max: 15.0,
        step: 0.1,
        unit: 'eV',
        showIf: 'mode',
        showIfValue: 2,
      },
      // 阶段四参数
      {
        key: 'workFunction',
        label: '逸出功 W_0',
        min: 1.5,
        max: 4.5,
        step: 0.05,
        unit: 'eV',
        showIf: 'mode',
        showIfValue: 3,
      },
      {
        key: 'stoppingVoltage',
        label: '反向电压 U',
        min: 0.0,
        max: 12.0,
        step: 0.1,
        unit: 'V',
        showIf: 'mode',
        showIfValue: 3,
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
      mode: 0,               // 0=初学, 1=通关
      showPhotonModel: 0,    // 0=光束模式, 1=光子微粒模式
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '学习模式',
        options: [
          { value: 0, label: '初学 · 光子激发入门' },
          { value: 1, label: '通关 · 伏安特性与遏止电压' },
        ],
      },
      {
        type: 'toggle',
        key: 'showPhotonModel',
        label: '光子微粒模型',
        group: '显示',
        trueValue: 1,
        falseValue: 0,
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
    ],
    paramMeta: [
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
      mode: 0,                // 0: 原子核的组成, 1: 天然放射线偏转
      nuclide: 3,             // 默认 3: He-4 (alpha粒子). 0:H-1, 1:H-2, 2:H-3, 3:He-4, 4:C-12, 5:C-14, 6:U-238
      nucleonDistance: 1.2,   // 核子平均间距 (fm)
      fieldType: 0,           // 偏转介质: 0: 磁场, 1: 电场, 2: 无场
      bField: 1.5,            // 磁感应强度 (T)
      eField: 5.0,            // 电场强度 (kV/m)
      initVelocity: 4.0,      // 粒子初速度
      showObstacles: 0,       // 0: 关闭挡板, 1: 开启挡板
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
      // 模式1参数
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
})

