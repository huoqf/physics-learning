import { describe, expect, it } from 'vitest'
import { getChaseMeetingCriticalTimes } from '../kinematics/acceleration'
import { getProjectileCriticalTimes } from '../kinematics/trajectory'
import { getSpringForceCriticalTimes } from '../dynamics/spring-force'
import { getEnergyConservationCriticalTimes } from '../energyConservation'
import { getVerticalSpringCriticalTimes } from '../verticalSpring'
import { getLightRodRopeCriticalTimes } from '../lightRodRope/trajectory'
import { getManBoatCriticalTimes } from '../momentumApplication/manBoat'
import { getOrbitTransferCriticalTimes } from '../orbitTransfer'
import { getChargeInBFieldCriticalTimes } from '../magnetism/forces'
import { getSingleRodCriticalTimes } from '../singleRod'
import { getDualRodsCriticalTimes } from '../dualRods'
import { getLoopPassFieldCriticalTimes } from '../loopPassField'
import { getCombinedFieldsCriticalTimes } from '@/features/electromagnetism/magnetism/combined-fields/model/combinedFieldsModel'

function expectGridAligned(times: number[], maxTime: number) {
  for (const t of times) {
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThanOrEqual(maxTime)
    expect(Math.round(t * 100) / 100).toBeCloseTo(t, 10)
  }
}

describe('Batch 2 物理层临界时刻单一真源函数', () => {
  it('getChaseMeetingCriticalTimes 覆盖追及（共速+追上）与相遇两种模式', () => {
    const chase = getChaseMeetingCriticalTimes({ chaseMode: 0, vA: 35, deltaX0: 80, t0: 1, aB: 6, vMax: 50 })
    expect(chase.some((e) => e.label.includes('共速'))).toBe(true)
    expect(chase.some((e) => e.label.includes('追上'))).toBe(true)
    expectGridAligned(chase.map((e) => e.time), 30)

    const meet = getChaseMeetingCriticalTimes({ chaseMode: 1, vA: 20, vL: 200, aB_meet: 2 })
    expect(meet.length).toBe(1)
    expect(meet[0].label).toContain('相遇')
    expectGridAligned(meet.map((e) => e.time), 30)
  })

  it('getProjectileCriticalTimes 区分基础平抛与斜面平抛', () => {
    const basic = getProjectileCriticalTimes({ modelMode: 0, v0x: 10, g: 9.8 })
    expect(basic.length).toBe(1)
    expect(basic[0].label).toContain('落地')

    const incline = getProjectileCriticalTimes({ modelMode: 2, v0x: 10, inclineAngle: 37, g: 9.8 })
    expect(incline.length).toBeGreaterThanOrEqual(2)
    expect(incline.some((e) => e.label.includes('距斜面最远'))).toBe(true)
    expectGridAligned(incline.map((e) => e.time), 30)
  })

  it('getSpringForceCriticalTimes 仅在胡克定律模式返回简谐极值点', () => {
    const hooke = getSpringForceCriticalTimes({ mode: 0, k: 100, m: 1.5 }, 5)
    expect(hooke.length).toBe(2)
    expectGridAligned(hooke.map((e) => e.time), 5)

    expect(getSpringForceCriticalTimes({ mode: 1, k: 100, m: 1.5 }, 5)).toEqual([])
  })

  it('getEnergyConservationCriticalTimes 覆盖单摆与阻尼山谷', () => {
    const pendulum = getEnergyConservationCriticalTimes({ mode: 0, m: 2, L: 5, theta0: 45, g: 9.8 }, 15)
    expect(pendulum.length).toBe(2)
    expect(pendulum[0].label).toContain('最低点')
    expectGridAligned(pendulum.map((e) => e.time), 15)

    const damped = getEnergyConservationCriticalTimes({ mode: 1, m: 2, R: 5, mu: 0.12, theta0: 55, g: 9.8 }, 15)
    expect(damped.some((e) => e.label.includes('静止'))).toBe(true)
  })

  it('getVerticalSpringCriticalTimes 区分下落砸弹簧与原长释放', () => {
    const drop = getVerticalSpringCriticalTimes({ mode: 0, m: 0.5, k: 50, h: 0.8 }, 15)
    expect(drop.length).toBe(3)
    expect(drop[1].label).toContain('平衡位置')
    expectGridAligned(drop.map((e) => e.time), 15)

    const hang = getVerticalSpringCriticalTimes({ mode: 1, m: 0.5, k: 50 }, 15)
    expect(hang.length).toBe(2)
    expectGridAligned(hang.map((e) => e.time), 15)
  })

  it('getLightRodRopeCriticalTimes 返回轻杆/轻绳关键事件', () => {
    const rod = getLightRodRopeCriticalTimes({ constraint: 0, m1: 1, m2: 1, L: 1.2, theta0: 30, v0: 0 }, 6)
    expect(rod.length).toBeGreaterThanOrEqual(1)
    expectGridAligned(rod.map((e) => e.time), 6)
  })

  it('getManBoatCriticalTimes 区分自动模式与键盘手动模式', () => {
    const autoSingle = getManBoatCriticalTimes({ manBoatControl: 0, manBoatMode: 0 })
    expect(autoSingle.length).toBe(1)
    expect(autoSingle[0].time).toBe(2.5)

    const autoSeq = getManBoatCriticalTimes({ manBoatControl: 0, manBoatMode: 3 })
    expect(autoSeq.length).toBe(2)
    expect(autoSeq[0].time).toBe(1.25)

    expect(getManBoatCriticalTimes({ manBoatControl: 1, manBoatMode: 0 })).toEqual([])
  })

  it('getOrbitTransferCriticalTimes 给出低轨周期或远地点点火窗', () => {
    const lowOrbit = getOrbitTransferCriticalTimes({ r1: 7.0, r3: 14.0, phase: 0 }, 120)
    expect(lowOrbit.length).toBe(1)
    expect(lowOrbit[0].label).toContain('低轨')
    expectGridAligned(lowOrbit.map((e) => e.time), 120)

    const transfer = getOrbitTransferCriticalTimes({ r1: 7.0, r3: 14.0, phase: 1, tBurn1: 10 }, 120)
    expect(transfer.length).toBe(1)
    expect(transfer[0].label).toContain('远地点')
    expect(transfer[0].time).toBeGreaterThan(10)
    expectGridAligned(transfer.map((e) => e.time), 120)
  })

  it('getChargeInBFieldCriticalTimes 标出进入与离开磁场边界', () => {
    const pts = getChargeInBFieldCriticalTimes({ mode: 0, boundaryType: 0, v: 12, B: 1.2, theta: 60 }, 8)
    expect(pts.length).toBe(2)
    expect(pts[0].time).toBe(1.5)
    expect(pts[1].time).toBeGreaterThan(1.5)
    expectGridAligned(pts.map((e) => e.time), 8)
  })

  it('getSingleRodCriticalTimes 与 getDualRodsCriticalTimes 给出 τ 与 3τ 特征时刻', () => {
    const single = getSingleRodCriticalTimes({
      startMechanism: 0, driveForce: 1.2, magneticB: 1.2, resistance: 1.5, rodMass: 0.2, railSpacing: 0.8,
    }, 12)
    expect(single.length).toBe(2)
    expectGridAligned(single.map((e) => e.time), 12)

    const dual = getDualRodsCriticalTimes({
      scenario: 0, massA: 0.2, massB: 0.4, fieldB: 1.0, railL: 0.5, resSum: 1.0,
    }, 30)
    expect(dual.length).toBe(2)
    expectGridAligned(dual.map((e) => e.time), 30)
  })

  it('getLoopPassFieldCriticalTimes 覆盖窄线框与宽线框四阶段边界', () => {
    const narrow = getLoopPassFieldCriticalTimes({
      dimensionPreset: 0, loopWidth: 4, fieldWidth: 8, constantSpeed: 1.0,
    }, 30)
    expect(narrow.length).toBe(4)
    expect(narrow[1].label).toContain('完全进入')
    expectGridAligned(narrow.map((e) => e.time), 30)

    const wide = getLoopPassFieldCriticalTimes({
      dimensionPreset: 1, loopWidth: 8, fieldWidth: 4, constantSpeed: 1.0,
    }, 30)
    expect(wide.length).toBe(4)
    expect(wide[2].label).toContain('后端进入')
    expectGridAligned(wide.map((e) => e.time), 30)
  })

  it('getCombinedFieldsCriticalTimes 覆盖质谱仪、回旋加速器与电偏转磁偏转', () => {
    const spec = getCombinedFieldsCriticalTimes({ mode: 0, electricE: 300, magneticB1: 0.2, magneticB2: 1.5, vParticle: 1500 }, 10)
    expect(spec.length).toBe(2)
    expect(spec[0].label).toContain('选择器')
    expectGridAligned(spec.map((e) => e.time), 10)

    const cyc = getCombinedFieldsCriticalTimes({ mode: 1, magneticB2: 1.5, acFrequency: 24, acVoltage: 5, resonanceLock: 1 }, 10)
    expect(cyc.length).toBeGreaterThanOrEqual(1)
    expectGridAligned(cyc.map((e) => e.time), 10)

    const defl = getCombinedFieldsCriticalTimes({ mode: 2, electricE: 300, magneticB2: 1.5, vParticle: 1500 }, 10)
    expect(defl.length).toBe(2)
    expect(defl[0].label).toContain('进入磁场')
    expectGridAligned(defl.map((e) => e.time), 10)
  })
})
