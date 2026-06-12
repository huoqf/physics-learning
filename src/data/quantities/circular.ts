import { calculateCircularMotion } from '../../physics'
import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from './types'

export function buildCircularQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-circular-motion': {
      const r = params.r ?? 2
      const omega = params.omega ?? 1
      const advancedMode = params.advancedMode ?? 0
      const { x, y, v, a_c, period } = calculateCircularMotion(r, omega, time)

      const isAdvanced = advancedMode === 1

      const quantities = [
        ...base,
        { label: '线速度 v', value: v.toFixed(2), unit: 'm/s' },
        ...(isAdvanced
          ? [
              { label: '水平坐标 x', value: x.toFixed(2), unit: 'm' },
              { label: '竖直坐标 y', value: y.toFixed(2), unit: 'm' },
              { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' },
            ]
          : []),
        { label: '周期 T', value: period.toFixed(2), unit: 's' },
      ]

      const formulas: Formula[] = isAdvanced
        ? [
            { name: '位置方程 x', latex: 'x = r \\cos(\\omega t)', level: 'important' },
            { name: '位置方程 y', latex: 'y = r \\sin(\\omega t)', level: 'important' },
            { name: '向心加速度', latex: 'a_n = \\omega^2 r = \\frac{v^2}{r}', level: 'core' },
          ]
        : [
            { name: '线速度与角速度', latex: 'v = \\omega r', level: 'core' },
            { name: '周期公式', latex: 'T = \\frac{2\\pi}{\\omega}', level: 'core' },
          ]

      const gaokaoPoints: GaokaoPoint[] = isAdvanced
        ? [
            { text: '简谐运动投影：匀速圆周运动在直径方向上的投影是标准的简谐运动。', importance: 'gaokao' as const },
            { text: '向心力做功：向心力与速度时刻垂直，因此向心力对旋转物体做功恒为零。', importance: 'hard' as const },
            { text: '速度与加速度的方向：线速度沿切线，向心加速度指向圆心，二者大小不变、方向改变。', importance: 'core' as const },
          ]
        : [
            { text: '非匀变速运动：匀速圆周运动的速度大小不变但方向时刻在变，因而它是变速运动。', importance: 'core' as const },
            { text: '向心力的作用：匀速圆周运动的合外力（向心力）只改变速度的方向，不改变速度的大小。', importance: 'basic' as const },
          ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-centripetal': {
      const r = params.r ?? 2
      const v = params.v ?? 3
      const m = params.m ?? 1
      const advancedMode = params.advancedMode ?? 0

      const omega = v / r
      const a_c = (v * v) / r
      const F_c = m * a_c
      const T = (2 * Math.PI * r) / v

      const isAdvanced = advancedMode === 1

      const quantities = [
        ...base,
        { label: '角速度 ω', value: omega.toFixed(2), unit: 'rad/s' },
        { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' },
        ...(isAdvanced
          ? [
              { label: '向心力 F_n', value: F_c.toFixed(2), unit: 'N' },
            ]
          : []),
        { label: '周期 T', value: T.toFixed(2), unit: 's' },
      ]

      const formulas: Formula[] = isAdvanced
        ? [
            { name: '向心力大小', latex: 'F_n = m a_n = m \\frac{v^2}{r} = m \\omega^2 r', level: 'core' },
            { name: '向心力矢量', latex: '\\vec{F}_n = -m \\omega^2 \\vec{r}', level: 'derived' },
          ]
        : [
            { name: '向心加速度', latex: 'a_n = \\frac{v^2}{r} = \\omega^2 r', level: 'core' },
            { name: '线速度与周期', latex: 'v = \\frac{2\\pi r}{T}', level: 'core' },
          ]

      const gaokaoPoints: GaokaoPoint[] = isAdvanced
        ? [
            { text: '向心力来源：向心力是效果力，受力分析中绝对不能额外画出向心力，它只能由重力、弹力、摩擦力等其他力或它们的合力提供。', importance: 'gaokao' as const },
            { text: '做功特性：向心力由于方向与速度时刻垂直，因此对做圆周运动的物体做功恒为零（不做功）。', importance: 'hard' as const },
            { text: '动力学核心：向心加速度与向心力满足牛顿第二定律，即 F_n = m · a_n。', importance: 'core' as const },
          ]
        : [
            { text: '速度与加速度的方向：线速度沿轨迹切线，向心加速度指向圆心，二者大小不变、方向在时刻改变。', importance: 'core' as const },
            { text: '向心力的作用：向心力不改变速度的大小（不改变物体的动能），仅仅改变速度的方向。', importance: 'basic' as const },
          ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    default:
      return null
  }
}
