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
} from '@/physics'
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
})

