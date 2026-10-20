import { describe, it, expect } from 'vitest'
import { computeCircularGeometryOrbit } from '../magnetism/circularGeometry'
import { calculateFreeThreeChargeEquilibrium } from '../electrostatics'

/** 静电力常量 k = 9.0×10⁹ N·m²/C² */
const COULOMB_CONST = 9.0e9

describe('磁场圆周几何：偏转侧与出射时刻', () => {
  it('正电荷在垂直纸面向里的磁场中向左偏（逆时针），60° 入射走长弧 240°', () => {
    const o = computeCircularGeometryOrbit({
      particleSign: 1,
      velocity: 3,
      angleDeg: 60,
      B: 1,
      boundaryType: 0,
    })
    // R = mv/(qB) = 3 m，ω = qB/m = 1 rad/s
    expect(o.R).toBeCloseTo(3, 6)
    // 圆心必须落在速度的左侧：入射 60° 时圆心 x<0、y>0（磁场内）
    expect(o.xc).toBeLessThan(0)
    expect(o.yc).toBeGreaterThan(0)
    // 出射弧角 = 2π − 2α = 240° → t = 4.19 s（若误取短弧 2α 会得 2.09 s）
    expect(o.tOut).toBeCloseTo(4.19, 1)
  })

  it('负电荷取镜像：向右偏（顺时针），60° 入射走短弧 120°', () => {
    const o = computeCircularGeometryOrbit({
      particleSign: -1,
      velocity: 3,
      angleDeg: 60,
      B: 1,
      boundaryType: 0,
    })
    expect(o.xc).toBeGreaterThan(0)
    expect(o.yc).toBeLessThan(0)
    expect(o.tOut).toBeCloseTo(2.09, 1)
  })

  it('出射弧角只由入射角决定：t 反比于 ω', () => {
    const a = computeCircularGeometryOrbit({ particleSign: 1, velocity: 2, angleDeg: 45, B: 1, boundaryType: 0 })
    const b = computeCircularGeometryOrbit({ particleSign: 1, velocity: 4, angleDeg: 45, B: 2, boundaryType: 0 })
    // 45° 入射 → 长弧 270°；ω 加倍则时间减半
    expect(a.tOut).toBeCloseTo(4.71, 1)
    expect(b.tOut).toBeCloseTo(a.tOut / 2, 1)
  })
})

describe('库仑定律：三电荷自由平衡', () => {
  it('异号电荷（+2μC 与 −3μC）的平衡电荷必须为负，且使三力平衡', () => {
    const q1 = 2e-6
    const q2 = -3e-6
    const r = 0.04
    const { q3, r13, r23, valid } = calculateFreeThreeChargeEquilibrium(q1, q2, r)
    expect(valid).toBe(true)
    // q3 必须与两侧电荷"夹"出平衡：异号情形下为负
    expect(q3).toBeLessThan(0)

    // 以 q1 为原点，q2 在 x=r，q3 在 x=r13（可能为负）
    const x1 = 0
    const x2 = r
    const x3 = r13
    const forceOn = (qa: number, xa: number, qb: number, xb: number) => {
      const dx = xb - xa
      const d = Math.abs(dx)
      // 同号排斥(+) 沿 +x，异号吸引(−)
      return (COULOMB_CONST * qa * qb * Math.sign(dx)) / (d * d)
    }
    // q1 受力：来自 q2 与 q3
    const f1 = forceOn(q1, x1, q2, x2) + forceOn(q1, x1, q3, x3)
    expect(Math.abs(f1)).toBeLessThan(1e-3)
    // q2 受力
    const f2 = forceOn(q2, x2, q1, x1) + forceOn(q2, x2, q3, x3)
    expect(Math.abs(f2)).toBeLessThan(1e-3)
    // 位置关系：q3 在 q1 外侧，距离比满足 √|q| 关系
    expect(Math.abs(r23)).toBeGreaterThan(Math.abs(r13))
  })

  it('同号电荷（+4μC 与 +1μC）的平衡电荷为负且夹在中间', () => {
    const { q3, r13, r23, valid } = calculateFreeThreeChargeEquilibrium(4e-6, 1e-6, 0.05)
    expect(valid).toBe(true)
    expect(q3).toBeLessThan(0)
    expect(r13 + r23).toBeCloseTo(0.05, 6)
  })
})
