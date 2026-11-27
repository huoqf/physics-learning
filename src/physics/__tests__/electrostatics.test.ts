import { describe, it, expect } from 'vitest'
import {
  COULOMB_CONSTANT,
  GRAVITY,
  VACUUM_PERMITTIVITY,
  calculateCoulombPendulum,
  calculateThreeChargeForces,
  calculateFreeThreeChargeEquilibrium,
  findEquilibriumX3,
  calculateNonUniformEField,
  calculateTwoChargeField2D,
  computePointChargeEquipotentialRadii,
  TWO_CHARGE_SEPARATION_M,
} from '../index'

describe('electrostatics 物理纯函数完整回归测试', () => {
  describe('calculateFreeThreeChargeEquilibrium · 三电荷自由平衡（全符号组合）', () => {
    const cases = [
      { label: '同正 (+4μC, +1μC)', q1: 4e-6, q2: 1e-6, expectedSign: -1 },
      { label: '同负 (−4μC, −1μC)', q1: -4e-6, q2: -1e-6, expectedSign: 1 },
      { label: '异号左小 (+1μC, −4μC)', q1: 1e-6, q2: -4e-6, expectedSign: -1 },
      { label: '异号左负小 (−1μC, +4μC)', q1: -1e-6, q2: 4e-6, expectedSign: 1 },
      { label: '异号右小 (+4μC, −1μC)', q1: 4e-6, q2: -1e-6, expectedSign: 1 },
      { label: '异号右负小 (−4μC, +1μC)', q1: -4e-6, q2: 1e-6, expectedSign: -1 },
    ]

    for (const c of cases) {
      it(`${c.label}：三个电荷所受合力均严格归零`, () => {
        const r = 0.06
        const { q3, r13, valid } = calculateFreeThreeChargeEquilibrium(c.q1, c.q2, r)
        expect(valid).toBe(true)
        expect(Math.sign(q3)).toBe(c.expectedSign)

        const forces = calculateThreeChargeForces(COULOMB_CONSTANT, [
          { x: 0, y: 0, q: c.q1 },
          { x: r, y: 0, q: c.q2 },
          { x: r13, y: 0, q: q3 },
        ])
        for (const f of forces) {
          expect(f.magnitude).toBeLessThan(1e-9)
        }
      })
    }

    it('等量异号或含零电荷时返回 valid=false', () => {
      expect(calculateFreeThreeChargeEquilibrium(2e-6, -2e-6, 0.05).valid).toBe(false)
      expect(calculateFreeThreeChargeEquilibrium(0, 2e-6, 0.05).valid).toBe(false)
      expect(calculateFreeThreeChargeEquilibrium(2e-6, 0, 0.05).valid).toBe(false)
    })
  })

  describe('findEquilibriumX3 · 单电荷平衡点（不落入奇点）', () => {
    it('同号电荷 (+1μC, +4μC) 平衡点严格在中间且不落入奇点', () => {
      const x1 = 0.3
      const x2 = 0.6
      const { x, possible } = findEquilibriumX3(1, x1, 4, x2, 1, 0.05, 0.85)
      expect(possible).toBe(true)
      // r13 / r23 = 1/2 => x = 0.3 + 0.3 * (1/3) = 0.4
      expect(x).toBeCloseTo(0.4, 8)
      const forces = calculateThreeChargeForces(COULOMB_CONSTANT, [
        { x: x1, y: 0, q: 1e-6 },
        { x: x2, y: 0, q: 4e-6 },
        { x: x, y: 0, q: 1e-6 },
      ])
      expect(forces[2].magnitude).toBeLessThan(1e-9)
    })

    it('同负电荷 (−4μC, −1μC) 平衡点靠近小电荷 −1μC', () => {
      const x1 = 0.3
      const x2 = 0.6
      const { x, possible } = findEquilibriumX3(-4, x1, -1, x2, -2, 0.05, 0.85)
      expect(possible).toBe(true)
      expect(x).toBeCloseTo(0.5, 8)
    })

    it('异号电荷 (+1μC, −4μC) 平衡点位于小电荷外侧且合力为零', () => {
      const x1 = 0.35
      const x2 = 0.65
      const { x, possible } = findEquilibriumX3(1, x1, -4, x2, 2, 0.02, 0.9)
      expect(possible).toBe(true)
      // d13 = 0.3 * 1 / (2 - 1) = 0.3 => x = 0.35 - 0.3 = 0.05
      expect(x).toBeCloseTo(0.05, 8)
      const forces = calculateThreeChargeForces(COULOMB_CONSTANT, [
        { x: x1, y: 0, q: 1e-6 },
        { x: x2, y: 0, q: -4e-6 },
        { x: x, y: 0, q: 2e-6 },
      ])
      expect(forces[2].magnitude).toBeLessThan(1e-9)
    })

    it('平衡点越界或等量异号或 q3=0 时返回 possible=false', () => {
      expect(findEquilibriumX3(1, 0.35, -4, 0.65, 2, 0.1, 0.9).possible).toBe(false)
      expect(findEquilibriumX3(2, 0.35, -2, 0.65, 1, 0.02, 0.9).possible).toBe(false)
      expect(findEquilibriumX3(1, 0.35, 4, 0.65, 0, 0.02, 0.9).possible).toBe(false)
    })
  })

  describe('calculateThreeChargeForces · 二维牛顿第三定律与除零保护', () => {
    it('平面三电荷库仑力总和恒为 0，且重合时不产生 NaN', () => {
      const f = calculateThreeChargeForces(COULOMB_CONSTANT, [
        { x: 0, y: 0, q: 2e-6 },
        { x: 0.3, y: 0, q: -3e-6 },
        { x: 0.1, y: 0.25, q: 1.5e-6 },
      ])
      const sumFx = f[0].fx + f[1].fx + f[2].fx
      const sumFy = f[0].fy + f[1].fy + f[2].fy
      expect(sumFx).toBeCloseTo(0, 9)
      expect(sumFy).toBeCloseTo(0, 9)

      const overlap = calculateThreeChargeForces(COULOMB_CONSTANT, [
        { x: 0, y: 0, q: 1e-6 },
        { x: 0, y: 0, q: 1e-6 },
      ])
      expect(overlap[0].magnitude).toBe(0)
    })
  })

  describe('calculateCoulombPendulum · 双丝线库仑摆平衡', () => {
    it('同号电荷满足 tanθ = F/(mg) 与 T = mg/cosθ', () => {
      const m = 0.01
      const L = 0.5
      const res = calculateCoulombPendulum(COULOMB_CONSTANT, 2e-6, 2e-6, m, L, GRAVITY)
      expect(res.hasSeparatedEquilibrium).toBe(true)
      expect(res.attractive).toBe(false)
      expect(Math.tan(res.theta)).toBeCloseTo(res.F / (m * GRAVITY), 5)
      expect(res.T).toBeCloseTo((m * GRAVITY) / Math.cos(res.theta), 5)
    })

    it('异号电荷同悬点不存在分离平衡解', () => {
      const res = calculateCoulombPendulum(COULOMB_CONSTANT, 2e-6, -2e-6, 0.01, 0.5, GRAVITY)
      expect(res.hasSeparatedEquilibrium).toBe(false)
      expect(res.attractive).toBe(true)
    })
  })

  describe('calculateNonUniformEField · 非匀强电势与场强梯度', () => {
    it('切换零势点仅平移绝对电势，不改变电势差 U_AB 与场强矢量', () => {
      const infA = calculateNonUniformEField(1.5, 1.2, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      const infB = calculateNonUniformEField(5.5, 1.2, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      const gndA = calculateNonUniformEField(1.5, 1.2, 150, 3.5, 2.2, 2e-6, 'ground', 3.5, 3.5, 0)
      const gndB = calculateNonUniformEField(5.5, 1.2, 150, 3.5, 2.2, 2e-6, 'ground', 3.5, 3.5, 0)

      expect(infA.phi - infB.phi).toBeCloseTo(gndA.phi - gndB.phi, 8)
      expect(infA.Ex).toBeCloseTo(gndA.Ex, 10)
      expect(infA.Ey).toBeCloseTo(gndA.Ey, 10)
    })

    it('远场处 φ-x 负导数等于 x 方向场强 Ex = -dφ/dx', () => {
      const dx = 1e-4
      const x = 2.0
      const y = 1.2
      const p1 = calculateNonUniformEField(x - dx, y, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      const p2 = calculateNonUniformEField(x + dx, y, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      const mid = calculateNonUniformEField(x, y, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      expect(mid.isRegularized).toBe(false)
      expect(-(p2.phi - p1.phi) / (2 * dx)).toBeCloseTo(mid.Ex, 2)
    })

    it('靠近点电荷正则化半径内触发 isRegularized 标记', () => {
      const near = calculateNonUniformEField(3.52, 2.2, 150, 3.5, 2.2, 2e-6, 'infinity', 3.5, 3.5, 0)
      expect(near.isRegularized).toBe(true)
      expect(near.rEffective).toBeCloseTo(0.1, 8)
    })
  })

  describe('calculateTwoChargeField2D · 双电荷二维叠加场强', () => {
    it('等量异种中垂线上合场强仅沿水平方向（Ey=0）', () => {
      const res = calculateTwoChargeField2D({
        q1C: 5e-6,
        q2C: -5e-6,
        separationM: TWO_CHARGE_SEPARATION_M,
        xM: 0,
        yM: 0.04,
        qTestC: 1e-6,
      })
      expect(res.Ex).toBeGreaterThan(0)
      expect(Math.abs(res.Ey)).toBeLessThan(1e-6)
    })

    it('等量同正中垂线上合场强仅沿竖直向上（Ex=0, Ey>0），中心处合场强为 0', () => {
      const center = calculateTwoChargeField2D({
        q1C: 5e-6,
        q2C: 5e-6,
        xM: 0,
        yM: 0,
        qTestC: 1e-6,
      })
      expect(center.E).toBeCloseTo(0, 6)

      const bisector = calculateTwoChargeField2D({
        q1C: 5e-6,
        q2C: 5e-6,
        xM: 0,
        yM: 0.03,
        qTestC: 1e-6,
      })
      expect(Math.abs(bisector.Ex)).toBeLessThan(1e-6)
      expect(bisector.Ey).toBeGreaterThan(0)
    })
  })

  describe('computePointChargeEquipotentialRadii · 等差等势面内密外疏', () => {
    it('相邻等势面 1/r 等差分布，半径间距严格单调递增', () => {
      const radii = computePointChargeEquipotentialRadii(36, 290, 9)
      expect(radii).toHaveLength(9)
      expect(radii[0]).toBeCloseTo(36, 8)
      expect(radii[radii.length - 1]).toBeCloseTo(290, 8)

      const invSteps = []
      const radialGaps = []
      for (let i = 1; i < radii.length; i++) {
        invSteps.push(1 / radii[i - 1] - 1 / radii[i])
        radialGaps.push(radii[i] - radii[i - 1])
      }
      for (let i = 1; i < invSteps.length; i++) {
        expect(invSteps[i]).toBeCloseTo(invSteps[0], 10)
        expect(radialGaps[i]).toBeGreaterThan(radialGaps[i - 1])
      }
    })

    it('VACUUM_PERMITTIVITY 常量导出符合 SI 标准', () => {
      expect(VACUUM_PERMITTIVITY).toBeCloseTo(8.854e-12, 16)
    })
  })
})
