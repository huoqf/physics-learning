import { describe, it, expect } from 'vitest'
import {
  calculateMomentumScalar,
  kineticEnergyFromMomentum,
  calculateMomentum1D,
  calculateTotalMomentum,
  calculateCenterOfMass,
  calculateCenterOfMassVelocity,
  generateMomentumEnergyCurve,
  elasticCollision1D,
} from '@/physics/momentum'
import {
  perfectlyInelasticCollision,
  calculateSystemMomentum,
  calculateCollisionVelocities,
  calculateCommonVelocity,
  calculateCommonVelocityTime,
  calculateSliderDisplacement,
  calculateBoardDisplacement,
  calculateSliderVelocity,
  calculateBoardVelocity,
  calculateRelativeDisplacement,
  calculateFrictionHeat,
  willSliderFallOff,
} from '@/physics/momentumConservation'
import {
  calculateFallVelocity,
  calculateAverageImpactForce,
  calculateCollisionTime,
  calculateMomentumChange,
  calculateFluidElementMass,
  calculateFluidInitialMomentum,
  calculateFluidFinalMomentum,
  calculateFluidImpactForce,
  calculateMomentumChangeRate,
} from '@/physics/momentumTheorem'
import {
  calculateConstantImpulse,
  calculateInstantaneousForce,
  calculateAnalyticalImpulse,
  calculateTotalImpulse,
  calculateAverageForce,
  calculateImpulseSlices,
} from '@/physics/impulse'
import {
  elasticCollision,
  inelasticCollisionSpeed,
  calculateInitialKineticEnergy,
  calculateFinalKineticEnergy,
  collisionWithEnergyLoss,
  calculateEnergyLoss,
  calculateMaxEnergyLoss,
  isVelocitySwapCase,
  isHeavyLightCase,
} from '@/physics/collision'

describe('physics/momentum & collision · 动量与碰撞基本定律', () => {
  it('标量/矢量动量、质心速度与弹性碰撞满足动量与动能双守恒', () => {
    expect(calculateMomentumScalar(2, 5)).toBe(10)
    expect(kineticEnergyFromMomentum(10, 2)).toBe(25)
    expect(calculateMomentum1D(2, -3)).toBe(-6)

    const pTotal = calculateTotalMomentum(calculateMomentum1D(2, 4), calculateMomentum1D(3, -1))
    expect(pTotal).toBe(5)
    expect(calculateCenterOfMass(2, 0, 3, 5)).toBe(3)
    expect(calculateCenterOfMassVelocity(pTotal, 2, 3)).toBe(1)

    const curve = generateMomentumEnergyCurve(10, 1, 5, 4)
    expect(curve).toHaveLength(5)
    expect(curve[0].Ek).toBe(50) // p²/(2*1)
    expect(curve[4].Ek).toBe(10) // p²/(2*5)

    const [vAf, vBf] = elasticCollision1D(2, 6, 4, -3)
    expect(2 * vAf + 4 * vBf).toBeCloseTo(2 * 6 + 4 * (-3), 10)
    expect(0.5 * 2 * vAf * vAf + 0.5 * 4 * vBf * vBf).toBeCloseTo(0.5 * 2 * 36 + 0.5 * 4 * 9, 10)
  })

  it('collision.ts：弹性/非弹性/恢复系数与机械能损失上界严格成立', () => {
    const [e1, e2] = elasticCollision(3, 4, 3, -2) // 等质量交换速度
    expect(e1).toBeCloseTo(-2, 10)
    expect(e2).toBeCloseTo(4, 10)

    const vStick = inelasticCollisionSpeed(2, 6, 4, 0)
    expect(vStick).toBe(2)

    const ek0 = calculateInitialKineticEnergy(2, 6, 4, 0)
    const ek1 = calculateFinalKineticEnergy(2, vStick, 4, vStick)
    expect(ek0 - ek1).toBeCloseTo(calculateMaxEnergyLoss(2, 4, 6), 10)

    const [vA_l, vB_l] = collisionWithEnergyLoss(2, 6, 4, 0.5)
    const loss = calculateEnergyLoss(2, 6, 4, vA_l, vB_l)
    expect(loss).toBeGreaterThan(0)
    expect(loss).toBeLessThan(calculateMaxEnergyLoss(2, 4, 6))

    expect(isVelocitySwapCase(2.0, 2.0, 0)).toBe(true)
    expect(isVelocitySwapCase(2.0, 3.0, 0)).toBe(false)
    expect(isHeavyLightCase(10, 1)).toBe(true)
    expect(isHeavyLightCase(3, 1)).toBe(false)
  })
})

describe('physics/momentumConservation · 碰撞与滑块-木板模型', () => {
  it('碰撞恢复系数 e=1/0/0.5 与动量守恒', () => {
    expect(perfectlyInelasticCollision(2, 6, 2, -2)).toBe(2)
    expect(calculateSystemMomentum(2, 6, 2, -2)).toBe(8)

    const elastic = calculateCollisionVelocities(2, 5, 3, -1)
    expect(2 * elastic.v1After + 3 * elastic.v2After).toBeCloseTo(7, 10)

    const inelastic = calculateCollisionVelocities(2, 5, 3, -1, 0)
    expect(inelastic.v1After).toBeCloseTo(inelastic.v2After, 10)
  })

  it('滑块-木板模型：共速前相对滑动、共速后同速且能量损耗 Q = ΔEk', () => {
    const m = 2, M = 4, v0 = 6, mu = 0.2, g = 10
    const vCommon = calculateCommonVelocity(m, v0, M) // 2 m/s
    expect(vCommon).toBeCloseTo(2, 10)
    const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g) // 4*2 / 4 = 2 s
    expect(tCommon).toBeCloseTo(2, 10)
    expect(calculateCommonVelocityTime(M, vCommon, 0, m, g)).toBe(Infinity)

    // t = 1 s（未共速）
    expect(calculateSliderVelocity(v0, mu, 1, g, m, M)).toBeCloseTo(4, 10)
    expect(calculateBoardVelocity(mu, m, M, 1, v0, g)).toBeCloseTo(1, 10)
    // t = 3 s（已共速）
    expect(calculateSliderVelocity(v0, mu, 3, g, m, M)).toBeCloseTo(vCommon, 10)
    expect(calculateBoardVelocity(mu, m, M, 3, v0, g)).toBeCloseTo(vCommon, 10)
    // 未传 m/M 退化模式
    expect(calculateSliderVelocity(v0, mu, 10, g)).toBe(0)

    const x1AtSync = calculateSliderDisplacement(v0, mu, tCommon, g, m, M)
    const x2AtSync = calculateBoardDisplacement(mu, m, M, tCommon, g, v0)
    const rel = calculateRelativeDisplacement(x1AtSync, x2AtSync)
    const heat = calculateFrictionHeat(mu, m, rel, g)
    // Q = 0.5*m*v0^2 - 0.5*(m+M)*vCommon^2 = 36 - 12 = 24 J
    expect(heat).toBeCloseTo(24, 10)

    // 共速后同速前进，相对位移不再增长
    const x1After = calculateSliderDisplacement(v0, mu, 4, g, m, M)
    const x2After = calculateBoardDisplacement(mu, m, M, 4, g, v0)
    expect(calculateRelativeDisplacement(x1After, x2After)).toBeCloseTo(rel, 10)
    expect(calculateSliderDisplacement(v0, mu, 1, g)).toBeCloseTo(5, 10)
    expect(calculateBoardDisplacement(mu, m, M, 1, g)).toBeCloseTo(0.5, 10)

    expect(willSliderFallOff(rel, 5)).toBe(true)
    expect(willSliderFallOff(rel, 10)).toBe(false)
  })
})

describe('physics/momentumTheorem & impulse · 动量定理、流体冲击与微元积分', () => {
  it('缓冲碰撞与流体动量变化率计算一致', () => {
    expect(calculateFallVelocity(20, 10)).toBeCloseTo(20, 10)
    expect(calculateCollisionTime(2, 4)).toBe(0.5)
    expect(calculateMomentumChange(2, 10)).toBe(20)
    expect(calculateAverageImpactForce(2, 10, 0.5, 10)).toBeCloseTo(60, 10)

    const dm = calculateFluidElementMass(1000, 0.01, 10, 0.1) // 10 kg
    expect(dm).toBeCloseTo(10, 10)
    expect(calculateFluidInitialMomentum(1000, 0.01, 10, 0.1)).toBeCloseTo(100, 10)
    expect(calculateFluidFinalMomentum(1000, 0.01, 10, 0.1, 1)).toBeCloseTo(-100, 10)
    expect(calculateFluidImpactForce(1000, 0.01, 10, 1)).toBeCloseTo(2000, 10)
    expect(calculateMomentumChangeRate(1000, 0.01, 10, 0)).toBeCloseTo(1000, 10)
  })

  it('冲量解析积分与高密度微元黎曼和收敛一致', () => {
    expect(calculateConstantImpulse(15, 4)).toBe(60)
    expect(calculateInstantaneousForce(0, 10, 2, 'linear')).toBe(0)
    expect(calculateInstantaneousForce(2, 10, 2, 'linear')).toBe(0)

    // 线性变力：总冲量 = 0.5 * FMax * T
    const iLin = calculateTotalImpulse(20, 4, 'linear')
    expect(iLin).toBeCloseTo(40, 10)
    expect(calculateAverageForce(20, 4, 'linear')).toBeCloseTo(10, 10)
    const slicesLin = calculateImpulseSlices(20, 4, 'linear', 200)
    expect(slicesLin[slicesLin.length - 1].cumulativeI).toBeCloseTo(iLin, 4)

    // 半波正弦变力：总冲量 = 2 * FMax * T / π
    const iSin = calculateTotalImpulse(10, 2, 'sine')
    expect(iSin).toBeCloseTo((20 * 2) / Math.PI, 10)
    const slicesSin = calculateImpulseSlices(10, 2, 'sine', 400)
    expect(slicesSin[slicesSin.length - 1].cumulativeI).toBeCloseTo(iSin, 3)

    // 任意时刻截断 + fallback 分支
    expect(calculateAnalyticalImpulse(1, 20, 4, 'linear')).toBeCloseTo(17.5, 10)
    expect(calculateInstantaneousForce(1, 10, 2, 'unknown' as never)).toBe(10)
    expect(calculateAnalyticalImpulse(1, 10, 2, 'unknown' as never)).toBe(10)
  })
})
