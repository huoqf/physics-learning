/**
 * 第三定律模式的「双轨共焦」守门测试。
 *
 * 开普勒第一定律：绕同一中心天体的所有轨道共用那个焦点。页面把太阳画在内轨右焦点 c₁ 上，
 * 所以外轨椭圆的中心必须平移 c₁ − c₂，让它的右焦点也落在太阳上。
 *
 * 曾经的做法是把外轨中心留在世界原点 (0, 0)：太阳就落在距它 c₂ 的「空气焦点」左侧，
 * 行星 B 绕着太阳右侧的空气焦点加减速 —— 实测 B 到太阳的距离是 4.125…10.875，
 * 而共焦时应为 3.000…12.000（默认参数），两端各差 c₂ − c₁ = 1.125。
 */
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { evaluateKeplerOrbit } from '@/physics/celestial'
import { useKeplerPhysics } from '@/features/mechanics/gravitation/hooks/useKeplerPhysics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { KEPLER_CONFIG } from '@/theme/physics'

const BASE = { a: 4.5, e: 0.75, mass: 36, mode: 2, a2: 7.5, e2: 0.6 } as const

/** 画布半宽（世界单位）：超出这个值，行星会在画布外消失 */
const HALF_WIDTH_WORLD = CANVAS_PRESETS.full.width / 2 / KEPLER_CONFIG.scaleBase

function run(params: Record<string, number>) {
  return renderHook(() => useKeplerPhysics(params, 0)).result.current
}

/** 行星 B 到太阳的距离（含外轨中心平移），以及沿用旧几何（中心在原点）的对照值 */
function bDistanceRange(params: { a: number; e: number; mass: number; a2: number; e2: number }, samples = 720) {
  const { orbitBCenterX, sunPhysX, a2, e2, mass, T2 } = run({ ...params, mode: 2 })
  let min = Infinity
  let max = -Infinity
  let legacyMin = Infinity
  let legacyMax = -Infinity
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * T2
    const o = evaluateKeplerOrbit(a2, e2, mass, t)
    const d = Math.hypot(o.x + orbitBCenterX - sunPhysX, o.y)
    const legacy = Math.hypot(o.x - sunPhysX, o.y)
    min = Math.min(min, d)
    max = Math.max(max, d)
    legacyMin = Math.min(legacyMin, legacy)
    legacyMax = Math.max(legacyMax, legacy)
  }
  return { min, max, legacyMin, legacyMax }
}

describe('第三定律：内外轨共焦点于太阳', () => {
  it('外轨椭圆的右焦点与太阳重合', () => {
    const r = run({ ...BASE })
    const c2 = r.a2 * Math.min(Math.max(r.e2, 0), 0.999)
    expect(r.orbitBCenterX).toBeCloseTo(r.c1 - c2, 10)
    expect(r.orbitBCenterX + c2).toBeCloseTo(r.sunPhysX, 10)
  })

  it('默认参数：B 到太阳的距离范围 = [a₂(1−e₂), a₂(1+e₂)]', () => {
    const r = bDistanceRange(BASE)
    expect(r.min).toBeCloseTo(7.5 * (1 - 0.6), 6)
    expect(r.max).toBeCloseTo(7.5 * (1 + 0.6), 6)
  })

  it('反证：外轨中心若留在原点，距离范围整体偏 c₂ − c₁', () => {
    const r = bDistanceRange(BASE)
    const offset = 1.125 // c₂ − c₁ = 7.5×0.6 − 4.5×0.75
    expect(r.legacyMin).toBeCloseTo(r.min + offset, 6)
    expect(r.legacyMax).toBeCloseTo(r.max - offset, 6)
  })

  it('任意偏心率组合（含 e₁ = 0 与 e₂ = 0.8）都共焦', () => {
    const cases = [
      { a: 2.5, e: 0, mass: 36, a2: 6, e2: 0.8 },
      { a: 5.5, e: 0.85, mass: 15, a2: 10, e2: 0 },
      { a: 4.5, e: 0.4, mass: 60, a2: 8, e2: 0.45 },
    ]
    for (const c of cases) {
      const r = bDistanceRange(c, 360)
      expect(r.min).toBeCloseTo(c.a2 * (1 - c.e2), 6)
      expect(r.max).toBeCloseTo(c.a2 * (1 + c.e2), 6)
    }
  })

  it('取景：任何参数组合下两轨并集都不超出画布半宽', () => {
    const cases = [
      { a: 2.5, e: 0, mass: 36, a2: 10, e2: 0.8 }, // 左端最远
      { a: 5.5, e: 0.85, mass: 36, a2: 10, e2: 0 }, // 右端最远
      { a: 4.5, e: 0.75, mass: 36, a2: 7.5, e2: 0.6 }, // 默认
      { a: 2.5, e: 0.85, mass: 36, a2: 6, e2: 0.8 },
    ]
    for (const c of cases) {
      const { orbitSpanX } = run({ ...c, mode: 2 })
      // 并集中点落在画布中心：归一化后左右两侧都不得超出半宽
      // （原始跨度可以超过半宽，取景就是把中点挪到中心的）
      expect(orbitSpanX.right - orbitSpanX.center).toBeLessThan(HALF_WIDTH_WORLD)
      expect(orbitSpanX.center - orbitSpanX.left).toBeLessThan(HALF_WIDTH_WORLD)
    }
  })

  it('前两定律模式没有外轨：取景中点恒为 0（与改动前的画布中心一致）', () => {
    for (const mode of [0, 1]) {
      const { orbitSpanX } = run({ ...BASE, mode })
      expect(orbitSpanX.center).toBe(0)
      expect(orbitSpanX.left).toBeCloseTo(-4.5, 10)
      expect(orbitSpanX.right).toBeCloseTo(4.5, 10)
    }
  })
})
