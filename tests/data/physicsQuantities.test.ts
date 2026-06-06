import { describe, it, expect } from 'vitest'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'

function find(qs: ReturnType<typeof buildPhysicsQuantities>, label: string) {
  return qs.quantities.find((q) => q.label.startsWith(label))?.value
}

describe('buildPhysicsQuantities', () => {
  it('始终包含时间 t', () => {
    const qs = buildPhysicsQuantities('anim-velocity', { v: 5 }, 2)
    expect(find(qs, '时间')).toBe(2)
  })

  it('匀速运动 s = v·t', () => {
    const qs = buildPhysicsQuantities('anim-velocity', { v: 5, deltaT: 3 }, 0)
    expect(find(qs, '通过位移')).toBeCloseTo(15, 10)
  })

  it('自由落体使用 physics 纯函数（v=v0+gt, y=v0t+½gt²）', () => {
    const qs = buildPhysicsQuantities('anim-free-fall', { v0: 0, g: 10, pressure: 0 }, 2)
    expect(find(qs, 'A 速度')).toBeCloseTo(20, 10)
  })

  it('竖直上抛取向上为正（v=v0-gt, y=v0t-½gt²）', () => {
    const qs = buildPhysicsQuantities('anim-vertical-throw', { v0: 20, g: 10 }, 1)
    expect(find(qs, '速度')).toBeCloseTo(10, 10)
    expect(find(qs, '位移')).toBeCloseTo(15, 10)
  })

  it('缺省 g 时回退到 GRAVITY 常量（非硬编码）', () => {
    const qs = buildPhysicsQuantities('anim-free-fall', { v0: 0, pressure: 0 }, 1)
    expect(find(qs, 'A 速度')).toBeCloseTo(9.8, 10)
  })

  it('动量守恒动画满足碰前=碰后总动量', () => {
    const qs = buildPhysicsQuantities(
      'anim-momentum-conservation',
      { m1: 2, m2: 3, v1: 5, v2: 0, e: 0.8 },
      0
    )
    expect(find(qs, '碰前总动量')).toBeCloseTo(find(qs, '碰后总动量') as number, 10)
  })

  it('未知动画回退为参数键值列表', () => {
    const qs = buildPhysicsQuantities('anim-unknown', { foo: 1 }, 0)
    expect(qs.quantities.some((q) => q.label === 'foo')).toBe(true)
  })

  // ===== 电磁学 · 静电场（M4-1）=====
  it('库仑定律：异号判定相互吸引', () => {
    const qs = buildPhysicsQuantities('anim-coulomb-law', { q1: 2, q2: -3, r: 4 }, 0)
    expect(find(qs, '作用')).toBe('相互吸引')
    expect(find(qs, '库仑力') as number).toBeGreaterThan(0)
  })

  it('点电荷电场：负电荷场强方向指向自身', () => {
    const qs = buildPhysicsQuantities('anim-electric-field', { q: -5, rTest: 2 }, 0)
    expect(find(qs, '方向')).toBe('指向负电荷')
  })

  it('带电粒子在匀强电场：偏转电场模型 a=qE/m（合理量级）', () => {
    // E=10×10³N/C, q=5μC, m=200mg → a = qE/m = (5e-6*1e4)/200e-6 = 250 m/s²
    const qs = buildPhysicsQuantities('anim-charge-in-efield', { E: 10, q: 5, m: 200, v0: 20 }, 0)
    expect(find(qs, '加速度') as number).toBeCloseTo(250, 6)
    expect(find(qs, '初速度') as number).toBe(20)
  })

  it('带电粒子：默认参数下射出电场（偏转有界，vy < v0）', () => {
    // t 取很大，应被钳到 tEnd；默认 a=250,v0=20,L=0.4 → tExit=0.02s, y=5cm, vy=5 < v0
    const qs = buildPhysicsQuantities('anim-charge-in-efield', { E: 10, q: 5, m: 200, v0: 20 }, 999)
    expect(find(qs, '结局')).toBe('射出电场')
    expect(find(qs, '竖直速度') as number).toBeLessThan(20)
    expect(find(qs, '竖直位移') as number).toBeCloseTo(0.05, 6)
  })

  it('带电粒子：强场+慢速 → 打在极板上', () => {
    const qs = buildPhysicsQuantities('anim-charge-in-efield', { E: 20, q: 10, m: 50, v0: 10 }, 999)
    expect(find(qs, '结局')).toBe('打在极板上')
  })

  it('电容器：增大 εᵣ 电容增大', () => {
    const c1 = find(buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 }, 0), '电容') as number
    const c2 = find(buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 4, U: 12, connected: 1 }, 0), '电容') as number
    expect(c2).toBeCloseTo(c1 * 4, 6)
  })

  it('电容器接电源：U 不变，Q=CU 随 C 变', () => {
    const qs = buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1 }, 0)
    expect(find(qs, '电源状态')).toBe('接电源(U不变)')
    expect(find(qs, '电压') as number).toBeCloseTo(12, 6)
  })

  it('电容器断电源：默认状态 Q 守恒，增大 d 时 U 变大而 E 不变', () => {
    const a = buildPhysicsQuantities('anim-capacitor', { S: 100, d: 5, epsilon_r: 1, U: 12, connected: 0 }, 0)
    // 默认状态断开 → 还原 U=12、E=2400
    expect(find(a, '电压') as number).toBeCloseTo(12, 4)
    expect(find(a, '场强') as number).toBeCloseTo(2400, 2)
    const b = buildPhysicsQuantities('anim-capacitor', { S: 100, d: 10, epsilon_r: 1, U: 12, connected: 0 }, 0)
    // d 加倍：U 加倍(24)，E 不变(2400)，Q 不变
    expect(find(b, '电压') as number).toBeCloseTo(24, 4)
    expect(find(b, '场强') as number).toBeCloseTo(2400, 2)
    expect(find(b, '电荷量') as number).toBeCloseTo(find(a, '电荷量') as number, 6)
  })

  // ===== 电磁学 · 恒定电流（M4-1）=====
  it('欧姆定律：I = U/R', () => {
    const qs = buildPhysicsQuantities('anim-ohm-law', { U: 6, R: 3 }, 0)
    expect(find(qs, '电流') as number).toBeCloseTo(2, 10)
  })

  it('串并联：串联 R总=R₁+R₂，并联更小', () => {
    const s = buildPhysicsQuantities('anim-circuit-analysis', { U: 12, R1: 4, R2: 2, mode: 0 }, 0)
    expect(find(s, '连接方式')).toBe('串联')
    expect(find(s, '总电阻') as number).toBeCloseTo(6, 10)
    const p = buildPhysicsQuantities('anim-circuit-analysis', { U: 12, R1: 4, R2: 4, mode: 1 }, 0)
    expect(find(p, '连接方式')).toBe('并联')
    expect(find(p, '总电阻') as number).toBeCloseTo(2, 10)
  })

  it('闭合电路：EMF=6 r=1 R=5 → I=1, U端=5, η≈83.3%', () => {
    const qs = buildPhysicsQuantities('anim-closed-circuit', { EMF: 6, r: 1, R: 5 }, 0)
    expect(find(qs, '电流') as number).toBeCloseTo(1, 10)
    expect(find(qs, '路端电压') as number).toBeCloseTo(5, 10)
    expect(find(qs, '效率') as number).toBeCloseTo((5 / 6) * 100, 6)
  })
})
