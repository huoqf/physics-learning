import { GRAVITY, getVSStateAtTime, precomputeVerticalSpringTrajectory } from '@/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function buildVerticalSpringQuantities(
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[] = [],
): PhysicsPanelData {
  const m = params.m ?? 0.5
  const k = params.k ?? 50
  const h = params.h ?? 0.8
  const g = GRAVITY
  const mode = params.mode ?? 0

  const trajectory = precomputeVerticalSpringTrajectory(m, k, h, g, 15, 0.02, mode)
  const state = getVSStateAtTime(trajectory, time)
  const xEq = (m * g) / k
  const displayX = mode === 1 ? state.x : Math.max(0, state.x)

  // 根据当前位移 x 与平衡位置 xEq 动态推导运动方程；统一取向下为正。
  let equation = mode === 1 ? 'mg - kx = ma（向下为正）' : 'mg = ma（未接触弹簧）'
  let eqHighlight: 'positive' | 'negative' | 'zero' | 'extreme' | undefined = undefined

  if (mode === 0 && state.x < -0.001) {
    equation = 'mg = ma（自由落体，向下加速）'
    eqHighlight = 'positive'
  } else if (state.x >= -0.001 && state.x < xEq - 0.002) {
    equation = 'mg - kx = ma（F合向下）'
    eqHighlight = 'positive'
  } else if (Math.abs(state.x - xEq) <= 0.002) {
    equation = 'mg - kx_C = 0（a = 0, v = vmax）'
    eqHighlight = 'extreme'
  } else {
    equation = 'kx - mg = -ma（F合向上）'
    eqHighlight = 'negative'
  }

  return {
    quantities: [
      ...base,
      { label: '当前运动方程', value: equation, unit: '', highlight: eqHighlight },
      { label: '瞬时合外力', symbol: 'F合', value: state.F_net, unit: 'N', highlight: state.F_net === 0 ? 'zero' as const : state.F_net < 0 ? 'negative' as const : undefined },
      { label: '瞬时动能', symbol: 'Ek', value: state.Ek, unit: 'J', highlight: 'positive' as const },
      { label: '弹簧弹力', symbol: 'F弹', value: state.F_spring, unit: 'N', highlight: state.F_spring > 0.05 ? 'positive' as const : undefined },
      { label: '瞬时速度', symbol: 'v', value: state.v, unit: 'm/s', highlight: state.v > 0.05 ? 'positive' as const : state.v < -0.05 ? 'negative' as const : 'zero' as const },
      { label: mode === 1 ? '弹簧伸长量' : '弹簧形变量', symbol: 'x', value: displayX, unit: 'm', highlight: displayX > 0.001 ? 'positive' as const : 'zero' as const },
    ],
    formulas: mode === 1 ? [
      { name: '挂球动力学方程', latex: 'mg-kx=ma', condition: '取向下为正，x为弹簧伸长量', level: 'core' },
      { name: '平衡位置 C', latex: 'kx_C=mg \\implies x_C=\\frac{mg}{k}', level: 'core', note: '速度和动能在此处最大' },
      { name: '最低点 D', latex: 'x_D=2x_C=\\frac{2mg}{k}', condition: '从原长处静止释放', level: 'important' },
      { name: '能量守恒', latex: 'mgx=\\frac12mv^2+\\frac12kx^2', condition: '从原长释放到伸长量为x的位置', level: 'core' },
    ] : [
      { name: '触网前自由落体', latex: 'mg=ma \\implies a=g', condition: 'A→B，尚未接触弹簧', level: 'important' },
      { name: '触网至平衡位置', latex: 'mg-kx=ma', condition: 'B→C，0\\le x<x_C', level: 'core', note: '合外力向下但逐渐减小，速度继续增大' },
      { name: '平衡位置 C', latex: 'kx_C=mg \\implies a=0,\\;v=v_{\\max}', level: 'core', note: '此时速度及动能达到最大' },
      { name: '最低点 D 能量方程', latex: 'mg(h+x_D)=\\frac12kx_D^2', condition: 'D点速度为0，弹簧压缩最大', level: 'important' },
      { name: '过平衡点至最低点', latex: 'kx-mg=m|a|', condition: 'C→D，x_C<x\\le x_D', level: 'core', note: '合外力向上，速度减小' },
    ],
    gaokaoPoints: [
      { text: mode === 1 ? '【速度最大点】挂球从原长释放后，速度与动能最大的位置仍在平衡位置 C（mg = kx），不是最低点 D。' : '【速度最大点误区】小球速度与动能最大的位置在平衡位置 C（mg = kx），而非刚接触弹簧的 B 点。', importance: 'hard' as const },
      { text: mode === 1 ? '【对称结论】从原长静止释放时，最低点 D 满足 x_D = 2mg/k，D点弹力为2mg。' : '【极值独立性】改变初始下落高度 h，小球最大速度所处平衡位置 C 的弹簧形变量（mg/k）保持不变。', importance: 'extend' as const },
    ],
  }
}
