import type { PhysicsPanelData } from '../types'

export function buildMechanicsExperimentBaseQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData | null {
  const mode = Number(params.mode || 0)
  const v0 = Number(params.v0 ?? 1.0)
  const a = Number(params.a ?? 1.5)
  const freq = Number(params.freq ?? 50)
  const d = Number(params.d ?? 0.01)
  const k = Number(params.k ?? 100)
  const m = Number(params.m ?? 0.2)

  const T = 1 / Math.max(1, freq)
  const v = v0 + a * time
  const x = v0 * time + 0.5 * a * time * time

  if (mode === 0) {
    // 模式 0: 打点纸带分析
    return {
      quantities: [
        { label: '打点周期', symbol: 'T', value: parseFloat(T.toFixed(3)), unit: 's' },
        { label: '实时速度', symbol: 'v', value: parseFloat(v.toFixed(2)), unit: 'm/s' },
        { label: '实时位移', symbol: 'x', value: parseFloat(x.toFixed(2)), unit: 'm' },
        { label: '设定加速度', symbol: 'a', value: parseFloat(a.toFixed(2)), unit: 'm/s²' },
      ],
      formulas: [
        {
          name: '逐差法求加速度',
          latex: 'a = \\frac{(x_6 - x_3) - (x_3 - x_0)}{9T^2}',
          level: 'core',
          condition: '匀变速直线运动打点纸带',
        },
        {
          name: '中间时刻瞬时速度',
          latex: 'v_n = \\frac{x_n + x_{n+1}}{2T}',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        { text: '区分连续相等时间间隔内的位移差 Δx = aT²', importance: 'gaokao' },
        { text: '逐差法可减小实验偶发误差，避免首尾点测量误差放大', importance: 'gaokao' },
      ],
    }
  }

  if (mode === 1) {
    // 模式 1: 光电门测速
    const v1 = Math.sqrt(Math.max(0, v0 * v0 + 2 * a * 0.3))
    const dt1Ms = (d / Math.max(0.01, v1)) * 1000

    return {
      quantities: [
        { label: '遮光宽度', symbol: 'd', value: d, unit: 'm' },
        { label: '光电门A遮光时间', symbol: 'Δt1', value: parseFloat(dt1Ms.toFixed(2)), unit: 'ms' },
        { label: '光电门A测得速度', symbol: 'v1', value: parseFloat(v1.toFixed(2)), unit: 'm/s' },
      ],
      formulas: [
        {
          name: '极短时间平均速度替代瞬时速度',
          latex: 'v = \\frac{d}{\\Delta t}',
          level: 'core',
          condition: 'd 远小于运动总位移',
        },
        {
          name: '光电门测加速度',
          latex: 'v_2^2 - v_1^2 = 2as',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        { text: '遮光条越窄，极短时间内的平均速度越接近瞬时速度', importance: 'gaokao' },
        { text: '光电门系统常结合气垫导轨进行动量守恒与动能定理验证', importance: 'gaokao' },
      ],
    }
  }

  // 模式 2: 胡克定律探究
  const F = m * 9.8
  const deltaX = F / Math.max(1, k)

  return {
    quantities: [
      { label: '钩码重力', symbol: 'G/F', value: parseFloat(F.toFixed(2)), unit: 'N' },
      { label: '弹簧劲度系数', symbol: 'k', value: k, unit: 'N/m' },
      { label: '弹簧伸长量', symbol: 'Δx', value: parseFloat(deltaX.toFixed(3)), unit: 'm' },
    ],
    formulas: [
      {
        name: '胡克定律',
        latex: 'F = k \\Delta x',
        level: 'core',
        condition: '弹性限度内',
      },
    ],
    gaokaoPoints: [
      { text: 'F-Δx 图线的斜率即为弹簧的劲度系数 k', importance: 'gaokao' },
      { text: '注意区分弹簧的总长度 L 与伸长量 Δx = L - L0', importance: 'gaokao' },
    ],
  }
}
