import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const modernPhysicsAnimations = defineAnimations({
  'anim-bohr-theory': {
    title: '原子结构与玻尔理论',
    knowledgeId: 'modern-1-1',
    Component: lazy(() => import('@/features/modern/bohr-theory/BohrTheoryAnimation')),
    controlsMode: 'timed' as const,
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
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '清空粒子轨迹',
        group: '操作',
        showIf: 'mode',
        showIfValue: 0,
        variant: 'danger',
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
        group: '操作',
        showIf: 'mode',
        showIfValue: 2,
        setParams: { launchTrigger: 1 },
      },
      {
        type: 'action',
        label: '重置退激光谱',
        group: '操作',
        showIf: 'mode',
        showIfValue: 2,
        variant: 'danger',
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
})
