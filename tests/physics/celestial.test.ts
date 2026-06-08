import { describe, it, expect } from 'vitest'
import {
  solveKeplerEquation,
  calculateKeplerOrbit,
  calculateOrbitalSpeed,
  calculateKeplerThird,
  calculateCentralMass,
  calculatePlanetDensity,
  calculateEscapeSpeed,
  calculateLaunchTrajectory
} from '@/physics/celestial'

describe('Kepler Physics Calculations', () => {
  describe('solveKeplerEquation', () => {
    it('should solve E - e * sin(E) = M correctly for circle (e = 0)', () => {
      // 当离心率为0（圆轨），偏近点角E应该等于平近点角M
      const M = Math.PI / 3
      const e = 0
      const E = solveKeplerEquation(M, e)
      expect(E).toBeCloseTo(M, 5)
    })

    it('should solve E - e * sin(E) = M correctly for eccentric orbits', () => {
      // 对于离心率为0.5的轨道
      const e = 0.5
      // 选取一些平近点角 M
      const testCases = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI, 2 * Math.PI]
      
      for (const M of testCases) {
        const E = solveKeplerEquation(M, e)
        // 验证 Kepler 方程解的正确性：E - e * sin(E) - M 应趋近于 0
        const residual = E - e * Math.sin(E) - M
        // 模 2pi 归一化（防止 M + 2pi 带来的误差）
        const normalizedResidual = ((residual + Math.PI) % (2 * Math.PI)) - Math.PI
        expect(normalizedResidual).toBeCloseTo(0, 5)
      }
    })
  })

  describe('calculateKeplerOrbit', () => {
    it('should conserve Kepler 1st Law (sum of focal distances r1 + r2 = 2a)', () => {
      const a = 5.0
      const b = 3.0
      const period = 10.0
      
      // 遍历一个周期的不同时刻
      for (let t = 0; t <= period; t += 1.0) {
        const orbit = calculateKeplerOrbit(a, b, t, period)
        
        // 太阳放在右焦点 (c, 0)，行星以几何中心为原点的坐标为 (x, y)
        // r1 是行星到右焦点距离，orbit.r 即代表 r1
        // r2 是行星到左焦点 (-c, 0) 距离
        const c = Math.sqrt(a * a - b * b)
        const x = orbit.x
        const y = orbit.y
        const r2 = Math.sqrt((x + c) * (x + c) + y * y)
        
        // 验证第一定律核心：r1 + r2 = 2a
        expect(orbit.r + r2).toBeCloseTo(2 * a, 4)
      }
    })

    it('should conserve Kepler 2nd Law (angular momentum conservation: r_near * v_near = r_far * v_far)', () => {
      const a = 5.0
      const b = 3.0
      const period = 10.0
      
      const c = Math.sqrt(a * a - b * b)
      const e = c / a
      const r_near = a - c // 近日点
      const r_far = a + c  // 远日点
      
      // 平近点角 M = 0 时，行星在近日点 (t = 0)
      const orbitNear = calculateKeplerOrbit(a, b, 0, period)
      // 平近点角 M = pi 时，行星在远日点 (t = period / 2)
      const orbitFar = calculateKeplerOrbit(a, b, period / 2, period)
      
      // 验证近日点和远日点距离
      expect(orbitNear.r).toBeCloseTo(r_near, 4)
      expect(orbitFar.r).toBeCloseTo(r_far, 4)
      
      // 验证近日点和远日点速度
      // 速度之比应满足 v_near / v_far = r_far / r_near = (1 + e) / (1 - e)
      const ratioV = orbitNear.v / orbitFar.v
      const ratioR = r_far / r_near
      expect(ratioV).toBeCloseTo(ratioR, 4)
      
      // 同样验证近日点和远日点动量守恒乘积相等 (r_near * v_near === r_far * v_far)
      const lNear = orbitNear.r * orbitNear.v
      const lFar = orbitFar.r * orbitFar.v
      expect(lNear).toBeCloseTo(lFar, 4)
    })
  })

  describe('Celestial Satellite and Escape Speed Calculations', () => {
    const G = 6.67e-11
    const M = 5.97e24
    const R = 6.37e6

    it('should calculate orbital speed, period and centripetal acceleration correctly', () => {
      // 轨道半径为 7000 km
      const r = 7000e3
      const { v, T, a_c } = calculateOrbitalSpeed(M, r, G)

      const expectedV = Math.sqrt((G * M) / r)
      const expectedT = (2 * Math.PI * r) / expectedV
      const expectedAc = (expectedV * expectedV) / r

      expect(v).toBeCloseTo(expectedV, 4)
      expect(T).toBeCloseTo(expectedT, 4)
      expect(a_c).toBeCloseTo(expectedAc, 4)
    })

    it('should verify Kepler\'s Third Law T2 = T1 * sqrt((r2/r1)^3)', () => {
      const r1 = 1.0
      const T1 = 1.0
      const r2 = 4.0
      const { T2 } = calculateKeplerThird(r1, T1, r2)
      expect(T2).toBeCloseTo(8.0, 5)
    })

    it('should reverse-calculate central mass M = 4*pi^2*r^3 / (G*T^2)', () => {
      const r = 2.0
      const T = 2 * Math.PI
      const { M: mass } = calculateCentralMass(r, T, 1.0) // G = 1.0
      // M = 4*pi^2 * 8 / (1 * 4*pi^2) = 8
      expect(mass).toBeCloseTo(8.0, 5)
    })

    it('should estimate average planet density rho = 3*pi / (G*T^2)', () => {
      const T_surface = 2 * Math.PI
      const { rho } = calculatePlanetDensity(T_surface, 1.0) // G = 1.0
      // rho = 3*pi / (1 * 4*pi^2) = 0.75 / pi
      expect(rho).toBeCloseTo(0.75 / Math.PI, 5)
    })

    it('should calculate escape speeds correctly (v2 = sqrt(2)*v1)', () => {
      const { v1, v2, v3 } = calculateEscapeSpeed(M, R, G)
      const expectedV1 = Math.sqrt((G * M) / R)
      const expectedV2 = Math.sqrt(2) * expectedV1

      expect(v1).toBeCloseTo(expectedV1, 2)
      expect(v2).toBeCloseTo(expectedV2, 2)
      expect(v3).toBeCloseTo(Math.sqrt(11.2), 4)
    })

    it('should determine launch trajectories correctly', () => {
      const v_c = Math.sqrt((G * M) / R)
      const v_e = Math.sqrt((2 * G * M) / R)

      // 1. 圆形轨道发射 (误差 10 m/s 内)
      const trajCirc = calculateLaunchTrajectory(v_c + 2, M, R, G)
      expect(trajCirc.orbitType).toBe('circular')
      expect(trajCirc.e).toBeLessThan(0.01)

      // 2. 椭圆轨道发射 (v_c < v0 < v_e)
      const trajEll = calculateLaunchTrajectory((v_c + v_e) / 2, M, R, G)
      expect(trajEll.orbitType).toBe('ellipse')
      expect(trajEll.e).toBeGreaterThan(0)
      expect(trajEll.e).toBeLessThan(1.0)
      expect(trajEll.rApo).toBeGreaterThan(R)

      // 3. 逃逸轨道发射 (v0 >= v_e)
      const trajEsc = calculateLaunchTrajectory(v_e + 500, M, R, G)
      expect(trajEsc.orbitType).toBe('escape')
      expect(trajEsc.e).toBeGreaterThanOrEqual(1.0)
      expect(trajEsc.rApo).toBe(Infinity)

      // 4. 坠毁轨道发射 (v0 明显小于 v_c)
      const trajCrash = calculateLaunchTrajectory(0.5 * v_c, M, R, G)
      expect(trajCrash.orbitType).toBe('crash')
      expect(trajCrash.rPeri).toBeLessThan(R)
    })
  })
})

