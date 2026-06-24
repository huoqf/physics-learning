import { calculateCircularMotion, precomputeVerticalCircularMotion } from '../../physics'
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
      const r = params.r ?? 3
      const v = params.v ?? 3
      const v0 = params.v0 ?? 5
      const m = params.m ?? 1
      const advancedMode = params.advancedMode ?? 0
      const trackType = params.trackType ?? 0

      const isAdvanced = advancedMode === 1

      let quantities: PhysicsQuantity[] = []
      let formulas: Formula[] = []
      let gaokaoPoints: GaokaoPoint[] = []

      if (isAdvanced) {
        // 进阶模式：竖直圆轨道动力学
        const { trajectory, vSwingLimit, vLoopLimit } = precomputeVerticalCircularMotion(r, v0, m, trackType, Math.max(30, time + 1))
        const idx = Math.round(time / 0.002)
        const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
        const pt = trajectory[clamped]
        const currentV = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy)

        quantities = [
          { label: '最低点初速 v₀', value: v0.toFixed(2), unit: 'm/s' },
          { label: '脱轨临界初速', value: vSwingLimit.toFixed(2), unit: 'm/s' },
          { label: '通轨临界初速', value: vLoopLimit.toFixed(2), unit: 'm/s' },
          { label: '当前速度 v', value: currentV.toFixed(2), unit: 'm/s' },
          {
            label: '轨道支持力 N',
            value: pt.state === 'flying'
              ? '0.00'
              : `${Math.abs(pt.N).toFixed(2)} ${pt.N > 0.01 ? '(向心拉/压)' : pt.N < -0.01 ? '(离心支/推)' : ''}`,
            unit: 'N'
          },
          { label: '运动状态', value: pt.state === 'on-track' ? '轨道滑动' : '脱轨飞行', unit: '' }
        ]

        formulas = [
          { name: '最低点支持力', latex: 'F_{N,\\text{lowest}} = mg + m\\frac{v_0^2}{r}', level: 'core' },
          { name: '等高点支持力', latex: 'F_N = m\\frac{v^2}{r}', level: 'core' },
          { name: '最高点支持力', latex: 'F_N = m\\frac{v^2}{r} - mg', level: 'core' },
          { name: '最高点临界速度 (绳模型)', latex: 'v_{\\min} = \\sqrt{gr}', level: 'important' }
        ]

        gaokaoPoints = [
          { text: '绳模型与杆模型：绳模型在最高点支持力（拉力）必须大于等于零，临界速度为 v = √gr；杆模型对小球可拉可撑，在最高点通过的临界条件仅为 v > 0。', importance: 'gaokao' as const },
          { text: '弹力方向判定：在杆模型中，最高点速度 v > √gr 时受到向下的拉力；当 v < √gr 时受到向上的支撑力；v = √gr 时不受弹力。', importance: 'hard' as const },
          { text: '超重与失重：最低点是小球受轨支持力最大的地方，处于超重状态，公式为 F_N = mg + mv²/r。', importance: 'core' as const },
          { text: '合外力与向心力：竖直平面圆周运动的合外力包括法向的向心力和切向力。向心力是效果力，改变速度方向；切向力改变速度大小。在受力分析中，绝不能将向心力或合外力作为独立的性质力画出。', importance: 'core' as const }
        ]
      } else {
        // 基础模式：匀速圆周运动
        const omega = v / r
        const a_c = (v * v) / r
        const F_c = m * a_c
        const T = (2 * Math.PI * r) / v

        quantities = [
          ...base,
          { label: '线速度 v', value: v.toFixed(2), unit: 'm/s' },
          { label: '角速度 ω', value: omega.toFixed(2), unit: 'rad/s' },
          { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' },
          { label: '向心力 F_n', value: F_c.toFixed(2), unit: 'N' },
          { label: '周期 T', value: T.toFixed(2), unit: 's' }
        ]

        formulas = [
          { name: '向心力大小', latex: 'F_n = m a_n = m \\frac{v^2}{r} = m \\omega^2 r', level: 'core' },
          { name: '向心加速度', latex: 'a_n = \\frac{v^2}{r} = \\omega^2 r', level: 'core' },
          { name: '线速度与周期', latex: 'v = \\frac{2\\pi r}{T}', level: 'core' }
        ]

        gaokaoPoints = [
          { text: '向心力来源：向心力是效果力，受力分析中绝对不能额外画出向心力，它只能由重力、弹力、摩擦力等其他力或它们的合力提供。', importance: 'gaokao' as const },
          { text: '做功特性：向心力由于方向与速度时刻垂直，因此对做圆周运动的物体做功恒为零（不做功）。', importance: 'hard' as const }
        ]
      }

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
