import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 热学 · 气体实验三定律 =====
export const thermodynamicsGasLawsAnimations = defineAnimations({
  'anim-gas-laws': {
    title: '气体实验三定律',
    knowledgeId: 'thermodynamics-2-1',
    Component: lazy(() => import('@/features/thermodynamics/gasLaws/GasLawsAnimation')),
    controlsMode: 'param',
    defaultParams: {
      mode: 0,
      T: 300,
      V: 5e-3,
    } as const,
    paramMeta: [
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K',
        showIf: 'mode', showIfValue: 1 },
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K',
        showIf: 'mode', showIfValue: 2 },
      { key: 'V', label: '体积 V', min: 1e-4, max: 1e-2, step: 1e-4, unit: 'm³',
        showIf: 'mode', showIfValue: 0 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [
          { value: 0, label: '等温（玻意耳）' },
          { value: 1, label: '等压（盖-吕萨克）' },
          { value: 2, label: '等容（查理）' },
        ] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '锁定温度 T，拖动体积 V，观察压强 P 变化' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '锁定压强 P（恒定砝码），拖动温度 T，观察体积 V 变化' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 2,
        content: '锁定体积 V（固定活塞），拖动温度 T，观察压强 P 变化' },
    ],
    supportsDiscovery: true,
    discoverySteps: () => import('@/features/thermodynamics/gasLaws/discoverySteps'),
    CenterExtra: lazy(() => import('@/features/thermodynamics/gasLaws/GasLawsCenterExtra')),
    centerLayout: 'splitH',
  },

  // ===== 热学 · 理想气体状态方程（Clapeyron 方程扩展）=====
  'anim-clapeyron': {
    title: '理想气体状态方程',
    knowledgeId: 'thermodynamics-2-2',
    Component: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronAnimation')),
    controlsMode: 'param',
    defaultParams: {
      mode: 0,
      V: 5e-3,
      T: 300,
    } as const,
    paramMeta: [
      { key: 'V', label: '体积 V', min: 1e-4, max: 1e-2, step: 1e-4, unit: 'm³' },
      { key: 'T', label: '温度 T', min: 200, max: 600, step: 1, unit: 'K' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础模式' }, { value: 1, label: '进阶模式' }] },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 0,
        content: '拖动 T 或 V，观察压强 P 自动约束变化' },
      { type: 'tip', group: '教学提示', showIf: 'mode', showIfValue: 1,
        content: '拖动 T 或 V，状态点在等温线族间跃迁' },
    ],
    CenterExtra: lazy(() => import('@/features/thermodynamics/gasLaws/ClapeyronCenterExtra')),
    centerLayout: 'splitH',
  },

  // ===== 热学 · 固体、液体与表面张力 =====
  'anim-solids-liquids': {
    title: '固体、液体与表面张力',
    knowledgeId: 'thermodynamics-2-3',
    Component: lazy(() => import('@/features/thermodynamics/solids-liquids')),
    controlsMode: 'param',
    defaultParams: {
      mode: 0,
      solidType: 0,
      gamma: 0.073,
      capillaryRadius: 0.5,
      isMercury: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '探究主题',
        group: '实验模型',
        resetOnChange: true,
        options: [
          { value: 0, label: '晶体与非晶体' },
          { value: 1, label: '表面张力' },
          { value: 2, label: '浸润与毛细现象' },
        ],
      },
      {
        type: 'segmented',
        key: 'solidType',
        label: '固体类型',
        group: '微观结构',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '单晶体 (规则点阵)' },
          { value: 1, label: '多晶体 (各向同性)' },
          { value: 2, label: '非晶体 (无序软化)' },
        ],
      },
      {
        type: 'segmented',
        key: 'isMercury',
        label: '实验液体',
        group: '液体性质',
        showIf: 'mode',
        showIfValue: 2,
        options: [
          { value: 0, label: '水 (浸润上升)' },
          { value: 1, label: '水银 (不浸润下降)' },
        ],
      },
      {
        type: 'preset',
        label: '📋 高考真题：肥皂液膜表面张力做功',
        group: '快捷预设',
        params: () => ({ mode: 1, solidType: 0, gamma: 0.05, capillaryRadius: 0.5, isMercury: 0 }),
      },
    ],
    paramMeta: [
      {
        key: 'gamma',
        label: '表面张力系数 γ',
        min: 0.02,
        max: 0.12,
        step: 0.005,
        unit: 'N/m',
        showIf: 'mode',
        showIfValue: 1,
        marks: [{ value: 0.073, label: '纯水 (0.073)' }],
      },
      {
        key: 'capillaryRadius',
        label: '毛细管半径 r',
        min: 0.2,
        max: 2.0,
        step: 0.1,
        unit: 'mm',
        showIf: 'mode',
        showIfValue: 2,
        marks: [{ value: 0.5, label: '细管 0.5mm' }],
      },
    ],
  },

  // ===== 热学 · 饱和汽与相对湿度 =====
  'anim-saturated-vapor': {
    title: '饱和汽与相对湿度',
    knowledgeId: 'thermodynamics-2-4',
    Component: lazy(() => import('@/features/thermodynamics/saturated-vapor')),
    CenterExtra: lazy(() => import('@/features/thermodynamics/saturated-vapor/SaturatedVaporCenterExtra')),
    controlsMode: 'param',
    defaultParams: {
      tempCelsius: 25,
      referencePressure: 1580,
      pistonVolume: 1.0,
    } as const,
    controlMeta: [
      {
        type: 'preset',
        label: '📋 高考陷阱：饱和汽等温压缩（p 恒为 ps）',
        group: '快捷预设',
        params: () => ({ tempCelsius: 25, referencePressure: 4000, pistonVolume: 1.0 }),
      },
      {
        type: 'preset',
        label: '📋 未饱和态压缩至饱和锁定',
        group: '快捷预设',
        params: () => ({ tempCelsius: 25, referencePressure: 2400, pistonVolume: 1.0 }),
      },
      {
        type: 'preset',
        label: '📋 降温结露过程 (RH 达 100%)',
        group: '快捷预设',
        params: () => ({ tempCelsius: 25, referencePressure: 1600, pistonVolume: 1.0 }),
      },
      {
        type: 'tip',
        group: '核心考点',
        variant: 'primary',
        content: '【高考关键易错点】：未饱和时等温压缩遵循玻意耳定律（p ∝ 1/V）；一旦 p 达到饱和汽压 ps，多余蒸汽立即液化，此后 p 恒等于 ps，与体积完全无关——这正是饱和汽压仅由温度决定的含义。',
      },
    ],
    paramMeta: [
      {
        key: 'tempCelsius',
        label: '环境温度 T',
        min: 5,
        max: 55,
        step: 1,
        unit: '℃',
        marks: [
          { value: 25, label: '室温 25℃' },
          { value: 14, label: '露点 14℃', variant: 'critical' },
        ],
      },
      {
        key: 'referencePressure',
        label: '水蒸气含量（V=1 时对应分压）',
        min: 500,
        max: 6000,
        step: 50,
        unit: 'Pa',
      },
      {
        key: 'pistonVolume',
        label: '气缸容积 V',
        min: 0.5,
        max: 2.0,
        step: 0.1,
        unit: '倍',
      },
    ],
  },
})

