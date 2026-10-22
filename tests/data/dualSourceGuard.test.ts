/**
 * 第 3 批双真源收口 · A 组回归测试。
 *
 * 每一条都直接断言**看板输出值**与"中屏那套常量算出来的值"一致，
 * 而不是只断言常量等于多少——只有这样才能挡住"以后又改回硬编码"。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildPhysicsQuantities, preloadQuantityBuilder } from '@/data/physicsQuantities'
import {
  TWO_CHARGE_SEPARATION_M,
  FARADAY_UNIFORM_B0,
  SATELLITE_LAUNCH_RADIUS_RATIO,
  computeACGenerationState,
  computeRCTransient,
  rcTauFromParams,
  computeProjectileStrobe,
  computeCentripetalFit,
} from '@/physics'
import { electromagnetismElectrostaticsAnimations } from '@/data/registries/electromagnetism-electrostatics'
import { LAYOUT } from '@/features/mechanics/gravitation/satelliteLayout'

const EPS = 1e-9
const K = 9e9

function value(panel: ReturnType<typeof buildPhysicsQuantities>, label: string) {
  return panel.quantities.find((q) => q.label.startsWith(label))?.value
}

function num(panel: ReturnType<typeof buildPhysicsQuantities>, label: string): number {
  return Number.parseFloat(String(value(panel, label)))
}

describe('A 组 · 中屏与看板共用同一套常量/函数', () => {
  beforeAll(async () => {
    await Promise.all(
      ['anim-electric-field', 'anim-field-lines', 'anim-ac-lc-impedance', 'anim-faraday-law', 'anim-binary-stars'].map((id) =>
        preloadQuantityBuilder(id),
      ),
    )
  })

  // ── #6 电场强度：半间距 3cm，而不是 5.25cm ────────────────────────────────
  it('场强进阶：等量异种电荷中点的合场强 = 2kQ/(3cm)²', () => {
    const half = TWO_CHARGE_SEPARATION_M / 2
    expect(half).toBeCloseTo(0.03, 12)
    const expected = (2 * K * 5e-6) / (half * half) // 1.0×10⁸ N/C
    const panel = buildPhysicsQuantities('anim-electric-field', { mode: 1, chargeConfig: 0, rTest: 0 }, 0)
    expect(num(panel, '合场强 E')).toBeCloseTo(expected, -6)
  })

  // ── #5 电场线：电荷在画布中心 (420, 325)，探针电势按此计算 ────────────────
  it('电场线：单正电荷时探针电势 = kQ/r（电荷在画布中心）', () => {
    // 画布 840×650 → 电荷 (420, 325)；探针默认 (420, 150)
    // 距离 175px，mPerPx = 0.8/160 = 0.005 → r = 0.875m
    const expectedKV = (K * 5e-6) / 0.875 / 1000
    const panel = buildPhysicsQuantities(
      'anim-field-lines',
      { topology: 0, qSource: 5, probeX: 420, probeY: 150, probeStartX: 420, probeStartY: 150 },
      0,
    )
    expect(num(panel, '当前点电势 φ')).toBeCloseTo(expectedKV, 2)
  })

  // ── #2 交流阻抗：线圈串联 15Ω 直流电阻，灯泡 30Ω，R_total = 45Ω ──────────
  it('交流阻抗：支路2电流按 Z=√((R_灯+15)²+X_L²) 计算', () => {
    const f = 50
    const L = 0.5
    const XL = 2 * Math.PI * f * L
    const Z = Math.hypot(30 + 15, XL)
    const expectedI = 100 / Z
    const panel = buildPhysicsQuantities('anim-ac-lc-impedance', {}, 0)
    expect(num(panel, '支路2有效电流')).toBeCloseTo(expectedI, 2)
  })

  // ── #4 卫星：入轨半径比与中屏 LAYOUT 同源 ─────────────────────────────────
  it('卫星：中屏布局与 physics 常量使用同一个入轨半径比', () => {
    expect(LAYOUT.mode1.rLaunchRatio).toBe(SATELLITE_LAUNCH_RADIUS_RATIO)
    expect(SATELLITE_LAUNCH_RADIUS_RATIO).toBeCloseTo(1.05, 12)
  })

  // ── #1 法拉第：B₀ 与中屏同源（从零开始增磁） ──────────────────────────────
  it('法拉第：匀变磁场模式 B₀ = 0，磁通量变化率 = (dB/dt)·S 与 B₀ 无关', () => {
    expect(FARADAY_UNIFORM_B0).toBe(0)
    const panel = buildPhysicsQuantities('anim-faraday-law', { mode: 1, N: 50, dBdt: 0.5 }, 2)
    // dΦ/dt = dBdt × S = 0.5 × 0.02 = 0.01 Wb/s
    expect(num(panel, '磁通量变化率')).toBeCloseTo(0.01, 6)
    expect(Math.abs(num(panel, '磁通量变化率'))).toBeGreaterThan(EPS)
  })

  // ── #3 双星：模型引力 G=1 与向心力 F=m·v²/r 严格自洽，绝不能输出 0.00N ──────
  it('双星：向心力与加速度使用模型归一化 G，与运动学量 m·v²/r 完全闭环', () => {
    const L = 8.0
    const massRatio = 1.0
    const panel = buildPhysicsQuantities('anim-binary-stars', { mode: 0, L, massRatio }, 0)
    // 默认 L=8, massRatio=1 -> m1=m2=5, r1=r2=4, F = 1.0*5*5/64 = 0.390625 N
    // 旧代码乘真实 G (6.67e-11) 导致输出 0.00N
    const fStr = String(value(panel, '各自向心力 F₁ / F₂'))
    expect(fStr).toContain('0.39')
    expect(fStr).not.toBe('均为 0.00')
    const aStr = String(value(panel, '各自向心加速度 a₁ / a₂'))
    expect(aStr).toContain('0.08m/s²') // a1 = 0.390625 / 5 = 0.078125 -> 0.08
  })

  // ── #7 多用电表：真实电路拓扑（定值电阻无源测得 0V/0mA，黑箱测得 6V/2.13mA） ──
  it('多用电表：定值电阻为无源器件测得 0V，有源黑箱测量路端电压 6.0V 与短路电流 2.13mA', async () => {
    await preloadQuantityBuilder('anim-multimeter')
    // 1. 无源定值电阻打电压挡 (DCV 10V) -> 0.00V
    const panelRes = buildPhysicsQuantities('anim-multimeter', { rangeIndex: 2, componentType: 0, rxNominal: 300, probesConnected: 1 }, 0)
    expect(value(panelRes, '仪表当前读数')).toBe('0.00 V')
    expect(value(panelRes, '测量工况与换挡建议')).toContain('无源元件')

    // 2. 有源黑箱打电压挡 (DCV 10V) -> 6.00V
    const panelBoxV = buildPhysicsQuantities('anim-multimeter', { rangeIndex: 2, componentType: 3, rxNominal: 300, probesConnected: 1 }, 0)
    expect(value(panelBoxV, '仪表当前读数')).toBe('6.00 V')

    // 3. 有源黑箱打电流挡 (DCA 10mA) -> 2.13mA
    const panelBoxA = buildPhysicsQuantities('anim-multimeter', { rangeIndex: 4, componentType: 3, rxNominal: 300, probesConnected: 1 }, 0)
    expect(value(panelBoxA, '仪表当前读数')).toBe('2.13 mA')

    // 4. 有源黑箱打欧姆挡 -> 触发高考警示
    const panelBoxOhm = buildPhysicsQuantities('anim-multimeter', { rangeIndex: 6, componentType: 3, rxNominal: 300, probesConnected: 1 }, 0)
    expect(value(panelBoxOhm, '仪表当前读数')).toBe('过载/含源')
    expect(value(panelBoxOhm, '测量工况与换挡建议')).toContain('严禁用欧姆挡测量含源器件')
  })

  // ── #9 交变电流：θ₀ 用「度」录入、按弧度入模，看板与中屏共用同一纯函数 ──────
  it('交变电流：θ₀ 按度→弧度换算后，看板 Φ/e 与中屏 computeACGenerationState 完全一致', async () => {
    await preloadQuantityBuilder('anim-ac-generation')
    const t = 1
    const omega = 2
    const theta0Rad = Math.PI / 2
    const state = computeACGenerationState(0.5, 0.04, omega, 100, theta0Rad, t)
    const panel = buildPhysicsQuantities(
      'anim-ac-generation',
      { mode: 1, B: 0.5, S: 0.04, omega, N: 100, initialPhase: 90 },
      t,
    )
    expect(num(panel, '瞬时磁通量 Φ')).toBeCloseTo(state.phi, 4)
    expect(num(panel, '瞬时电动势 e')).toBeCloseTo(state.e, 2)
    // 旧缺陷把 90 直接当弧度加进相位（≈ +5157°），Φ 的正负号都会反掉
    expect(num(panel, '瞬时磁通量 Φ')).toBeLessThan(0)
  })

  // ── 多用电表：公式体系与警示必须跟随当前挡位 ────────────────────────────────
  it('多用电表：欧姆/电压/电流挡各自给出对应公式，关断挡不再硬塞欧姆表公式', async () => {
    await preloadQuantityBuilder('anim-multimeter')
    const names = (rangeIndex: number) =>
      (buildPhysicsQuantities('anim-multimeter', { rangeIndex, probesConnected: 1 }, 0).formulas ?? []).map(
        (f) => f.name,
      )

    // 欧姆挡 ×1 (index 6)：欧姆表回路三件套
    expect(names(6)).toEqual(['欧姆表回路欧姆定律', '欧姆调零满偏电流', '中值电阻与半偏状态'])
    // 直流电压挡 (index 2)：串联分压扩程
    expect(names(2)).toContain('串联分压电阻')
    expect(names(2)).toContain('电压扩程倍数')
    expect(names(2)).not.toContain('中值电阻与半偏状态')
    // 直流电流挡 (index 4)：并联分流扩程
    expect(names(4)).toContain('并联分流电阻')
    expect(names(4)).toContain('电流扩程倍数')
    // 关断挡 (index 0)：没有测量回路，公式区留空
    expect(names(0)).toEqual([])
  })

  // ── #10 油膜法：尺度与方格数对齐（约 223 格，单分子厚度 1.12 nm / 11.2 Å） ─────
  it('油膜法：单分子油酸厚度为 1.12 nm (11.2 Å)，有效格数约 223 格与中屏 1cm 方格对齐', async () => {
    await preloadQuantityBuilder('anim-oil-film-experiment')
    const panel = buildPhysicsQuantities('anim-oil-film-experiment', { ratio: 500, dropsPerMl: 80, powderDensity: 0 }, 0)
    // 展开面积约 223.0 cm² -> 有效格数 223 格（旧代码因 1.12e-10 导致 2232 格与数千平方厘米）
    expect(value(panel, '有效方格数 N_grid')).toBe('223')
    expect(value(panel, '油膜展开面积 S')).toBe('223.0')
    const dStr = String(value(panel, '估算分子直径(膜厚) d'))
    expect(dStr).toContain('1.12 nm')
    expect(dStr).toContain('11.2')
  })

  // ── #11 RC 暂态：看板读数与中屏曲线共用 computeRCTransient / 同一个 τ ────────
  it('电容器 RC 暂态：看板 u_C / i / ∫i dt 与 computeRCTransient 同源，t=τ 时恰为 63.2%', async () => {
    await preloadQuantityBuilder('anim-capacitor')
    const params = { mode: 1, emf: 6, R_t: 10, C_t: 200, phase: 0 }
    // kΩ × μF → s：10 kΩ × 200 μF = 2 s
    const tau = rcTauFromParams(params)
    expect(tau).toBeCloseTo(2, 10)

    const state = computeRCTransient(6, 10e3, 200e-6, tau, 'charge')
    expect(state.uC / 6).toBeCloseTo(0.632, 3)

    const panel = buildPhysicsQuantities('anim-capacitor', params, tau)
    expect(num(panel, '时间常数')).toBeCloseTo(tau, 1)
    expect(num(panel, '电容电压')).toBeCloseTo(state.uC, 1)
    expect(num(panel, '回路电流')).toBeCloseTo(Math.abs(state.i) * 1e3, 2)
    // 面积即电量：∫i dt 与 q 必须落在同一数量级同一数值上
    expect(num(panel, '极板电量')).toBeCloseTo(state.q * 1e6, -1)
    expect(num(panel, '∫i dt（面积）')).toBeCloseTo(state.areaCharge * 1e6, -1)

    // 放电模式 t=τ 时 u_C 应为 E·e⁻¹
    const dis = buildPhysicsQuantities('anim-capacitor', { ...params, phase: 1 }, tau)
    expect(num(dis, '电容电压')).toBeCloseTo(6 * Math.exp(-1), 1)

    // 面积公式必须随充/放电切换：放电面积是"已放出的电量" CE − C·u_C，不是 C·u_C
    const areaFormula = (p: ReturnType<typeof buildPhysicsQuantities>) =>
      (p.formulas ?? []).find((f) => f.name === '面积即电量')?.latex ?? ''
    expect(areaFormula(panel)).toContain('\\Delta Q = C')
    expect(areaFormula(dis)).toContain('CE - C')
    // 放电 t=τ 时，面积应等于 CE − q（而不是 q）
    expect(num(dis, '∫i dt（面积）')).toBeCloseTo(1200 - 6 * Math.exp(-1) * 200, 0)
  })

  // ── 注册表：RC 模式必须能播放（'param' 会让 time 永远停在 0）──────────────────
  it('电容器：注册表按 mode 动态解析播放模式与时长，模式 0 仍保持纯参数静态图', () => {
    const config = electromagnetismElectrostaticsAnimations['anim-capacitor']
    const modeOf = config.controlsMode as (p: Record<string, number>) => string
    const maxTimeOf = config.maxTime as (p: Record<string, number>) => number

    expect(modeOf({ mode: 0 })).toBe('param')
    expect(modeOf({ mode: 1 })).toBe('timed')
    expect(maxTimeOf({ mode: 1, R_t: 10, C_t: 200 })).toBeCloseTo(10, 10)
    expect(maxTimeOf({ mode: 0 })).toBe(30)

    // 默认仍停在模式 0，老页面/老链接的行为不因新增模式而改变
    expect((config.defaultParams as Record<string, number>).mode).toBe(0)
  })

  // ── #12 平抛频闪：看板读数与中屏打点同一份采样 ─────────────────────────────
  it('平抛频闪：看板逐差 = gT²、间距比 1:3:5 与 computeProjectileStrobe 同源；有阻力时整层关闭', async () => {
    await preloadQuantityBuilder('anim-projectile')
    const params = { v0x: 10, g: 9.8, modelMode: 0, strobeMode: 1, strobeT: 0.2 }
    const t = 1.0
    const s = computeProjectileStrobe(10, 9.8, 0.2, t)

    const panel = buildPhysicsQuantities('anim-projectile', params, t)
    expect(num(panel, '已打点数 n')).toBe(s.marks.length)
    expect(num(panel, '逐差 ΔΔy = gT²')).toBeCloseTo(s.diffOfDy, 3)
    expect(num(panel, '首段竖直间距 Δy₁')).toBeCloseTo(s.firstDy, 3)
    expect(String(value(panel, '竖直间距比'))).toBe('1 : 3 : 5')
    // 逐差就是 gT²：9.8 × 0.04 = 0.392
    expect(s.diffOfDy).toBeCloseTo(9.8 * 0.04, 10)

    // 有空气阻力 → 竖直方向不再匀加速，频闪结论必须整层收回
    const damped = buildPhysicsQuantities('anim-projectile', { ...params, airResistance: 0.05 }, t)
    expect(value(damped, '频闪打点')).toBe('已关闭')
    expect((damped.formulas ?? []).some((f) => f.name.includes('逐差'))).toBe(false)
    expect((damped.quantities ?? []).some((q) => q.label.startsWith('逐差'))).toBe(false)
  })

  // ── #13 向心 F–ω²：看板斜率与卡片拟合同源 ──────────────────────────────────
  it('向心 F–ω²：看板理论斜率 = m·r、拟合斜率来自最小二乘，与 computeCentripetalFit 同源', async () => {
    await preloadQuantityBuilder('anim-centripetal')
    const m = 2
    const r = 3
    const params = { r, v: 3, m, fitMode: 1, showWaveform: 1, showCompare: 0 }
    const fit = computeCentripetalFit(m, r, { vMin: 1, vMax: 10 })

    const panel = buildPhysicsQuantities('anim-centripetal', params, 0)
    expect(num(panel, '理论斜率 k = m·r')).toBeCloseTo(fit.slope, 2) // 6.00
    expect(num(panel, '拟合斜率 k_fit')).toBeCloseTo(fit.fitSlope, 2)
    expect(num(panel, '角速度平方 ω²')).toBeCloseTo(1, 1) // ω = v/r = 1
    expect(num(panel, '拟合相对偏差')).toBeCloseTo(fit.slopeError * 100, 1)
    expect((panel.formulas ?? []).some((f) => f.name.includes('F–ω²'))).toBe(true)

    // 对照线：质量加倍后斜率翻倍
    const cmp = buildPhysicsQuantities('anim-centripetal', { ...params, showCompare: 1 }, 0)
    expect(num(cmp, '对照斜率')).toBeCloseTo(2 * m * r, 2)

    // 模式 A 不输出任何拟合读数（不能把两套斜率同时塞给同一张图）
    const theory = buildPhysicsQuantities('anim-centripetal', { ...params, fitMode: 0 }, 0)
    expect((theory.quantities ?? []).some((q) => q.label.includes('拟合'))).toBe(false)
  })
})

