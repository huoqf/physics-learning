import { describe, it, expect } from 'vitest'
import {
  generateLatticeNodes,
  calculateSurfaceTensionForce,
  calculateCapillaryRise,
} from '../solidsLiquids'

describe('solidsLiquids 物理纯计算测试', () => {
  it('生成单晶点阵严格等距规整', () => {
    const nodes = generateLatticeNodes('singleCrystal', 4, 4, 20)
    expect(nodes).toHaveLength(16)
    expect(nodes[0]).toEqual({ x: 0, y: 0, isCrystal: true })
    expect(nodes[1]).toEqual({ x: 20, y: 0, isCrystal: true })
    expect(nodes[4]).toEqual({ x: 0, y: 20, isCrystal: true })
  })

  it('计算表面张力 F = 2*gamma*L 符合双面液膜物理公式', () => {
    // 水 gamma = 0.073 N/m, L = 0.05m
    const force = calculateSurfaceTensionForce(0.073, 0.05)
    expect(force).toBeCloseTo(0.0073, 5)
  })

  it('毛细上升满足接触角与管径规律（浸润上升，不浸润下降）', () => {
    // 浸润：水在玻璃管中，theta = 0, r = 0.5mm
    const water = calculateCapillaryRise(0.073, 0, 0.0005, 1000, 9.8)
    expect(water.isWetting).toBe(true)
    expect(water.meniscusType).toBe('concave')
    expect(water.h).toBeGreaterThan(0.02) // ~0.0298 m

    // 不浸润：水银在玻璃管中，theta = 140° (2.443 rad), cos < 0
    const mercury = calculateCapillaryRise(0.48, (140 * Math.PI) / 180, 0.0005, 13600, 9.8)
    expect(mercury.isWetting).toBe(false)
    expect(mercury.meniscusType).toBe('convex')
    expect(mercury.h).toBeLessThan(0) // 液面压低
  })
})
