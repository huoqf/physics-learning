import { describe, it, expect } from 'vitest'
import {
  EQUAL_CHARGE_PLAY_DURATION,
  EQUAL_CHARGE_SCAN_HALF_CM,
  getEqualChargePair,
  evaluateEqualChargePoint,
  sampleEqualChargeAxisProfile,
  computeEqualChargeSnapshot,
  getEqualChargeCriticalTimes,
} from '../equalChargeField'

describe('equalChargeField 物理纯函数测试', () => {
  it('6 种 (chargeType, axis) 组合均返回有限且自洽的分布', () => {
    for (const chargeType of [0, 1, 2]) {
      for (const axis of [0, 1]) {
        const cfg = { chargeType, axis, qMicroC: 5, halfSepCm: 3 }
        const profile = sampleEqualChargeAxisProfile(cfg, 80)
        expect(profile.ePoints.length).toBe(81)
        expect(profile.phiPoints.length).toBe(81)
        profile.ePoints.forEach((p) => {
          expect(Number.isFinite(p.x)).toBe(true)
          expect(Number.isFinite(p.y)).toBe(true)
        })
        profile.phiPoints.forEach((p) => {
          expect(Number.isFinite(p.x)).toBe(true)
          expect(Number.isFinite(p.y)).toBe(true)
        })

        const snapMid = computeEqualChargeSnapshot(cfg, EQUAL_CHARGE_PLAY_DURATION / 2)
        expect(snapMid.sCm).toBeCloseTo(0, 6)
        expect(snapMid.point.E).toBeCloseTo(snapMid.eAtMidpointMV * 1e6, -1)
      }
    }
  })

  it('等量异种中垂线 (chargeType=0, axis=1)：φ 恒为 0，中点 O 场强最大且垂直指向负电荷一侧', () => {
    const cfg = { chargeType: 0, axis: 1, qMicroC: 5, halfSepCm: 3 }
    const ptMid = evaluateEqualChargePoint(cfg, 0, 0)
    const ptOff = evaluateEqualChargePoint(cfg, 0, 0.04)

    expect(ptMid.phi).toBeCloseTo(0, 6)
    expect(ptOff.phi).toBeCloseTo(0, 6)
    expect(ptMid.Ey).toBeCloseTo(0, 6)
    expect(ptMid.Ex).toBeGreaterThan(0)
    expect(ptMid.E).toBeGreaterThan(ptOff.E)
  })

  it('等量同种中垂线 (chargeType=1/2, axis=1)：中点 E=0 且 φ≠0，极大值位于 y = ±a/√2', () => {
    for (const chargeType of [1, 2]) {
      const cfg = { chargeType, axis: 1, qMicroC: 6, halfSepCm: 4 }
      const pair = getEqualChargePair(cfg)
      const ptMid = evaluateEqualChargePoint(cfg, 0, 0)
      const yExtM = pair.aM * Math.SQRT1_2
      const ptExt = evaluateEqualChargePoint(cfg, 0, yExtM)
      const ptInner = evaluateEqualChargePoint(cfg, 0, yExtM * 0.5)
      const ptOuter = evaluateEqualChargePoint(cfg, 0, yExtM * 1.6)

      expect(ptMid.E).toBeCloseTo(0, 6)
      if (chargeType === 1) {
        expect(ptMid.phi).toBeGreaterThan(0)
      } else {
        expect(ptMid.phi).toBeLessThan(0)
      }
      expect(ptExt.E).toBeGreaterThan(ptInner.E)
      expect(ptExt.E).toBeGreaterThan(ptOuter.E)
    }
  })

  it('等量电荷连线中点 (axis=0)：异种 E>0 且 φ=0，同种 E=0 且 φ≠0', () => {
    const opp = evaluateEqualChargePoint({ chargeType: 0, axis: 0, qMicroC: 4, halfSepCm: 3 }, 0, 0)
    expect(opp.E).toBeGreaterThan(0)
    expect(opp.phi).toBeCloseTo(0, 6)

    const samePos = evaluateEqualChargePoint({ chargeType: 1, axis: 0, qMicroC: 4, halfSepCm: 3 }, 0, 0)
    expect(samePos.E).toBeCloseTo(0, 6)
    expect(samePos.phi).toBeGreaterThan(0)

    const sameNeg = evaluateEqualChargePoint({ chargeType: 2, axis: 0, qMicroC: 4, halfSepCm: 3 }, 0, 0)
    expect(sameNeg.E).toBeCloseTo(0, 6)
    expect(sameNeg.phi).toBeLessThan(0)
  })

  it('getEqualChargeCriticalTimes：严格升序、>0、<= maxTime 且落在 0.01s 网格上', () => {
    for (const halfSepCm of [1.5, 3, 5]) {
      for (const chargeType of [0, 1, 2]) {
        for (const axis of [0, 1]) {
          const list = getEqualChargeCriticalTimes({ chargeType, axis, halfSepCm })
          expect(list.length).toBeGreaterThanOrEqual(2)
          for (let i = 0; i < list.length; i++) {
            const t = list[i].time
            expect(t).toBeGreaterThan(0)
            expect(t).toBeLessThanOrEqual(EQUAL_CHARGE_PLAY_DURATION)
            expect(Math.abs(Math.round(t * 100) - t * 100)).toBeLessThan(1e-9)
            if (i > 0) {
              expect(t).toBeGreaterThan(list[i - 1].time)
            }
          }
        }
      }
    }
    const endSnap = computeEqualChargeSnapshot({ chargeType: 0, axis: 0, qMicroC: 5, halfSepCm: 3 }, EQUAL_CHARGE_PLAY_DURATION)
    expect(endSnap.sCm).toBeCloseTo(EQUAL_CHARGE_SCAN_HALF_CM, 6)
  })
})
