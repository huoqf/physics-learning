import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 机械振动与波 =====
export const vibrationOscillationAnimations = defineAnimations({
  'anim-simple-harmonic': {
    title: '简谐运动（弹簧振子）',
    knowledgeId: 'vibration-1-1',
    Component: lazy(() => import('@/features/vibration/simpleHarmonic/SimpleHarmonicAnimation')),
    controlsMode: 'timed' as const,
    maxTime: 20,
    defaultParams: {
      A: 0.06,
      mass: 0.5,
      k: 20,
      phiDeg: 0,
      mode: 0,
      showGraph: 1,
      showHelper: 1,
    } as const,
    paramMeta: [
      { key: 'A', label: '振幅 A', min: 0.02, max: 0.10, step: 0.005, unit: 'm', group: '振动参数' },
      { key: 'mass', label: '振子质量 m', min: 0.2, max: 2.0, step: 0.1, unit: 'kg', group: '物理属性' },
      { key: 'k', label: '劲度系数 k', min: 10, max: 50, step: 5, unit: 'N/m', group: '物理属性' },
      { key: 'phiDeg', label: '初相位 φ', min: 0, max: 360, step: 5, unit: '°', group: '振动参数' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '水平弹簧振子' },
          { value: 1, label: '竖直弹簧振子' },
          { value: 2, label: '能量守恒分析' },
        ],
      },
      {
        type: 'toggle',
        key: 'showGraph',
        label: '显示振动图象',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'showHelper',
        label: '显示辅助投影线',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '简谐运动周期 $T = 2\\pi \\sqrt{m/k}$，调节质量 m 或劲度系数 k 探究周期变化规律。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '竖直振子中，平衡位置 $O$ 偏离弹簧原长 $L_0$ 处（$\\Delta x_0 = mg/k$）。重力与弹力的合外力作为回复力。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
        content: '动能与弹性势能周期性此消彼长。在任意位置，系统的总机械能守恒。',
      },
    ],
  },
  'anim-simple-pendulum': {
    title: '单摆',
    knowledgeId: 'vibration-1-2',
    Component: lazy(() => import('@/features/vibration/simpleHarmonic/SimplePendulumAnimation')),
    controlsMode: 'timed' as const,
    maxTime: 20,
    defaultParams: {
      L: 1.0,
      g: 9.8,
      theta0: 8,
      phiDeg: 0,
      showGraph: 1,
      showHelper: 1,
    } as const,
    paramMeta: [
      { key: 'L', label: '摆长 L', min: 0.5, max: 2.0, step: 0.1, unit: 'm', group: '摆参数' },
      { key: 'g', label: '重力加速度 g', min: 2.0, max: 20.0, step: 0.1, unit: 'm/s²', group: '环境参数' },
      { key: 'theta0', label: '最大摆角 θ₀', min: 2, max: 10, step: 1, unit: '°', group: '摆参数' },
      { key: 'phiDeg', label: '初相位 φ', min: 0, max: 360, step: 5, unit: '°', group: '摆参数' },
    ],
    controlMeta: [
      {
        type: 'toggle',
        key: 'showGraph',
        label: '显示振动图象',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'showHelper',
        label: '显示辅助投影线',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '单摆周期 $T = 2\\pi \\sqrt{L/g}$，摆长和重力加速度决定其振动快慢。摆球质量不影响周期。',
      },
      {
        type: 'tip',
        group: '教学提示',
        content: '简谐运动要求摆角 $\\theta \\le 10^\\circ$，在此范围内，重力的切向分力 $F_t = -mg\\sin\\theta \\approx -mg\\theta$ 提供回复力。',
      },
    ],
  },
})
