import { solveBasicAmpere, solveAdvancedAmpere } from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { PhysicsPanelData } from '../types'

export function handleMagnetism(animId: string, params: Record<string, any>, time: number, base: PhysicsPanelData['quantities']): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-ampere-force': {
      const mode = params.mode ?? 0
      const B = params.B ?? 1.0
      const I = params.I ?? 2.0
      const L = 4.0 // 有效长度固定为 4.0m
      const m = 0.5 // 质量固定为 0.5kg

      if (mode === 0) {
        // ── 基础模式 ──
        const res = solveBasicAmpere(I, B, L, m, time)
        const fDirText = res.F > 1e-4 ? ' (向右)' : res.F < -1e-4 ? ' (向左)' : ' (为零)'
        
        return {
          quantities: [
            ...base,
            { label: '磁感应强度 B', value: `${Math.abs(B).toFixed(1)}`, unit: `T (${B > 0 ? '垂直纸面向里' : B < 0 ? '垂直纸面向外' : '无磁场'})`, color: PHYSICS_COLORS.magneticField },
            { label: '电流 I', value: `${Math.abs(I).toFixed(1)}`, unit: `A (${I > 0 ? '向上' : I < 0 ? '向下' : '无电流'})`, color: PHYSICS_COLORS.electricCurrent },
            { label: '有效长度 L', value: L.toFixed(1), unit: 'm', color: colors.neutral[500] },
            { label: '安培力 F', value: `${Math.abs(res.F).toFixed(2)}`, unit: `N${fDirText}`, color: PHYSICS_COLORS.lorentzForce, highlight: res.FAbs > 1e-4 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '安培力大小公式', latex: 'F = BIL \\quad (\\vec{B} \\perp \\vec{I})', level: 'core', condition: '当磁场与电流垂直时' },
            { name: '安培力方向判定', latex: '\\vec{F} = I\\vec{L} \\times \\vec{B}', level: 'core', condition: '遵循左手定则' },
          ],
          gaokaoPoints: [
            { text: '【左手定则三维空间判定】伸开左手，使大拇指与四指垂直且在同一平面内，让磁感线穿过手心（B入掌心），四指指向电流方向，大拇指所指即为安培力方向。', importance: 'gaokao' },
            { text: '【三者方向关系】安培力 F 垂直于磁场 B 和电流 I 决定的平面，但 B 和 I 不一定垂直。当 B 与 I 夹角为 θ 时，F = BIL sinθ。', importance: 'core' },
            { text: '【有效长度考点】公式中的 L 指的是"有效长度"，即在磁场中且通电的那段导线在垂直磁场方向的投影长度（对双轨即为导轨间距，而非导体棒总长）。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错点：极易混淆左手定则（判定安培力/洛伦兹力方向）与右手定则（判定感应电流/感应电动势方向）。口诀：左力右感。', level: 'danger' },
            { text: '易错点：忽视电流或磁场方向反向时力的方向变化。电流单向反向，力反向；磁场单向反向，力反向；两者同时反向，力方向保持不变。', level: 'warning' },
          ],
        }
      } else {
        // ── 进阶模式 ──
        const theta = params.theta ?? 30
        const mu = params.mu ?? 0.2
        const res = solveAdvancedAmpere(I, B, theta, mu, L, m, time)
        
        let stateText = '静止平衡'
        if (res.state === 'sliding-up') stateText = '向上滑动'
        if (res.state === 'sliding-down') stateText = '向下滑动'

        let fText = `${Math.abs(res.f).toFixed(2)}`
        let fUnit = 'N'
        if (res.f > 1e-4) fUnit = 'N (沿斜面向上)'
        else if (res.f < -1e-4) fUnit = 'N (沿斜面向下)'
        else fUnit = 'N (为零)'

        return {
          quantities: [
            ...base,
            { label: '安培力 F_安', value: Math.abs(res.F_ampere).toFixed(2), unit: `N (${res.F_ampere > 1e-4 ? '水平向右' : res.F_ampere < -1e-4 ? '水平向左' : '为零'})`, color: PHYSICS_COLORS.lorentzForce },
            { label: '支持力 N', value: res.N.toFixed(2), unit: 'N', color: PHYSICS_COLORS.normalForce },
            { label: '摩擦力 f', value: fText, unit: fUnit, color: PHYSICS_COLORS.friction, highlight: res.state === 'equilibrium' ? undefined : 'extreme' },
            { label: '瞬时加速度 a', value: res.a.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: Math.abs(res.a) > 0.01 ? 'extreme' : 'zero' },
            { label: '导体棒状态', value: stateText, unit: '', highlight: res.state === 'equilibrium' ? 'positive' : 'negative' },
          ],
          formulas: [
            { name: '安培力大小', latex: 'F_{\\text{安}} = BIL', level: 'core' },
            { name: '沿斜面待平衡项', latex: 'R_{\\parallel} = F_{\\text{安}}\\cos\\theta - mg\\sin\\theta', level: 'core', condition: '向上为正' },
            { name: '斜面正压力', latex: 'N = mg\\cos\\theta + F_{\\text{安}}\\sin\\theta', level: 'core', condition: '安培力向右时' },
            { name: '静摩擦平衡条件', latex: '|R_{\\parallel}| \\le \\mu N \\implies f = -R_{\\parallel}', level: 'core' },
            { name: '滑动摩擦与加速度', latex: 'f = -\\mu N \\operatorname{sgn}(R_{\\parallel}) \\implies a = \\frac{R_{\\parallel} + f}{m}', level: 'core', condition: '滑动状态下' },
          ],
          gaokaoPoints: [
            { text: '【受力分析与分解】解决磁场力与斜面平衡问题时，必须画出二维侧视受力图。将各力沿平行于斜面和垂直于斜面两个方向进行正交分解。', importance: 'gaokao' },
            { text: '【静摩擦力的双向性与临界】静摩擦力的方向取决于导体棒的运动趋势。若安培力较小，棒有下滑趋势，摩擦力向上；若安培力较大，棒有上滑趋势，摩擦力向下。临界平衡状态满足 |f| = μN。', importance: 'gaokao' },
            { text: '【特殊临界公式】在无摩擦（μ = 0）或特定简化平衡条件下，常能推导得出简化临界公式 F_安 = mg tanθ，注意该公式不具有通用性，应从基本受力分析入手。', importance: 'core' },
          ],
          warnings: [
            { text: '易错点：极易把安培力的方向画错！当匀强磁场竖直向上/下时，安培力沿水平方向，而非沿斜面方向。务必注意安培力与磁场及电流两两垂直的几何约束。', level: 'danger' },
            { text: '易错点：漏掉正压力中安培力的分量！安培力不仅在沿斜面方向有分力，在垂直斜面方向也有分力，导致正压力 N 发生变化，从而改变了最大静摩擦力 μN。', level: 'danger' },
          ],
        }
      }
    }
    case 'anim-lorentz-force': {
      const mode = params.mode ?? 0
      const v0 = params.v0 ?? 10.0
      const B = params.B ?? 1.0
      const E = params.E ?? 10.0
      const qOverM = params.qOverM ?? 1.0
      const q = params.q ?? 1.0

      if (mode === 0) {
        // 基础模式
        const R = Math.abs(v0 / (q * B))
        const F_lorentz = q * v0 * B

        return {
          quantities: [
            ...base,
            { label: '电荷极性', value: q > 0 ? '正电荷 (+q)' : '负电荷 (-q)', unit: '', highlight: q > 0 ? 'positive' : 'negative' },
            { label: '入射速度 v', value: v0.toFixed(1), unit: 'm/s', color: PHYSICS_COLORS.velocity },
            { label: '磁场强度 B', value: B.toFixed(1), unit: 'T', color: PHYSICS_COLORS.magneticField },
            { label: '洛伦兹力 F_洛', value: Math.abs(F_lorentz).toFixed(2), unit: 'N', color: PHYSICS_COLORS.lorentzForce, highlight: F_lorentz === 0 ? 'zero' : 'extreme' },
            { label: '轨道半径 R', value: R.toFixed(2), unit: 'm', color: '#64748B' },
          ],
          formulas: [
            {
              name: '洛伦兹力大小',
              latex: 'F_{\\text{洛}} = qvB \\quad (\\vec{v} \\perp \\vec{B})',
              level: 'core',
              condition: '当速度与磁场垂直时',
            },
            {
              name: '向心力与半径公式',
              latex: 'qvB = m\\frac{v^2}{R} \\implies R = \\frac{mv}{qB}',
              level: 'core',
            }
          ],
          gaokaoPoints: [
            {
              text: '【洛伦兹力永远不做功】洛伦兹力的方向始终与带电粒子的瞬时速度方向垂直，因此它只改变速度的方向，而不改变速度的大小。',
              importance: 'gaokao',
            },
          ],
          warnings: [
            {
              text: '易错点：应用左手定则判断洛伦兹力方向时，四指指向正电荷的运动方向，对于负电荷，四指应指向运动的反方向（即电流的相反方向）。',
              level: 'danger',
            }
          ]
        }
      } else {
        // 进阶模式
        const v_filter = B > 0.01 ? E / B : 0
        const F_electric = qOverM * E
        const F_lorentz = qOverM * v0 * B
        const isBalanced = Math.abs(v0 - v_filter) < 1e-4

        return {
          quantities: [
            ...base,
            { label: '磁场强度 B', value: B.toFixed(1), unit: 'T', color: PHYSICS_COLORS.magneticField },
            { label: '电场强度 E', value: E.toFixed(1), unit: 'V/m', color: PHYSICS_COLORS.electricField },
            { label: '粒子荷质比 q/m', value: qOverM.toFixed(1), unit: 'C/kg' },
            { label: '过滤速度 v_滤', value: v_filter.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity, highlight: 'extreme' },
            { label: '入射速度 v', value: v0.toFixed(1), unit: 'm/s', color: PHYSICS_COLORS.velocity },
            { label: '电场力/质量 FE/m', value: F_electric.toFixed(2), unit: 'N/kg', color: PHYSICS_COLORS.electricForce },
            { label: '洛伦兹力/质量 FL/m', value: F_lorentz.toFixed(2), unit: 'N/kg', color: PHYSICS_COLORS.lorentzForce },
            { label: '偏转状态', value: isBalanced ? '匀速直线穿出' : (v0 > v_filter ? '洛力主导，向上偏转' : '电场力主导，向下偏转'), unit: '', highlight: isBalanced ? 'positive' : 'negative' }
          ],
          formulas: [
            {
              name: '复合场受力平衡',
              latex: 'F_{\\text{洛}} = F_{\\text{电}} \\implies qvB = qE',
              level: 'core',
              condition: '沿中轴直线穿出时',
            },
            {
              name: '过滤速度公式',
              latex: 'v = \\frac{E}{B}',
              level: 'core',
            }
          ],
          gaokaoPoints: [
            {
              text: '【速度选择器的物理本质】"只选速度，不选电性和质量"。从受力平衡方程 qvB = qE 可知，能够笔直穿出复合场的速度满足 v = E/B。无论是正电荷还是负电荷，无论是重离子还是轻电子，只要初速度等于 E/B，都在复合场中保持匀速直线运动穿出。',
              importance: 'gaokao',
            },
            {
              text: '【速度选择器的单向性】粒子必须从左侧水平向右入射才能发生选择。如果粒子从右侧入射，电场力与洛伦兹力将同向，粒子必然发生偏转而无法穿出。',
              importance: 'gaokao',
            }
          ],
          warnings: [
            {
              text: '易错点：误认为改变带电粒子的电量 q 会打破选择器的平衡。实际上 q 因子同时出现在两边并被消去，平衡状态不受影响。',
              level: 'danger',
            }
          ],
          mnemonic: '只选速度，不选质量，不选电性，单向选择。'
        }
      }
    }
    case 'anim-charge-in-bfield': {
      const mode = params.mode ?? 0 // 0=基础模式, 1=进阶模式
      const q = params.q ?? 1
      const m = params.m ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const theta = params.theta ?? 90 // 射入夹角

      const R = Math.abs((m * v) / (q * B))
      const T = Math.abs((2 * Math.PI * m) / (q * B))
      
      // 基础模式下的停留时间 t（假设垂直射入，圆心角为 pi）
      const arcAngle = Math.PI // 这里简化为垂直射出
      const timeInB = (arcAngle / (2 * Math.PI)) * T
      
      // 进阶模式下的最大射出距离 x_max (直径)
      const xMax = 2 * R

      if (mode === 0) {
        return {
          quantities: [
            ...base,
            { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
            { label: '运动周期 T', value: T.toFixed(2), unit: 's', color: PHYSICS_COLORS.lorentzForce },
            { label: '停留时间 t', value: timeInB.toFixed(2), unit: 's', color: PHYSICS_COLORS.heatLoss, highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '洛伦兹力提供向心力', latex: 'qvB = m\\frac{v^2}{R}', level: 'core' },
            { name: '回旋半径', latex: 'R = \\frac{mv}{qB}', level: 'core' },
            { name: '运动周期', latex: 'T = \\frac{2\\pi m}{qB}', level: 'core' },
            { name: '运动时间', latex: 't = \\frac{\\theta}{2\\pi}T', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '高考考点：粒子在磁场中的运行时间由圆心角决定，与速度无关。', importance: 'gaokao' as const },
            { text: '确定圆心是解决磁场问题的关键，通常利用两速度垂线的交点或一速度垂线与一条弦的中垂线交点来确定。', importance: 'core' as const },
          ],
          warnings: [
            { text: '易错防坑：错将运动半径与时间混淆，容易误认为速度越大、粒子在磁场中运动时间越长。实际上，在偏转角一定时，运动时间仅取决于周期，与速度大小完全无关！', level: 'danger' }
          ],
        }
      } else {
        return {
          quantities: [
            ...base,
            { label: '当前射入角 θ', value: theta.toFixed(0), unit: '°', color: PHYSICS_COLORS.magneticField },
            { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
            { label: '最大射出距离 x_max', value: xMax.toFixed(2), unit: 'm', color: PHYSICS_COLORS.heatLoss, highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '弦长公式', latex: 'L = 2R\\sin\\frac{\\theta}{2}', level: 'core' },
            { name: '最大距离', latex: 'x_{\\max} = 2R = \\frac{2mv}{qB}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '高考考点：高考压轴题常客。找圆心、求半径、定时间；旋转圆与放缩圆边界临界切点分析。', importance: 'gaokao' as const },
            { text: '旋转圆规律：当速度大小不变、方向改变时，粒子的轨迹圆大小不变，但圆心绕入射点旋转（圆心轨迹为以入射点为圆心、半径为R的圆弧）。', importance: 'core' as const },
            { text: '临界极值：在磁场边界上，当弦长恰好等于轨迹圆的直径（即 2R）时，粒子射出的距离达到最大值。', importance: 'gaokao' as const },
          ],
          warnings: [
            { text: '易错防坑：找不到动态圆圆心的运动轨迹（通常是以入射点为圆心、半径为R的圆弧），在画临界条件时切点找错导致漏解。', level: 'danger' }
          ],
        }
      }
    }
    default:
      return null
  }
}
