/**
 * LC 振荡图表的「控制变量可观测性」不变量守卫。
 *
 * 静态脚本抓不住语义归一化错误：
 *   1. 若 `useLCPhysics` 把电荷写成 `sample.q / safeQ0`，或消费方动态按 `Q0` 缩放 `yDomain`，
 *      语法和类型全合法，但调 `Q0` 时画面振幅纹丝不动；
 *   2. 若消费方把 `xDomain` 写成 `[0, T]` 或 `[0, 2*T]`，语法和类型也全合法，
 *      但调 `L` 或 `C` 时曲线永远铺满固定周期数，周期变化被视觉抹平。
 *
 * 本测试通过验证 Hook 输出与真实渲染出的 SVG 路径几何对参数扰动的响应，
 * 直接钉死上述两类语义退化。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { useLCPhysics } from '@/features/electromagnetism/em-oscillation/hooks/useLCPhysics'
import EMOscillationCenterExtra from '@/features/electromagnetism/em-oscillation/EMOscillationCenterExtra'
import { useAnimationStore } from '@/stores'
import { LC_CURVE_TIME_WINDOW } from '@/physics'
import { EM_OSCILLATION_COLORS } from '@/theme/physics'

/** 解析 SVG path `M x,y L x,y ...` 的点列 */
function parsePathPoints(d: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (const m of d.matchAll(/[ML]\s*([-\d.]+)[,\s]+([-\d.]+)/g)) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) })
  }
  return pts
}

/** 统计折线 y 序列（居中后）穿过基准值的次数 */
function countCrossings(ys: number[], mid: number): number {
  let count = 0
  let prevSign = 0
  for (const y of ys) {
    const diff = y - mid
    if (Math.abs(diff) < 1e-6) continue
    const sign = diff > 0 ? 1 : -1
    if (prevSign !== 0 && sign !== prevSign) count += 1
    prevSign = sign
  }
  return count
}

describe('LC 振荡图表：控制变量灵敏度与防归一化契约', () => {
  beforeEach(() => {
    act(() => {
      useAnimationStore.getState().reset()
    })
  })

  it('Hook 层：Q₀ 翻三倍时电荷曲线真实峰值同比翻三倍，且周期与时间窗跨度不变', () => {
    const r1 = renderHook(() =>
      useLCPhysics({ L: 0.4, C: 0.4, Q0: 1, time: 4, showDamping: false, switchPos: 2 }),
    ).result.current
    const r3 = renderHook(() =>
      useLCPhysics({ L: 0.4, C: 0.4, Q0: 3, time: 4, showDamping: false, switchPos: 2 }),
    ).result.current

    const max1 = Math.max(...r1.chargeCurve.map((p) => Math.abs(p.y)))
    const max3 = Math.max(...r3.chargeCurve.map((p) => Math.abs(p.y)))

    expect(max1).toBeCloseTo(1, 2)
    expect(max3).toBeCloseTo(3, 2)
    expect(max3 / max1).toBeCloseTo(3, 2)

    expect(r1.T).toBeCloseTo(r3.T, 12)
    expect(r1.viewEnd - r1.viewStart).toBe(LC_CURVE_TIME_WINDOW)
    expect(r3.viewEnd - r3.viewStart).toBe(LC_CURVE_TIME_WINDOW)
  })

  it('Hook 层：电感 L 放大 4 倍使周期翻倍，但时间窗跨度恒定且窗内振荡次数严格减半', () => {
    const smallL = renderHook(() =>
      useLCPhysics({ L: 0.4, C: 0.4, Q0: 1, time: 6, showDamping: false, switchPos: 2 }),
    ).result.current
    const largeL = renderHook(() =>
      useLCPhysics({ L: 1.6, C: 0.4, Q0: 1, time: 6, showDamping: false, switchPos: 2 }),
    ).result.current

    expect(largeL.T / smallL.T).toBeCloseTo(2, 9)
    expect(smallL.viewEnd - smallL.viewStart).toBe(LC_CURVE_TIME_WINDOW)
    expect(largeL.viewEnd - largeL.viewStart).toBe(LC_CURVE_TIME_WINDOW)

    const crossSmall = countCrossings(smallL.chargeCurve.map((p) => p.y), 0)
    const crossLarge = countCrossings(largeL.chargeCurve.map((p) => p.y), 0)
    expect(crossSmall).toBeGreaterThan(crossLarge)
    expect(crossLarge).toBeLessThanOrEqual(Math.ceil(crossSmall / 2))
  })

  it('渲染层：调大 Q₀ 时 SVG 电荷曲线实际像素振幅成比例放大（拒绝暗中归一化 yDomain）', () => {
    act(() => {
      useAnimationStore.getState().setParams({ scene: 0, L: 0.4, C: 0.4, Q0: 1, showDamping: 0, switchPos: 2 })
      useAnimationStore.getState().setTime(4)
    })
    const { container, rerender } = render(<EMOscillationCenterExtra />)

    const getChargeSpanPx = () => {
      const path = container.querySelector(`path[fill="none"][stroke="${EM_OSCILLATION_COLORS.charge}"]`)
      expect(path).not.toBeNull()
      const pts = parsePathPoints(path!.getAttribute('d') ?? '')
      expect(pts.length).toBeGreaterThan(10)
      const ys = pts.map((p) => p.y)
      return Math.max(...ys) - Math.min(...ys)
    }

    const span1 = getChargeSpanPx()

    act(() => {
      useAnimationStore.getState().updateParam('Q0', 3)
    })
    rerender(<EMOscillationCenterExtra />)

    const span3 = getChargeSpanPx()
    expect(span3 / span1).toBeCloseTo(3, 1)
  })

  it('渲染层：增大 L 时时间轴刻度右界保持锁定，且固定像素宽内的过零点数严格减少（拒绝 xDomain=[0, 2T]）', () => {
    const setupAndRender = (L: number) => {
      act(() => {
        useAnimationStore.getState().setParams({ scene: 0, L, C: 0.4, Q0: 1, showDamping: 0, switchPos: 2 })
        useAnimationStore.getState().setTime(5)
      })
      const view = render(<EMOscillationCenterExtra />)
      const svgs = view.container.querySelectorAll('svg')
      // 第一张 SVG 是电荷 q-t 图
      const qSvg = svgs[0]
      expect(qSvg).toBeDefined()
      const path = qSvg.querySelector(`path[fill="none"][stroke="${EM_OSCILLATION_COLORS.charge}"]`)
      const pts = parsePathPoints(path?.getAttribute('d') ?? '')
      const ys = pts.map((p) => p.y)
      const midY = (Math.max(...ys) + Math.min(...ys)) / 2
      const numericTicks = [...qSvg.querySelectorAll('text')]
        .map((t) => t.textContent?.trim() ?? '')
        .filter((s) => /^-?\d+(?:\.\d+)?$/.test(s))
        .map(Number)
      view.unmount()
      return { crossings: countCrossings(ys, midY), maxTick: Math.max(...numericTicks) }
    }

    const small = setupAndRender(0.4)
    const large = setupAndRender(1.6)

    expect(small.maxTick).toBe(LC_CURVE_TIME_WINDOW)
    expect(large.maxTick).toBe(LC_CURVE_TIME_WINDOW)
    expect(small.crossings).toBeGreaterThan(large.crossings)
  })
})
