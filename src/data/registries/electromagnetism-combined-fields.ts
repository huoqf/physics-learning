import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 复合场组合场模型（高考三合一级联模型）=====
export const combinedFieldsAnimations = defineAnimations({
  'anim-combined-fields': {
    title: '复合场组合场模型（高考三合一级联模型）',
    knowledgeId: 'electricity-3-4',
    Component: lazy(() =>
      import('@/features/electromagnetism/magnetism/combined-fields/CombinedFieldsAnimation'),
    ),
    controlsMode: 'timed' as const,
    maxTime: 0.0006,
    defaultParams: {
      mode: 0,
      electricE: 300,
      magneticB1: 0.2,
      magneticB2: 1.5,
      acFrequency: 24,
      acVoltage: 5,
      resonanceLock: 1,
      particleType: 0,
      vParticle: 1500,
    } as const,
    paramMeta: [
      // 模式 0: 质谱仪级联参数
      { key: 'electricE', label: '选择器电场 E', min: 100, max: 1000, step: 10, unit: 'N/C', showIf: 'mode', showIfValue: 0 },
      { key: 'magneticB1', label: '选择器磁场 B₁', min: 0.1, max: 1.0, step: 0.01, unit: 'T', showIf: 'mode', showIfValue: 0 },
      { key: 'magneticB2', label: '偏转磁场 B₂', min: 0.5, max: 3.0, step: 0.05, unit: 'T', showIf: 'mode', showIfValue: 0 },
      { key: 'vParticle', label: '初速度 v₀', min: 1000, max: 2000, step: 50, unit: 'm/s', showIf: 'mode', showIfValue: 0 },

      // 模式 1: 回旋加速器参数
      { key: 'magneticB2', label: '回旋磁场 B₂', min: 0.5, max: 3.0, step: 0.05, unit: 'T', showIf: 'mode', showIfValue: 1 },
      { key: 'acFrequency', label: '高频频率 f', min: 10, max: 100, step: 0.1, unit: 'kHz', showIf: 'mode', showIfValue: 1 },
      { key: 'acVoltage', label: '加速电压 U', min: 1.0, max: 10.0, step: 0.2, unit: 'kV', showIf: 'mode', showIfValue: 1 },

      // 模式 2: 电偏转+磁偏转级联参数
      { key: 'electricE', label: '偏转电场 E', min: 100, max: 1000, step: 10, unit: 'N/C', showIf: 'mode', showIfValue: 2 },
      { key: 'magneticB2', label: '偏转磁场 B₂', min: 0.5, max: 3.0, step: 0.05, unit: 'T', showIf: 'mode', showIfValue: 2 },
      { key: 'vParticle', label: '初速度 v₀', min: 1000, max: 2000, step: 50, unit: 'm/s', showIf: 'mode', showIfValue: 2 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        options: [
          { value: 0, label: '质谱仪级联' },
          { value: 1, label: '回旋加速器' },
          { value: 2, label: '电偏转与磁偏转' },
        ],
      },
      // 粒子选择仅在模式 0 和 模式 2 展示
      {
        type: 'segmented',
        key: 'particleType',
        group: '粒子选择',
        showIf: 'mode',
        showIfValue: 0,
        options: [
          { value: 0, label: '质子 (¹H⁺)' },
          { value: 1, label: '氘核 (²H⁺)' },
          { value: 2, label: 'α 粒子 (⁴He²⁺)' },
        ],
      },
      {
        type: 'segmented',
        key: 'particleType',
        group: '粒子选择',
        showIf: 'mode',
        showIfValue: 2,
        options: [
          { value: 0, label: '质子 (¹H⁺)' },
          { value: 1, label: '氘核 (²H⁺)' },
          { value: 2, label: 'α 粒子 (⁴He²⁺)' },
        ],
      },
      // 共振锁定仅在模式 1 展示
      {
        type: 'toggle',
        key: 'resonanceLock',
        label: '一键共振锁定 (autoTune)',
        group: '快速向导',
        showIf: 'mode',
        showIfValue: 1,
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        content: '速度选择器：仅当 v₀ = E/B₁ 时受力平衡，直线通过。随后在 B₂ 中偏转，其半径 R ∝ m/q，可分选同位素。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '回旋加速器：频率须硬核匹配 f = qB₂/2πm；电压 U 仅决定加速次数，最终动能由 R_max 锁死（与电压无关）。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
        content: '级联偏转：在电场中进行类平抛偏转（速度变大），随之以切向速度射入磁场做匀速圆周（速度大小不变）。',
      },
    ],
  },
})
