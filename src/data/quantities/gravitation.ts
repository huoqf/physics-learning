import { GRAVITATIONAL_CONSTANT, EARTH_MASS, calculateOrbitalSpeed, calculateKeplerOrbit, calculateLaunchTrajectory, calculateBinaryStars, calculateTripleStars } from '../../physics'
import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from './types'


export function buildGravitationQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-kepler': {
      const mode = params.mode ?? 0 // 0=第一定律, 1=第二定律, 2=第三定律
      const a1 = params.a ?? 4.5
      const b1 = params.b ?? 3.0
      const T1 = params.period ?? 10

      const c1 = Math.sqrt(Math.max(0, a1 * a1 - b1 * b1))
      const e1 = a1 > 0 ? c1 / a1 : 0
      const rMin = a1 - c1
      const rMax = a1 + c1

      const orbitA = calculateKeplerOrbit(a1, b1, time, T1)

      const a2 = params.a2 ?? 7.5
      const T2 = T1 * Math.sqrt(Math.pow(a2 / a1, 3))

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode !== 2) {
        // 第一和第二定律
        quantities.push(
          { label: '轨道几何 (a,b,e)', value: `a=${a1.toFixed(1)}, b=${b1.toFixed(1)}, e=${e1.toFixed(2)}`, unit: '' },
          { label: '极值距离 (近/远)', value: `r_min=${rMin.toFixed(2)}, r_max=${rMax.toFixed(2)}`, unit: '' },
          { label: '近日/远日速度比', value: (rMax / rMin).toFixed(2), unit: '' },
          { label: '当前距日距离 r', value: orbitA.r.toFixed(2), unit: '' },
          { label: '当前瞬时速度 v', value: orbitA.v.toFixed(2), unit: '(相对值)', highlight: 'positive' as const }
        )
      } else {
        // 第三定律
        quantities.push(
          { label: '内轨半径 & 周期 (A)', value: `a₁=${a1.toFixed(1)}, T₁=${T1.toFixed(1)}s`, unit: '' },
          { label: '外轨半径 & 周期 (B)', value: `a₂=${a2.toFixed(1)}, T₂=${T2.toFixed(1)}s`, unit: '' },
          { label: '内轨比值 a₁³/T₁²', value: (Math.pow(a1, 3) / Math.pow(T1, 2)).toFixed(4), unit: '', highlight: 'positive' as const },
          { label: '外轨比值 a₂³/T₂²', value: (Math.pow(a2, 3) / Math.pow(T2, 2)).toFixed(4), unit: '', highlight: 'positive' as const }
        )
      }

      if (mode === 0) {
        formulas.push(
          { name: '第一定律轨道方程', latex: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (c = \\sqrt{a^2-b^2})', level: 'important' },
          { name: '焦半径定义关系', latex: 'r_1 + r_2 = 2a \\quad (\\text{双焦点距离和恒定})', level: 'core' }
        )
        gaokaoPoints.push(
          { text: '恒星（如太阳）必然处于行星椭圆轨道的其中一个焦点上。', importance: 'core' as const },
          { text: '离心率 e=c/a 刻画椭圆轨道的扁平程度，0 <= e < 1，越接近 0 越圆。', importance: 'basic' as const },
          { text: '近日点距离为 a-c，远日点距离为 a+c。', importance: 'gaokao' as const }
        )
      } else if (mode === 1) {
        formulas.push(
          { name: '第二定律面积微分', latex: '\\Delta S = \\frac{1}{2} \\int r^2 d\\theta = \\text{常数}', level: 'important', condition: '同一轨道同一天体' },
          { name: '近日点远日点守恒', latex: 'r_{\\text{近日}} \\cdot v_{\\text{近日}} = r_{\\text{远日}} \\cdot v_{\\text{远日}} \\quad (\\text{角动量守恒})', level: 'core', condition: '椭圆轨道' }
        )
        gaokaoPoints.push(
          { text: '近日点（距恒星最近）速度最大，远日点（距恒星最远）速度最小。', importance: 'gaokao' as const },
          { text: '行星做椭圆轨道运动不是匀速运动，其线速度和角速度均在时刻变化。', importance: 'core' as const },
          { text: '近日速度与远日速度之比与近日距离和远日距离成反比。', importance: 'hard' as const }
        )
      } else {
        formulas.push(
          { name: '第三定律周期比值', latex: '\\frac{a_1^3}{T_1^2} = \\frac{a_2^3}{T_2^2} = k', level: 'core', condition: '同一中心天体' },
          { name: '常数决定式', latex: 'k = \\frac{G M_{\\text{中心天体}}}{4\\pi^2}', level: 'derived' }
        )
        gaokaoPoints.push(
          { text: '比值常数 k 的大小仅与中心天体的质量有关，与环绕的行星质量无关。', importance: 'gaokao' as const },
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
            const r0 = 1.35 * R_earth
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
      const mode = params.mode ?? 0 // 0=双星系统, 1=三星系统
      const L = params.L ?? 8.0
      const massRatio = params.massRatio ?? 1.0

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode === 0) {
        // 双星系统
        const { m1, m2, r1, r2, v1, v2, T } = calculateBinaryStars(L, massRatio)
        quantities.push(
          { label: '双星间距 L', value: L.toFixed(1), unit: 'm' },
          { label: '质量比 m₁:m₂', value: `${massRatio.toFixed(1)}:1`, unit: '' },
          { label: '轨道半径 r₁ / r₂', value: `${r1.toFixed(2)}m / ${r2.toFixed(2)}m`, unit: '' },
          { label: '线速度 v₁ / v₂', value: `${v1.toFixed(2)}m/s / ${v2.toFixed(2)}m/s`, unit: '' },
          { label: '各自向心力 F₁ / F₂', value: `均为 ${(GRAVITATIONAL_CONSTANT * m1 * m2 / (L * L)).toFixed(2)}`, unit: 'N' },
          { label: '各自向心加速度 a₁ / a₂', value: `${(GRAVITATIONAL_CONSTANT * m2 / (L * L)).toFixed(2)}m/s² / ${(GRAVITATIONAL_CONSTANT * m1 / (L * L)).toFixed(2)}m/s²`, unit: '' },
          { label: '运行周期 T', value: T.toFixed(2), unit: 's', highlight: 'positive' as const }
        )

        formulas.push(
          { name: '引力提供各自向心力 (星1)', latex: 'G\\frac{m_1 m_2}{L^2} = m_1 \\omega^2 r_1', level: 'important' },
          { name: '引力提供各自向心力 (星2)', latex: 'G\\frac{m_1 m_2}{L^2} = m_2 \\omega^2 r_2', level: 'important' },
          { name: '周期与总质量关系', latex: 'T = 2\\pi \\sqrt{\\frac{L^3}{G(m_1 + m_2)}}', level: 'core' }
        )

        gaokaoPoints.push(
          { text: '易错陷阱：万有引力公式中的距离是双星间距 L，而向心力公式中的半径是各自的轨道半径 r₁ 或 r₂，二者绝不能混淆。', importance: 'gaokao' as const },
          { text: '双星做匀速圆周运动的角速度 ω 和周期 T 绝对相等。', importance: 'core' as const },
          { text: '双星的轨道半径、线速度、向心加速度均与它们的质量成反比。', importance: 'gaokao' as const }
        )
      } else {
        // 三星系统
        const { r, fNet, v, T } = calculateTripleStars(L)
        const starMass = 5.0

        quantities.push(
          { label: '三星间距 L', value: L.toFixed(1), unit: 'm' },
          { label: '单星质量 m', value: starMass.toFixed(1), unit: 'kg' },
          { label: '轨道半径 r', value: r.toFixed(2), unit: 'm' },
          { label: '线速度 v', value: v.toFixed(2), unit: 'm/s' },
          { label: '星体合力 F_合', value: fNet.toFixed(2), unit: 'N' },
          { label: '运行周期 T', value: T.toFixed(2), unit: 's', highlight: 'positive' as const }
        )

        formulas.push(
          { name: '等边三角形合向心力', latex: 'F_{\\text{合}} = \\sqrt{3} G \\frac{m^2}{L^2} = m \\omega^2 r', level: 'important' },
          { name: '三星轨道半径关系', latex: 'r = \\frac{L}{\\sqrt{3}}', level: 'core' },
          { name: '三星运转周期', latex: 'T = 2\\pi \\sqrt{\\frac{L^3}{3Gm}}', level: 'derived' }
        )

        gaokaoPoints.push(
          { text: '三星系统的每颗星均受另外两颗星的引力，其合力指向正三角形的中心（质心）。', importance: 'core' as const },
          { text: '三星做圆周运动的角速度 ω、周期 T 和轨道半径 r 完全相等。', importance: 'gaokao' as const }
        )
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
