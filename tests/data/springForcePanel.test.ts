import { describe, it, expect } from 'vitest'
import { handleSpringForce } from '@/data/quantities/dynamics/springForce'
import { GRAVITY } from '@/physics/constants'

/**
 * 轻质物体突变模型（anim-light-weight-mutation）右屏守卫。
 *
 * 该动画整条时间轴从「剪断」起算，中屏一直在演剪断之后的运动，
 * 所以右屏加速度必须随 t 变化。曾经四行写死 ↑g／↓g／↓2g／0，
 * 画面里球在动、右屏却说加速度恒定 —— 学生无从判断该信哪个。
 */

const panel = (t: number) => {
  const data = handleSpringForce('anim-light-weight-mutation', { k: 100, m: 1 }, t, [])
  expect(data).not.toBeNull()
  return data!
}

const readAccel = (t: number, label: string) => {
  const row = panel(t).quantities.find((q) => q.label === label)
  expect(row, label).toBeDefined()
  return row!.value
}

const numeric = (text: string) => Number.parseFloat(text.replace(/[↑↓\s]/g, ''))

describe('轻质物体突变 · 右屏加速度随 t 演化', () => {
  it('t=0（剪断瞬间）：g / g / 2g / 0，方向与教科书结论一致', () => {
    expect(readAccel(0, '球 A 加速度 a_A')).toBe(`↑ ${GRAVITY.toFixed(2)}`)
    expect(readAccel(0, '球 B 加速度 a_B')).toBe(`↓ ${GRAVITY.toFixed(2)}`)
    expect(readAccel(0, '球 C 加速度 a_C')).toBe(`↓ ${(2 * GRAVITY).toFixed(2)}`)
    expect(readAccel(0, '球 D 加速度 a_D')).toBe((0).toFixed(2))
  })

  it('剪断后弹簧在恢复：a_A、a_C、a_D 都不再是瞬间那个常数', () => {
    const a0 = numeric(readAccel(0, '球 A 加速度 a_A'))
    const a1 = numeric(readAccel(0.1, '球 A 加速度 a_A'))
    expect(a1).not.toBeCloseTo(a0, 1)

    // a_A = g·cos(ωt)，ω = √(k/m) = 10 rad/s
    expect(a1).toBeCloseTo(GRAVITY * Math.cos(10 * 0.1), 1)
    // a_C = −g(1+cos(ω_rel t))，ω_rel = √(2k/m)
    expect(numeric(readAccel(0.1, '球 C 加速度 a_C'))).toBeCloseTo(
      GRAVITY * (1 + Math.cos(Math.sqrt(2) * 10 * 0.1)),
      1,
    )
    // a_D 从 0 开始向下增长（弹簧拉力衰减），不再是「瞬时静止」的 0
    expect(numeric(readAccel(0.1, '球 D 加速度 a_D'))).toBeGreaterThan(1)
  })

  it('B 球仍按自由落体走 a=g，落地后归零', () => {
    expect(numeric(readAccel(0.2, '球 B 加速度 a_B'))).toBeCloseTo(GRAVITY, 2)
    // 落体距离约 1.44 m → 约 0.54 s 落地
    expect(readAccel(0.8, '球 B 加速度 a_B')).toBe((0).toFixed(2))
  })

  it('公式标题写明「剪断瞬间」，不会与逐帧值打架', () => {
    for (const f of panel(0.3).formulas) {
      expect(f.name.startsWith('剪断瞬间')).toBe(true)
    }
  })
})

describe('弹力演示 · 三个 mode 各自对应自己的物理模型', () => {
  const panelOf = (params: Record<string, number>) => {
    const data = handleSpringForce('anim-spring-force', params, 0.5, [])
    expect(data).not.toBeNull()
    return data!
  }
  const valueOf = (data: ReturnType<typeof panelOf>, label: string) => {
    const row = data.quantities.find((q) => q.label === label)
    expect(row, label).toBeDefined()
    return row!.value
  }

  /**
   * 回归守卫：曾经 mode 1 / mode 2 被一起吞进「绳与弹簧瞬时切断」分支，
   * 选「支持力与桌面形变」时右屏却输出四球加速度全 0.00 与四条「剪断瞬间」公式，
   * 与中屏画面（桌面被压薄 + FN-x 关系图）完全对不上。
   */
  it('mode 1（支持力）给出 FN / G / 桌面压缩量，且不再出现四球加速度与剪断公式', () => {
    const data = panelOf({ k: 100, m: 2, mode: 1, kAtoms: 120 })

    expect(valueOf(data, '支持力 F_N')).toBe((2 * GRAVITY).toFixed(1))
    expect(valueOf(data, '重力 G')).toBe((2 * GRAVITY).toFixed(1))
    // 压缩量与中屏「压缩量 x = ?.?? cm」同口径：m → cm
    expect(valueOf(data, '桌面压缩量 x')).toBe(((2 * GRAVITY) / 120 * 100).toFixed(2))

    for (const label of ['球 A 加速度 a_A', '球 B 加速度 a_B', '球 C 加速度 a_C', '球 D 加速度 a_D']) {
      expect(data.quantities.find((q) => q.label === label), label).toBeUndefined()
    }
    expect(data.formulas.map((f) => f.name)).not.toContain('剪断瞬间：A 球向上加速')
    expect(data.formulas.map((f) => f.name)).toContain('支持力的弹力本质')
  })

  it('mode 2（绳拉力）给出 T / G / 绳伸长量，与 kRope 联动', () => {
    const data = panelOf({ k: 100, m: 2, mode: 2, kRope: 150 })

    expect(valueOf(data, '绳拉力 T')).toBe((2 * GRAVITY).toFixed(1))
    expect(valueOf(data, '绳伸长量 Δx')).toBe(((2 * GRAVITY) / 150 * 100).toFixed(2))
    expect(data.formulas.map((f) => f.name)).toContain('拉力的弹力本质')
    expect(data.formulas.map((f) => f.name)).not.toContain('剪断瞬间：A 球向上加速')
  })

  it('mode 0 仍是胡克定律，与前两档互不串台', () => {
    const data = panelOf({ k: 100, m: 1, mode: 0 })
    expect(valueOf(data, '固有角频率 ω')).toBe(Math.sqrt(100 / 1).toFixed(2))
    expect(data.quantities.find((q) => q.label === '支持力 F_N')).toBeUndefined()
    expect(data.quantities.find((q) => q.label === '绳拉力 T')).toBeUndefined()
  })

  it('轻质物体突变模型不受 mode 影响，恒按剪断后出值', () => {
    const data = handleSpringForce('anim-light-weight-mutation', { k: 100, m: 1, mode: 2 }, 0, [])!
    expect(data.quantities.find((q) => q.label === '球 A 加速度 a_A')).toBeDefined()
  })
})
