/**
 * 绳与弹簧瞬时切断模型 — 系统二落地收敛（方案 A′）
 *
 * 事故背景（2026-10）：系统一 B 球早就有 isLanded + 位移截断，系统二却完全没有。
 * 实测 t≈0.55s D 球触地后继续自由落体，t=1.0s 时 C 球已在地面下 710px，
 * t≈0.75s 整个系统二飞出 650px 画布。本文件锁定修复后的行为：
 *   - D 触地即停，a_D 恒为 0
 *   - C 在 0.15s 内收敛到"弹簧压缩 mg/k"的静平衡
 *   - 落地前后位置连续、两球不互穿、加速度不出现超过 2g 的尖峰
 */
import { describe, it, expect } from 'vitest'
import {
  calculateCutRopeState,
  calculateSystem2LandingTime,
  SYSTEM2_SETTLE_TIME,
  PIXELS_PER_METER,
  SPRING_NATURAL_LENGTH,
  BALL_RADIUS,
  CUT_ROPE_ANCHORS,
} from '@/physics/dynamics/spring-force'

const { ceilY, groundY } = CUT_ROPE_ANCHORS
const BALL_TOP = groundY - BALL_RADIUS
const K = 100
const M = 1
const G = 9.8

/** 静平衡球心距：弹簧压缩 mg/k 后托住 C */
const SETTLED_GAP = SPRING_NATURAL_LENGTH - ((M * G) / K) * PIXELS_PER_METER

const stateAt = (t: number, m = M) => calculateCutRopeState(K, m, t, 1, 0, ceilY, groundY)

describe('calculateSystem2LandingTime', () => {
  it('返回 D 球恰好触地的时刻', () => {
    const tLand = calculateSystem2LandingTime(K, M, ceilY, groundY)
    expect(tLand).toBeGreaterThan(0.5)
    expect(tLand).toBeLessThan(0.6)
    // 该时刻 D 正好贴地
    expect(stateAt(tLand).positions.yD).toBeCloseTo(BALL_TOP, 3)
    // 前一瞬还在上方
    expect(stateAt(tLand - 0.01).positions.yD).toBeLessThan(BALL_TOP)
  })

  it('与 B 球落地落在同一个小窗口内（两侧本该对称）', () => {
    const tLand2 = calculateSystem2LandingTime(K, M, ceilY, groundY)
    const bLanded = (t: number) => stateAt(t).isLanded
    let tLandB = 0
    for (let t = 0; t <= 1; t += 0.005) {
      if (bLanded(t)) {
        tLandB = t
        break
      }
    }
    expect(Math.abs(tLand2 - tLandB)).toBeLessThan(0.05)
  })

  it('质量变化时仍然单调且有限', () => {
    for (const m of [1, 1.5, 2, 3]) {
      const t = calculateSystem2LandingTime(K, m, ceilY, groundY)
      expect(Number.isFinite(t)).toBe(true)
      expect(t).toBeGreaterThan(0)
      expect(stateAt(t, m).positions.yD).toBeCloseTo(BALL_TOP, 2)
    }
  })
})

describe('落地前：自由段公式保持不变', () => {
  it('t=0 仍给出教科书瞬时突变：a_C=-2g、a_D=0、弹簧力 = +mg', () => {
    const s = stateAt(0)
    expect(s.forces.a_C).toBeCloseTo(-2 * G, 6)
    expect(s.forces.a_D).toBeCloseTo(0, 6)
    // +mg：弹簧仍被拉伸，拉 C 向下、D 向上（方向不能反）
    expect(s.forces.fSpring2).toBeCloseTo(M * G, 6)
  })

  it('t=0.1 仍在自由段，未落地', () => {
    const tLand = calculateSystem2LandingTime(K, M, ceilY, groundY)
    expect(0.1).toBeLessThan(tLand)
    const s = stateAt(0.1)
    expect(s.positions.yD).toBeLessThan(BALL_TOP)
  })
})

describe('落地后：系统二收敛到压缩静平衡', () => {
  const tLand = calculateSystem2LandingTime(K, M, ceilY, groundY)

  it('D 球钉在地面，不再下坠', () => {
    for (const t of [tLand, tLand + 0.1, 1, 2, 3]) {
      expect(stateAt(t).positions.yD).toBeCloseTo(BALL_TOP, 6)
    }
  })

  it('D 球加速度恒为 0（地面支持力平衡）', () => {
    for (const t of [tLand + 0.01, tLand + 0.1, 1, 2, 3]) {
      expect(stateAt(t).forces.a_D).toBeCloseTo(0, 6)
    }
  })

  it('过渡结束后 C 球停在压缩弹簧上：a_C=0、弹力=-mg、球心距=静平衡值', () => {
    const s = stateAt(tLand + SYSTEM2_SETTLE_TIME + 0.01)
    expect(s.forces.a_C).toBeCloseTo(0, 6)
    // -mg：弹簧转为压缩，推 C 向上、压 D 向下（符号与拉伸时相反）
    expect(s.forces.fSpring2).toBeCloseTo(-M * G, 6)
    expect(s.positions.yD - s.positions.yC).toBeCloseTo(SETTLED_GAP, 2)
  })

  it('收敛是单调推进的，不会在终点来回抖', () => {
    const gapAt = (t: number) => {
      const p = stateAt(t).positions
      return p.yD - p.yC
    }
    const g0 = gapAt(tLand)
    const g1 = gapAt(tLand + SYSTEM2_SETTLE_TIME / 2)
    const g2 = gapAt(tLand + SYSTEM2_SETTLE_TIME)
    expect(g0).toBeGreaterThan(g1)
    expect(g1).toBeGreaterThan(g2 - 0.5)
    expect(g2).toBeCloseTo(SETTLED_GAP, 1)
  })
})

describe('整段轨迹的健壮性', () => {
  it('C 球位置在落地时刻连续（无瞬移）', () => {
    const tLand = calculateSystem2LandingTime(K, M, ceilY, groundY)
    // 落地瞬间下落速度约 1500px/s，0.002s 的正常位移就有 ~3px；
    // 真出现"瞬移"会是几十上百 px，因此阈值取正常步长的 2 倍即可判别
    const before = stateAt(tLand - 0.002).positions.yC
    const at = stateAt(tLand).positions.yC
    const after = stateAt(tLand + 0.002).positions.yC
    expect(Math.abs(at - before)).toBeLessThan(6)
    expect(Math.abs(after - at)).toBeLessThan(6)
  })

  it('两球从不互穿，也不穿地', () => {
    for (let t = 0; t <= 3; t += 0.01) {
      const { yC, yD } = stateAt(t).positions
      expect(yD - yC).toBeGreaterThanOrEqual(2 * BALL_RADIUS - 0.5)
      expect(yD).toBeLessThanOrEqual(BALL_TOP + 0.5)
    }
  })

  it('加速度不出现超出 2g 的尖峰（旁侧对比图量程只到 2.5g）', () => {
    for (let t = 0; t <= 3; t += 0.01) {
      const { a_C, a_D } = stateAt(t).forces
      expect(Math.abs(a_C)).toBeLessThanOrEqual(2 * G + 0.01)
      expect(Math.abs(a_D)).toBeLessThanOrEqual(2 * G + 0.01)
    }
  })
})
