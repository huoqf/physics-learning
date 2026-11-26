import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { useRelativityPhysics } from '../hooks/useRelativityPhysics'
import { RelativityScene } from '../components/RelativityScene'
import { buildRelativityQuantities } from '@/data/quantities/relativity'
import type { SceneScale } from '@/scene'

function makeSceneScale(totalHorizWorld: number): SceneScale {
  const trackLeft = 70
  const trackWidth = 490
  const worldSpanX = Math.max(2.6, totalHorizWorld + 1.4)
  const unifiedScale = Math.min(82, trackWidth / worldSpanX)
  const originX = trackLeft + (trackWidth - totalHorizWorld * unifiedScale) / 2
  return {
    scaleX: unifiedScale,
    scaleY: unifiedScale,
    scale: unifiedScale,
    originX,
    originY: 550,
    maxVectorLength: 195,
  }
}

describe('相对论 Hook、场景与右屏看板集成测试', () => {
  it('飞船光脉冲相位与飞船表盘由同一固有时 τ 同步驱动', () => {
    const { result } = renderHook(() =>
      useRelativityPhysics({
        beta: 0.8,
        m0: 1.0,
        time: 2.0,
        mode: 0,
        showGeometry: true,
      }),
    )

    expect(result.current.beta).toBe(0.8)
    expect(result.current.gamma).toBeCloseTo(5 / 3, 4)
    expect(result.current.lengthRatio).toBeCloseTo(0.6, 4)
    expect(result.current.clockState.groundTime).toBeCloseTo(2.0, 4)
    expect(result.current.clockState.properTime).toBeCloseTo(1.2, 4)
    expect(result.current.groundClockAngle).toBeCloseTo(120, 2)
    expect(result.current.shipClockAngle).toBeCloseTo(72, 2)
    expect(result.current.clockState.pulseHeightRatio).toBeCloseTo(0.8, 4)
  })

  it('低速极限 β=0 与高速边界保护', () => {
    const { result: lowResult } = renderHook(() =>
      useRelativityPhysics({
        beta: 0,
        m0: 1.0,
        time: 1.0,
        mode: 0,
        showGeometry: false,
      }),
    )
    expect(lowResult.current.beta).toBe(0)
    expect(lowResult.current.gamma).toBe(1)
    expect(lowResult.current.lengthRatio).toBe(1)
    expect(lowResult.current.clockState.groundTime).toBe(1.0)
    expect(lowResult.current.clockState.properTime).toBe(1.0)

    const { result: highResult } = renderHook(() =>
      useRelativityPhysics({
        beta: 0.999,
        m0: 1.0,
        time: 1.0,
        mode: 1,
        showGeometry: true,
      }),
    )
    expect(highResult.current.beta).toBe(0.95)
    expect(highResult.current.gamma).toBeCloseTo(3.20256, 3)
  })

  it('模式严格隔离：非动钟模式下即使 showGeometry=true 也不渲染几何推导层', () => {
    const vp = { designLeft: 0, designVisibleW: 840 }
    for (const mode of [1, 2, 3]) {
      const { result } = renderHook(() =>
        useRelativityPhysics({ beta: 0.8, m0: 1.0, time: 1.5, mode, showGeometry: true }),
      )
      const scale = makeSceneScale(result.current.clockState.totalHorizWorld)
      const { container } = render(
        React.createElement(
          'svg',
          null,
          React.createElement(RelativityScene, {
            physics: result.current,
            vp,
            sceneScale: scale,
            font: (n: number) => n,
          }),
        ),
      )
      expect(container.querySelector('.geometry-diagram')).toBeNull()
    }
  })

  it('全速域 [0, 0.95] 内飞船运动范围与固定表盘零重叠，且尺缩标注带单位 L₀', () => {
    const vp = { designLeft: 0, designVisibleW: 840 }
    for (const beta of [0, 0.6, 0.866, 0.95]) {
      const { result } = renderHook(() =>
        useRelativityPhysics({
          beta,
          m0: 1.0,
          time: 10,
          mode: 0,
          showGeometry: true,
        }),
      )
      const scale = makeSceneScale(result.current.clockState.totalHorizWorld)
      const { container } = render(
        React.createElement(
          'svg',
          null,
          React.createElement(RelativityScene, {
            physics: result.current,
            vp,
            sceneScale: scale,
            font: (n: number) => n,
          }),
        ),
      )

      const shipRects = container.querySelectorAll('.frame-s rect')
      const shipBody = shipRects[2]
      expect(shipBody).toBeTruthy()
      const rightEdge = Number(shipBody.getAttribute('x')) + Number(shipBody.getAttribute('width'))
      expect(rightEdge).toBeLessThan(620)
    }

    const { result: mode1 } = renderHook(() =>
      useRelativityPhysics({ beta: 0.6, m0: 1.0, time: 0, mode: 1, showGeometry: false }),
    )
    const { container: mode1Container } = render(
      React.createElement(
        'svg',
        null,
        React.createElement(RelativityScene, {
          physics: mode1.current,
          vp,
          sceneScale: makeSceneScale(mode1.current.clockState.totalHorizWorld),
          font: (n: number) => n,
        }),
      ),
    )
    expect(mode1Container.textContent).toContain('L = 0.800 L₀')
    expect(mode1Container.textContent).toContain('同时的相对性')
  })

  it('同时的相对性在到达后壁 A 瞬间前左右光束严格等长，β=0.866 保留 3 位小数', () => {
    const vp = { designLeft: 0, designVisibleW: 840 }
    const { result } = renderHook(() =>
      useRelativityPhysics({ beta: 0.866, m0: 1.0, time: 0.267, mode: 1, showGeometry: false }),
    )
    const { container } = render(
      React.createElement(
        'svg',
        null,
        React.createElement(RelativityScene, {
          physics: result.current,
          vp,
          sceneScale: makeSceneScale(result.current.clockState.totalHorizWorld),
          font: (n: number) => n,
        }),
      ),
    )

    expect(container.textContent).toContain('v = 0.866 c')
    const leftBeam = container.querySelector('.simultaneity-s-left-beam')
    const rightBeam = container.querySelector('.simultaneity-s-right-beam')
    expect(leftBeam).toBeTruthy()
    expect(rightBeam).toBeTruthy()
    const leftLen = Math.abs(Number(leftBeam!.getAttribute('x2')) - Number(leftBeam!.getAttribute('x1')))
    const rightLen = Math.abs(Number(rightBeam!.getAttribute('x2')) - Number(rightBeam!.getAttribute('x1')))
    expect(leftLen).toBeCloseTo(rightLen, 4)
    expect(leftLen).toBeGreaterThan(10)
  })

  it('右屏看板 5 个区块随左屏 mode 严格同步，不出现跨模式不相干内容', () => {
    const d0 = buildRelativityQuantities('anim-relativity', { mode: 0, beta: 0.6 }, 1.25)!
    const d1 = buildRelativityQuantities('anim-relativity', { mode: 1, beta: 0.866 }, 0.27)!
    const d2 = buildRelativityQuantities('anim-relativity', { mode: 2, beta: 0.8 }, 3.0)!
    const d3 = buildRelativityQuantities('anim-relativity', { mode: 3, beta: 0.8, m0: 2.0 }, 2.0)!

    const dumpText = (d: NonNullable<typeof d0>) =>
      [
        ...d.quantities.map((q) => q.label),
        ...(d.formulas ?? []).map((f) => f.name),
        ...(d.warnings ?? []).map((w) => w.text),
        ...(d.gaokaoPoints ?? []).map((g) => g.text),
        d.mnemonic ?? '',
      ].join('\n')

    expect(dumpText(d0)).toContain('动钟变慢')
    expect(dumpText(d0)).not.toContain('尺缩只发生在')
    expect(dumpText(d0)).not.toContain('量子力学')
    expect(dumpText(d0)).not.toContain('静能')

    expect(dumpText(d1)).toContain('动尺缩短')
    expect(dumpText(d1)).toContain('同时的相对性')
    expect(dumpText(d1)).not.toContain('量子力学')
    expect(dumpText(d1)).not.toContain('静能')

    expect(dumpText(d2)).toContain('牛顿力学')
    expect(dumpText(d2)).toContain('量子力学')
    expect(dumpText(d2)).not.toContain('尺缩只发生在')
    expect(dumpText(d2)).not.toContain('静能')

    expect(dumpText(d3)).toContain('不变质量')
    expect(dumpText(d3)).toContain('相对论能量与质能关系')
    expect(dumpText(d3)).not.toContain('尺缩只发生在')
    expect(dumpText(d3)).not.toContain('量子力学')
  })
})
