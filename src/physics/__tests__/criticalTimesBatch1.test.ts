import { describe, expect, it } from 'vitest'
import { getBulletBlockCriticalTimes } from '../bulletBlock'
import { getSpringBlocksCriticalTimes } from '../momentumApplication/springBlocks'
import { getCurvedSlotCriticalTimes } from '../momentumApplication/curvedSlot'
import { getLightWeightMutationCriticalTimes } from '../dynamics/spring-force'
import { getVerticalCircularCriticalTimes } from '../dynamics/dynamics-advanced'
import { getCollisionCriticalTimes } from '../collision'
import { getVelocityCriticalTimes } from '../kinematics/velocity'

function expectGridAligned(times: number[], maxTime: number) {
  for (const t of times) {
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThanOrEqual(maxTime)
    expect(Math.round(t * 100) / 100).toBeCloseTo(t, 10)
  }
}

describe('Batch 1 物理层临界时刻单一真源函数', () => {
  it('getBulletBlockCriticalTimes 覆盖穿透与留存共速两种工况', () => {
    const retain = getBulletBlockCriticalTimes({ m: 0.1, M: 0.4, v0: 8, f: 10, L: 1 })
    expect(retain.map((e) => e.label)).toEqual(['⚡ 子弹刚接触木块', '⚡ 子弹与木块共速'])
    expect(retain[1].autoPause).toBe(true)
    expectGridAligned(retain.map((e) => e.time), 30)

    const penetrate = getBulletBlockCriticalTimes({ m: 0.1, M: 0.4, v0: 30, f: 10, L: 0.5 })
    expect(penetrate.map((e) => e.label)).toEqual(['⚡ 子弹刚接触木块', '⚡ 子弹穿出木块'])
    expect(penetrate[1].autoPause).toBe(true)
    expectGridAligned(penetrate.map((e) => e.time), 30)
  })

  it('getSpringBlocksCriticalTimes 区分非固连分离与固连往复', () => {
    const free = getSpringBlocksCriticalTimes({
      mA_spring: 2, mB_spring: 3, v0_spring: 5, k_spring: 20, connectionMode_spring: 0,
    })
    expect(free.length).toBe(3)
    expect(free[1].label).toContain('共速')
    expect(free[2].label).toContain('分离')
    expect(free[2].autoPause).toBe(true)
    expectGridAligned(free.map((e) => e.time), 30)

    const bonded = getSpringBlocksCriticalTimes({
      mA_spring: 2, mB_spring: 3, v0_spring: 5, k_spring: 20, connectionMode_spring: 1,
    })
    expect(bonded[2].label).toBe('首次恢复原长')
    expect(bonded[2].autoPause).toBe(false)
  })

  it('getLightWeightMutationCriticalTimes 标出剪断瞬间与 B 球落地前', () => {
    const pts = getLightWeightMutationCriticalTimes({ m: 1 }, 3)
    expect(pts.length).toBe(2)
    expect(pts[0].time).toBe(0.02)
    expect(pts[0].autoPause).toBe(true)
    expect(pts[1].time).toBeLessThan(0.6)
    expectGridAligned(pts.map((e) => e.time), 3)
  })

  it('getVerticalCircularCriticalTimes 覆盖脱离轨道、摆动与通关三态', () => {
    const fall = getVerticalCircularCriticalTimes({ r: 3, v0: 9, m: 1, trackType: 0 })
    expect(fall.length).toBe(1)
    expect(fall[0].label).toContain('脱离轨道')
    expect(fall[0].time).toBeCloseTo(0.84, 1)
    expect(fall[0].autoPause).toBe(true)

    const swing = getVerticalCircularCriticalTimes({ r: 3, v0: 5, m: 1, trackType: 0 })
    expect(swing.length).toBe(1)
    expect(swing[0].label).toContain('摆动最高点')

    const loop = getVerticalCircularCriticalTimes({ r: 3, v0: 14, m: 1, trackType: 0 })
    expect(loop.map((e) => e.label)).toEqual(['⚡ 首次经过最高点', '回到最低点（一圈）'])
    expectGridAligned(loop.map((e) => e.time), 30)
  })

  it('getCurvedSlotCriticalTimes 覆盖四分之一槽滑出与对称半圆槽', () => {
    const quarter = getCurvedSlotCriticalTimes({ m_block: 2, M_slot: 5, R_slot: 1.5, isFixed: 1, slotShape: 0 })
    expect(quarter.length).toBe(1)
    expect(quarter[0].label).toContain('槽底并滑出')
    expect(quarter[0].time).toBeCloseTo(0.72, 1)

    const semi = getCurvedSlotCriticalTimes({ m_block: 2, M_slot: 5, R_slot: 1.5, isFixed: 0, slotShape: 1 })
    expect(semi.length).toBe(2)
    expect(semi[0].label).toContain('到达槽底')
    expect(semi[1].label).toContain('对侧最高点')
    expectGridAligned(semi.map((e) => e.time), 6)
  })

  it('getCollisionCriticalTimes 计算碰后分离瞬间且无追及时返回空', () => {
    const col = getCollisionCriticalTimes({ m1: 3, v1: 5, m2: 2, v2: 0, advancedMode: 0 })
    expect(col.length).toBe(1)
    expect(col[0].time).toBe(1.69)
    expect(col[0].autoPause).toBe(true)

    const noCol = getCollisionCriticalTimes({ m1: 3, v1: -2, m2: 2, v2: 1, advancedMode: 0 })
    expect(noCol).toEqual([])
  })

  it('getVelocityCriticalTimes 标出首个 Δt 微元端点并过滤越界值', () => {
    const pts = getVelocityCriticalTimes({ deltaT: 2 })
    expect(pts.length).toBe(1)
    expect(pts[0].time).toBe(2)

    const tiny = getVelocityCriticalTimes({ deltaT: 0.02 })
    expect(tiny.length).toBe(1)
    expect(tiny[0].time).toBe(0.02)

    const zero = getVelocityCriticalTimes({ deltaT: 0 })
    expect(zero).toEqual([])
  })
})
