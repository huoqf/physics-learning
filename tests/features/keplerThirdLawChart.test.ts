/**
 * 第三定律图的"折线覆盖"守门测试。
 *
 * 图上的结论是 A、B 与同一中心天体的参考行星族共线。参考族若写死一组半长轴，
 * 就会在参数超出那组数时失效：把 a₂ 拖到 10，`maxA3` 被撑到 1120，而折线仍停在 a = 7.5
 * （37% 高度），点 B 悬在线外的右上角 —— "共线"当场破功。
 *
 * 因此参考族必须跟着参数走：从原点 0 一直取到 max(a₁, a₂)。
 */
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeplerPhysics } from '@/features/mechanics/gravitation/hooks/useKeplerPhysics'

const BASE = { a: 4.5, e: 0.75, mass: 36, mode: 2, a2: 7.5, e2: 0.6 } as const

function run(params: Record<string, number>) {
  return renderHook(() => useKeplerPhysics(params, 0)).result.current
}

describe('第三定律图：参考行星族的覆盖范围', () => {
  it('折线从原点起，且覆盖 A、B 两点（a₂ 取遍全量程）', () => {
    for (const a2 of [6, 6.5, 7.5, 8.5, 9.5, 10]) {
      const r = run({ ...BASE, a2 })
      const family = r.referenceFamily

      expect(family[0].a).toBe(0)
      expect(family[0].a3).toBe(0)
      expect(family[0].t2).toBe(0)

      const lastA3 = family[family.length - 1].a3
      expect(lastA3).toBeGreaterThanOrEqual(Math.max(r.a3_1, r.a3_2) - 1e-9)
    }
  })

  it('族中每一点、以及 A/B 两点都严格落在 y = k·x 上', () => {
    for (const a2 of [6, 8, 10]) {
      const r = run({ ...BASE, a2 })
      for (const p of r.referenceFamily) {
        expect(p.a3).toBeCloseTo(r.k_ratio * p.t2, 6)
      }
      expect(r.a3_1).toBeCloseTo(r.k_ratio * r.t2_1, 9)
      expect(r.a3_2).toBeCloseTo(r.k_ratio * r.t2_2, 9)
    }
  })

  it('折线随 a₂ 收放：a₂ 小则轴缩紧，a₂ 大则轴撑开', () => {
    const small = run({ ...BASE, a2: 6 })
    const large = run({ ...BASE, a2: 10 })
    expect(small.maxA3).toBeLessThan(large.maxA3)
    // 轴上限始终由最远那颗行星决定，只留 12% 余量
    expect(small.maxA3 / Math.pow(6, 3)).toBeCloseTo(1.12, 6)
    expect(large.maxA3 / Math.pow(10, 3)).toBeCloseTo(1.12, 6)
  })
})
