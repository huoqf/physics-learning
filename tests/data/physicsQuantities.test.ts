import { describe, it, expect, beforeAll } from 'vitest'
import { buildPhysicsQuantities, preloadQuantityBuilder } from '@/data/physicsQuantities'
import { calculateCapacitor, VACUUM_PERMITTIVITY } from '@/physics'

function find(qs: ReturnType<typeof buildPhysicsQuantities>, label: string) {
  return qs.quantities.find((q) => q.label.startsWith(label))?.value
}

// 预加载所有测试涉及的构建器
const TEST_ANIM_IDS = [
  'anim-momentum-conservation',
  'anim-experiment-momentum',
  'anim-experiment-mechanical-energy',
  'anim-experiment-newton-second',
  'anim-charge-elementary',
  'anim-coulomb-law',
  'anim-electric-field',
  'anim-charge-in-efield',
  'anim-capacitor',
  'anim-field-lines',
  'anim-electric-potential',
  'anim-electrostatic-shielding',
  'anim-equal-charge-field',
  'anim-ohm-law',
  'anim-circuit-analysis',
  'anim-closed-circuit',
  'anim-oblique-throw',
  'anim-circular-motion',
  'anim-centripetal',
  'anim-lc-oscillation',
  'anim-em-wave',
  'anim-em-spectrum',
  'anim-bullet-block',
  'anim-forced-resonance',
  'anim-double-slit-interference',
  'anim-experiment-double-slit',
  'anim-simple-pendulum',
  'anim-experiment-pendulum',
  'anim-nuclear-decay',
  'anim-decay-magnetic-orbit',
]

describe('buildPhysicsQuantities', () => {
  beforeAll(async () => {
    await Promise.all(TEST_ANIM_IDS.map((id) => preloadQuantityBuilder(id)))
  })

  it('受迫振动与共振物理量构建器正确输出固有频率与振幅', () => {
    const qs = buildPhysicsQuantities(
      'anim-forced-resonance',
      { m: 1.0, k: 39.5, gamma: 0.5, F0: 2.0, f: 1.0, mode: 1 },
      0
    )
    expect(find(qs, '系统固有频率')).toBeCloseTo(1.0, 1)
    expect(find(qs, '受迫振动振幅')).toBeGreaterThan(0)
  })

  it('动量守恒动画满足碰前=碰后总动量', () => {
    const qs = buildPhysicsQuantities(
      'anim-momentum-conservation',
      { m1: 2, m2: 3, v1: 5, v2: 0, e: 0.8 },
      0
    )
    expect(find(qs, '碰前总动量')).toBeCloseTo(find(qs, '碰后总动量') as number, 10)
  })

  it('气轨验证动量守恒实验物理量构建器正确输出光电门挡光时间、速度与守恒动量', () => {
    const qs = buildPhysicsQuantities(
      'anim-experiment-momentum',
      {
        m1_exp: 0.4,
        m2_exp: 0.2,
        v1_exp: 0.8,
        plateWidth_mm: 20.0,
        collisionType_exp: 0,
      },
      0
    )
    expect(find(qs, '挡光片宽度 Δx')).toContain('20.0')
    expect(find(qs, '碰前门1挡光时间 Δt₁')).toBe('0.0250')
    expect(find(qs, '碰前初速度 v₁')).toBe('0.800')
    expect(find(qs, '碰前总动量 p_前')).toBe('0.320')
    expect(find(qs, '碰后总动量 p_后')).toBe('0.320')
    expect(find(qs, '动量守恒相对偏差')).toBe('+0.00%')
  })

  it('未知动画没有任何声明，兜底为空而不是猜标签', () => {
    const qs = buildPhysicsQuantities('anim-unknown', { foo: 1 }, 0)
    expect(qs.quantities).toHaveLength(0)
  })

  // ===== 电磁学 · 静电场（M4-1）=====
  it('电荷与元电荷：接触起电守恒且密立根油滴给出平衡电压与整数倍电量', () => {
    const ch = buildPhysicsQuantities('anim-charge-elementary', { mode: 0, method: 1, step: 2, qAInit: 6, qBInit: -2 }, 0)
    expect(find(ch, '物体 A 当前电量')).toBe('+2.0')
    expect(find(ch, '系统总电量')).toBe('+4.0')

    const millikan = buildPhysicsQuantities('anim-charge-elementary', { mode: 1, voltageU: 490, plateGapMm: 5, chargeMultipleN: 2, dropMass1e15: 3.2 }, 0)
    expect(find(millikan, '悬浮平衡电压')).toBe('490.0')
    expect(find(millikan, '元电荷整数倍')).toBe('2')
  })

  it('库仑定律：异号判定相互吸引，含零电荷判定无相互作用', () => {
    const qs = buildPhysicsQuantities('anim-coulomb-law', { q1: 2, q2: -3, r: 4 }, 0)
    expect(find(qs, '作用类型')).toBe('相互吸引')
    expect(find(qs, '库仑力')).toBeDefined()

    const zero = buildPhysicsQuantities('anim-coulomb-law', { q1: 0, q2: 3, r: 4 }, 0)
    expect(find(zero, '作用类型')).toBe('无相互作用')
  })

  it('点电荷电场：场强 E 大小计算正确，且 mode=1 按二维坐标与中屏一致', () => {
    const qs = buildPhysicsQuantities('anim-electric-field', { q: -5, rTest: 2 }, 0)
    expect(find(qs, '场强 E')).toBeDefined()

    const sym = buildPhysicsQuantities('anim-electric-field', { mode: 1, chargeConfig: 1, testXCm: 0, testYCm: 3, rTest: 3, qTest: 1 }, 0)
    // 等量同正在中垂线上合场强不为无穷大奇点
    expect(String(find(sym, '合场强 E'))).not.toContain('10⁹')
  })

  it('电场线与等势面 / 电势与电势差 / 静电屏蔽看板构建器完整输出', () => {
    const fl = buildPhysicsQuantities('anim-field-lines', { topology: 2, qSource: 5, probeX: 420, probeY: 150, probeStartX: 420, probeStartY: 150 }, 0)
    expect(find(fl, '拓扑场景')).toBe('等量异种电荷')
    expect(Number(find(fl, '当前点电势 φ'))).toBeCloseTo(0, 2)

    const ep = buildPhysicsQuantities('anim-electric-potential', { phiA: 120, phiB: -40, qProbe: -2, slopeK: 150 }, 0)
    expect(find(ep, '两点电势差 U_AB')).toBe('160.0')

    const sh = buildPhysicsQuantities('anim-electrostatic-shielding', { E0: 450, mode: 1, isGrounded: 1, tipRadius: 0.2 }, 0)
    expect(find(sh, '内部合场强')).toBe(0)
    expect(find(sh, '空气放电状态')).toBe('击穿放电')
  })

  it('带电粒子在匀强电场：加速度与末速度合理', () => {
    const qs = buildPhysicsQuantities('anim-charge-in-efield', { U: 200, v0: 20, q: 5 }, 0)
    expect(find(qs, '加速度')).toBeDefined()
    expect(find(qs, '末速度')).toBeDefined()
  })

  it('电容器：增大 εᵣ 电容增大', () => {
    const c1 = find(buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 }, 0), '电容') as number
    const c2 = find(buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 4, U: 12, connected: 1 }, 0), '电容') as number
    expect(c2).toBeCloseTo(c1 * 4, 6)
  })

  it('电容器断电源：Q 守恒，增大 d 时 U 变大', () => {
    const a = buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 0 }, 0)
    expect(find(a, '电势差') as number).toBeCloseTo(12, 4)
    expect(find(a, '板间场强') as number).toBeCloseTo(2400, 2)
    const b = buildPhysicsQuantities('anim-capacitor', { S: 100, d: 10, epsilon_r: 1, U: 12, connected: 0 }, 0)
    expect(find(b, '电势差') as number).toBeCloseTo(24, 4)
    expect(find(b, '板间场强') as number).toBeCloseTo(2400, 2)
  })

  it('电容器先改参数充入高电荷后断开：savedQ 精确守恒，不回退默认几何', () => {
    // 假设在接通下 S=200, d=2 充入的电荷量
    const c0 = calculateCapacitor(VACUUM_PERMITTIVITY, 200 * 1e-4, 2 * 1e-3).C
    const customQ = c0 * 12
    // 断开电源，且板间距 d 从 2 变为 4（电容减半，电压翻倍到 24V）
    const res = buildPhysicsQuantities('anim-capacitor', { S: 200, d: 4, epsilon_r: 1, U: 12, connected: 0, savedQ: customQ }, 0)
    expect(find(res, '电荷量') as number).toBeCloseTo(customQ * 1e12, 4)
    expect(find(res, '电势差') as number).toBeCloseTo(24, 4)
  })

  // ===== 电磁学 · 恒定电流（M4-1）=====
  it('欧姆定律：I = U/R', () => {
    const qs = buildPhysicsQuantities('anim-ohm-law', { U: 6, R: 3 }, 0)
    expect(parseFloat(find(qs, '瞬时电流') as string)).toBeCloseTo(2, 10)
  })

  it('串并联：串联 R总=R₁+R₂，并联更小', () => {
    const s = buildPhysicsQuantities('anim-circuit-analysis', { U: 12, R1: 4, R2: 2, subMode: 0 }, 0)
    expect(find(s, '当前拓扑')).toContain('串联')
    expect(find(s, '等效总电阻') as number).toBeCloseTo(6, 10)
    const p = buildPhysicsQuantities('anim-circuit-analysis', { U: 12, R1: 4, R2: 4, subMode: 1 }, 0)
    expect(find(p, '当前拓扑')).toContain('并联')
    expect(find(p, '等效总电阻') as number).toBeCloseTo(2, 10)
  })

  it('闭合电路：EMF=6 r=1 R=5 → I=1, U端=5, η≈83.3%', () => {
    const qs = buildPhysicsQuantities('anim-closed-circuit', { EMF: 6, r: 1, R: 5 }, 0)
    expect(parseFloat(find(qs, '干路电流') as string)).toBeCloseTo(1, 10)
    expect(find(qs, '路端电压') as number).toBeCloseTo(5, 10)
    expect(parseFloat(find(qs, '电源效率') as string)).toBeCloseTo((5 / 6) * 100, 1)
  })

  it('斜抛运动物理量计算：包含水平位移、竖直高度及实时速度', () => {
    const qs = buildPhysicsQuantities('anim-oblique-throw', { v0: 15, angle: 45, g: 9.8, airResistance: 0 }, 1)
    expect(find(qs, '水平位移')).toBeDefined()
    expect(find(qs, '竖直高度')).toBeDefined()
    expect(find(qs, '实时速度')).toBeDefined()
  })

  it('匀速圆周运动物理量：进阶模式额外包含水平/竖直坐标及向心加速度', () => {
    const qs = buildPhysicsQuantities('anim-circular-motion', { r: 2, omega: 1.5, advancedMode: 1 }, 1)
    expect(find(qs, '线速度')).toBeDefined()
    expect(find(qs, '水平坐标')).toBeDefined()
    expect(find(qs, '竖直坐标')).toBeDefined()
    expect(find(qs, '向心加速度')).toBeDefined()
  })

  it('向心力物理量：进阶模式包含向心力且数值计算正确', () => {
    const qs = buildPhysicsQuantities('anim-centripetal', { r: 2, v: 4, m: 3, advancedMode: 0 }, 1)
    expect(find(qs, '向心加速度') as number).toBeCloseTo(8, 5)
    expect(find(qs, '向心力') as number).toBeCloseTo(24, 5)
  })

  // ===== 电磁学 · 电磁振荡与电磁波 =====
  it('LC 振荡：包含物理量、公式与高考要点', () => {
    const qs = buildPhysicsQuantities('anim-lc-oscillation', { scene: 0, L: 1, C: 1, Q0: 1 }, 0)
    expect(find(qs, '电容器电荷量')).toBeDefined()
    expect(Number(find(qs, '极板间电压'))).toBeCloseTo(1, 6)
    expect(Number(find(qs, '自感电动势'))).toBeCloseTo(1, 6)
    expect(Number(find(qs, '能量变化周期'))).toBeCloseTo(Math.PI, 6)
    expect(qs.formulas && qs.formulas.length > 0).toBe(true)
    expect(qs.gaokaoPoints && qs.gaokaoPoints.length > 0).toBe(true)

    const qsCharging = buildPhysicsQuantities('anim-lc-oscillation', { scene: 0, switchPos: 1, L: 1, C: 0.5, Q0: 2 }, 1.2)
    expect(Number(find(qsCharging, '电容器电荷量'))).toBeCloseTo(2, 6)
    expect(Number(find(qsCharging, '极板间电压'))).toBeCloseTo(4, 6)
    expect(Number(find(qsCharging, '回路电流'))).toBe(0)
    expect(Number(find(qsCharging, '自感电动势'))).toBe(0)
    expect(find(qsCharging, '工作阶段')).toContain('直流充电')
  })

  it('电磁波：包含波速公式与麦克斯韦理论高考要点', () => {
    const qs = buildPhysicsQuantities('anim-em-wave', { scene: 1, fEM: 100 }, 0)
    expect(find(qs, '电磁波频率')).toBeDefined()
    expect(qs.formulas?.some((f) => f.name.includes('波速'))).toBe(true)
    expect(qs.gaokaoPoints?.some((g) => g.text.includes('麦克斯韦'))).toBe(true)
  })

  it('电磁波谱：包含波谱顺序高考要点与典型应用', () => {
    const qs = buildPhysicsQuantities('anim-em-spectrum', { scene: 2, band: 3 }, 0)
    expect(find(qs, '谱段')).toBe('可见光')
    expect(qs.gaokaoPoints?.some((g) => g.text.includes('电磁波谱顺序'))).toBe(true)
  })

  // ===== 动量 · 子弹打木块自动模式联动校验 =====
  it('子弹打木块：初速低于临界时自动判定为留存模式并计算共速', () => {
    // m=0.1, M=0.4, v0=8, f=10, L=1 -> vCrit≈15.8m/s -> 留存
    const qs = buildPhysicsQuantities('anim-bullet-block', { m: 0.1, M: 0.4, v0: 8, f: 10, L: 1 }, 0)
    expect(find(qs, '运动模式')).toBe('留存模式')
    expect(find(qs, '共速速度')).toBe('1.60') // v = 0.1*8 / 0.5 = 1.6
    expect(find(qs, '相对位移 Δx')).toBeDefined()
    expect(qs.formulas?.some((f) => f.name.includes('动量守恒'))).toBe(true)
  })

  it('子弹打木块：初速高于临界时自动判定为穿透模式并计算穿出速度', () => {
    // m=0.1, M=0.4, v0=30, f=10, L=1 -> vCrit≈15.8m/s -> 穿透
    const qs = buildPhysicsQuantities('anim-bullet-block', { m: 0.1, M: 0.4, v0: 30, f: 10, L: 1 }, 0)
    expect(find(qs, '运动模式')).toBe('穿透模式')
    expect(find(qs, '穿出子弹速度')).toBeDefined()
    expect(find(qs, '穿出木块速度')).toBeDefined()
    expect(find(qs, '摩擦生热 Q')).toBe('10.0') // Q = f * L = 10 * 1 = 10 J
    expect(qs.formulas?.some((f) => f.latex.includes('m v_1 + M v_2'))).toBe(true)
  })

  // ===== 光学 · 双缝干涉测波长实验看板防除零与量程保护 =====
  it('双缝干涉实验看板：即使 slitDistance=0 也能安全防除零，绝不产生 NaN', () => {
    const qs = buildPhysicsQuantities(
      'anim-experiment-double-slit',
      { slitDistance: 0, screenDistance: 0 },
      0
    )
    expect(qs.quantities.length).toBeGreaterThan(0)
    qs.quantities.forEach((q) => {
      expect(String(q.value)).not.toBe('NaN')
      expect(String(q.value)).not.toBe('Infinity')
    })
  })

  it('双缝干涉实验看板：极端宽条纹时正确触发螺旋测微器超量程警示', () => {
    // d=0.1, L=2.0 -> x4 > 50mm -> 超量程
    const qs = buildPhysicsQuantities(
      'anim-experiment-double-slit',
      { slitDistance: 0.1, screenDistance: 2.0, targetFringe: 4 },
      0
    )
    expect(qs.warnings?.some((w) => w.text.includes('超过螺旋测微器量程'))).toBe(true)
  })

  it('双缝干涉实验看板：大负向偏置导致读数 < 0 时正确触发低于零刻度警示', () => {
    const qs = buildPhysicsQuantities(
      'anim-experiment-double-slit',
      { currentFringe: 1, handwheelOffset: -5.0 },
      0
    )
    expect(qs.warnings?.some((w) => w.text.includes('低于螺旋测微器零刻度基准'))).toBe(true)
  })

  // ===== 单摆振动与高考实验（含模式 0、1、2、3）=====
  it('单摆物理量构建器：简谐与能量守恒模式正常输出', () => {
    const qs0 = buildPhysicsQuantities('anim-simple-pendulum', { mode: 0, L: 1.0, g: 9.8, theta0: 5 }, 0)
    expect(Number(find(qs0, '重力 G'))).toBeCloseTo(9.8, 1)

    const qs1 = buildPhysicsQuantities('anim-simple-pendulum', { mode: 1, L: 1.0, g: 9.8, theta0: 30 }, 0)
    expect(Number(find(qs1, '真实周期 T_real'))).toBeGreaterThan(2.007)

    const qs2 = buildPhysicsQuantities('anim-simple-pendulum', { mode: 2, L: 1.0, g: 9.8, theta0: 10 }, 0)
    expect(Number(find(qs2, '总机械能 E'))).toBeGreaterThan(0)
  })

  it('单摆实验物理量构建器正确解析参数并输出自洽重力加速度与小角偏差', () => {
    const qsExp = buildPhysicsQuantities(
      'anim-experiment-pendulum',
      {
        l_line: 0.99,
        d_mm: 20.0,
        n_cycles: 40,
        g: 9.8,
        timing_err: 0,
        theta0_exp: 4,
      },
      0
    )
    expect(Number(find(qsExp, '有效摆长 L'))).toBeCloseTo(1.0, 3)
    expect(Number(find(qsExp, '单摆周期 T'))).toBeCloseTo(2.007, 2)
    expect(Number(find(qsExp, '测得重力加速度 g_测'))).toBeCloseTo(9.8, 1)
    expect(find(qsExp, '小角理论偏差')).toBeDefined()
    expect(String(find(qsExp, '小角理论偏差'))).toContain('%')
  })

  // ===== 验证动量守恒气轨实验物理量构建器 =====
  it('气轨实验物理量构建器正确输出动量对比表与反弹负动量', () => {
    // 1. 标准同向碰撞 (m1 > m2)
    const qsNormal = buildPhysicsQuantities(
      'anim-experiment-momentum',
      {
        m1_exp: 0.4,
        m2_exp: 0.2,
        v1_exp: 0.8,
        plateWidth_mm: 20.0,
        collisionType_exp: 0,
      },
      0
    )
    expect(Number(find(qsNormal, '滑块1质量 m₁'))).toBeCloseTo(0.4, 3)
    expect(Number(find(qsNormal, '滑块2质量 m₂'))).toBeCloseTo(0.2, 3)
    expect(Number(find(qsNormal, '碰前门1挡光时间 Δt₁'))).toBeCloseTo(0.025, 4)
    expect(Number(find(qsNormal, '碰前总动量 p_前'))).toBeCloseTo(0.32, 3)
    expect(Number(find(qsNormal, '碰后总动量 p_后'))).toBeCloseTo(0.32, 3)
    expect(Number(find(qsNormal, '滑块2碰后动量 p₂\''))).toBeCloseTo(0.213, 2)
    expect(find(qsNormal, '动量守恒相对偏差')).toBe('+0.00%')

    // 2. 反弹模式 (m1 < m2)
    const qsRebound = buildPhysicsQuantities(
      'anim-experiment-momentum',
      {
        m1_exp: 0.2,
        m2_exp: 0.6,
        v1_exp: 0.8,
        plateWidth_mm: 20.0,
        collisionType_exp: 0,
      },
      0
    )
    expect(Number(find(qsRebound, '滑块1碰后速度 v₁\''))).toBeLessThan(0)
    expect(Number(find(qsRebound, '滑块1碰后动量 p₁\''))).toBeLessThan(0)
    expect(find(qsRebound, '反弹门1挡光时间 Δt₁\'')).toBeDefined()
    expect(Number(find(qsRebound, '碰前总动量 p_前'))).toBeCloseTo(0.16, 3)
    expect(Number(find(qsRebound, '碰后总动量 p_后'))).toBeCloseTo(0.16, 3)
  })

  it('力学实验拆分：验证机械能守恒与牛顿第二定律实验看板正常输出', () => {
    const qsEnergy = buildPhysicsQuantities(
      'anim-experiment-mechanical-energy',
      { freq: 50, m: 0.2, friction: 2 },
      0.3
    )
    expect(qsEnergy.quantities.length).toBeGreaterThan(0)
    expect(Number(find(qsEnergy, '纸带实测加速度'))).toBeCloseTo(9.8 * 0.98, 2)

    const qsNewton = buildPhysicsQuantities(
      'anim-experiment-newton-second',
      { mode: 0, M_cart: 0.4, m_hook: 0.05, balanceMode: 0, freq: 50 },
      0.8
    )
    expect(Number(find(qsNewton, '细绳真实拉力'))).toBeGreaterThan(0)
    expect(Number(find(qsNewton, '小车实测加速度'))).toBeCloseTo((0.05 * 9.8) / 0.45, 2)
  })

  it('静电场 Phase 2 新增与升级看板：等量电荷场线 / 库仑摆 / 带屏漂移示波管 / 内外屏蔽', () => {
    // 1. 等量电荷场线模型
    const qsEqual = buildPhysicsQuantities(
      'anim-equal-charge-field',
      { chargeType: 1, axis: 1, qMicroC: 5, halfSepCm: 3 },
      3.0,
    )
    expect(Number(find(qsEqual, '中点 O 场强'))).toBeCloseTo(0, 3)

    // 2. 库仑摆模式 (mode=2)
    const qsPendulum = buildPhysicsQuantities('anim-coulomb-law', { mode: 2, q1: 2, q2: 2, mGram: 20, stringLenCm: 30 }, 0)
    expect(find(qsPendulum, '平衡状态')).toBe('同号对称张开')
    expect(Number(find(qsPendulum, '平衡偏角'))).toBeGreaterThan(30)

    const qsPendulumOpp = buildPhysicsQuantities('anim-coulomb-law', { mode: 2, q1: 2, q2: -2, mGram: 20, stringLenCm: 30 }, 0)
    expect(find(qsPendulumOpp, '平衡状态')).toBe('异号吸引无法张开')

    // 3. 带电粒子在匀强电场中运动：负电荷 + 荧光屏总偏转 Y
    const qsInPlate = buildPhysicsQuantities(
      'anim-charge-in-efield',
      { U: 150, v0: 15, q: -2, freq: 30, isAC: 0, useGravity: 0, phi0: 0, showScreen: 1 },
      0.5,
    )
    expect(Number(find(qsInPlate, '加速度 ay'))).toBeLessThan(0)

    const qsScreen = buildPhysicsQuantities(
      'anim-charge-in-efield',
      { U: 150, v0: 15, q: -2, freq: 30, isAC: 0, useGravity: 0, phi0: 0, showScreen: 1 },
      2.5,
    )
    expect(Number(find(qsScreen, '加速度 ay'))).toBe(0)
    expect(Number(find(qsScreen, '荧光屏总偏转 Y'))).toBeGreaterThan(0)
    expect(qsScreen.formulas?.some((f) => f.name.includes('示波管荧光屏偏转'))).toBe(true)

    const qsAC = buildPhysicsQuantities(
      'anim-charge-in-efield',
      { U: 150, v0: 15, q: 2, freq: 30, isAC: 1, useGravity: 0, phi0: 0, showScreen: 0 },
      0.5,
    )
    expect(qsAC.formulas?.some((f) => f.name.includes('示波管荧光屏偏转'))).toBe(false)

    // 4. 静电屏蔽内屏蔽模式 (mode=2, shieldType=1) 不再误显示外加电场 E_0
    const qsShield = buildPhysicsQuantities(
      'anim-electrostatic-shielding',
      { E0: 300, mode: 2, shieldType: 1, isGrounded: 1, tipRadius: 1.0 },
      0,
    )
    expect(find(qsShield, '外加电场强度')).toBeUndefined()
    expect(find(qsShield, '空腔屏蔽方案')).toBe('内屏蔽（腔内 +Q）')
    expect(find(qsShield, '壳外受内荷附加场')).toBe('0')
  })
})


