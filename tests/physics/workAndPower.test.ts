import { describe, it, expect } from 'vitest'
import {
  calculateWorkBasic,
  classifyWorkType,
  calculateWorkAdvanced,
  calculateLiftOffForce,
  calculateWorkKinematicsBasic,
  calculateWorkKinematicsAdvanced,
  computeVTPoints,
  computeWorkFSeries,
  computeWorkEnergyBars,
} from '@/physics/work'
import {
  precomputeConstantPowerTrajectory,
  precomputeConstantAccelTrajectory,
  getPowerStateAtTime,
  calculateConstantPowerParams,
  calculateConstantAccelParams,
} from '@/physics/power'

describe('physics/work · 恒力做功与动能耦合', () => {
  it('基础模式：0°/60°/90°/120° 做功与正负判定一致', () => {
    expect(classifyWorkType(30)).toBe('positive')
    expect(classifyWorkType(90)).toBe('zero')
    expect(classifyWorkType(135)).toBe('negative')

    const w60 = calculateWorkBasic(20, 5, 60)
    expect(w60.Fx).toBeCloseTo(10, 10)
    expect(w60.Fy).toBeCloseTo(10 * Math.sqrt(3), 10)
    expect(w60.W).toBeCloseTo(50, 10)

    const w90 = calculateWorkBasic(20, 5, 90)
    expect(w90.W).toBeCloseTo(0, 10)

    const w120 = calculateWorkBasic(20, 5, 120)
    expect(w120.W).toBeCloseTo(-50, 10)
  })

  it('进阶模式：脱地临界判据与摩擦力清零一致，满足动能定理 W_net = WF + Wf = Ek', () => {
    const m = 2
    const g = 10
    const crit = calculateLiftOffForce(m, 30, g) // mg / sin30° = 40 N
    expect(crit).toBeCloseTo(40, 10)
    expect(calculateLiftOffForce(m, 0, g)).toBe(Infinity)

    // 未脱地：F=20, θ=30° -> Fy=10 < 20, FN=10, f=0.2*10=2
    const normal = calculateWorkAdvanced(20, 4, 30, m, 0.2, g)
    expect(normal.isLiftedOff).toBe(false)
    expect(normal.F_N).toBeCloseTo(10, 10)
    expect(normal.f).toBeCloseTo(2, 10)
    expect(normal.W_net).toBeCloseTo(normal.W_F + normal.W_f, 10)

    const bars = computeWorkEnergyBars(4, 20, 30, m, 0.2, g)
    expect(bars.WF).toBeCloseTo(normal.W_F, 10)
    expect(bars.Wf_abs).toBeCloseTo(-normal.W_f, 10)
    expect(bars.Ek).toBeCloseTo(normal.W_net, 10)

    // 脱地：F=45 >= 40 -> FN=0, f=0, Wf=0
    const lifted = calculateWorkAdvanced(45, 4, 30, m, 0.2, g)
    expect(lifted.isLiftedOff).toBe(true)
    expect(lifted.F_N).toBe(0)
    expect(lifted.f).toBe(0)
    expect(lifted.W_f).toBe(0)
  })

  it('运动学量、v-t 采样与 F-s 序列严格自洽', () => {
    const kBasic = calculateWorkKinematicsBasic(10, 8, 0, 2)
    expect(kBasic.a).toBeCloseTo(5, 10)
    expect(kBasic.v_max).toBeCloseTo(Math.sqrt(2 * 5 * 8), 10)
    expect(kBasic.t_total).toBeCloseTo(Math.sqrt((2 * 8) / 5), 10)

    const vt = computeVTPoints(kBasic, 11)
    expect(vt).toHaveLength(11)
    expect(vt[0]).toEqual({ t: 0, v: 0 })
    expect(vt[10].v).toBeCloseTo(kBasic.v_max, 10)

    // 力不足以克服摩擦或夹角 90° 时静止分支
    const staticKin = calculateWorkKinematicsAdvanced(5, 10, 0, 2, 0.5, 10)
    expect(staticKin.a).toBe(0)
    expect(staticKin.t_total).toBe(Infinity)
    const zeroVt = computeVTPoints(staticKin, 5)
    expect(zeroVt.every((p) => p.v === 0)).toBe(true)

    const series = computeWorkFSeries(45, 30, 2, 0.2, 10, 10, 5)
    expect(series).toHaveLength(5)
    expect(series[4].s).toBeCloseTo(10, 10)
    expect(series[4].Wf_abs).toBe(0) // 已脱地
    expect(series[4].Wnet).toBeCloseTo(series[4].WF, 10)

    // 非脱地且静摩擦不足起动时 Ek clamp 为 0
    const stuckBars = computeWorkEnergyBars(3, 5, 0, 2, 0.5, 10)
    expect(stuckBars.Ek).toBe(0)
  })
})

describe('physics/power · 汽车两种起动模型', () => {
  it('恒定功率起动：低速限流 F_max = 3f，终态趋近 v_max = P/f', () => {
    const P_rated = 60000
    const m = 200
    const f = 2000
    const params = calculateConstantPowerParams(P_rated, m, f)
    expect(params.F_max).toBe(6000)
    expect(params.v_max).toBe(30)
    expect(params.v_limit).toBe(10)

    const pts = precomputeConstantPowerTrajectory(P_rated, m, f, 100, 0.05)
    expect(pts[0].F).toBe(6000)
    const last = pts[pts.length - 1]
    expect(last.v).toBeCloseTo(params.v_max, 2)
    expect(last.a).toBeCloseTo(0, 4)
    expect(last.P).toBeCloseTo(P_rated, 0)
  })

  it('恒定加速度起动：经历匀加速(0) -> 变加速(1) -> 匀速(2)三阶段且临界量一致', () => {
    const P_rated = 60000
    const m = 200
    const f = 2000
    const a_target = 5
    const cp = calculateConstantAccelParams(P_rated, m, f, a_target)
    expect(cp.F_const).toBe(3000)
    expect(cp.v_c).toBe(20)
    expect(cp.t_c).toBe(4)
    expect(cp.v_max).toBe(30)

    const { points, v_c, t_c } = precomputeConstantAccelTrajectory(P_rated, m, f, a_target, 60, 0.02)
    expect(v_c).toBe(cp.v_c)
    expect(t_c).toBe(cp.t_c)

    const phases = new Set(points.map((p) => p.phase))
    expect(phases.has(0)).toBe(true)
    expect(phases.has(1)).toBe(true)
    expect(phases.has(2)).toBe(true)

    // 插值器与边界处理
    expect(getPowerStateAtTime([], 5).v).toBe(0)
    expect(getPowerStateAtTime(points, -1).t).toBe(points[0].t)
    expect(getPowerStateAtTime(points, 999).v).toBeCloseTo(30, 1)
    const mid = getPowerStateAtTime(points, 2.01)
    expect(mid.t).toBeCloseTo(2.01, 10)
    expect(mid.v).toBeCloseTo(a_target * 2.01, 1)
  })
})
