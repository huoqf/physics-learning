import { describe, it, expect } from 'vitest'
import {
  solveBasicAmpere,
  AMPERE_BASIC_SCENE,
} from '@/physics'

describe('solveBasicAmpere', () => {
  const scene = AMPERE_BASIC_SCENE // xMin=-1.6, xMax=1.6, mass=0.5

  // ── 基本公式 F = -B·I·L·sin(θ) ──

  it('θ=90° 时 F = BIL（直交最大力）', () => {
    const res = solveBasicAmpere(2, 1, 90, 4, 0.5, 0, scene)
    // F = -B·sin(90°)·I·L = -1·1·2·4 = -8
    expect(res.F).toBeCloseTo(-8, 8)
    expect(res.FAbs).toBeCloseTo(8, 8)
  })

  it('θ=0° 时 F = 0（B 平行于 I，无安培力）', () => {
    const res = solveBasicAmpere(2, 1, 0, 4, 0.5, 0, scene)
    expect(res.F).toBeCloseTo(0, 8)
    expect(res.FAbs).toBeCloseTo(0, 8)
  })

  it('θ=30° 时 F = BIL·sin30°', () => {
    const res = solveBasicAmpere(2, 1, 30, 4, 0.5, 0, scene)
    // F = -1·sin(30°)·2·4 = -4
    expect(res.F).toBeCloseTo(-4, 8)
  })

  it('I=0 时 F = 0', () => {
    const res = solveBasicAmpere(0, 1, 90, 4, 0.5, 0, scene)
    expect(res.F).toBeCloseTo(0, 8)
  })

  it('B=0 时 F = 0', () => {
    const res = solveBasicAmpere(2, 0, 90, 4, 0.5, 0, scene)
    expect(res.F).toBeCloseTo(0, 8)
  })

  // ── B_perp / B_para 分解 ──

  it('B_perp = B·sin(θ), B_para = B·cos(θ)', () => {
    const res = solveBasicAmpere(1, 2, 60, 4, 0.5, 0, scene)
    expect(res.B_perp).toBeCloseTo(2 * Math.sin(Math.PI / 3), 10)
    expect(res.B_para).toBeCloseTo(2 * Math.cos(Math.PI / 3), 10)
  })

  // ── 方向判定 ──

  it('I>0 时 currentDir = positive', () => {
    const res = solveBasicAmpere(1, 1, 90, 4, 0.5, 0, scene)
    expect(res.currentDir).toBe('positive')
  })

  it('I<0 时 currentDir = negative', () => {
    const res = solveBasicAmpere(-1, 1, 90, 4, 0.5, 0, scene)
    expect(res.currentDir).toBe('negative')
  })

  it('I=0 时 currentDir = zero', () => {
    const res = solveBasicAmpere(0, 1, 90, 4, 0.5, 0, scene)
    expect(res.currentDir).toBe('zero')
  })

  it('B>0 时 magneticDir = intoPage', () => {
    const res = solveBasicAmpere(1, 1, 90, 4, 0.5, 0, scene)
    expect(res.magneticDir).toBe('intoPage')
  })

  it('B<0 时 magneticDir = outOfPage', () => {
    const res = solveBasicAmpere(1, -1, 90, 4, 0.5, 0, scene)
    expect(res.magneticDir).toBe('outOfPage')
  })

  it('F>0 时 forceDir = right', () => {
    // F = -B·sin(θ)·I·L, 要 F>0 需要 B·I < 0
    const res = solveBasicAmpere(-2, 1, 90, 4, 0.5, 0, scene)
    expect(res.F).toBeGreaterThan(0)
    expect(res.forceDir).toBe('right')
  })

  it('F<0 时 forceDir = left', () => {
    const res = solveBasicAmpere(2, 1, 90, 4, 0.5, 0, scene)
    expect(res.F).toBeLessThan(0)
    expect(res.forceDir).toBe('left')
  })

  // ── 加速度 a = F/m ──

  it('加速度 a = F/m', () => {
    const res = solveBasicAmpere(2, 1, 90, 4, 0.5, 0, scene)
    // F=-8, m=0.5 → a=-16
    expect(res.a).toBeCloseTo(-16, 8)
  })

  it('m=0 时 a=0（避免除零）', () => {
    const res = solveBasicAmpere(2, 1, 90, 4, 0, 0, scene)
    expect(res.a).toBe(0)
  })

  // ── 运动学积分 x = x0 + 0.5·a·t² ──

  it('t=0 时 x 位于场景中心', () => {
    const res = solveBasicAmpere(2, 1, 90, 4, 0.5, 0, scene)
    expect(res.x).toBeCloseTo(0, 10) // x0 = (-1.6+1.6)/2 = 0
  })

  it('t>0 时位置按 x = x0 + 0.5·a·t² 积分', () => {
    // a=-16, tLimit≈0.447s，用 t=0.2 确保未触壁
    const res = solveBasicAmpere(2, 1, 90, 4, 0.5, 0.2, scene)
    // x = 0 + 0.5·(-16)·0.04 = -0.32
    expect(res.x).toBeCloseTo(-0.32, 8)
    expect(res.isLimited).toBe(false)
  })

  // ── 边界限位 ──

  it('向右运动超时后限位于 xMax', () => {
    // 要 a>0（向右），需 F>0，即 B·I < 0
    const res = solveBasicAmpere(-10, 1, 90, 4, 0.5, 10, scene)
    // a 很大，t=10 足够到达限位
    expect(res.isLimited).toBe(true)
    expect(res.x).toBeCloseTo(scene.xMax, 8)
  })

  it('向左运动超时后限位于 xMin', () => {
    const res = solveBasicAmpere(10, 1, 90, 4, 0.5, 10, scene)
    expect(res.isLimited).toBe(true)
    expect(res.x).toBeCloseTo(scene.xMin, 8)
  })

  it('F=0 时不发生运动，x 保持中心', () => {
    const res = solveBasicAmpere(0, 1, 90, 4, 0.5, 5, scene)
    expect(res.x).toBeCloseTo(0, 10)
    expect(res.isLimited).toBe(false)
  })

  // ── 默认参数 ──

  it('使用默认参数时 thetaIB=90, L=4.0, m=0.5', () => {
    const res = solveBasicAmpere(1, 1)
    // F = -1·sin(90°)·1·4 = -4
    expect(res.F).toBeCloseTo(-4, 8)
    expect(res.a).toBeCloseTo(-8, 8) // -4/0.5
  })
})
