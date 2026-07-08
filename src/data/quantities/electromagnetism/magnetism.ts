import {
  solveBasicAmpere,
  solveAdvancedAmpere,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
  calcParticleRadius,
  calcParticlePeriod,
} from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from '../types'

export function handleMagnetism(animId: string, params: Record<string, number>, time: number, base: PhysicsPanelData['quantities']): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-ampere-force': {
      const mode = params.mode ?? 0
      const B = params.B ?? 1.0
      const I = params.I ?? 2.0
      const L = params.L ?? 4.0 // 联动 L
      const thetaIB = params.thetaIB ?? 90
      const bFieldDir = params.bFieldDir ?? 0
      const m = 0.5 // 质量固定为 0.5kg

      if (mode === 0) {
        // ── 基础模式 ──
        const res = solveBasicAmpere(I, B, thetaIB, L, m, time)
        const fDirText = res.F > 1e-4 ? ' (向右)' : res.F < -1e-4 ? ' (向左)' : ' (为零)'
        
        return {
          quantities: [
            ...base,
            { label: '有效磁场 B_⊥', value: `${Math.abs(res.B_perp).toFixed(2)}`, unit: `T (${B > 0 ? '垂直纸面向里' : B < 0 ? '垂直纸面向外' : '无磁场'})`, color: PHYSICS_COLORS.magneticField },
            { label: '平行磁场 B_∥', value: `${Math.abs(res.B_para).toFixed(2)}`, unit: 'T (不产生安培力)', color: PHYSICS_COLORS.labelTextLight },
            { label: '电流 I', value: `${Math.abs(I).toFixed(1)}`, unit: `A (${I > 0 ? '向上' : I < 0 ? '向下' : '无电流'})`, color: PHYSICS_COLORS.electricCurrent },
            { label: '有效长度 L', value: L.toFixed(1), unit: 'm', color: PHYSICS_COLORS.textMuted },
            { label: '安培力 F', value: `${Math.abs(res.F).toFixed(2)}`, unit: `N${fDirText}`, color: PHYSICS_COLORS.lorentzForce, highlight: res.FAbs > 1e-4 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '安培力大小公式', latex: 'F = BIL \\sin\\theta_{IB}', level: 'core' as const, condition: 'θ_IB 为磁场与电流夹角' },
            { name: '垂直/平行分解', latex: 'B_{\\perp} = B\\sin\\theta_{IB}, \\quad B_{\\parallel} = B\\cos\\theta_{IB}', level: 'core' as const },
            { name: '安培力方向判定', latex: '\\vec{F} = I\\vec{L} \\times \\vec{B}', level: 'core' as const, condition: '遵循左手定则' },
          ],
          gaokaoPoints: [
            { text: '【左手定则三维空间判定】伸开左手，使大拇指与四指垂直且在同一平面内，让磁感线穿过手心（B入掌心），四指指向电流方向，大拇指所指即为安培力方向。', importance: 'gaokao' },
            { text: '【三者方向关系】安培力 F 垂直于磁场 B 和电流 I 决定的平面，但 B 和 I 不一定垂直。当 B 与 I 夹角为 θ 时，F = BIL sinθ。', importance: 'core' },
            { text: '【有效长度考点】公式中的 L 指的是"有效长度"，即在磁场中且通电的那段导线在垂直磁场方向的投影长度。', importance: 'gaokao' },
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
        const res = solveAdvancedAmpere(I, B, theta, mu, bFieldDir, L, m, time)
        
        let stateText = '静止平衡'
        if (res.state === 'sliding-up') stateText = '向上滑动'
        if (res.state === 'sliding-down') stateText = '向下滑动'

        let fText = `${Math.abs(res.f).toFixed(2)}`
        let fUnit = 'N'
        if (res.f > 1e-4) fUnit = 'N (沿斜面向上)'
        else if (res.f < -1e-4) fUnit = 'N (沿斜面向下)'
        else fUnit = 'N (为零)'

        // 确定磁场方向描述
        let bFieldDirectionText = '无安培力'
        if (Math.abs(res.F_ampere) > 1e-4) {
          if (bFieldDir === 0) bFieldDirectionText = res.F_ampere > 0 ? '水平向右' : '水平向左'
          else if (bFieldDir === 1) bFieldDirectionText = res.F_ampere > 0 ? '沿斜面向上' : '沿斜面向下'
          else bFieldDirectionText = res.F_ampere > 0 ? '竖直向上' : '竖直向下'
        }

        // 平衡区间说明
        const rangeText = (Math.abs(B) < 1e-4)
          ? '无约束'
          : `${res.I_min.toFixed(2)} A 至 ${res.I_max.toFixed(2)} A`

        return {
          quantities: [
            ...base,
            { label: '安培力 F_安', value: Math.abs(res.F_ampere).toFixed(2), unit: `N (${bFieldDirectionText})`, color: PHYSICS_COLORS.lorentzForce },
            { label: '支持力 N', value: res.N.toFixed(2), unit: 'N', color: PHYSICS_COLORS.normalForce },
            { label: '摩擦力 f', value: fText, unit: fUnit, color: PHYSICS_COLORS.friction, highlight: res.state === 'equilibrium' ? undefined : 'extreme' },
            { label: '瞬时加速度 a', value: res.a.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: Math.abs(res.a) > 0.01 ? 'extreme' : 'zero' },
            { label: '平衡电流范围', value: rangeText, unit: '', color: PHYSICS_COLORS.referencePoint, highlight: res.state === 'equilibrium' ? 'positive' : 'negative' },
            { label: '导体棒状态', value: stateText, unit: '', highlight: res.state === 'equilibrium' ? 'positive' : 'negative' },
          ],
          formulas: [
            { name: '安培力大小', latex: 'F_{\\text{安}} = BIL', level: 'core' as const },
            ...(bFieldDir === 0 ? [
              { name: '沿斜面合外力', latex: 'R_{\\parallel} = F_{\\text{安}}\\cos\\theta - mg\\sin\\theta', level: 'core' as const, condition: '竖直磁场' },
              { name: '斜面正压力', latex: 'N = mg\\cos\\theta + F_{\\text{安}}\\sin\\theta', level: 'core' as const, condition: '竖直磁场' },
            ] : bFieldDir === 1 ? [
              { name: '沿斜面合外力', latex: 'R_{\\parallel} = F_{\\text{安}} - mg\\sin\\theta', level: 'core' as const, condition: '垂直斜面磁场' },
              { name: '斜面正压力', latex: 'N = mg\\cos\\theta', level: 'core' as const, condition: '垂直斜面磁场' },
            ] : [
              { name: '沿斜面合外力', latex: 'R_{\\parallel} = (F_{\\text{安}} - mg)\\sin\\theta', level: 'core' as const, condition: '水平磁场' },
              { name: '斜面正压力', latex: 'N = (mg - F_{\\text{安}})\\cos\\theta', level: 'core' as const, condition: '水平磁场' },
            ]),
            { name: '静摩擦平衡条件', latex: '|R_{\\parallel}| \\le \\mu N \\implies f = -R_{\\parallel}', level: 'core' as const },
            { name: '滑动摩擦与加速度', latex: 'f = -\\mu N \\operatorname{sgn}(R_{\\parallel}) \\implies a = \\frac{R_{\\parallel} + f}{m}', level: 'core' as const, condition: '滑动状态下' },
          ],
          gaokaoPoints: [
            { text: '【受力分析与分解】解决磁场力与斜面平衡问题时，必须画出二维侧视受力图。将各力沿平行于斜面和垂直于斜面两个方向进行正交分解。', importance: 'gaokao' },
            { text: '【静摩擦力的双向性与临界】静摩擦力的方向取决于导体棒的运动趋势。若安培力较小，棒有下滑趋势，摩擦力向上；若安培力较大，棒有上滑趋势，摩擦力向下。临界平衡状态满足 |f| = μN。', importance: 'gaokao' },
            { text: '【临界电流计算】当静摩擦力达到最大静摩擦力时（f = ±μN），导体棒处于恰不上滑或恰不下滑的临界状态。平衡电流范围 [I_min, I_max] 即对应这两个临界点。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错点：极易把安培力的方向画错！务必注意安培力与磁场及电流两两垂直的几何约束。例如竖直磁场安培力为水平方向；垂直斜面磁场安培力为沿斜面方向；水平磁场安培力为竖直方向。', level: 'danger' },
            { text: '易错点：漏掉正压力中安培力的分量！当磁场是竖直或水平方向时，安培力在垂直斜面方向也有分力，导致正压力 N 发生变化，从而改变了最大静摩擦力 μN。', level: 'danger' },
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
            { label: '轨道半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.textMuted },
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
      const boundaryType = params.boundaryType ?? 0 // 0=单边界, 1=双边界, 2=圆形
      const dynamicType = params.dynamicType ?? 0 // 0=旋转圆, 1=缩放圆, 2=平移圆
      const q = params.q ?? 1
      const m = params.m ?? 1
      const v = params.v ?? 12
      const B = params.B ?? 1.2
      const theta = params.theta ?? 60 // 射入夹角
      const d = params.magneticWidth ?? 5.0
      const Rb = params.magneticRadius ?? 4.0

      const R = calcParticleRadius(m, v, q, B)
      const T = calcParticlePeriod(m, q, B)

      if (mode === 0) {
        // ─── 基础模式 ───
        if (boundaryType === 0) {
          // 单边界磁场 (y > 0)
          const thetaRad = (theta * Math.PI) / 180
          const sign = (q * B) >= 0 ? -1 : 1
          const deltaPhi = sign === -1 ? 2 * thetaRad : 2 * (Math.PI - thetaRad)
          const timeInB = T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0
          const exitDistance = 2 * R * Math.sin(thetaRad)

          return {
            quantities: [
              ...base,
              { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '运动周期 T', value: T.toFixed(2), unit: 's', color: PHYSICS_COLORS.lorentzForce },
              { label: '偏转圆心角 φ', value: ((deltaPhi * 180) / Math.PI).toFixed(1), unit: '°', color: PHYSICS_COLORS.appliedForce },
              { label: '停留时间 t', value: timeInB.toFixed(2), unit: 's', color: PHYSICS_COLORS.heatLoss, highlight: 'extreme' as const },
              { label: '射出点距离 x_out', value: exitDistance.toFixed(2), unit: 'm', color: PHYSICS_COLORS.velocity },
            ],
            formulas: [
              { name: '回旋半径', latex: 'R = \\frac{mv}{qB}', level: 'core' },
              { name: '运动周期', latex: 'T = \\frac{2\\pi m}{qB}', level: 'core' },
              { name: '偏转圆心角', latex: '\\Delta\\phi = 2\\theta\\ (或 2(\\pi-\\theta))', level: 'core' },
              { name: '运动时间', latex: 't = \\frac{\\Delta\\phi}{2\\pi}T', level: 'core' },
            ],
            gaokaoPoints: [
              { text: '粒子在单边界磁场中运动时，射入角 θ 决定了偏转角，且射出点距离始终为弦长 L = 2R*sinθ。', importance: 'gaokao' as const },
              { text: '运动时间由偏转圆心角唯一决定，与速度大小 v 完全无关。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：在偏转角一定的情况下，切勿因速度变大而误认为运动时间变长。时间仅与圆心角 and 周期有关！', level: 'danger' }
            ],
          }
        } else if (boundaryType === 1) {
          // 双平行边界磁场 (0 < y < d)
          const res = calculateDoubleBoundaryExit(q, m, v, B, theta, d)

          return {
            quantities: [
              ...base,
              { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '临界半径 R_crit', value: res.R_crit.toFixed(2), unit: 'm', color: PHYSICS_COLORS.appliedForce },
              { label: '是否穿出磁场', value: res.isPenetrated ? '是 (穿透)' : '否 (折回)', unit: '', color: res.isPenetrated ? PHYSICS_COLORS.lorentzForce : PHYSICS_COLORS.heatLoss, highlight: 'extreme' as const },
              { label: '运动时间 t', value: res.t.toFixed(2), unit: 's', color: PHYSICS_COLORS.heatLoss },
            ],
            formulas: [
              { name: '临界穿透条件', latex: 'R_{crit} = \\frac{d}{1 \\mp \\cos\\theta}', level: 'important' },
              { name: '穿透判定', latex: 'R \\ge R_{crit} \\implies 穿透', level: 'core' },
            ],
            gaokaoPoints: [
              { text: '双平行边界的临界穿透条件是轨迹圆与边界恰好相切，即 R(1 ∓ cosθ) = d。', importance: 'gaokao' as const },
              { text: '当速度 v 较小 (R < R_crit) 时，粒子被折回，出射点距离在下边界 x = 2*xc 处。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：画相切临界图时，必须分清粒子偏转的方向（向左还是向右），这决定了相切几何关系中的符号是 1-cosθ 还是 1+cosθ。', level: 'danger' }
            ],
          }
        } else {
          // 圆形边界磁场 (半径 Rb)
          const res = calculateCircularBoundaryExit(q, m, v, B, Rb)

          return {
            quantities: [
              ...base,
              { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '磁场半径 R_b', value: Rb.toFixed(2), unit: 'm', color: PHYSICS_COLORS.appliedForce },
              { label: '偏转角 Δφ', value: ((res.deltaPhi * 180) / Math.PI).toFixed(1), unit: '°', color: PHYSICS_COLORS.lorentzForce },
              { label: '运动时间 t', value: res.t.toFixed(2), unit: 's', color: PHYSICS_COLORS.heatLoss, highlight: 'extreme' as const },
            ],
            formulas: [
              { name: '圆形磁场对称性', latex: '径向射入 \\implies 径向射出', level: 'important' },
              { name: '偏转角与半径关系', latex: '\\tan\\frac{\\Delta\\phi}{2} = \\frac{R_b}{R}', level: 'core' },
            ],
            gaokaoPoints: [
              { text: '圆形磁场“对称性定理”：沿径向（指向圆心）射入磁场的粒子，射出时其速度反向延长线必过磁场圆心。', importance: 'gaokao' as const },
              { text: '该对称性使偏转角中垂线正好经过磁场圆心，形成直角三角形关系：tan(Δφ/2) = R_b / R。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：注意此径向对称性仅在粒子“射向磁场圆心”时成立。如果入射速度不指向磁场圆心，出射必不对称！', level: 'danger' }
            ],
          }
        }
      } else {
        // ─── 进阶模式 (动态圆极值分析) ───
        if (dynamicType === 0) {
          // 旋转圆
          const xMax = 2 * R

          return {
            quantities: [
              ...base,
              { label: '焦点回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '包络圆半径 2R', value: xMax.toFixed(2), unit: 'm', color: PHYSICS_COLORS.appliedForce, highlight: 'extreme' as const },
              { label: '最大射出距离 x_max', value: xMax.toFixed(2), unit: 'm', color: PHYSICS_COLORS.heatLoss },
            ],
            formulas: [
              { name: '弦长公式', latex: 'L = 2R\\sin\\frac{\\Delta\\phi}{2}', level: 'core' },
              { name: '最大放电半径', latex: 'r_{max} = 2R = \\frac{2mv}{qB}', level: 'important' },
            ],
            gaokaoPoints: [
              { text: '旋转圆（初速大小不变，方向改变）的轨迹圆心轨迹是以入射点为圆心、半径为 R 的圆弧。', importance: 'gaokao' as const },
              { text: '无边界时，旋转圆的包络线为以入射点为圆心、半径为 2R 的圆（也称为最大“放电”区域）。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：画边界切点临界时，应确保轨迹圆心位于其圆心轨迹圆弧上，切点为粒子轨迹与边界的切点，而非任意几何交点。', level: 'danger' }
            ],
          }
        } else if (dynamicType === 1) {
          // 缩放圆
          return {
            quantities: [
              ...base,
              { label: '当前回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '运动周期 T', value: T.toFixed(2), unit: 's', color: PHYSICS_COLORS.lorentzForce },
            ],
            formulas: [
              { name: '圆心轨迹线', latex: '垂直于入射速度的射线', level: 'core' },
              { name: '缩放关系', latex: 'R \\propto v', level: 'core' },
            ],
            gaokaoPoints: [
              { text: '缩放圆（初速方向不变，大小改变）的各轨迹圆心在一条垂直于速度方向 of 直线上平移。', importance: 'gaokao' as const },
              { text: '在双边界磁场中，随着速度 v 变大，轨迹圆变大。相切于上边界的圆即为“穿透”的临界状态。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：不要遗漏磁场边界有两端限制时（如有限宽度的板状磁场），既有穿透上边界的临界，也可能有从左右侧面射出的临界。', level: 'danger' }
            ],
          }
        } else {
          // 平移圆
          return {
            quantities: [
              ...base,
              { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.negativeCharge },
              { label: '运动周期 T', value: T.toFixed(2), unit: 's', color: PHYSICS_COLORS.lorentzForce },
            ],
            formulas: [
              { name: '圆心轨迹线', latex: '与入射边界平行的直线', level: 'core' },
              { name: '入射宽度', latex: '\\Delta x_{in} = \\Delta x_{out}', level: 'core' },
            ],
            gaokaoPoints: [
              { text: '平移圆（一束平行粒子，速度大小与方向皆同）的圆心在一条与入射边界平行的直线上平移。', importance: 'gaokao' as const },
              { text: '常用于求解粒子束穿过磁场后的聚焦（如磁聚焦）或宽度遮挡问题。', importance: 'core' as const },
            ],
            warnings: [
              { text: '易错防坑：平移圆的各圆轨道由于大小相同且平行，画图时可用直尺平移圆心和轨迹切点来进行直观分析。', level: 'danger' }
            ],
          }
        }
      }
    }
    case 'anim-magnetic-circular-geom': {
      const boundaryType = params.boundaryType ?? 0
      const particleSign = params.particleSign ?? 1
      const velocity = params.velocity ?? 3.0
      const angle = params.angle ?? 60
      const B = params.magneticB ?? 1.0

      const angleRad = (angle * Math.PI) / 180
      const R = velocity / B
      const omega = B
      
      const xc = particleSign * R * Math.sin(angleRad)
      const yc = -particleSign * R * Math.cos(angleRad)

      // 迭代计算 tOut (dt = 1ms)
      const dt = 0.001
      const maxT = 12.0
      let tOut = maxT
      let t = 0.005
      const omegaDir = -particleSign * omega
      const theta0 = angleRad + particleSign * Math.PI / 2

      while (t < maxT) {
        const curTheta = theta0 + omegaDir * t
        const curX = xc + R * Math.cos(curTheta)
        const curY = yc + R * Math.sin(curTheta)

        let inB = false
        if (boundaryType === 0) {
          inB = curY >= 0
        } else if (boundaryType === 1) {
          inB = curX >= -3.0 && curX <= 3.0 && curY >= 0 && curY <= 4.0
        } else {
          inB = curX * curX + (curY - 3.5) * (curY - 3.5) <= 3.5 * 3.5
        }

        if (!inB) {
          tOut = t - dt / 2
          break
        }
        t += dt
      }

      // 计算实时停留时间
      const curT = time <= tOut ? time : tOut

      // 特征公式及三角形的 LaTeX 信息
      let triangleFormula = ''
      let boundaryName = '单边界'
      if (boundaryType === 0) {
        boundaryName = '单边界'
        triangleFormula = '(R - d)^2 + \\left(\\frac{L}{2}\\right)^2 = R^2'
      } else if (boundaryType === 1) {
        boundaryName = '矩形边界'
        // 出射点的坐标
        const omegaDirExit = -particleSign * omega
        const thetaExit = theta0 + omegaDirExit * tOut
        const xOut = xc + R * Math.cos(thetaExit)
        triangleFormula = `(R - d)^2 + x_{\\text{offset}}^2 = R^2 \\implies (R - 4.0)^2 + (${Math.abs(xOut - xc).toFixed(2)})^2 = R^2`
      } else {
        boundaryName = '圆形边界'
        triangleFormula = '\\Delta\\varphi = 2\\arctan\\left(\\frac{R_b}{R}\\right)'
      }

      return {
        quantities: [
          ...base,
          { label: '磁场边界类型', value: boundaryName, unit: '' },
          { label: '电荷电性', value: particleSign > 0 ? '正电荷 (+q)' : '负电荷 (-q)', unit: '', highlight: particleSign > 0 ? 'positive' as const : 'negative' as const },
          { label: '初速度 v', value: velocity.toFixed(1), unit: 'm/s', color: PHYSICS_COLORS.velocity },
          { label: '入射角 α', value: `${angle.toFixed(0)}°`, unit: '', color: PHYSICS_COLORS.labelTextLight },
          { label: '磁场强度 B', value: B.toFixed(1), unit: 'T', color: PHYSICS_COLORS.magneticField },
          { label: '轨道半径 R', value: R.toFixed(2), unit: 'm', color: PHYSICS_COLORS.lorentzForce, highlight: 'positive' as const },
          { label: '运动周期 T', value: (2 * Math.PI / omega).toFixed(2), unit: 's', color: PHYSICS_COLORS.period },
          { label: '停留时间 t', value: curT.toFixed(2), unit: `s (出射时刻: ${tOut.toFixed(2)}s)`, color: PHYSICS_COLORS.heatLoss, highlight: time > tOut ? 'extreme' as const : undefined },
        ],
        formulas: [
          { name: '向心力源泉', latex: 'qvB = m\\frac{v^2}{R} \\implies R = \\frac{mv}{qB}', level: 'core' as const },
          { name: '偏转周期律', latex: 'T = \\frac{2\\pi m}{qB} \\implies t = \\frac{\\theta}{360^\\circ}T', level: 'core' as const },
          { name: '几何特征方程', latex: triangleFormula, level: 'important' as const, condition: `${boundaryName}几何三角形` },
        ],
        gaokaoPoints: [
          { text: '【找圆心】：自粒子入射点与任意瞬时位置引速度矢量的法线（垂直于速度），双法线的相交点即为轨道圆心 O。', importance: 'gaokao' as const },
          { text: '【定三角形】：根据磁场边界物理特征，锁定高亮直角三角形，将几何图形关系转化为代数方程式求解。', importance: 'gaokao' as const },
          { text: '【周期与时间】：粒子在磁场中偏转的时间仅由偏转圆心角和周期共同决定，与初速度大小无关（若偏转角恒定）。', importance: 'core' as const },
        ],
        warnings: [
          { text: '易错防坑：使用左手定则判定洛伦兹力方向时，务必注意负电荷的四指应当指向速度的相反方向。', level: 'danger' as const },
        ],
      }
    }
    default:
      return null
  }
}
