import { describe, it, expect } from 'vitest'
import { calculateElectrostaticShielding } from '../electrostaticShielding'

describe('electrostaticShielding 物理纯计算测试', () => {
  it('静电平衡状态下导体内部反向感应电场严格抵消外电场', () => {
    const res = calculateElectrostaticShielding({ E0: 200, mode: 0 })
    expect(res.E0).toBe(200)
    expect(res.EPrime).toBe(200)
    expect(res.ENet).toBe(0)
  })

  it('导体接地时整个导体及其空腔电势为0', () => {
    const ungrounded = calculateElectrostaticShielding({ E0: 300, mode: 2, isGrounded: 0 })
    expect(ungrounded.potential).toBeGreaterThan(0)

    const grounded = calculateElectrostaticShielding({ E0: 300, mode: 2, isGrounded: 1 })
    expect(grounded.potential).toBe(0)
  })

  it('尖端曲率半径越小，表面电荷密度越大，易引发空气击穿放电', () => {
    const blunt = calculateElectrostaticShielding({ E0: 400, mode: 1, tipRadius: 3.0 })
    const sharp = calculateElectrostaticShielding({ E0: 400, mode: 1, tipRadius: 0.2 })

    expect(sharp.tipChargeDensity).toBeGreaterThan(blunt.tipChargeDensity * 10)
    expect(sharp.isAirBreakdown).toBe(true)
  })
})
