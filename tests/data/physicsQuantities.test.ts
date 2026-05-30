import { describe, it, expect } from 'vitest'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'

function find(qs: ReturnType<typeof buildPhysicsQuantities>, label: string) {
  return qs.find((q) => q.label.startsWith(label))?.value
}

describe('buildPhysicsQuantities', () => {
  it('始终包含时间 t', () => {
    const qs = buildPhysicsQuantities('anim-velocity', { v: 5 }, 2)
    expect(find(qs, '时间')).toBe(2)
  })

  it('匀速运动 s = v·t', () => {
    const qs = buildPhysicsQuantities('anim-velocity', { v: 5 }, 3)
    expect(find(qs, '位移')).toBeCloseTo(15, 10)
  })

  it('自由落体使用 physics 纯函数（v=v0+gt, y=v0t+½gt²）', () => {
    const qs = buildPhysicsQuantities('anim-free-fall', { v0: 0, g: 10 }, 2)
    expect(find(qs, '速度')).toBeCloseTo(20, 10)
    expect(find(qs, '位移')).toBeCloseTo(20, 10)
  })

  it('竖直上抛取向上为正（v=v0-gt, y=v0t-½gt²）', () => {
    const qs = buildPhysicsQuantities('anim-vertical-throw', { v0: 20, g: 10 }, 1)
    expect(find(qs, '速度')).toBeCloseTo(10, 10)
    expect(find(qs, '位移')).toBeCloseTo(15, 10)
  })

  it('缺省 g 时回退到 GRAVITY 常量（非硬编码）', () => {
    const qs = buildPhysicsQuantities('anim-free-fall', { v0: 0 }, 1)
    expect(find(qs, '重力加速度')).toBeCloseTo(9.8, 10)
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
    expect(qs.some((q) => q.label === 'foo')).toBe(true)
  })
})
