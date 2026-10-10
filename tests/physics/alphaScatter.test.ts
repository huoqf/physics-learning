import { describe, it, expect } from 'vitest'
import {
  ALPHA_SPEED_PX_PER_FRAME,
  SCATTER_SCALE_PX,
  COULOMB_K,
  classifyScatterAngle,
  scatterAngleDeg,
  closestApproachPx,
  velocityDeflectionDeg,
  integrateAlphaScatterFrame,
  type ScatterParticleState,
} from '@/physics/alphaScatter'

/**
 * α 粒子散射物理层守卫。
 *
 * 核心诉求：数值积分轨迹必须与卢瑟福解析式 θ = 2·arctan(a/b) 一致，
 * 否则中屏动画与右屏物理量看板会给出互相矛盾的散射角。
 */

const CANVAS_W = 840
const CANVAS_H = 650
const NUCLEUS = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
const EMIT_X = 30

/** 复现动画的逐帧推进，返回稳定后的偏转角（度） */
function simulateDeflection(b: number, maxFrames = 3000): number {
  let state: ScatterParticleState = {
    x: EMIT_X,
    y: NUCLEUS.y - b,
    vx: ALPHA_SPEED_PX_PER_FRAME,
    vy: 0,
  }
  for (let f = 0; f < maxFrames; f++) {
    state = integrateAlphaScatterFrame(state, NUCLEUS.x, NUCLEUS.y)
    if (state.x < 0 || state.x > CANVAS_W || state.y < 0 || state.y > CANVAS_H) break
  }
  return velocityDeflectionDeg(state.vx, state.vy)
}

describe('alphaScatter · 库仑作用尺度自洽性', () => {
  it('库仑系数由作用尺度反解，a = k/v₀² 成立', () => {
    expect(COULOMB_K).toBeCloseTo(SCATTER_SCALE_PX * ALPHA_SPEED_PX_PER_FRAME ** 2, 10)
  })
})

describe('alphaScatter · 卢瑟福解析式', () => {
  it('对心入射 (b = 0) 原路返回 180°', () => {
    expect(scatterAngleDeg(0)).toBe(180)
  })

  it('b = a 时散射角恰为 90°（双曲线几何分界）', () => {
    expect(scatterAngleDeg(SCATTER_SCALE_PX)).toBeCloseTo(90, 6)
  })

  it('散射角随碰撞参数单调递减，且远距入射趋近直穿', () => {
    const angles = [0, 4, 20, 91.6, 325].map((b) => scatterAngleDeg(b))
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThan(angles[i - 1])
    }
    expect(scatterAngleDeg(325)).toBeLessThan(2)
  })

  it('最近接近距离满足 r_min = a + √(a² + b²)', () => {
    expect(closestApproachPx(0)).toBeCloseTo(2 * SCATTER_SCALE_PX, 6)
    expect(closestApproachPx(3)).toBeCloseTo(SCATTER_SCALE_PX + 5, 6)
  })
})

describe('alphaScatter · 数值积分与解析式一致（中屏动画 ↔ 右屏看板）', () => {
  // 覆盖 反弹 / 大角偏转 / 明显偏转 / 临界 / 近直穿 各区间
  for (const b of [0, 1, 2, 4, 6, 10, 20, 40, 80, 120]) {
    it(`b = ${b}px 时积分偏转角与解析解偏差 < 1°`, () => {
      const simulated = simulateDeflection(b)
      const analytic = scatterAngleDeg(b)
      expect(Math.abs(simulated - analytic)).toBeLessThan(1)
    })
  }

  it('均匀束流统计符合「绝大多数直穿、少数偏转、极少数反弹」', () => {
    const samples = 2000
    const stats = { straight: 0, deflected: 0, rebound: 0 }
    for (let i = 0; i < samples; i++) {
      const y = (i / samples) * CANVAS_H
      stats[classifyScatterAngle(scatterAngleDeg(Math.abs(y - NUCLEUS.y)))]++
    }
    // 直穿占绝对多数
    expect(stats.straight / samples).toBeGreaterThan(0.6)
    // 反弹为极少数（卢瑟福实验中约 1/8000）
    expect(stats.rebound / samples).toBeLessThan(0.05)
    // 偏转为少数
    expect(stats.deflected / samples).toBeLessThan(0.4)
  })
})

describe('alphaScatter · 散射行为分类阈值', () => {
  it('按 5° / 90° 划分直穿、偏转与反弹', () => {
    expect(classifyScatterAngle(0)).toBe('straight')
    expect(classifyScatterAngle(4.9)).toBe('straight')
    expect(classifyScatterAngle(5)).toBe('deflected')
    expect(classifyScatterAngle(89.9)).toBe('deflected')
    expect(classifyScatterAngle(90)).toBe('rebound')
    expect(classifyScatterAngle(180)).toBe('rebound')
  })
})
