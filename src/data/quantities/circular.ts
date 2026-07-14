import {
  calculateCircularMotion,
  calculateConicalPendulumState,
  calculateDiskRotationState,
  precomputeVerticalCircularMotion,
} from '../../physics'
import { GRAVITY } from '../../physics/constants'
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

        // 运动学加速度分解计算
        const g = GRAVITY
        let a_xiang = 0
        let a_qie = 0
        let a_he = 0

        if (pt.state === 'on-track') {
          a_xiang = (currentV * currentV) / r
          a_qie = Math.abs(g * Math.sin(pt.theta))
          a_he = Math.sqrt(a_xiang * a_xiang + a_qie * a_qie)
        } else {
          a_xiang = 0
          a_qie = 0
          a_he = g
        }

        quantities = [
          { label: '最低点初速 v₀', value: v0.toFixed(2), unit: 'm/s' },
          { label: '脱轨临界初速', value: vSwingLimit.toFixed(2), unit: 'm/s' },
          { label: '通轨临界初速', value: vLoopLimit.toFixed(2), unit: 'm/s' },
          { label: '当前速度 v', value: currentV.toFixed(2), unit: 'm/s' },
          { label: '向心加速度 a_向', value: a_xiang.toFixed(2), unit: 'm/s²' },
          { label: '切向加速度 a_切', value: a_qie.toFixed(2), unit: 'm/s²' },
          { label: '合加速度 a_合', value: a_he.toFixed(2), unit: 'm/s²' },
          {
            label: trackType === 0 ? '绳拉力 T' : '杆/轨道约束力 N',
            value: pt.state === 'flying'
              ? '0.00'
              : `${(trackType === 0 ? Math.max(0, pt.N) : pt.N).toFixed(2)} ${pt.N > 0.01 ? '(向心拉/压)' : pt.N < -0.01 ? '(离心支/推)' : ''}`,
            unit: 'N'
          },
          { label: '运动状态', value: pt.state === 'on-track' ? '轨道滑动' : '脱轨飞行', unit: '' }
        ]

        formulas = [
          { name: '一般法向方程（θ自最低点起算）', latex: 'N = m\\frac{v^2}{r} + mg\\cos\\theta', level: 'core' },
          { name: '最低点约束力', latex: 'N_{\\text{lowest}} = mg + m\\frac{v_0^2}{r}', level: 'core' },
          { name: '最高点约束力', latex: 'N_{\\text{top}} = m\\frac{v^2}{r} - mg', level: 'core' },
          { name: '最高点临界速度 (绳模型)', latex: 'v_{\\min} = \\sqrt{gr}', level: 'important' }
        ]

        gaokaoPoints = [
          { text: '绳模型与杆模型：绳模型约束力为拉力 T，必须 T≥0，最高点临界速度为 v = √gr；杆模型对小球可拉可撑，在最高点通过的能量临界条件为 v > 0。', importance: 'gaokao' as const },
          { text: '弹力方向判定：在杆模型中，最高点速度 v > √gr 时受到向下的拉力；当 v < √gr 时受到向上的支撑力；v = √gr 时不受弹力。', importance: 'hard' as const },
          { text: '超重与失重：最低点是约束力最大的地方，处于超重状态，公式为 N = mg + mv²/r。', importance: 'core' as const },
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
          { label: '向心加速度 a_向', value: a_c.toFixed(2), unit: 'm/s²' },
          { label: '向心力 F_向', value: F_c.toFixed(2), unit: 'N' },
          { label: '周期 T', value: T.toFixed(2), unit: 's' }
        ]

        formulas = [
          { name: '向心力大小', latex: 'F_{\\text{向}} = m a_{\\text{向}} = m \\frac{v^2}{r} = m \\omega^2 r', level: 'core' },
          { name: '向心加速度', latex: 'a_{\\text{向}} = \\frac{v^2}{r} = \\omega^2 r', level: 'core' },
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
    case 'anim-vertical-circular': {
      // 竖直圆模型 — 无条件走竖直圆轨道动力学（无 advancedMode 分支）
      const r = params.r ?? 3
      const v0 = params.v0 ?? 5
      const m = params.m ?? 1
      const trackType = params.trackType ?? 0

      const { trajectory, vSwingLimit, vLoopLimit } = precomputeVerticalCircularMotion(r, v0, m, trackType, Math.max(30, time + 1))
      const idx = Math.round(time / 0.002)
      const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
      const pt = trajectory[clamped]
      const currentV = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy)

      const g = GRAVITY
      let a_xiang = 0
      let a_qie = 0
      let a_he = 0

      if (pt.state === 'on-track') {
        a_xiang = (currentV * currentV) / r
        a_qie = Math.abs(g * Math.sin(pt.theta))
        a_he = Math.sqrt(a_xiang * a_xiang + a_qie * a_qie)
      } else {
        a_xiang = 0
        a_qie = 0
        a_he = g
      }

      const quantities: PhysicsQuantity[] = [
        { label: '最低点初速 v₀', value: v0.toFixed(2), unit: 'm/s' },
        { label: '脱轨临界初速', value: vSwingLimit.toFixed(2), unit: 'm/s' },
        { label: '通轨临界初速', value: vLoopLimit.toFixed(2), unit: 'm/s' },
        { label: '当前速度 v', value: currentV.toFixed(2), unit: 'm/s' },
        { label: '向心加速度 a_向', value: a_xiang.toFixed(2), unit: 'm/s²' },
        { label: '切向加速度 a_切', value: a_qie.toFixed(2), unit: 'm/s²' },
        { label: '合加速度 a_合', value: a_he.toFixed(2), unit: 'm/s²' },
        {
          label: trackType === 0 ? '绳拉力 T' : '杆/轨道约束力 N',
          value: pt.state === 'flying'
            ? '0.00'
            : `${(trackType === 0 ? Math.max(0, pt.N) : pt.N).toFixed(2)} ${pt.N > 0.01 ? '(向心拉/压)' : pt.N < -0.01 ? '(离心支/推)' : ''}`,
          unit: 'N'
        },
        { label: '运动状态', value: pt.state === 'on-track' ? '轨道滑动' : '脱轨飞行', unit: '' }
      ]

      const formulas: Formula[] = [
        { name: '一般法向方程（θ自最低点起算）', latex: 'N = m\\frac{v^2}{r} + mg\\cos\\theta', level: 'core' },
        { name: '最低点约束力', latex: 'N_{\\text{lowest}} = mg + m\\frac{v_0^2}{r}', level: 'core' },
        { name: '最高点约束力', latex: 'N_{\\text{top}} = m\\frac{v^2}{r} - mg', level: 'core' },
        { name: '最高点临界速度 (绳模型)', latex: 'v_{\\min} = \\sqrt{gr}', level: 'important' }
      ]

      const gaokaoPoints: GaokaoPoint[] = [
        { text: '绳模型与杆模型：绳模型约束力为拉力 T，必须 T≥0，最高点临界速度为 v = √gr；杆模型对小球可拉可撑，在最高点通过的能量临界条件为 v > 0。', importance: 'gaokao' as const },
        { text: '弹力方向判定：在杆模型中，最高点速度 v > √gr 时受到向下的拉力；当 v < √gr 时受到向上的支撑力；v = √gr 时不受弹力。', importance: 'hard' as const },
        { text: '超重与失重：最低点是约束力最大的地方，处于超重状态，公式为 N = mg + mv²/r。', importance: 'core' as const },
        { text: '合外力与向心力：竖直平面圆周运动的合外力包括法向的向心力和切向力。向心力是效果力，改变速度方向；切向力改变速度大小。在受力分析中，绝不能将向心力或合外力作为独立的性质力画出。', importance: 'core' as const }
      ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-circular-models': {
      const mode = params.modelMode ?? 0
      const omega = params.omega ?? 3
      const length = params.L ?? 1
      const radius = params.r ?? 0.8
      const mu = params.mu ?? 0.4
      const mass = 1
      const isConical = mode === 0

      if (isConical) {
        const state = calculateConicalPendulumState(omega, length, mass)
        return {
          quantities: [
            { label: '摆角 θ', value: state.thetaDeg.toFixed(1), unit: '°' },
            { label: '旋转半径 r', value: state.radius.toFixed(2), unit: 'm' },
            { label: '向心力 Fn', value: state.centripetalForce.toFixed(2), unit: 'N' },
            { label: '最低稳定角速度', value: state.minOmega.toFixed(2), unit: 'rad/s' },
            { label: '运动状态', value: state.stable ? '稳定圆锥摆' : '转速不足', unit: '' },
          ],
          formulas: [
            { name: '竖直方向平衡', latex: 'T\\cos\\theta = mg', level: 'core' },
            { name: '水平方向提供向心力', latex: 'T\\sin\\theta = m\\omega^2 r', level: 'core' },
            { name: '合外力形式', latex: 'F_{\\text{合}} = mg\\tan\\theta = m\\omega^2 r', level: 'core' },
            { name: '摆角与转速', latex: '\\cos\\theta = \\frac{g}{\\omega^2 L}', condition: '\\omega \\ge \\sqrt{g/L}', level: 'important' },
          ],
          gaokaoPoints: [
            { text: '圆锥摆中，拉力的水平分量提供向心力，竖直分量与重力平衡。', importance: 'core' as const },
            { text: 'r = Lsinθ，不要把 r 当作与 θ 无关的独立量。', importance: 'gaokao' as const },
            { text: '受力图中只画重力和拉力，不额外画“向心力”。', importance: 'gaokao' as const },
          ],
          warnings: state.stable ? undefined : [
            { text: '当前 ω 小于 √(g/L)，非零摆角圆锥摆不稳定。', level: 'warning' as const },
          ],
        }
      }

      const state = calculateDiskRotationState(omega, radius, mu, mass)
      return {
        quantities: [
          { label: '所需向心力 Fn', value: state.requiredForce.toFixed(2), unit: 'N' },
          { label: '最大静摩擦力 fmax', value: state.maxStaticFriction.toFixed(2), unit: 'N' },
          { label: '临界角速度 ωcrit', value: state.criticalOmega.toFixed(2), unit: 'rad/s' },
          { label: '静摩擦利用率', value: `${Math.round(state.frictionRatio * 100)}`, unit: '%' },
          { label: '运动状态', value: state.slipping ? '相对圆盘滑动' : '随圆盘转动', unit: '' },
        ],
        formulas: [
          { name: '静摩擦力提供向心力', latex: 'f = m\\omega^2 r', level: 'core' },
          { name: '最大静摩擦力', latex: 'f_{\\max} = \\mu mg', level: 'core' },
          { name: '临界条件', latex: '\\mu mg = m\\omega_{\\text{crit}}^2 r', level: 'important' },
          { name: '临界角速度', latex: '\\omega_{\\text{crit}} = \\sqrt{\\frac{\\mu g}{r}}', level: 'core' },
        ],
        gaokaoPoints: [
          { text: '圆盘模型中，指向圆心的静摩擦力提供向心力。', importance: 'core' as const },
          { text: '超过最大静摩擦力后，在圆盘参考系中表现为向外滑动。', importance: 'gaokao' as const },
          { text: '临界角速度与质量无关，质量会在方程两边约掉。', importance: 'hard' as const },
        ],
        warnings: state.slipping ? [
          { text: '所需向心力已超过最大静摩擦力，不能继续保持相对圆盘静止。', level: 'danger' as const },
        ] : undefined,
      }
    }
    default:
      return null
  }
}
