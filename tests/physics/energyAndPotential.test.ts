import { describe, it, expect } from 'vitest'
import {
  precomputePendulumTrajectory,
  precomputeValleyTrajectory,
  getECStateAtTime,
} from '@/physics/energyConservation'
import {
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
} from '@/physics/potentialEnergy'

describe('physics/energyConservation · 机械能守恒与阻尼耗散', () => {
  it('理想单摆往复过程：总能量恒定且无摩擦生热 Q=0', () => {
    const m = 2
    const L = 2
    const g = 10
    const pts = precomputePendulumTrajectory(m, L, 60, g, 4, 0.02)
    expect(pts.length).toBeGreaterThan(100)
    const E0 = m * g * L * (1 - Math.cos(Math.PI / 3)) // 2 * 10 * 2 * 0.5 = 20 J

    for (const p of pts) {
      expect(p.Q).toBe(0)
      expect(p.Etot).toBeCloseTo(E0, 10)
      // 半隐式欧拉法子步积分，机械能漂移极小
      expect(p.Ep + p.Ek).toBeCloseTo(E0, 2)
    }
  })

  it('山谷阻尼轨道：产生热量 Q 满足 Ep + Ek + Q = E0，坡上满足停住判据后进 phase=1', () => {
    const pts = precomputeValleyTrajectory(1, 2, 0.4, 45, 10, 8, 0.02)
    const E0 = pts[0].Etot
    expect(pts[pts.length - 1].phase).toBe(1)
    expect(pts[pts.length - 1].v).toBe(0)
    expect(pts[pts.length - 1].Q).toBeGreaterThan(0)
    for (const p of pts) {
      expect(p.Ep + p.Ek + p.Q).toBeCloseTo(E0, 5)
    }

    // 插值器与空列表边界
    expect(getECStateAtTime([], 1).Etot).toBe(0)
    expect(getECStateAtTime(pts, -1).t).toBe(0)
    expect(getECStateAtTime(pts, 999).t).toBe(pts[pts.length - 1].t)
    const sMid = getECStateAtTime(pts, 0.51)
    expect(sMid.t).toBeCloseTo(0.51, 10)
  })
})

describe('physics/potentialEnergy · 重力势能与弹性势能', () => {
  it('重力自由落体与反弹：重力做功恒等于势能减少量 W = -ΔEp，且碰撞门限后停在地面', () => {
    const m = 1
    const g = 10
    const y0 = 5
    const y_ref = 2
    const pts = precomputeGravityTrajectory(m, g, y0, y_ref, 0.6, 8, 0.02)

    expect(pts[0].Ep).toBeCloseTo(m * g * (y0 - y_ref), 10)
    for (const p of pts) {
      expect(p.W).toBeCloseTo(-p.deltaEp, 10)
      expect(p.pos).toBeGreaterThanOrEqual(0)
    }
    const last = pts[pts.length - 1]
    expect(last.pos).toBe(0)
    expect(last.v).toBe(0)
  })

  it('弹性简谐振动：满足机械能守恒、胡克定律 F=-kx 与 W=-ΔEp', () => {
    const m = 2
    const k = 50
    const x0 = 0.4
    const pts = precomputeSpringTrajectory(m, k, x0, 5, 0.02)
    const E0 = 0.5 * k * x0 * x0 // 4 J

    for (const p of pts) {
      expect(p.F).toBeCloseTo(-k * p.pos, 10)
      expect(p.a).toBeCloseTo(p.F / m, 10)
      expect(p.Ep + p.Ek).toBeCloseTo(E0, 10)
      expect(p.W).toBeCloseTo(-p.deltaEp, 10)
    }

    // 插值器边界
    expect(getPEStateAtTime([], 1).mode).toBe(0)
    expect(getPEStateAtTime(pts, -2).pos).toBeCloseTo(x0, 10)
    expect(getPEStateAtTime(pts, 999).t).toBe(pts[pts.length - 1].t)
    const s = getPEStateAtTime(pts, 0.11)
    expect(s.t).toBeCloseTo(0.11, 10)
  })
})
