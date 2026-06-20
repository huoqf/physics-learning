/**
 * 动力学相关动画的物理量看板数据构建。
 *
 * 从 physicsQuantities.ts 拆分而来，涵盖连接体、弹簧力、摩擦力、
 * 平衡、矢量合成、牛顿第二定律、超失重、重力基础、万有引力等动画。
 */
import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from './types'
import {
  GRAVITY,
  calculateEarthGravity,
  calculateFrictionPullModel,
  calculateFrictionInclineModel,
  calculateConnectedBody,
  calculateVectorAddition,
  calculateOrthogonalDecomposition,
  calculateEquilibriumTension,
  calculateNewtonSecondVariableMotion,
  calculateElevatorMotion,
} from '../../physics'

export function buildDynamicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-connected-bodies': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const F = params.F ?? 15
      const mu = params.mu ?? 0.1
      const advancedMode = params.advancedMode ?? 0
      const analysisView = params.analysisView ?? 0 // 0=普通, 1=整体, 2=隔离m1, 3=隔离m2

      // 1. 物理计算（单一来源：calculateConnectedBody）
      const physicsResult = calculateConnectedBody(m1, m2, F, mu, GRAVITY)
      const { isMoving: isMovingPhysically, a: acceleration, T: tension } = physicsResult

      // 2. 运动时间状态推算
      const tMax = 4.0
      const isStarted = time > 0
      const isEnded = advancedMode === 0
        ? false // 基础模式由组件层控制边界
        : time >= tMax

      const isMoving = isStarted && !isEnded && isMovingPhysically

      // 实时物理量
      const currentA = isMoving ? acceleration : 0
      const currentT = isMoving
        ? tension
        : physicsResult.displayTension

      const currentFf1 = physicsResult.f1Max
      const currentFf2 = physicsResult.f2Max

      // 实时物理量看板
      const quantities = [
        ...base,
        { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' as const : undefined },
        { label: '连接内力 T', value: currentT.toFixed(1), unit: 'N', highlight: currentT > 0 ? 'positive' as const : undefined },
        { label: 'm₁ 摩擦力 f₁', value: currentFf1.toFixed(1), unit: 'N' },
        { label: 'm₂ 摩擦力 f₂', value: currentFf2.toFixed(1), unit: 'N' },
      ]

      // 3. 动态公式高亮联动
      const formulas: Formula[] = []
      if (analysisView === 0) {
        formulas.push({ name: '① 整体方程', latex: 'F - f_1 - f_2 = (m_1 + m_2)a', level: 'core' })
        formulas.push({ name: '② 隔离 m₁', latex: 'T - f_1 = m_1 a', level: 'core' })
      } else if (analysisView === 1) {
        formulas.push({ name: '整体方程 (高亮)', latex: 'F - (f_1 + f_2) = (m_1 + m_2)a', level: 'core' })
      } else if (analysisView === 2) {
        formulas.push({ name: '隔离 m₁ (高亮)', latex: 'T - f_1 = m_1 a', level: 'core' })
        formulas.push({ name: '内力结论', latex: 'T = \\frac{m_1}{m_1 + m_2}F', level: 'important', condition: '同材质粗糙面上滑动时', note: '与摩擦系数μ无关' })
      } else if (analysisView === 3) {
        formulas.push({ name: '隔离 m₂ (高亮)', latex: 'F - T - f_2 = m_2 a', level: 'core' })
      }

      // 4. 高考要点
      const gaokaoPoints: GaokaoPoint[] = [
        { text: '整体法与隔离法：求解系统加速度优先用整体法，求解内力必须隔离。', importance: 'core' as const },
        { text: '秒杀结论：在同材质粗糙面上滑动时，绳/弹簧拉力 T = m₁F/(m₁+m₂)，与摩擦系数 μ 无关。', importance: 'gaokao' as const },
        { text: '临界起动条件：外拉力 F 必须大于最大静摩擦力之和 μ(m₁+m₂)g 才能使系统起动。', importance: 'hard' as const },
      ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }

    case 'anim-spring-force': {
      const k = params.k ?? 100
      const m = params.m ?? 1
      const omega = Math.sqrt(k / m)
      const amplitude = 0.5
      const displacement = amplitude * Math.sin(omega * time)
      const potentialEnergy = 0.5 * k * displacement * displacement
      return {
        quantities: [
          ...base,
          { label: '弹性势能 E_p', value: potentialEnergy.toFixed(2), unit: 'J', highlight: potentialEnergy > 0.05 ? 'extreme' : undefined },
          { label: '固有角频率 ω', value: omega.toFixed(2), unit: 'rad/s' }
        ],
        formulas: [
          { name: '胡克定律', latex: 'F = -kx', level: 'core', condition: '弹性限度内' },
          { name: '弹性势能', latex: 'E_p = \\frac{1}{2}kx^2', level: 'important', condition: '弹簧处于自然长度时Ep=0' }
        ],
        gaokaoPoints: [
          { text: '胡克定律中的 x 是形变量（拉伸或压缩量），非弹簧长度。', importance: 'core' as const },
          { text: '弹力方向总是指向弹簧形变恢复的方向，与形变方向相反。', importance: 'core' as const },
          { text: 'F-x图像的斜率代表劲度系数k，图线围成的面积表弹性势能。', importance: 'gaokao' as const }
        ]
      }
    }

    case 'anim-friction': {
      const mode = params.mode ?? 0
      const m = params.m ?? 5
      const mu = params.mu ?? 0.3
      const g = params.g ?? GRAVITY

      if (mode === 0) {
        // 水平外力模型 (f-F)
        const F_applied = params.F_applied ?? 15
        const { a, F_net, isSliding } = calculateFrictionPullModel(m, mu, F_applied, g)

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: isSliding ? '匀加速滑动' : '静止', unit: '', highlight: isSliding ? 'positive' as const : 'zero' as const },
            { label: '合外力 F_合', value: F_net.toFixed(2), unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
            { label: '加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          ],
          formulas: [
            { name: '最大静摩擦力', latex: 'f_{\\text{max}} = \\mu_s F_N = 1.12\\mu mg', level: 'important', note: '1.12为静动摩擦系数比' },
            { name: '滑动摩擦力', latex: 'f_{\\text{slip}} = \\mu F_N = \\mu mg', level: 'core', condition: '水平面上' },
            { name: '滑动状态', latex: 'f = f_{\\text{slip}},\\quad a = \\frac{F - f_{\\text{slip}}}{m}', level: 'core' }
          ],
          gaokaoPoints: [
            { text: '静摩擦力是被动力，范围为 0 至最大静摩擦力。', importance: 'core' as const },
            { text: '滑动摩擦力仅取决于正压力和动摩擦因数，与速度、接触面积均无关。', importance: 'core' as const },
            { text: '最大静摩擦力略大于滑动摩擦力（1.12 倍），临界时摩擦力会突跳。', importance: 'gaokao' as const },
            { text: '解答摩擦力问题必须先判定：静摩擦还是滑动摩擦。', importance: 'gaokao' as const }
          ]
        }
      } else {
        // 斜面倾角模型 (f-θ)
        const angle = params.angle ?? 15
        const { a, criticalAngle, isSliding } = calculateFrictionInclineModel(m, mu, angle, g)

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: isSliding ? '匀加速下滑' : '静止平衡', unit: '', highlight: isSliding ? 'positive' as const : 'zero' as const },
            { label: '临界下滑角 θ_c', value: criticalAngle.toFixed(1), unit: '°', highlight: 'extreme' as const },
            { label: '加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          ],
          formulas: [
            { name: '斜面支持力', latex: 'F_N = mg\\cos\\theta', level: 'core' },
            { name: '下滑重力分力', latex: 'G_x = mg\\sin\\theta', level: 'core' },
            { name: '静止平衡', latex: 'f = G_x = mg\\sin\\theta', level: 'important', condition: '静止时' },
            { name: '下滑滑动', latex: 'f = \\mu F_N = \\mu mg\\cos\\theta', level: 'important', condition: '滑动时' }
          ],
          gaokaoPoints: [
            { text: '临界条件 tan θ_c = μ_s，超过后摩擦力突跳减小。', importance: 'gaokao' as const },
            { text: '静止时 f 随 θ 增大（正弦）；滑动时 f 随 θ 增大而减小（余弦）。', importance: 'hard' as const },
            { text: '若 μ ≥ tan θ，物体无论如何释放均不下滑。', importance: 'hard' as const }
          ]
        }
      }
    }

    case 'anim-equilibrium': {
      const m = params.m ?? 2.0
      const theta1 = params.theta1 ?? 45
      const theta2 = params.theta2 ?? 45
      const mode = params.mode ?? 0 // 0 = 基础悬挂, 1 = 平行四边形, 2 = 正交分解, 3 = 封闭三角形
      const g = GRAVITY
      const gravity = m * g

      const { t1, t2 } = calculateEquilibriumTension(m, theta1, theta2, g)

      const isOverloaded = t1 > 35 || t2 > 35
      const isBroken = t1 > 50 || t2 > 50

      const quantities: PhysicsQuantity[] = [
        ...base,
      ]

      if (isBroken) {
        quantities.push(
          { label: '绳 1 状态', value: t1 > 50 ? '已拉断' : '受力中', unit: '' },
          { label: '绳 2 状态', value: t2 > 50 ? '已拉断' : '受力中', unit: '' },
          { label: '拉力 T₁', value: t1 > 50 ? 0 : t1.toFixed(1), unit: 'N' },
          { label: '拉力 T₂', value: t2 > 50 ? 0 : t2.toFixed(1), unit: 'N' }
        )
      } else {
        if (mode === 2) {
          const { fx: t1x, fy: t1y } = calculateOrthogonalDecomposition(t1, theta1)
          const { fx: t2x, fy: t2y } = calculateOrthogonalDecomposition(t2, theta2)
          quantities.push(
            { label: 'T₁ 水平分力 T1x', value: t1x.toFixed(1), unit: 'N' },
            { label: 'T₂ 水平分量 T2x', value: t2x.toFixed(1), unit: 'N' },
            { label: 'T₁ 竖直分量 T1y', value: t1y.toFixed(1), unit: 'N' },
            { label: 'T₂ 竖直分量 T2y', value: t2y.toFixed(1), unit: 'N' },
            { label: 'x轴合力 ΣFx', value: (t2x - t1x).toFixed(2), unit: 'N', highlight: 'zero' as const },
            { label: 'y轴合力 ΣFy', value: (t1y + t2y - gravity).toFixed(2), unit: 'N', highlight: 'zero' as const }
          )
        } else if (mode === 1) {
          quantities.push(
            { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '等效合力 F合', value: gravity.toFixed(1), unit: 'N', highlight: 'positive' as const }
          )
        } else {
          quantities.push(
            { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined }
          )
        }
      }

      let formulas: Formula[] = [
        { name: '水平方向平衡', latex: 'T_1 \\cos\\theta_1 = T_2 \\cos\\theta_2', level: 'core', condition: '共点力平衡' },
        { name: '竖直方向平衡', latex: 'T_1 \\sin\\theta_1 + T_2 \\sin\\theta_2 = mg', level: 'core', condition: '共点力平衡' }
      ]
      let gaokaoPoints: GaokaoPoint[] = [
        { text: '共点力平衡条件为物体所受合外力为零，即 ΣFx = 0, ΣFy = 0。', importance: 'core' as const },
        { text: '两挂绳夹角趋近于 180° 时，张力趋于无穷大，极易拉断。', importance: 'hard' as const }
      ]

      if (isBroken) {
        formulas = [
          { name: '单摆阻尼方程', latex: '\\theta\'\' + \\gamma \\theta\' + \\frac{g}{L}\\sin\\theta = 0', level: 'supplementary' }
        ]
        gaokaoPoints = [
          { text: '轻绳的最大耐受拉力即为高考受力分析中的临界平衡条件。', importance: 'hard' as const },
          { text: '一绳断裂后，重物做单摆阻尼运动，最终平衡点移至挂点正下方。', importance: 'core' as const }
        ]
      } else if (mode === 1) {
        formulas = [
          { name: '力的平行四边形定则', latex: 'F_{\\text{合}} = \\sqrt{T_1^2 + T_2^2 + 2T_1T_2\\cos(\\theta_1+\\theta_2)}', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '平行四边形定则是矢量运算规律，合力随两力夹角增大而减小。', importance: 'gaokao' as const },
          { text: '合力与分力为"等效替代"关系，大小范围为 |T₁-T₂| ≤ F ≤ T₁+T₂。', importance: 'core' as const }
        ]
      } else if (mode === 2) {
        formulas = [
          { name: '正交分解水平分量', latex: 'T_x = T \\cos\\theta', level: 'core' },
          { name: '正交分解竖直分量', latex: 'T_y = T \\sin\\theta', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '正交分解法常用于复杂受力，可将矢量运算化为代数运算。', importance: 'gaokao' as const },
          { text: '建系原则：应使尽可能多的力落在轴上，以简化正交方程。', importance: 'core' as const }
        ]
      } else if (mode === 3) {
        formulas = [
          { name: '正弦定理形式', latex: '\\frac{T_1}{\\sin(90^\\circ-\\theta_2)} = \\frac{T_2}{\\sin(90^\\circ-\\theta_1)} = \\frac{mg}{\\sin(\\theta_1+\\theta_2)}', level: 'important', condition: '三力平衡' }
        ]
        gaokaoPoints = [
          { text: '三力平衡首尾相接必构成封闭三角形，常用于力的定性分析。', importance: 'hard' as const },
          { text: '高考动态平衡压轴题中，力的封闭三角形图解法是突破核心。', importance: 'gaokao' as const }
        ]
      }

      return {
        quantities,
        formulas,
        gaokaoPoints
      }
    }

    case 'anim-vector-addition': {
      const quantities: PhysicsQuantity[] = [...base]
      const f1 = params.f1 ?? 10
      const f2 = params.f2 ?? 8
      const angle = params.angle ?? 60
      const mode = params.mode ?? 0 // 0=平行四边形, 1=三角形, 2=正交分解

      if (mode === 2) {
        const { fx, fy } = calculateOrthogonalDecomposition(f1, angle)
        quantities.push(
          { label: '水平分量 Fx', value: fx.toFixed(2), unit: 'N' },
          { label: '竖直分量 Fy', value: fy.toFixed(2), unit: 'N' }
        )
      } else {
        const { fResultant, resultAngleDeg } = calculateVectorAddition(f1, f2, angle)

        quantities.push(
          { label: '合力 F', value: fResultant.toFixed(2), unit: 'N', highlight: 'positive' as const },
          { label: '合力偏角 α', value: resultAngleDeg.toFixed(1), unit: '°' }
        )
      }

      let formulas: Formula[] = []
      let gaokaoPoints: GaokaoPoint[] = []

      if (mode === 2) {
        formulas = [
          { name: '水平分量', latex: 'F_x = F \\cos\\theta', level: 'core' },
          { name: '竖直分量', latex: 'F_y = F \\sin\\theta', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '正交分解法是力学最核心的分析工具。', importance: 'gaokao' as const },
          { text: '建系时通常使尽可能多的力落在轴上。', importance: 'core' as const }
        ]
      } else {
        formulas = [
          { name: '合力大小', latex: 'F = \\sqrt{F_1^2 + F_2^2 + 2F_1F_2\\cos\\theta}', level: 'core' },
          { name: '偏角正切', latex: '\\tan\\alpha = \\frac{F_2\\sin\\theta}{F_1 + F_2\\cos\\theta}', level: 'derived' }
        ]
        gaokaoPoints = [
          { text: '力的合成遵循平行四边形与三角形定则。', importance: 'core' as const },
          { text: '合力随两力夹角增大而单调减小。', importance: 'gaokao' as const }
        ]
      }

      return {
        quantities,
        formulas,
        gaokaoPoints
      }
    }

    case 'anim-newton-second': {
      const F = params.F ?? 10
      const m = params.m ?? 2
      const mu = params.mu ?? 0
      const advancedMode = params.advancedMode ?? 0

      let F_applied = F
      let f = 0
      let F_net = 0
      let a = 0
      let v = 0
      let s = 0

      if (advancedMode === 1) {
        // 进阶模式：变力运动
        const modelIdx = (params.modelIdx ?? 0) as 0 | 1
        const k = params.k ?? 2
        const F0 = params.F0 ?? 15
        const omega = params.omega ?? 1.5
        const motion = calculateNewtonSecondVariableMotion(modelIdx, { m, mu, k, F0, omega }, time)
        F_applied = motion.F_applied
        f = motion.f
        F_net = motion.F_net
        a = motion.a
        v = motion.v
        s = motion.s
      } else {
        // 普通模式：匀加速直线运动
        const g = 9.8
        const N = m * g
        f = mu * N
        F_applied = F
        F_net = Math.max(0, F_applied - f)
        a = F_net / m
        v = a * time
        s = 0.5 * a * time * time
      }

      return {
        quantities: [
          ...base,
          { label: '合外力 F_合', value: F_net, unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '加速度 a', value: a, unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '瞬时速度 v', value: v, unit: 'm/s', highlight: v > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '当前位移 s', value: s, unit: 'm' },
        ],
        formulas: [
          { name: '牛顿第二定律', latex: 'F_{\\text{合}} = ma', level: 'core' },
          { name: '合外力计算', latex: 'F_{\\text{合}} = F - f', level: 'core', condition: '水平面上，拉力与摩擦力方向相反' },
          { name: '滑动摩擦力', latex: 'f = \\mu N = \\mu mg', level: 'core', condition: '水平面上滑动时' }
        ],
        gaokaoPoints: [
          { text: '加速度 a 与合外力 F_合 瞬时对应，力变则 a 变。', importance: 'gaokao' as const },
          { text: 'a 的方向始终与合外力 F_合 的方向相同。', importance: 'core' as const },
          { text: '合外力、质量与加速度必须对应同一个研究对象（小车）。', importance: 'core' as const }
        ]
      }
    }

    case 'anim-weightlessness': {
      const m = params.m ?? 50
      const g = params.g ?? 9.8
      const a_param = params.a ?? 2
      const advancedMode = params.advancedMode ?? 0

      let a = a_param
      let v = 0
      let N = m * (g + a)
      let stateName = '正常平衡'

      if (advancedMode === 1) {
        const modelIdx = (params.modelIdx ?? 0) as 0 | 1
        const motion = calculateElevatorMotion(modelIdx, m, g, time)
        a = motion.a
        v = motion.v
        N = motion.N

        if (motion.state === 'overweight') stateName = '超重'
        else if (motion.state === 'underweight') stateName = '失重'
        else if (motion.state === 'weightless') stateName = '完全失重'
        else stateName = '正常平衡'
      } else {
        // 普通模式，恒定加速度：使用 calculateElevatorMotion 统一计算
        const motion = calculateElevatorMotion(2, m, g, time, a_param)
        a = a_param
        v = motion.v
        N = m * (g + a)
        if (N < 0) N = 0

        if (Math.abs(a) < 0.01) stateName = '正常平衡'
        else if (Math.abs(a + g) < 0.1) stateName = '完全失重'
        else if (a > 0) stateName = '超重'
        else stateName = '失重'
      }

      return {
        quantities: [
          ...base,
          { label: '电梯加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : a < -0.05 ? 'negative' as const : 'zero' as const },
          { label: '支持力/视重 N', value: N.toFixed(1), unit: 'N', highlight: N > m * g + 0.1 ? 'positive' as const : N < 0.1 ? 'zero' as const : N < m * g - 0.1 ? 'negative' as const : undefined },
          { label: '真实重力 G', value: (m * g).toFixed(1), unit: 'N' },
          { label: '电梯速度 v', value: v.toFixed(2), unit: 'm/s' },
          { label: '超失重状态', value: stateName, unit: '', highlight: stateName === '超重' ? 'positive' as const : stateName === '完全失重' ? 'extreme' as const : stateName === '失重' ? 'negative' as const : undefined }
        ],
        formulas: [
          { name: '视重计算公式', latex: 'N = m(g + a)', level: 'core', condition: '取向上为正方向' },
          { name: '牛顿第二定律', latex: 'N - mg = ma', level: 'core', condition: '取向上为正方向' }
        ],
        gaokaoPoints: [
          { text: '【实重与视重】物体的真实重力 mg 保持不变，改变的仅是支持力（视重）。', importance: 'core' as const },
          { text: '【加速度决定态】状态仅由 a 的方向决定：a 向上则超重，a 向下则失重，与速度方向无关。', importance: 'gaokao' as const },
          { text: '【完全失重】当 a = -g 时，支持力 N = 0，物体在空中处于漂浮态。', importance: 'core' as const }
        ]
      }
    }

    case 'anim-gravity-basic': {
      const mode = params.mode ?? 0

      if (mode === 0) {
        // 地球自转模式
        const latitude = params.latitude ?? 45
        const omegaScale = params.omegaScale ?? 80
        const m = 1.0
        const F_gravitation = 100 // 相对基准大小
        const { F_grav, F_centripetal, G_force, angleDeviation } = calculateEarthGravity(
          latitude, m, F_gravitation, omegaScale
        )
        return {
          quantities: [
            ...base,
            { label: '引力 F_引 (相对)', value: F_grav.toFixed(1), unit: 'N' },
            { label: '向心力 F_向 (相对)', value: F_centripetal.toFixed(1), unit: 'N', highlight: F_centripetal > 1.5 ? 'positive' : undefined },
            { label: '实际重力 G (相对)', value: G_force.toFixed(1), unit: 'N', highlight: 'positive' as const },
            { label: '重力偏角 θ', value: angleDeviation.toFixed(2), unit: '°', highlight: angleDeviation > 0.5 ? 'extreme' : undefined }
          ],
          formulas: [
            { name: '引力分解关系', latex: '\\vec{F}_{\\text{引}} = \\vec{G} + \\vec{F}_{\\text{向}}', level: 'core' },
            { name: '极点状态(向心力=0)', latex: 'G = F_{\\text{引}}', level: 'important', condition: '两极处' },
            { name: '赤道状态(向心力最大)', latex: 'G = F_{\\text{引}} - F_{\\text{向}}', level: 'important', condition: '赤道处' }
          ],
          gaokaoPoints: [
            { text: '重力是万有引力的一个分力，方向竖直向下不指向地心。', importance: 'core' as const },
            { text: '重力加速度 g 随纬度升高而增大，赤道最小、两极最大。', importance: 'core' as const }
          ]
        }
      }

      // mode=1: 悬挂法重心实验
      const suspendPoint = params.suspendPoint ?? 0
      const showWeight = params.showWeight ?? 0
      const weightMass = params.weightMass ?? 1.2

      const baseCenterX = 5, baseCenterY = 5
      let centerX = baseCenterX, centerY = baseCenterY
      if (showWeight === 1) {
        const totalMass = 1.0 + weightMass
        centerX = (baseCenterX * 1.0 + (params.weightX ?? 25) * weightMass) / totalMass
        centerY = (baseCenterY * 1.0 + (params.weightY ?? 25) * weightMass) / totalMass
      }

      return {
        quantities: [
          ...base,
          { label: '当前悬挂孔', value: `A${suspendPoint + 1}`, unit: '' },
          { label: '重心 C 坐标', value: `(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`, unit: '本地单位' },
          { label: '配重状态', value: showWeight === 1 ? '已启用' : '未启用', unit: '' },
          ...(showWeight === 1 ? [
            { label: '配重质量 M', value: weightMass.toFixed(1), unit: '倍板质量' },
          ] : []),
        ],
        formulas: [
          { name: '悬挂法原理', latex: '平衡时重心在悬挂点正下方', level: 'core', condition: '薄板自由悬挂静止后' },
          { name: '重心定义', latex: '\\vec{r}_C = \\frac{\\sum m_i \\vec{r}_i}{\\sum m_i}', level: 'important', condition: '质量分布确定时重心唯一' },
          { name: '确定重心', latex: '两条悬挂线交点 = 重心', level: 'core', condition: '不同悬挂点各画一条铅垂线' },
        ],
        gaokaoPoints: [
          { text: '悬挂法找重心：从不同点悬挂薄板，静止后沿悬挂线画铅垂线，交点即重心。', importance: 'core' as const },
          { text: '重心不一定在物体上（如空心环、不规则薄板）。', importance: 'gaokao' as const },
          { text: '重心位置与悬挂点无关，由质量分布唯一确定。', importance: 'core' as const },
        ],
      }
    }

    case 'anim-gravity': {
      const mode = params.mode ?? 0 // 0=相对单位, 1=真实尺度
      const preset = params.preset ?? 0 // 0=自定义, 1=地月, 2=日地, 3=同步卫星, 4=宇航员
      const G = 6.674e-11

      let m1 = params.m1 ?? 1000
      let m2 = params.m2 ?? 10
      let r = params.r ?? 5
      let F_val = 0

      if (mode === 1) {
        // 真实尺度模式
        let realM1 = 5.97e24
        let realM2 = 7.35e22
        let realR = 3.84e8
        let name1 = '地球'
        let name2 = '月球'

        switch (preset) {
          case 1:
            realM1 = 5.97e24
            realM2 = 7.35e22
            realR = 3.84e8
            name1 = '地球'
            name2 = '月球'
            break
          case 2:
            realM1 = 1.99e30
            realM2 = 5.97e24
            realR = 1.50e11
            name1 = '太阳'
            name2 = '地球'
            break
          case 3:
            realM1 = 5.97e24
            realM2 = 1.00e3
            realR = 4.22e7
            name1 = '地球'
            name2 = '同步卫星'
            break
          case 4:
            realM1 = 5.97e24
            realM2 = 80
            realR = 6.77e6
            name1 = '地球'
            name2 = '宇航员'
            break
          default:
            // 自定义：用 params 的滑块相对放大作为真实尺度
            realM1 = (params.m1 ?? 1000) * 1e21
            realM2 = (params.m2 ?? 10) * 1e20
            realR = (params.r ?? 5) * 1e7
            name1 = '天体 1'
            name2 = '天体 2'
            break
        }

        F_val = (G * realM1 * realM2) / (realR * realR)

        return {
          quantities: [
            ...base,
            { label: `${name1}质量 m₁`, value: realM1.toExponential(2), unit: 'kg' },
            { label: `${name2}质量 m₂`, value: realM2.toExponential(2), unit: 'kg' },
            { label: '天体间距 r', value: realR.toExponential(2), unit: 'm' },
            { label: '万有引力 F', value: F_val.toExponential(2), unit: 'N', highlight: 'positive' as const },
            { label: '引力常数 G', value: '6.674×10⁻¹¹', unit: 'N·m²/kg²' }
          ],
          formulas: [
            { name: '万有引力定律', latex: 'F = G \\frac{m_1 m_2}{r^2}', level: 'core', condition: '质点或均匀球体' }
          ],
          gaokaoPoints: [
            { text: '万有引力是重力的本源，重力通常是引力的分力。', importance: 'core' as const },
            { text: '天体间距远大于自身半径时，天体才能简化为质点。', importance: 'basic' as const },
            { text: '引力常数 G 由卡文迪什通过扭秤实验测得，被誉为"称量地球第一人"。', importance: 'gaokao' as const }
          ]
        }
      } else {
        // 相对单位模式
        F_val = (m1 * m2) / (r * r)
        return {
          quantities: [
            ...base,
            { label: '天体 1 质量 m₁', value: m1, unit: '相对单位' },
            { label: '天体 2 质量 m₂', value: m2, unit: '相对单位' },
            { label: '天体间距 r', value: r.toFixed(1), unit: '相对单位' },
            { label: '万有引力 F_引', value: F_val.toFixed(2), unit: '相对单位', highlight: 'positive' as const },
            { label: '比例关系占比', value: 'F ∝ m₁m₂/r²', unit: '' }
          ],
          formulas: [
            { name: '比例变化关系', latex: 'F \\propto \\frac{m_1 m_2}{r^2}', level: 'core' }
          ],
          gaokaoPoints: [
            { text: '引力大小与物体质量乘积成正比，与距离平方成反比。', importance: 'core' as const },
            { text: '万有引力具有相互性，天体1对2的引力等于天体2对1的引力。', importance: 'core' as const },
            { text: '在轨道运动中，万有引力提供环绕天体所需的向心力。', importance: 'gaokao' as const }
          ]
        }
      }
    }

    default:
      return null
  }
}
