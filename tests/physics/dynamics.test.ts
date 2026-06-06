import { describe, it, expect } from 'vitest'
import {
  calculateEarthGravity,
  calculateElasticForce,
  calculateFrictionPullModel,
  calculateFrictionInclineModel,
  calculateVectorAddition,
  calculateOrthogonalDecomposition
} from '../../src/physics/dynamics'

describe('Dynamics physics calculations', () => {
  describe('calculateElasticForce', () => {
    it('should calculate spring force correctly according to Hooke\'s law', () => {
      const { F } = calculateElasticForce(100, 0.2)
      expect(F).toBe(-20) // F = -kx = -100 * 0.2
    })

    it('should support negative displacement (compression)', () => {
      const { F } = calculateElasticForce(100, -0.1)
      expect(F).toBe(10) // F = -kx = -100 * -0.1
    })
  })

  describe('calculateEarthGravity', () => {
    const F_gravitation = 100
    const m = 1.0
    const omegaScale = 80 // 放大自转效应

    it('should have zero centripetal force and zero deviation at the poles', () => {
      // 纬度 90 度 (极点)
      const res = calculateEarthGravity(90, m, F_gravitation, omegaScale)
      
      expect(res.F_centripetal).toBeCloseTo(0, 5)
      expect(res.angleDeviation).toBeCloseTo(0, 5)
      // 极点重力等于万有引力
      expect(res.G_force).toBeCloseTo(F_gravitation, 5)
      // 极点处重力矢量完全朝向 Y 轴负方向
      expect(res.Gx).toBeCloseTo(0, 5)
      expect(res.Gy).toBeCloseTo(-F_gravitation, 5)
    })

    it('should have maximum centripetal force and zero deviation at the equator', () => {
      // 纬度 0 度 (赤道)
      const res = calculateEarthGravity(0, m, F_gravitation, omegaScale)
      const expectedCentripetal = F_gravitation * (0.00346 * omegaScale)
      
      expect(res.F_centripetal).toBeCloseTo(expectedCentripetal, 5)
      expect(res.angleDeviation).toBeCloseTo(0, 5)
      // 赤道重力为万有引力减去向心力
      expect(res.G_force).toBeCloseTo(F_gravitation - expectedCentripetal, 5)
      // 矢量方向指向地心 (向左)
      expect(res.Gx).toBeCloseTo(-(F_gravitation - expectedCentripetal), 5)
      expect(res.Gy).toBeCloseTo(0, 5)
    })

    it('should have deviation angle at mid-latitudes', () => {
      // 纬度 45 度 (中纬度)
      const res = calculateEarthGravity(45, m, F_gravitation, omegaScale)
      
      // 中纬度必定有偏离地心的角度，不为零
      expect(res.angleDeviation).toBeGreaterThan(0.5)
      // 重力大小介于赤道和两极之间
      const resEquator = calculateEarthGravity(0, m, F_gravitation, omegaScale)
      const resPole = calculateEarthGravity(90, m, F_gravitation, omegaScale)
      expect(res.G_force).toBeGreaterThan(resEquator.G_force)
      expect(res.G_force).toBeLessThan(resPole.G_force)
    })
  })

  describe('calculateFrictionPullModel', () => {
    const m = 5
    const mu = 0.3
    const g = 9.8

    it('should stay static when applied force is below maximum static friction', () => {
      const F_applied = 10
      const res = calculateFrictionPullModel(m, mu, F_applied, g)
      expect(res.isSliding).toBe(false)
      expect(res.f_actual).toBeCloseTo(10, 2)
      expect(res.a).toBe(0)
      expect(res.F_normal).toBe(5 * 9.8)
    })

    it('should slide when applied force is above maximum static friction', () => {
      const F_applied = 25
      const res = calculateFrictionPullModel(m, mu, F_applied, g)
      expect(res.isSliding).toBe(true)
      // 滑动摩擦力 f_slip = mu * m * g = 0.3 * 5 * 9.8 = 14.7 N
      expect(res.f_actual).toBeCloseTo(14.7, 2)
      // 加速度 a = (25 - 14.7) / 5 = 2.06 m/s²
      expect(res.a).toBeCloseTo(2.06, 2)
    })
  })

  describe('calculateFrictionInclineModel', () => {
    const m = 5
    const mu = 0.3
    const g = 9.8

    it('should keep equilibrium on a low incline angle', () => {
      const angle = 12
      const res = calculateFrictionInclineModel(m, mu, angle, g)
      expect(res.isSliding).toBe(false)
      // 摩擦力 f = m * g * sin(12°) ≈ 5 * 9.8 * 0.2079 = 10.19 N
      expect(res.f_actual).toBeCloseTo(10.19, 2)
      expect(res.a).toBe(0)
    })

    it('should slide down on a high incline angle', () => {
      const angle = 30
      const res = calculateFrictionInclineModel(m, mu, angle, g)
      expect(res.isSliding).toBe(true)
      // 摩擦力 f = mu * m * g * cos(30°) = 0.3 * 5 * 9.8 * 0.866 = 12.73 N
      expect(res.f_actual).toBeCloseTo(12.73, 2)
      // 加速度 a = g * sin(30°) - mu * g * cos(30°) = 9.8 * 0.5 - 0.3 * 9.8 * 0.866 = 4.9 - 2.546 = 2.354 m/s²
      expect(res.a).toBeCloseTo(2.35, 2)
    })
  })

  describe('calculateVectorAddition', () => {
    it('should synthesize perpendicular forces (3-4-5 triangle) correctly', () => {
      const { fResultant, resultAngleDeg } = calculateVectorAddition(3, 4, 90)
      expect(fResultant).toBeCloseTo(5, 5)
      expect(resultAngleDeg).toBeCloseTo(53.13, 2)
    })

    it('should combine forces in the same direction correctly', () => {
      const { fResultant, resultAngleDeg } = calculateVectorAddition(10, 8, 0)
      expect(fResultant).toBeCloseTo(18, 5)
      expect(resultAngleDeg).toBeCloseTo(0, 5)
    })

    it('should combine forces in opposite directions correctly', () => {
      const { fResultant, resultAngleDeg } = calculateVectorAddition(10, 8, 180)
      expect(fResultant).toBeCloseTo(2, 5)
      expect(resultAngleDeg).toBeCloseTo(0, 5)
    })
  })

  describe('calculateOrthogonalDecomposition', () => {
    it('should decompose a force at 30 degrees correctly', () => {
      const { fx, fy } = calculateOrthogonalDecomposition(10, 30)
      expect(fx).toBeCloseTo(8.66, 2) // 10 * cos(30) = 8.66
      expect(fy).toBeCloseTo(5, 2)    // 10 * sin(30) = 5
    })

    it('should decompose a vertical force correctly', () => {
      const { fx, fy } = calculateOrthogonalDecomposition(10, 90)
      expect(fx).toBeCloseTo(0, 5)
      expect(fy).toBeCloseTo(10, 5)
    })
  })
})

