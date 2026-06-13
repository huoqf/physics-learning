import { describe, it, expect } from 'vitest'
import {
  calculateEarthGravity,
  calculateElasticForce,
  calculateFrictionPullModel,
  calculateFrictionInclineModel,
  calculateVectorAddition,
  calculateOrthogonalDecomposition,
  calculateEquilibriumTension,
  calculateNewtonSecondVariableMotion,
  calculateElevatorMotion,
  calculateConnectedBody,
  calculateConnectedBodyTimeline,
  calculateGravitation,
} from '../../src/physics/dynamics'

describe('Dynamics physics calculations', () => {
  describe('calculateGravitation', () => {
    it('should calculate gravitational force correctly', () => {
      const G = 6.674e-11
      const m1 = 5.97e24
      const m2 = 7.35e22
      const r = 3.84e8
      const { F } = calculateGravitation(G, m1, m2, r)
      expect(F / 1e20).toBeCloseTo(1.982, 1)
    })
  })

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

    it('should treat critical point (F = f_max) as static', () => {
      // f_max = mu_static * m * g = 0.3 * 1.12 * 5 * 9.8 = 16.464 N
      const F_applied = 0.3 * 1.12 * 5 * 9.8
      const res = calculateFrictionPullModel(m, mu, F_applied, g)
      expect(res.isSliding).toBe(false)
      expect(res.f_actual).toBeCloseTo(F_applied, 2)
      expect(res.a).toBe(0)
    })

    it('should return zero friction when mu = 0', () => {
      const F_applied = 10
      const res = calculateFrictionPullModel(m, 0, F_applied, g)
      expect(res.isSliding).toBe(true)
      expect(res.f_actual).toBe(0)
      expect(res.a).toBeCloseTo(F_applied / m, 2)
    })

    it('should return muStatic using DEFAULT_STATIC_FRICTION_RATIO', () => {
      const res = calculateFrictionPullModel(m, mu, 10, g)
      expect(res.muStatic).toBeCloseTo(mu * 1.12, 5)
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

    it('should treat critical angle as static', () => {
      // criticalAngle = arctan(mu_static) = arctan(0.336) ≈ 18.57°
      const res = calculateFrictionInclineModel(m, mu, 18.57, g)
      expect(res.isSliding).toBe(false)
    })

    it('should return zero friction and acceleration on a flat surface (angle = 0)', () => {
      const res = calculateFrictionInclineModel(m, mu, 0, g)
      expect(res.isSliding).toBe(false)
      expect(res.f_actual).toBe(0)
      expect(res.a).toBe(0)
    })

    it('should handle near-vertical angle (89°) with numerical stability', () => {
      const res = calculateFrictionInclineModel(m, mu, 89, g)
      expect(res.isSliding).toBe(true)
      expect(isFinite(res.f_actual)).toBe(true)
      expect(isFinite(res.a)).toBe(true)
      // 法向力趋近 0，摩擦力趋近 0
      expect(res.f_actual).toBeLessThan(1)
    })

    it('should return muStatic and f_slip fields', () => {
      const res = calculateFrictionInclineModel(m, mu, 30, g)
      expect(res.muStatic).toBeCloseTo(mu * 1.12, 5)
      expect(res.f_slip).toBeCloseTo(mu * m * g * Math.cos(30 * Math.PI / 180), 2)
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

  describe('calculateEquilibriumTension', () => {
    const g = 9.8

    it('should calculate tension correctly under symmetric hanging (30 degrees)', () => {
      // 质量 2kg，重力 19.6N，两角均 30度
      const { t1, t2, gravity } = calculateEquilibriumTension(2, 30, 30, g)
      expect(gravity).toBeCloseTo(19.6, 5)
      // T1 = T2 = G = 19.6 N
      expect(t1).toBeCloseTo(19.6, 2)
      expect(t2).toBeCloseTo(19.6, 2)
    })

    it('should handle vertical limit single hang correctly', () => {
      // 左绳 90度（竖直），右绳 0度（水平但拉力为 0）
      const { t1, t2 } = calculateEquilibriumTension(2, 90, 0, g)
      expect(t1).toBeCloseTo(19.6, 5) // 承受全部重力
      expect(t2).toBeCloseTo(0, 5)    // 水平绳无拉力
    })

    it('should return safety overload values if angles are too small', () => {
      // 两角夹角之和趋近于 0（极端拉平）
      const { t1, t2 } = calculateEquilibriumTension(2, 0.5, 0.5, g)
      expect(t1).toBe(999)
      expect(t2).toBe(999)
    })
  })

  describe('calculateNewtonSecondVariableMotion', () => {
    const m = 2
    const mu = 0.2
    const g = 9.8

    it('should stay static under linear force when F_applied <= f_max', () => {
      const k = 2
      // t = 1, F_applied = 2 <= 3.92, 应该静止
      const res = calculateNewtonSecondVariableMotion(0, { m, mu, k, g }, 1)
      expect(res.F_applied).toBe(2)
      expect(res.f).toBe(2)
      expect(res.F_net).toBe(0)
      expect(res.a).toBe(0)
      expect(res.v).toBe(0)
      expect(res.s).toBe(0)
    })

    it('should slide under linear force when F_applied > f_max', () => {
      const k = 2
      // t = 3, F_applied = 6 > 3.92, 应该开始运动
      const res = calculateNewtonSecondVariableMotion(0, { m, mu, k, g }, 3)
      expect(res.F_applied).toBe(6)
      expect(res.f).toBeCloseTo(3.92, 5)
      expect(res.F_net).toBeCloseTo(6 - 3.92, 5)
      expect(res.a).toBeCloseTo((6 - 3.92) / m, 5)
    })

    it('should calculate sine variable force motion correctly', () => {
      const F0 = 10
      const omega = 1.5
      // t = 2
      const res = calculateNewtonSecondVariableMotion(1, { m, mu: 0, F0, omega }, 2)
      const expectedF = F0 * Math.sin(omega * 2)
      expect(res.F_applied).toBeCloseTo(expectedF, 5)
      expect(res.f).toBe(0)
      expect(res.F_net).toBeCloseTo(expectedF, 5)
      expect(res.a).toBeCloseTo(expectedF / m, 5)
    })
  })

  describe('calculateElevatorMotion', () => {
    const m = 50
    const g = 9.8

    it('should calculate elevator state correctly for mode 0 (variable lift) at different phases', () => {
      // t = 1.0 (加速上升)
      const res1 = calculateElevatorMotion(0, m, g, 1.0)
      expect(res1.a).toBe(2.0)
      expect(res1.v).toBe(2.0)
      expect(res1.y).toBe(1.0)
      expect(res1.N).toBe(50 * (9.8 + 2.0))
      expect(res1.state).toBe('overweight')

      // t = 3.0 (匀速上升)
      const res2 = calculateElevatorMotion(0, m, g, 3.0)
      expect(res2.a).toBe(0)
      expect(res2.v).toBe(4.0)
      expect(res2.N).toBe(50 * 9.8)
      expect(res2.state).toBe('normal')

      // t = 6.0 (减速上升)
      const res3 = calculateElevatorMotion(0, m, g, 6.0)
      expect(res3.a).toBe(-2.0)
      expect(res3.v).toBe(2.0)
      expect(res3.N).toBe(50 * (9.8 - 2.0))
      expect(res3.state).toBe('underweight')
    })

    it('should calculate elevator state correctly for mode 1 (cable break and free fall)', () => {
      // t = 1.0 (静止在空中)
      const res1 = calculateElevatorMotion(1, m, g, 1.0)
      expect(res1.a).toBe(0)
      expect(res1.N).toBe(50 * 9.8)
      expect(res1.state).toBe('normal')

      // t = 2.0 (完全失重下落)
      const res2 = calculateElevatorMotion(1, m, g, 2.0)
      expect(res2.a).toBe(-g)
      expect(res2.N).toBe(0)
      expect(res2.state).toBe('weightless')

      // t = 4.5 (阻尼减速缓冲)
      const res3 = calculateElevatorMotion(1, m, g, 4.5)
      expect(res3.a).toBe(2.5 * g)
      expect(res3.N).toBeGreaterThan(50 * g)
      expect(res3.state).toBe('overweight')
    })
  })

  describe('calculateConnectedBody', () => {
    const g = 9.8

    it('should return moving state when F exceeds total friction', () => {
      // m1=2, m2=3, F=15, mu=0.1
      // totalFrictionMax = 0.1 * (2+3) * 9.8 = 4.9
      // F=15 > 4.9, isMoving=true
      const res = calculateConnectedBody(2, 3, 15, 0.1, g)
      expect(res.isMoving).toBe(true)
      // a = (15 - 4.9) / 5 = 2.02
      expect(res.a).toBeCloseTo(2.02, 2)
      // T = m1*F/(m1+m2) = 2*15/5 = 6
      expect(res.T).toBeCloseTo(6, 5)
      expect(res.displayTension).toBeCloseTo(6, 5)
      expect(res.f1).toBeCloseTo(0.1 * 2 * 9.8, 5)
      expect(res.f2).toBeCloseTo(0.1 * 3 * 9.8, 5)
      expect(res.staticTensionRange).toBeNull()
    })

    it('should return static state when F does not exceed total friction', () => {
      // m1=2, m2=3, F=3, mu=0.1
      // totalFrictionMax = 4.9, F=3 < 4.9
      const res = calculateConnectedBody(2, 3, 3, 0.1, g)
      expect(res.isMoving).toBe(false)
      expect(res.a).toBe(0)
      expect(res.T).toBe(0)
      expect(res.displayTension).toBe(0)
      expect(res.f1).toBeNull()
      expect(res.f2).toBeNull()
      expect(res.f1Max).toBeCloseTo(0.1 * 2 * 9.8, 5)
      expect(res.f2Max).toBeCloseTo(0.1 * 3 * 9.8, 5)
      expect(res.staticTensionRange).not.toBeNull()
      // T_min = max(0, F - f2Max) = max(0, 3 - 2.94) = 0.06
      expect(res.staticTensionRange!.min).toBeCloseTo(0.06, 2)
      // T_max = min(f1Max, F) = min(1.96, 3) = 1.96
      expect(res.staticTensionRange!.max).toBeCloseTo(1.96, 2)
    })

    it('should return zero tension range when F=0', () => {
      const res = calculateConnectedBody(2, 3, 0, 0.1, g)
      expect(res.isMoving).toBe(false)
      expect(res.staticTensionRange!.min).toBe(0)
      expect(res.staticTensionRange!.max).toBe(0)
    })

    it('should handle zero friction (smooth surface)', () => {
      // mu=0, any F > 0 should cause motion
      const res = calculateConnectedBody(2, 3, 10, 0, g)
      expect(res.isMoving).toBe(true)
      expect(res.a).toBeCloseTo(10 / 5, 5)
      expect(res.T).toBeCloseTo(2 * 10 / 5, 5)
    })
  })

  describe('calculateConnectedBodyTimeline', () => {
    const g = 9.8

    it('should return zero state when system is not moving', () => {
      const res = calculateConnectedBodyTimeline(2, 3, 3, 0.1, g, 2.0)
      expect(res.a).toBe(0)
      expect(res.v).toBe(0)
      expect(res.s).toBe(0)
      expect(res.T).toBe(0)
      expect(res.isMoving).toBe(false)
    })

    it('should return zero state at t=0 even if system can move', () => {
      const res = calculateConnectedBodyTimeline(2, 3, 15, 0.1, g, 0)
      expect(res.a).toBe(0)
      expect(res.v).toBe(0)
      expect(res.s).toBe(0)
      expect(res.isMoving).toBe(false)
    })

    it('should calculate correct kinematics for moving system', () => {
      // a = (15 - 4.9) / 5 = 2.02 m/s²
      const res = calculateConnectedBodyTimeline(2, 3, 15, 0.1, g, 2.0)
      expect(res.isMoving).toBe(true)
      expect(res.a).toBeCloseTo(2.02, 2)
      expect(res.v).toBeCloseTo(2.02 * 2, 2)
      expect(res.s).toBeCloseTo(0.5 * 2.02 * 4, 2)
      expect(res.T).toBeCloseTo(6, 5)
    })

    it('should handle negative time as zero', () => {
      const res = calculateConnectedBodyTimeline(2, 3, 15, 0.1, g, -1)
      expect(res.a).toBe(0)
      expect(res.v).toBe(0)
      expect(res.s).toBe(0)
    })
  })
})


