import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

/**
 * 高考力学实验基础 - 动画注册表
 */
export const mechanicsExperimentAnimations = defineAnimations({
  'anim-mechanics-experiment-base': {
    title: '高考力学实验基础与纸带/光电门分析',
    knowledgeId: 'experiment-1-1',
    Component: lazy(() => import('@/features/mechanics/experiment/MechanicsExperimentAnimation')),
    controlsMode: 'timed',
    defaultParams: {
      mode: 0,
      v0: 1.0,
      a: 1.5,
      freq: 50,
      d: 0.01,
      k: 100,
      m: 0.2,
    } as const,
    paramMeta: [
      {
        key: 'v0',
        label: '初速度 v0',
        min: 0,
        max: 5,
        step: 0.1,
        unit: 'm/s',
        group: '基础运动参数',
      },
      {
        key: 'a',
        label: '加速度 a',
        min: 0.1,
        max: 8,
        step: 0.1,
        unit: 'm/s²',
        group: '基础运动参数',
      },
      {
        key: 'freq',
        label: '打点频率 f',
        min: 10,
        max: 100,
        step: 5,
        unit: 'Hz',
        group: '打点计时器',
        marks: [
          { value: 50, label: '高考标准 50Hz', variant: 'critical' },
        ],
      },
      {
        key: 'd',
        label: '遮光条宽度 d',
        min: 0.005,
        max: 0.05,
        step: 0.005,
        unit: 'm',
        group: '光电门参数',
        marks: [
          { value: 0.01, label: '标准 1cm', variant: 'critical' },
        ],
      },
      {
        key: 'k',
        label: '弹簧劲度系数 k',
        min: 20,
        max: 300,
        step: 10,
        unit: 'N/m',
        group: '胡克定律',
      },
      {
        key: 'm',
        label: '钩码质量 m',
        min: 0.05,
        max: 1.0,
        step: 0.05,
        unit: 'kg',
        group: '胡克定律',
      },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '高考实验模型',
        resetOnChange: true,
        options: [
          { label: '① 打点纸带分析', value: 0 },
          { label: '② 光电门测速', value: 1 },
          { label: '③ 胡克定律探究', value: 2 },
        ],
      },
      {
        type: 'preset',
        label: '📋 2024新课标卷：逐差法求加速度 a',
        description: '装载高考打点纸带逐差法真题参数 (f=50Hz, a=2.0m/s²)',
        params: { mode: 0, v0: 0.5, a: 2.0, freq: 50 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '📋 2023全国甲卷：光电门瞬时速度测定',
        description: '装载光电门遮光测速真题参数 (d=0.01m, a=1.5m/s²)',
        params: { mode: 1, v0: 0.8, a: 1.5, d: 0.01 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '📋 2022全国乙卷：胡克定律测劲度系数 k',
        description: '装载弹簧测力与伸长量真题参数 (k=120N/m, m=0.3kg)',
        params: { mode: 2, k: 120, m: 0.3 },
        restartOnApply: true,
      },
      {
        type: 'tip',
        group: '高考要点提示',
        content: '打点纸带逐差法公式：a = [(x6-x3)-(x3-x0)] / 9T²（或位移段 [(s4+s5+s6)-(s1+s2+s3)] / 9T²）；光电门用极短遮光时间内的平均速度替代瞬时速度：v = d/Δt。',
      },
    ],
  },
})
