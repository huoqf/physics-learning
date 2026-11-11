import { describe, it, expect } from 'vitest'
import {
  getBoardTimeline,
  getBoardSystemState,
  generateBRTrajectory,
} from '@/physics/blockBoard'
import {
  computeStackedStaticStatics,
  computeSlidingStatics,
} from '@/physics/systemIsolated'
import {
  getCurvedSlotAlpha,
  precomputeCurvedSlot,
  interpolateCurvedSlot,
} from '@/physics/momentumApplication/curvedSlot'

describe('physics/blockBoard · 板块模型三类耦合路径', () => {
  it('情况B（共速后整体减速）：tSync 时刻速度汇合，阶段经历 sliding → together → stopped', () => {
    const param = { m: 2, M: 2, mu1: 0.4, mu2: 0.1, v0: 6, L: 10, g: 10 }
    const tl = getBoardTimeline(param)
    expect(tl.boardMoves).toBe(true)
    expect(tl.tSync).toBeLessThan(tl.tFall)

    const s0 = getBoardSystemState(param, 0)
    expect(s0.phase).toBe('sliding')

    const sMid = getBoardSystemState(param, tl.tSync * 0.5)
    expect(sMid.phase).toBe('sliding')
    expect(sMid.vBlock).toBeGreaterThan(sMid.vBoard)

    const sTogether = getBoardSystemState(param, tl.tSync + 0.1)
    expect(sTogether.phase).toBe('together')
    expect(sTogether.vBlock).toBeCloseTo(sTogether.vBoard, 10)
    expect(sTogether.hasFallen).toBe(false)

    const sEnd = getBoardSystemState(param, tl.tMax + 1)
    expect(sEnd.phase).toBe('stopped')
    expect(sEnd.vBlock).toBe(0)
    expect(sEnd.vBoard).toBe(0)

    const traj = generateBRTrajectory(param, tl.tMax, 20)
    expect(traj.blockTrajectory).toHaveLength(21)
    expect(traj.boardTrajectory).toHaveLength(21)
  })

  it('情况A（滑块共速前跌落）：木板较短时触发 fallen 并独立减速', () => {
    const param = { m: 2, M: 4, mu1: 0.3, mu2: 0.1, v0: 8, L: 2, g: 10 }
    const tl = getBoardTimeline(param)
    expect(tl.tFall).toBeLessThan(tl.tSync)

    const sFall = getBoardSystemState(param, tl.tFall + 0.05)
    expect(sFall.hasFallen).toBe(true)
    expect(sFall.phase).toBe('fallen')

    const sLate = getBoardSystemState(param, tl.tFall + 20)
    expect(sLate.vBlock).toBe(0)
    expect(sLate.vBoard).toBe(0)
  })

  it('情况C（地面粗糙木板不动）：boardMoves=false 且滑块独立刹停', () => {
    const param = { m: 1, M: 5, mu1: 0.2, mu2: 0.5, v0: 4, L: 10, g: 10 }
    const tl = getBoardTimeline(param)
    expect(tl.boardMoves).toBe(false)

    const sMid = getBoardSystemState(param, 1)
    expect(sMid.vBoard).toBe(0)
    expect(sMid.xBoard).toBe(0)
    expect(sMid.vBlock).toBeCloseTo(2, 10)

    const sStop = getBoardSystemState(param, 10)
    expect(sStop.phase).toBe('stopped')
    expect(sStop.vBlock).toBe(0)
  })
})

describe('physics/systemIsolated · 整体法与隔离法静/动力学', () => {
  it('模型1 静力平衡：内力抵消后地面对系统反力严格平衡外力与总重', () => {
    const res = computeStackedStaticStatics(2, 3, Math.PI / 6, 10, 12)
    expect(res.N_ground).toBeCloseTo(50, 10)
    expect(res.f_ground).toBe(12)
    expect(res.N_slope).toBeCloseTo(20 * Math.cos(Math.PI / 6), 10)
    expect(res.f_slope).toBeCloseTo(20 * Math.sin(Math.PI / 6), 10)
  })

  it('模型2 斜面下滑：动/静摩擦判据 sinθ > μcosθ 且地面支持力体现失重分量 m₁a_y', () => {
    const g = 10
    const theta = Math.PI / 4 // sin=cos=sqrt(2)/2
    // μ=0.2 < tan45°=1 -> 起动
    const sliding = computeSlidingStatics(2, 4, theta, 0.2, g)
    expect(sliding.hasMotion).toBe(true)
    expect(sliding.acceleration).toBeGreaterThan(0)
    expect(sliding.N_ground).toBeCloseTo(60 - 2 * sliding.ay, 10)
    expect(sliding.f_ground).toBeCloseTo(2 * sliding.ax, 10)

    // μ=1.5 > tan45°=1 -> 静止
    const resting = computeSlidingStatics(2, 4, theta, 1.5, g)
    expect(resting.hasMotion).toBe(false)
    expect(resting.acceleration).toBe(0)
    expect(resting.N_ground).toBeCloseTo(60, 10)
    expect(resting.f_ground).toBe(0)
    expect(resting.f_slope).toBeCloseTo(20 * Math.sin(theta), 10)
  })
})

describe('physics/momentumApplication/curvedSlot · 弧形槽-滑块耦合 RK4', () => {
  it('可动四分之一槽：水平动量守恒、总质心水平位置守恒、总机械能守恒', () => {
    const m = 1, M = 3, R = 1.6, g = 10
    expect(getCurvedSlotAlpha(Math.PI / 2, 0, m, M, R, g)).toBeLessThan(0)

    const states = precomputeCurvedSlot(m, M, R, g, 1.2, 0.005, 0, 0)
    const E0 = m * g * R // 从 R 高度静止释放
    const xCm0 = (M * 0 + m * R) / (M + m)

    for (const s of states) {
      // 水平动量始终为 0
      expect(m * s.v_x + M * s.v_X).toBeCloseTo(0, 4)
      // 水平质心恒定
      expect((M * s.X + m * s.x) / (M + m)).toBeCloseTo(xCm0, 4)
      // 机械能守恒
      expect(s.Ek_m + s.Ek_M + s.Ep).toBeCloseTo(E0, 2)
    }
    // 确认最终脱离到达平地 (N = 0, Ep = 0)
    const end = states[states.length - 1]
    expect(end.N).toBe(0)
    expect(end.Ep).toBe(0)
  })

  it('固定轨道与对称半圆槽模式及插值边界校验', () => {
    const fixed = precomputeCurvedSlot(1, 3, 1.0, 10, 1.0, 0.01, 1, 1)
    expect(fixed.every((s) => s.X === 0 && s.v_X === 0 && s.Ek_M === 0)).toBe(true)

    expect(interpolateCurvedSlot([], 0.5).theta).toBeCloseTo(Math.PI / 2, 10)
    expect(interpolateCurvedSlot(fixed, -1).t).toBe(0)
    expect(interpolateCurvedSlot(fixed, 999).t).toBe(fixed[fixed.length - 1].t)
    const mid = interpolateCurvedSlot(fixed, 0.255)
    expect(mid.t).toBeCloseTo(0.255, 10)
  })
})
