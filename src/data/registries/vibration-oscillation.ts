import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import { SIMPLE_PENDULUM_DEFAULT_PARAMS } from '@/physics/experimentPendulum'
import { GRAVITY } from '@/physics/constants'

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
        // 原「T = 2π√(m/k)」为公式搬运（§2.6.5 C2），右屏 FormulaSection 已给出
        content: '只改 m、再只改 k，各测一次周期：两次变化幅度一样吗？想把周期加倍，改哪个量更省事？',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        // 原「Δx₀ = mg/k」为公式搬运（§2.6.5 C2），右屏 FormulaSection 已给出
        content: '先关掉振动让它静止：平衡位置是不是落在弹簧原长下方？再从这个位置拉开放手，看它绕哪里对称往复。',
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
    CenterExtra: lazy(() => import('@/features/vibration/simpleHarmonic/SimplePendulumCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed' as const,
    maxTime: (params) => {
      if (params?.mode === 3) {
        const l = params.l_line ?? 0.985
        const d = (params.d_mm ?? 20.0) / 2000
        const L = l + d
        const g = params.g ?? GRAVITY
        const n = params.n_cycles ?? 40
        const T = 2 * Math.PI * Math.sqrt(L / g)
        return Math.ceil(n * T) + 2
      }
      return 20
    },
    defaultParams: SIMPLE_PENDULUM_DEFAULT_PARAMS,
    paramMeta: [
      { key: 'L', label: '摆长 L', min: 1.0, max: 2.0, step: 0.1, unit: 'm', group: '摆参数', hideIf: 'mode', hideIfValue: 3 },
      { key: 'g', label: '重力加速度 g', min: 2.0, max: 20.0, step: 0.1, unit: 'm/s²', group: '环境参数', hideIf: 'mode', hideIfValue: 3 },
      { key: 'theta0', label: '最大摆角 θ₀', min: 2, max: 60, step: 1, unit: '°', group: '摆参数', hideIf: 'mode', hideIfValue: 3 },
      { key: 'phiDeg', label: '初相位 φ', min: 0, max: 360, step: 5, unit: '°', group: '摆参数', hideIf: 'mode', hideIfValue: 3 },
      { key: 'l_line', label: '摆线长 l', min: 0.7, max: 1.3, step: 0.005, unit: 'm', group: '实验测量', showIf: 'mode', showIfValue: 3 },
      { key: 'd_mm', label: '摆球直径 d', min: 12.0, max: 28.0, step: 0.1, unit: 'mm', group: '实验测量', showIf: 'mode', showIfValue: 3 },
      { key: 'theta0_exp', label: '摆角 θ₀ (≤5°)', min: 1, max: 5, step: 0.5, unit: '°', group: '实验测量', showIf: 'mode', showIfValue: 3 },
      { key: 'n_cycles', label: '全振动次数 N', min: 20, max: 60, step: 5, unit: '次', group: '实验测量', showIf: 'mode', showIfValue: 3 },
      { key: 'timing_err', label: '秒表计时误差 Δt', min: -0.5, max: 0.5, step: 0.05, unit: 's', group: '误差探究', showIf: 'mode', showIfValue: 3 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '小角简谐' },
          { value: 1, label: '大角对比' },
          { value: 2, label: '能量守恒' },
          { value: 3, label: '单摆测 g' },
        ],
      },
      {
        type: 'preset',
        label: '⏱️ 标准摆长测 g（l=0.985m）',
        description: '标准单摆实验 (l=0.985m, d=20mm, N=40, θ₀=4°)',
        params: { mode: 3, l_line: 0.985, d_mm: 20.0, n_cycles: 40, timing_err: 0, theta0_exp: 4, theta0: 4, g: 9.8 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '⌛ 停表滞后（+0.4s）',
        description: '模拟人工反应慢停 0.4s 导致测得周期偏大、g 偏小',
        params: { mode: 3, l_line: 0.985, d_mm: 20.0, n_cycles: 40, timing_err: 0.4, theta0_exp: 4, theta0: 4, g: 9.8 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '📏 短摆长测 g（l=0.69m）',
        description: '测量不同摆长数据 (l=0.690m, d=20mm, N=40)',
        params: { mode: 3, l_line: 0.69, d_mm: 20.0, n_cycles: 40, timing_err: 0, theta0_exp: 4, theta0: 4, g: 9.8 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '📋 简谐基础：小角单摆 (θ₀=5°)',
        description: '基础小角等时性单摆演示 (L=1.0m, g=9.8m/s²)',
        params: { mode: 0, L: 1.0, g: 9.8, theta0: 5, phiDeg: 0 },
        restartOnApply: true,
      },
      {
        type: 'toggle',
        key: 'showGraph',
        label: '显示沙摆轨迹',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'toggle',
        key: 'showHelper',
        label: '显示投影辅助线',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 0,
        // 原 F_t = −mg sinθ ≈ −mgθ 属公式搬运（§2.6.5 C2），右屏 FormulaSection 已给出
        content: '把起始摆角从 5° 慢慢加到 30°：盯周期读数，它在哪个角度之后开始明显偏离小角值？',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '大摆角下简谐近似失效，摆动周期随最大偏角变大而非线性变长。图中虚线为简谐近似单摆，实线为非线性真实单摆。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 2,
        // 原「高考高频结论 + F_拉,max 公式」属考点结论与公式搬运（§2.6.5 C2/C3），
        // 右屏 quantities/vibration.ts 的 F_拉,max 公式已给出同一结论
        content: '盯两条曲线：动能与势能此消彼长、总和是不是一条水平线？再把拉力读数与最低点对齐，看它是否出现峰值。',
      },
      {
        type: 'tip',
        group: '操作提示',
        showIf: 'mode',
        showIfValue: 3,
        // 原「高考实验要点」三条（摆长算至球心、累积计时、小角近似）属实验考点（§2.6.5 C3），
        // 右屏 gaokaoPoints 已有累积计时与摆长测量要点；左屏只留这一模式的操作顺序。
        content: '按顺序走一遍：量摆长到球心 → 从最低点开始计时、数够 30 次以上 → 再故意让秒表晚停 0.4s，看 g 偏大还是偏小。',
      },
    ],
  },

  'anim-mechanical-wave': {
    title: '机械波的形成与传播',
    knowledgeId: 'vibration-2-1',
    Component: lazy(() => import('@/features/vibration/wave/MechanicalWaveAnimation')),
    CenterExtra: lazy(() => import('@/features/vibration/wave/MechanicalWaveCenterExtra')),
    centerLayout: 'splitV',
    controlsMode: 'timed' as const,
    maxTime: 40,
    defaultParams: {
      A: 2,
      f: 1,
      v: 2,
      mode: 0,
      showLinks: 1,
      showLambda: 0,
      lockSource: 0,
      phi0: 0,
    } as const,
    paramMeta: [
      { key: 'A', label: '振幅 A', min: 0.5, max: 4.0, step: 0.1, unit: 'cm', group: '波参数', importance: 'core' },
      { key: 'f', label: '频率 f', min: 0.2, max: 2.0, step: 0.1, unit: 'Hz', group: '波参数', importance: 'core' },
      { key: 'v', label: '波速 v', min: 0.5, max: 5.0, step: 0.1, unit: 'm/s', group: '介质参数', importance: 'core' },
      {
        key: 'phi0',
        label: '初相 φ₀',
        min: 0,
        max: 360,
        step: 15,
        unit: '°',
        group: '进阶参数',
        importance: 'advanced',
      },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '传播模式',
        resetOnChange: true,
        options: [
          { value: 0, label: '连续简谐波' },
          { value: 1, label: '单脉冲' },
        ],
      },
      {
        type: 'toggle',
        key: 'showLinks',
        label: '显示弹性纽带',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'showLambda',
        label: '标注波长 λ',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
        showIf: 'mode',
        showIfValue: 0,
      },
      {
        type: 'toggle',
        key: 'lockSource',
        label: '锁定振源（禁拖拽）',
        group: '交互',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        content:
          '观察质点 $P$：波形向右传播时，$P$ 只在竖直方向振动（传波不传质）。波速 $v=\\lambda f$，调节 $v$ 或 $f$ 观察波长变化。',
      },
      {
        type: 'tip',
        group: '教学提示',
        showIf: 'mode',
        showIfValue: 1,
        content: '单脉冲：扰动到达前质点保持静止（因果性）。脉冲过后质点回到平衡位置附近。',
      },
    ],
  },

  'anim-wave-diffraction': {
    title: '波的衍射',
    knowledgeId: 'vibration-2-2',
    Component: lazy(() => import('@/features/vibration/wave/WaveDiffractionAnimation')),
    CenterExtra: lazy(() => import('@/features/vibration/wave/WaveDiffractionCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed' as const,
    maxTime: 60,
    defaultParams: {
      d: 8,
      lambda: 4,
      A: 1,
      showProbe: 1,
    } as const,
    paramMeta: [
      {
        key: 'd',
        label: '缝宽 d',
        min: 1,
        max: 20,
        step: 0.5,
        unit: 'cm',
        group: '狭缝',
        importance: 'core',
        marks: [{ value: 4, label: 'd=λ₀', variant: 'critical' }],
      },
      {
        key: 'lambda',
        label: '波长 λ',
        min: 1,
        max: 12,
        step: 0.5,
        unit: 'cm',
        group: '入射波',
        importance: 'core',
      },
      {
        key: 'A',
        label: '振幅 A',
        min: 0.3,
        max: 2,
        step: 0.1,
        unit: '',
        group: '入射波',
        importance: 'display',
      },
    ],
    controlMeta: [
      {
        type: 'toggle',
        key: 'showProbe',
        label: '显示能量探针线',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        content:
          '当缝宽 $d$ 接近或小于波长 $\\lambda$ 时，衍射最明显；右侧 $I(y)$ 曲线随之展宽。',
      },
    ],
  },

  'anim-wave-interference': {
    title: '波的干涉',
    knowledgeId: 'vibration-2-2',
    Component: lazy(() => import('@/features/vibration/wave/WaveInterferenceAnimation')),
    CenterExtra: lazy(() => import('@/features/vibration/wave/WaveInterferenceCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed' as const,
    maxTime: 60,
    defaultParams: {
      a: 12,
      lambda: 5,
      A: 1,
      showNodes: 1,
      showDelta: 0,
    } as const,
    paramMeta: [
      {
        key: 'a',
        label: '双源间距 a',
        min: 4,
        max: 24,
        step: 0.5,
        unit: 'cm',
        group: '波源',
        importance: 'core',
      },
      {
        key: 'lambda',
        label: '波长 λ',
        min: 2,
        max: 12,
        step: 0.5,
        unit: 'cm',
        group: '入射波',
        importance: 'core',
      },
      {
        key: 'A',
        label: '振幅 A',
        min: 0.3,
        max: 2,
        step: 0.1,
        unit: '',
        group: '入射波',
        importance: 'display',
      },
    ],
    controlMeta: [
      {
        type: 'toggle',
        key: 'showNodes',
        label: '显示加强/减弱示意线',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'toggle',
        key: 'showDelta',
        label: '显示程差 δ 标注',
        group: '显示辅助',
        trueValue: 1,
        falseValue: 0,
      },
      {
        type: 'tip',
        group: '教学提示',
        content:
          '相干条件：频率相同、相位差恒定。程差 $\\delta=n\\lambda$ 加强，$\\delta=(n+1/2)\\lambda$ 减弱。',
      },
    ],
  },
  'anim-doppler-effect': {
    title: '多普勒效应',
    knowledgeId: 'vibration-2-3',
    Component: lazy(() => import('@/features/vibration/doppler')),
    controlsMode: 'timed',
    defaultParams: {
      mode: 0,
      waveSpeed: 340,
      sourceSpeed: 100,
      frequency: 10,
      observerSpeed: 0,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '相对运动模型',
        resetOnChange: true,
        options: [
          { value: 0, label: '波源运动' },
          { value: 1, label: '观察者运动' },
          { value: 2, label: '超音速激波' },
        ],
      },
      {
        type: 'preset',
        label: '🚂 鸣笛列车呼啸驶过',
        group: '快捷预设',
        params: () => ({ mode: 0, waveSpeed: 340, sourceSpeed: 100, frequency: 10, observerSpeed: 0 }),
      },
      {
        type: 'preset',
        label: '🚄 乘客迎面驶向广播',
        group: '快捷预设',
        params: () => ({ mode: 1, waveSpeed: 340, sourceSpeed: 0, frequency: 10, observerSpeed: 70 }),
      },
      {
        type: 'preset',
        label: '✈️ 战机超音速马赫锥',
        group: '快捷预设',
        params: () => ({ mode: 2, waveSpeed: 340, sourceSpeed: 450, frequency: 10, observerSpeed: 0 }),
      },
      {
        type: 'tip',
        group: '观察指引',
        variant: 'info',
        content:
          '观察重点：波源运动压缩前方波长（λ 变小）；观察者运动波长不变，单位时间接收波峰增多导致接收频率升高。',
      },
    ],
    paramMeta: [
      { key: 'sourceSpeed', label: '波源速度 vs', min: 0, max: 300, step: 20, unit: 'm/s', showIf: 'mode', showIfValue: 0 },
      { key: 'waveSpeed', label: '介质波速 v', min: 200, max: 400, step: 20, unit: 'm/s' },
      { key: 'frequency', label: '波源固有频率 f₀', min: 5, max: 20, step: 1, unit: 'Hz' },
      { key: 'observerSpeed', label: '观察者速度 vo', min: -100, max: 100, step: 10, unit: 'm/s', showIf: 'mode', showIfValue: 1 },
    ],
  },
  'anim-forced-resonance': {
    title: '受迫振动与共振',
    knowledgeId: 'vibration-1-3',
    Component: lazy(() => import('@/features/vibration/forced-resonance')),
    CenterExtra: lazy(() => import('@/features/vibration/forced-resonance/ForcedResonanceCenterExtra')),
    centerLayout: 'splitH',
    controlsMode: 'timed',
    maxTime: 20,
    defaultParams: {
      mode: 1,
      m: 1.0,
      k: 39.5,
      gamma: 0.85,
      F0: 2.0,
      f: 1.0,
      showForces: 1,
    } as const,
    controlMeta: [
      // 1. 探究主题（置顶，选择实验模式）
      {
        type: 'segmented',
        key: 'mode',
        label: '探究主题',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '衰减到稳定' },
          { value: 1, label: '共振曲线' },
          { value: 2, label: '不同阻尼' },
        ],
      },
      // 2. 显示选项（辅助矢量开关）
      {
        type: 'toggle',
        key: 'showForces',
        label: '受力矢量分析 (弹力/阻力/驱动力)',
        group: '显示选项',
      },
      // 3. 典型物理情境预设（纯净紧凑按钮，无冗长卡片占用空间）
      {
        type: 'preset',
        label: '⚡ 强烈共振 (f = f₀ = 1.0Hz)',
        group: '典型物理情境',
        restartOnApply: true,
        params: () => ({ mode: 1, m: 1.0, k: 39.5, gamma: 0.6, F0: 2.0, f: 1.0, showForces: 1 }),
      },
      {
        type: 'preset',
        label: '🔄 低频随动 (f = 0.5Hz < f₀)',
        group: '典型物理情境',
        restartOnApply: true,
        params: () => ({ mode: 1, m: 1.0, k: 39.5, gamma: 0.5, F0: 2.0, f: 0.5, showForces: 1 }),
      },
      {
        type: 'preset',
        label: '🛡️ 高频避振 (f = 2.2Hz >> f₀)',
        group: '典型物理情境',
        restartOnApply: true,
        params: () => ({ mode: 1, m: 1.0, k: 39.5, gamma: 0.6, F0: 2.0, f: 2.2, showForces: 1 }),
      },
      {
        type: 'preset',
        label: '🏭 共振筛增重调频 (m: 1.0→1.6kg)',
        group: '典型物理情境',
        restartOnApply: true,
        params: () => ({ mode: 1, m: 1.6, k: 39.5, gamma: 0.45, F0: 2.4, f: 0.79, showForces: 1 }),
      },
      // 4. 探究指引（原 196 字「工况条件与观察重点」四条结论表已压缩：
      //    f 与 f₀ 的大小关系预设标签本身已写明，振幅峰/谷属结论（§2.6.5 C1/C3），右屏共振曲线给出）
      {
        type: 'tip',
        group: '实验探究指引',
        content:
          '三个预设只差驱动频率 f：等于 f₀、低于 f₀、远高于 f₀ 各放一次，只盯振幅读数与相位差的变化。改 m 会挪动 f₀，注意共振条件是否还成立。',
      },
    ],
    paramMeta: [
      {
        key: 'f',
        label: '驱动频率 f',
        description: '偏心轮电机驱动频率。系统固有频率 f₀ = 1/(2π)√(k/m)',
        min: 0.2,
        max: 2.4,
        step: 0.05,
        unit: 'Hz',
        marks: [
          { value: 1.0, label: '固有频率 f₀ (m=1kg)', variant: 'critical' },
          { value: 2.2, label: '高频避振区' },
        ],
      },
      { key: 'F0', label: '驱动力幅值 F0', min: 0.5, max: 5.0, step: 0.5, unit: 'N' },
      { key: 'm', label: '振子质量 m', description: '增大 m 将降低固有频率 f₀', min: 0.5, max: 2.5, step: 0.1, unit: 'kg' },
      { key: 'k', label: '弹簧劲度 k', min: 10, max: 80, step: 5, unit: 'N/m' },
      { key: 'gamma', label: '介质阻力系数 γ', description: '阻力越小共振峰越尖锐；阻力越大共振峰越平缓', min: 0.1, max: 1.5, step: 0.05, unit: 'N·s/m' },
    ],
  },
})

