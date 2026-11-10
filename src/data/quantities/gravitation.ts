import {
  GRAVITATIONAL_CONSTANT,
  EARTH_MASS,
  SOLAR_MASS,
  SECONDS_PER_DAY,
  SATELLITE_LAUNCH_RADIUS_RATIO,
  calculateOrbitalSpeed,
  ellipseFromEccentricity,
  evaluateKeplerOrbit,
  orbitalPeriodFromMass,
  calculateLaunchTrajectory,
  calculateBinaryStars,
  calculateTripleStars,
  TRIPLE_STARS_DEFAULT_MASS,
  MULTI_STAR_DEFAULT_PARAMS,
  MULTI_STAR_DISTANCE_UNIT_M,
  MULTI_STAR_DAYS_PER_ANIM_SEC,
  computeHohmannElements,
  computeTransferState,
  megaMetersToMeters,
} from '../../physics'
import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, WarningItem } from './types'
import type { OrbitTransferPhase } from '../../physics/orbitTransfer'
import { PHYSICS_COLORS } from '@/theme/physics'
import { formatScientific } from '@/utils/formatNumber'


export function buildGravitationQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-kepler': {
      const mode = params.mode ?? 0 // 0=第一定律, 1=第二定律, 2=第三定律
      const a1 = params.a ?? 4.5
      const e1 = params.e ?? 0.75
      const mass = params.mass ?? 36
      const a2 = params.a2 ?? 7.5

      // 与中屏共用同一套物理函数：几何量、周期、轨道状态都不在此处重算
      const { c: c1, rMin, rMax } = ellipseFromEccentricity(a1, e1)
      const orbitA = evaluateKeplerOrbit(a1, e1, mass, time)
      const T1 = orbitalPeriodFromMass(a1, mass)
      const T2 = orbitalPeriodFromMass(a2, mass)
      const a3_1 = Math.pow(a1, 3)
      const a3_2 = Math.pow(a2, 3)
      const k1 = a3_1 / Math.pow(T1, 2)
      const k2 = a3_2 / Math.pow(T2, 2)

      // 近日 / 远日点的速度：由同一求解器在 t=0 与 t=T/2 处取值
      const vPeri = evaluateKeplerOrbit(a1, e1, mass, 0).v
      const vApo = evaluateKeplerOrbit(a1, e1, mass, T1 / 2).v

      // 第一定律的实测焦半径之和：r₂ 用副焦点的真实坐标量，而不是 2a − r₁（后者是恒真式）
      const rToSun = orbitA.r
      const rToFoci2 = Math.hypot(orbitA.x + c1, orbitA.y)

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode === 0) {
        quantities.push(
          { label: '半长轴 / 偏心率', value: `${a1.toFixed(1)} / ${e1.toFixed(2)}`, unit: '' },
          { label: '近日点距日 r_min', value: rMin.toFixed(2), unit: '' },
          { label: '远日点距日 r_max', value: rMax.toFixed(2), unit: '' },
          {
            label: '焦半径之和(实测)',
            value: (rToSun + rToFoci2).toFixed(3),
            unit: '=2a',
            highlight: 'positive' as const,
          },
          { label: '当前距日 r', value: rToSun.toFixed(2), unit: '' },
          { label: '当前速度 v', value: orbitA.v.toFixed(2), unit: '(相对)', highlight: 'positive' as const },
        )
      } else if (mode === 1) {
        quantities.push(
          { label: '近日点距日 r_min', value: rMin.toFixed(2), unit: '' },
          { label: '远日点距日 r_max', value: rMax.toFixed(2), unit: '' },
          { label: '近日点速度 v_近', value: vPeri.toFixed(2), unit: '(相对)', highlight: 'extreme' as const },
          { label: '远日点速度 v_远', value: vApo.toFixed(2), unit: '(相对)' },
          {
            label: 'r·v（近日点）',
            value: (rMin * vPeri).toFixed(3),
            unit: '',
            highlight: 'positive' as const,
          },
          {
            label: 'r·v（远日点）',
            value: (rMax * vApo).toFixed(3),
            unit: '（相等）',
            highlight: 'positive' as const,
          },
          { label: '当前距日 r', value: rToSun.toFixed(2), unit: '' },
        )
      } else {
        quantities.push(
          { label: '中心天体质量 M', value: mass.toFixed(0), unit: '' },
          { label: '内轨 a₁ / T₁', value: `${a1.toFixed(1)} / ${T1.toFixed(2)}`, unit: '' },
          { label: '外轨 a₂ / T₂', value: `${a2.toFixed(1)} / ${T2.toFixed(2)}`, unit: '' },
          {
            label: '内轨比值 a₁³/T₁²',
            value: k1.toFixed(4),
            unit: '',
            highlight: 'positive' as const,
          },
          {
            label: '外轨比值 a₂³/T₂²',
            value: k2.toFixed(4),
            unit: '=内轨',
            highlight: 'positive' as const,
          },
        )
      }

      if (mode === 0) {
        formulas.push(
          { name: '第一定律轨道方程', latex: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (c = \\sqrt{a^2-b^2})', level: 'important' },
          { name: '焦半径定义关系', latex: 'r_1 + r_2 = 2a \\quad (\\text{双焦点距离和恒定})', level: 'core' }
        )
        gaokaoPoints.push(
          { text: '恒星（如太阳）必然处于行星椭圆轨道的其中一个焦点上，而不是椭圆的中心。', importance: 'core' as const },
          { text: '偏心率 e = c/a 刻画椭圆轨道的扁平程度，0 ≤ e < 1，越接近 0 越圆。', importance: 'basic' as const },
          { text: '近日点距离为 a − c，远日点距离为 a + c。', importance: 'gaokao' as const },
          { text: '半长轴 a 是椭圆的固定几何量，与行星到太阳的距离 r 不是一回事 —— 椭圆轨道上不能用 r 代替 a。', importance: 'gaokao' as const }
        )
      } else if (mode === 1) {
        formulas.push(
          { name: '第二定律面积微分', latex: '\\Delta S = \\frac{1}{2} \\int r^2 d\\theta = \\text{常数}', level: 'important', condition: '同一轨道同一天体' },
          { name: '近日点远日点守恒', latex: 'r_{\\text{近日}} \\cdot v_{\\text{近日}} = r_{\\text{远日}} \\cdot v_{\\text{远日}} \\quad (\\text{角动量守恒})', level: 'core', condition: '仅在近、远日点 v ⊥ r' }
        )
        gaokaoPoints.push(
          { text: '近日点（距恒星最近）速度最大，远日点（距恒星最远）速度最小。', importance: 'gaokao' as const },
          { text: '行星做椭圆轨道运动不是匀速运动，其线速度和角速度均在时刻变化。', importance: 'gaokao' as const },
          { text: '近日速度与远日速度之比等于远日距离与近日距离之比，即 v_近 : v_远 = r_max : r_min。', importance: 'hard' as const }
        )
      } else {
        formulas.push(
          { name: '第三定律周期比值', latex: '\\frac{a_1^3}{T_1^2} = \\frac{a_2^3}{T_2^2} = k', level: 'core', condition: '同一中心天体' },
          { name: '常数决定式', latex: 'k = \\frac{G M_{\\text{中心天体}}}{4\\pi^2}', level: 'derived', note: '拖动 M 改变中心天体时 k 才变；只改 a 时 k 不变' }
        )
        gaokaoPoints.push(
          { text: '比值常数 k 的大小仅与中心天体的质量有关，与环绕的行星质量无关。', importance: 'gaokao' as const },
          // 左屏 e₁ / e₂ 两个旋钮"拖了周期不动"是本节最容易被当成 bug 的现象，它就是结论本身
          { text: '同一中心天体的椭圆轨道，周期只由半长轴 a 决定，与偏心率 e 无关：把 e₁、e₂ 拖到 0.8，轨道越拖越扁，T₁、T₂ 与 k 却一动不动。', importance: 'gaokao' as const },
          { text: '第三定律适用于同一中心天体下的所有环绕星体（如八大行星绕日、所有卫星绕地）。', importance: 'core' as const },
          { text: '半长轴 a 是长轴的一半，对圆形轨道而言简化为轨道半径 R。', importance: 'basic' as const }
        )
      }

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-satellite': {
      const mode = params.mode ?? 0 // 0=多轨道对比, 1=宇宙速度发射
      const G = GRAVITATIONAL_CONSTANT
      const M_earth = EARTH_MASS
      const R_earth = 6.37e6

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode === 0) {
        // ── 模式 0：多轨道圆周对比 ──
        const r = params.r ?? 7
        const rMeters = r * 1e6
        const { v, T, a_c } = calculateOrbitalSpeed(M_earth, rMeters, G)
        const THours = T / 3600

        quantities.push(
          { label: '轨道半径 r', value: rMeters.toExponential(2), unit: 'm' },
          { label: '线速度 v', value: (v / 1000).toFixed(2), unit: 'km/s', highlight: 'positive' as const },
          { label: '运行周期 T', value: THours.toFixed(2), unit: 'h' },
          { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' }
        )

        formulas.push(
          { name: '线速度公式', latex: 'v = \\sqrt{\\frac{GM}{r}}', level: 'core', condition: '圆形轨道' },
          { name: '周期公式', latex: 'T = 2\\pi \\sqrt{\\frac{r^3}{GM}}', level: 'core', condition: '圆形轨道' },
          { name: '向心加速度', latex: 'a_n = \\frac{GM}{r^2}', level: 'important', condition: '万有引力提供向心力' }
        )

        gaokaoPoints.push(
          { text: '高轨低速：轨道半径越大，线速度和向心加速度越小，周期越长。', importance: 'core' as const },
          { text: '同步轨道：轨道半径固定约 4.24万公里，周期固定为24小时。', importance: 'gaokao' as const },
          { text: '第一宇宙速度 7.9km/s 是近地圆轨道的最大环绕速度。', importance: 'hard' as const }
        )
      } else {
        // ── 模式 1：宇宙速度发射 ──
        const v0_km_s = params.v0 ?? 7.9
        const v0 = v0_km_s * 1000
        const isLaunched = params.isLaunched ?? 0
        const { orbitType, e } = calculateLaunchTrajectory(v0, M_earth, R_earth, G)

        let typeName = '椭圆轨道'
        if (orbitType === 'crash') typeName = '坠毁轨道 (未能环绕)'
        else if (orbitType === 'circular') typeName = '近地圆轨道'
        else if (orbitType === 'escape') typeName = '逃逸轨道 (脱离地球)'

        let phaseName = '待发射'
        let currentH = 0 // 米
        let currentV = 0 // m/s
        let crashed = false

        if (isLaunched === 1) {
          const t_animation = time
          if (t_animation < 3) {
            phaseName = '垂直起飞'
            const p = t_animation / 3
            currentH = R_earth * 0.15 * p
            currentV = v0 * (t_animation / 8)
          } else if (t_animation < 8) {
            phaseName = '重力转弯'
            const p = (t_animation - 3) / 5
            const eased = 1 - Math.pow(1 - p, 2)
            currentH = R_earth * (0.15 + 0.20 * eased)
            currentV = v0 * (t_animation / 8)
          } else {
            // 在轨阶段：重现极坐标积分
            // 入轨半径必须与中屏（satelliteLayout 的 rLaunchRatio）同源，
            // 旧实现写死 1.35R 而中屏在 1.05R 入轨，同一页两条轨道。
            const r0 = SATELLITE_LAUNCH_RADIUS_RATIO * R_earth
            const v_c = Math.sqrt(G * M_earth / r0)
            const alpha = (r0 * v0 * v0) / (G * M_earth)
            const e_ecc = Math.abs(alpha - 1)
            const isFarOrigin = v0 < v_c
            const p_param = isFarOrigin ? r0 * (1 - e_ecc) : r0 * (1 + e_ecc)
            const h = r0 * v0

            let theta = 0.6
            const dt = 0.05
            const timeScale = 450 // mode1 的时间加速
            const targetT = (t_animation - 8) * timeScale
            const maxSteps = Math.min(10000, targetT / dt)

            for (let i = 0; i < maxSteps; i++) {
              const curR = isFarOrigin ? p_param / (1 - e_ecc * Math.cos(theta - 0.6)) : p_param / (1 + e_ecc * Math.cos(theta - 0.6))
              if (curR < R_earth * 0.99) {
                crashed = true
                break
              }
              const dTheta = (h / (curR * curR)) * dt
              theta += dTheta
            }

            if (crashed) {
              phaseName = '撞击坠毁'
              currentH = 0
              currentV = 0
            } else {
              phaseName = '在轨环绕'
              const currentR = isFarOrigin ? p_param / (1 - e_ecc * Math.cos(theta - 0.6)) : p_param / (1 + e_ecc * Math.cos(theta - 0.6))
              currentH = currentR - R_earth
              
              const v_sq = v0 * v0 + 2 * G * M_earth * (1 / currentR - 1 / r0)
              currentV = v_sq > 0 ? Math.sqrt(v_sq) : 0
            }
          }
        }

        quantities.push(
          { label: '发射速度 v₀', value: v0_km_s.toFixed(2), unit: 'km/s', highlight: 'extreme' as const },
          { label: '当前阶段', value: phaseName, unit: '', highlight: crashed ? 'negative' as const : isLaunched === 1 ? 'positive' as const : undefined },
          { label: '实时高度', value: (currentH / 1000).toFixed(2), unit: 'km' },
          { label: '实时线速度', value: (currentV / 1000).toFixed(2), unit: 'km/s', highlight: isLaunched === 1 && !crashed ? 'positive' as const : undefined },
          { label: '预定轨道类型', value: typeName, unit: '', highlight: orbitType === 'crash' ? 'negative' as const : 'positive' as const },
          { label: '预定偏心率 e', value: e.toFixed(3), unit: '' }
        )

        formulas.push(
          { name: '二体轨道方程', latex: 'r(\\theta) = \\frac{p}{1 + e \\cos \\theta}', level: 'important', condition: '二体问题' },
          { name: '总机械能守恒', latex: 'E = \\frac{1}{2}m v^2 - G\\frac{Mm}{r} = \\text{常数}', level: 'core', condition: '仅受万有引力' }
        )

        gaokaoPoints.push(
          { text: '第一宇宙速度 7.9km/s 是地球卫星的最小发射速度。', importance: 'core' as const },
          { text: '第二宇宙速度 11.2km/s 是卫星脱离地球引力束缚的最小速度。', importance: 'gaokao' as const },
          { text: '发射速度小于第一宇宙速度时，卫星必将落回地表坠毁。', importance: 'hard' as const }
        )
      }

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-binary-stars': {
      const mode = params.mode ?? MULTI_STAR_DEFAULT_PARAMS.mode // 0=双星系统, 1=三星系统
      const L = params.L ?? MULTI_STAR_DEFAULT_PARAMS.L
      const LMeters = L * MULTI_STAR_DISTANCE_UNIT_M
      const massRatio = params.massRatio ?? MULTI_STAR_DEFAULT_PARAMS.massRatio

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []
      const warnings: WarningItem[] = []

      if (mode === 0) {
        // 双星系统（真实 SI 单位）
        const { m1, m2, r1, r2, v1, v2, omega, T, F, a1, a2 } = calculateBinaryStars(LMeters, massRatio)
        quantities.push(
          { label: '质量 m₁ / m₂', value: `${(m1 / SOLAR_MASS).toFixed(2)} / ${(m2 / SOLAR_MASS).toFixed(2)}`, unit: 'M☉' },
          { label: '轨道半径 r₁ / r₂', value: `${(r1 / MULTI_STAR_DISTANCE_UNIT_M).toFixed(2)} / ${(r2 / MULTI_STAR_DISTANCE_UNIT_M).toFixed(2)}`, unit: '×10¹⁰ m' },
          { label: '线速度 v₁ / v₂', value: `${(v1 / 1000).toFixed(2)} / ${(v2 / 1000).toFixed(2)}`, unit: 'km/s' },
          { label: '向心力 F₁ = F₂', value: formatScientific(F, 2), unit: 'N' },
          { label: '向心加速度 a₁ / a₂', value: `${a1.toFixed(3)} / ${a2.toFixed(3)}`, unit: 'm/s²' },
          { label: '角速度 ω', value: formatScientific(omega, 2), unit: 'rad/s' },
          { label: '运行周期 T', value: (T / SECONDS_PER_DAY).toFixed(2), unit: 'd', highlight: 'positive' as const }
        )

        formulas.push(
          {
            name: '引力提供各自向心力',
            latex: 'G\\frac{m_1 m_2}{L^2} = m_1 \\omega^2 r_1 = m_2 \\omega^2 r_2',
            condition: '双星仅受相互万有引力，绕共同质心做共面匀速圆周运动',
            note: '两星向心力大小严格相等，角速度 ω 与周期 T 相同。',
            level: 'important',
          },
          {
            name: '质心半径分配关系',
            latex: 'm_1 r_1 = m_2 r_2, \\quad r_1 + r_2 = L',
            condition: '质心静止在两星连线上',
            note: '半径、线速度与向心加速度均与质量成反比。',
            level: 'core',
          },
          {
            name: '周期与总质量关系',
            latex: 'T = 2\\pi \\sqrt{\\frac{L^3}{G(m_1 + m_2)}}',
            condition: '总质量 m₁+m₂ 不变时，周期 T 只随间距 L 变化，与质量比无关',
            level: 'core',
          }
        )

        gaokaoPoints.push(
          { text: '易错陷阱：万有引力公式中的距离是双星间距 L，而向心力公式中的半径是各自的轨道半径 r₁ 或 r₂，二者绝不能混淆。', importance: 'gaokao' as const },
          { text: '双星做匀速圆周运动的角速度 ω 和周期 T 绝对相等，且连线始终通过质心。', importance: 'core' as const },
          { text: '双星的轨道半径、线速度、向心加速度均与它们的质量成反比（r₁/r₂ = v₁/v₂ = a₁/a₂ = m₂/m₁）。', importance: 'gaokao' as const }
        )

        warnings.push(
          {
            text: '易错提醒：固定间距 L 调质量比，向心力 F₁ = F₂ 不因受力不均而偏心，但质量越小的星轨道半径、线速度与加速度越大。',
            level: 'warning',
          },
          {
            text: `单位与时间尺度说明：1 M☉ = 1.989×10³⁰ kg；本演示采用加速时间尺度（1 动画秒 = ${MULTI_STAR_DAYS_PER_ANIM_SEC} 天轨道时间）。`,
            level: 'info',
          }
        )
      } else {
        // 三星系统（等边三角形特例，真实 SI 单位）
        const starMass = TRIPLE_STARS_DEFAULT_MASS
        const { r, fNet, fPair, a, v, omega, T } = calculateTripleStars(LMeters, undefined, starMass)

        quantities.push(
          { label: '单星质量 m', value: (starMass / SOLAR_MASS).toFixed(1), unit: 'M☉' },
          { label: '轨道半径 r', value: (r / MULTI_STAR_DISTANCE_UNIT_M).toFixed(2), unit: '×10¹⁰ m' },
          { label: '线速度 v', value: (v / 1000).toFixed(2), unit: 'km/s' },
          { label: '星间分引力 F₀', value: formatScientific(fPair, 2), unit: 'N' },
          { label: '星体合力 F_合', value: formatScientific(fNet, 2), unit: 'N' },
          { label: '向心加速度 a', value: a.toFixed(3), unit: 'm/s²' },
          { label: '角速度 ω', value: formatScientific(omega, 2), unit: 'rad/s' },
          { label: '运行周期 T', value: (T / SECONDS_PER_DAY).toFixed(2), unit: 'd', highlight: 'positive' as const }
        )

        formulas.push(
          {
            name: '等边三角形分引力合成',
            latex: 'F_{\\text{合}} = 2 F_0 \\cos 30^\\circ = \\sqrt{3} G \\frac{m^2}{L^2} = m \\omega^2 r',
            condition: '三颗星等质量（m₁=m₂=m₃=m）、构成等边三角形、仅受相互引力且稳定圆周运动',
            note: '任意星受到其余两星的分引力 F₀ = Gm²/L²，夹角 60°，合力指向正三角形中心。',
            level: 'important',
          },
          {
            name: '三星轨道半径关系',
            latex: 'r = \\frac{L}{2\\cos 30^\\circ} = \\frac{L}{\\sqrt{3}}',
            condition: '正三角形外接圆半径',
            level: 'core',
          },
          {
            name: '三星运转周期',
            latex: 'T = 2\\pi \\sqrt{\\frac{L^3}{3Gm}}',
            condition: '仅适用于等质量等边三角形稳态圆周特例',
            level: 'derived',
          }
        )

        gaokaoPoints.push(
          { text: '三星系统的每颗星均受另外两颗星大小相等的分引力（夹角 60°），合力指向正三角形中心（质心）。', importance: 'core' as const },
          { text: '该特例中三颗星做圆周运动的角速度 ω、周期 T、线速度 v 与轨道半径 r 完全相等，相位互差 120°。', importance: 'gaokao' as const }
        )

        warnings.push(
          {
            text: '适用条件限制：上述周期与合力公式仅对「等质量、等边三角形构型、只受相互引力」的稳定圆周运动成立；一般三星系统不保证做匀速圆周运动。',
            level: 'danger',
          },
          {
            text: `单位与时间尺度说明：1 M☉ = 1.989×10³⁰ kg；1 动画秒 = ${MULTI_STAR_DAYS_PER_ANIM_SEC} 天轨道时间。`,
            level: 'info',
          }
        )
      }

      return {
        quantities,
        formulas,
        gaokaoPoints,
        warnings,
      }
    }
    case 'anim-orbit-transfer': {
      const r1 = megaMetersToMeters(params.r1 ?? 7)
      const r3 = megaMetersToMeters(Math.max(params.r3 ?? 14, (params.r1 ?? 7) + 0.2))
      const phase = (params.phase ?? 0) as OrbitTransferPhase
      const tBurn1 = params.tBurn1 ?? 0
      const tBurn2 = params.tBurn2 ?? -1
      const el = computeHohmannElements({ r1, r3 })
      const st = computeTransferState(
        { r1, r3 },
        phase,
        time,
        tBurn1,
        tBurn2 >= 0 ? tBurn2 : null,
      )
      const phaseName =
        phase === 0 ? '低轨巡航' : phase === 1 ? '转移椭圆' : '高轨巡航'

      return {
        quantities: [
          { label: '半长轴 a', value: (el.a / 1e6).toFixed(2), unit: '×10⁶ m', color: PHYSICS_COLORS.wavelength },
          { label: '偏心率 e', value: el.e.toFixed(3), unit: '' },
          { label: '当前阶段', value: phaseName, unit: '' },
          {
            label: '当前速率 v',
            value: (st.v / 1000).toFixed(2),
            unit: 'km/s',
            color: PHYSICS_COLORS.velocity,
          },
          {
            label: '低轨速度 v₁',
            value: (el.v1 / 1000).toFixed(2),
            unit: 'km/s',
            color: PHYSICS_COLORS.velocity,
          },
          {
            label: '高轨速度 v₃',
            value: (el.v3 / 1000).toFixed(2),
            unit: 'km/s',
            color: PHYSICS_COLORS.velocity,
          },
          {
            label: 'Δv₁（近地点）',
            value: (el.dV1 / 1000).toFixed(3),
            unit: 'km/s',
            color: PHYSICS_COLORS.forceNet,
          },
          {
            label: 'Δv₂（远地点）',
            value: (el.dV2 / 1000).toFixed(3),
            unit: 'km/s',
            color: PHYSICS_COLORS.forceNet,
          },
          { label: '离心判据 η=v²r/GM', value: st.eta.toFixed(3), unit: '' },
        ],
        formulas: [
          {
            name: '圆轨速度',
            latex: 'v=\\sqrt{\\dfrac{GM}{r}}',
            level: 'core',
            note: 'r↑ → v↓，故 v₁ > v₃（高轨更慢）',
          },
          {
            name: '霍曼半长轴',
            latex: 'a=\\dfrac{r_1+r_3}{2}',
            level: 'core',
          },
          {
            name: '近/远地点脉冲',
            latex: '\\Delta v_1=v_p-v_1,\\quad \\Delta v_2=v_3-v_a',
            level: 'important',
            condition: '共面双脉冲抬轨（霍曼）',
          },
          {
            name: '开普勒第三定律',
            latex: '\\dfrac{a^3}{T_2^2}=\\dfrac{r_1^3}{T_1^2}=\\dfrac{GM}{4\\pi^2}',
            level: 'important',
          },
        ],
        gaokaoPoints: [
          {
            text: '【速度比较】抬轨时近地点加速进入椭圆：同一交点上椭圆速度大于内圆轨速度；远地点再加速才能圆化到外圆。高轨稳态速度小于低轨。',
            importance: 'gaokao',
          },
          {
            text: '【两把火】霍曼抬轨：近地点切向加速、远地点再切向加速；降轨则在远地点先减速进入椭圆，近地点再减速圆化。',
            importance: 'gaokao',
          },
          {
            text: '【离心与向心】v↑ 使 mv²/r 大于万有引力时做离心运动（轨道抬升趋势）；v↓ 则向心。圆轨上二者相等（η=1）。',
            importance: 'hard',
          },
          {
            text: '【同步卫星交叉】同步轨道周期约 24 h，半径约 4.2×10⁴ km；可在本页将 r₃ 调大观察 v、T 变化，参考系切换见「人造卫星」多圆对比。',
            importance: 'core',
          },
        ],
      }
    }

    default:

      return null
  }
}
