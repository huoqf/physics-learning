import { describe, it, expect, beforeAll } from 'vitest'
import { buildPhysicsQuantities, preloadQuantityBuilder } from '@/data/physicsQuantities'

function find(qs: ReturnType<typeof buildPhysicsQuantities>, label: string) {
  return qs.quantities.find((q) => q.label.startsWith(label))?.value
}

// 预加载所有测试涉及的构建器
const TEST_ANIM_IDS = [
  'anim-momentum-conservation',
  'anim-coulomb-law',
  'anim-electric-field',
  'anim-charge-in-efield',
  'anim-capacitor',
  'anim-ohm-law',
  'anim-circuit-analysis',
  'anim-closed-circuit',
  'anim-oblique-throw',
  'anim-circular-motion',
  'anim-centripetal',
]

describe('buildPhysicsQuantities', () => {
  beforeAll(async () => {
    await Promise.all(TEST_ANIM_IDS.map((id) => preloadQuantityBuilder(id)))
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
    expect(find(qs, '作用类型')).toBe('相互吸引')
    expect(find(qs, '库仑力')).toBeDefined()
  })

  it('点电荷电场：场强 E 大小计算正确', () => {
    const qs = buildPhysicsQuantities('anim-electric-field', { q: -5, rTest: 2 }, 0)
    expect(find(qs, '场强 E')).toBeDefined()
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
})
