import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartTimeScrubProvider } from '@/context/ChartTimeScrubContext'
import { VelocityTimeChart } from '../VelocityTimeChart'
import { MiniChart } from '@/components/UI/MiniChart'
import { AnimationStoreOverrideProvider, useAnimationStore } from '@/stores'
import { CHART_COLORS } from '@/theme/physics'

describe('ChartTimeScrub 与 Ghost 上下文隔离', () => {
  it('VelocityTimeChart 在 ChartTimeScrubProvider 下自动启用图区搓擦反控时间', () => {
    const scrubToTime = vi.fn()
    const { container } = render(
      <ChartTimeScrubProvider value={{ scrubToTime, maxTime: 10 }}>
        <VelocityTimeChart
          points={[{ t: 0, v: 0 }, { t: 10, v: 20 }]}
          currentTime={2}
          tMax={10}
        />
      </ChartTimeScrubProvider>,
    )

    const svg = container.querySelector('svg')!
    expect(svg.style.cursor).toBe('ew-resize')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 300,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    // jsdom 无原生 PointerEvent 时 fireEvent.pointerDown 会丢弃 clientX，用 MouseEvent 携带坐标验证
    fireEvent(
      svg,
      new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 250,
        clientY: 150,
      }),
    )
    expect(scrubToTime).toHaveBeenCalledTimes(1)
    expect(scrubToTime.mock.calls[0][0]).toBeGreaterThan(0)
    expect(scrubToTime.mock.calls[0][0]).toBeLessThan(10)
  })

  it('MiniChart 仅在 xKey="t" 时自动启用反控，xKey="x" 时不绑定', () => {
    const scrubToTime = vi.fn()
    const { container: c1 } = render(
      <ChartTimeScrubProvider value={{ scrubToTime, maxTime: 5 }}>
        <MiniChart
          title="v-t"
          xMin={0}
          xMax={5}
          yMin={0}
          yMax={10}
          points={[{ t: 0, v: 0 }, { t: 5, v: 10 }]}
          lines={[{ key: 'v', color: CHART_COLORS.primary, name: 'v' }]}
          xKey="t"
          xLabel="t(s)"
          yLabel="v(m/s)"
          currentVals={{ v: 2 }}
          currentXVal={1}
        />
      </ChartTimeScrubProvider>,
    )
    expect(c1.querySelector('svg')!.style.cursor).toBe('ew-resize')

    const { container: c2 } = render(
      <ChartTimeScrubProvider value={{ scrubToTime, maxTime: 5 }}>
        <MiniChart
          title="F-x"
          xMin={0}
          xMax={5}
          yMin={0}
          yMax={10}
          points={[{ x: 0, f: 0 }, { x: 5, f: 10 }]}
          lines={[{ key: 'f', color: CHART_COLORS.primary, name: 'F' }]}
          xKey="x"
          xLabel="x(m)"
          yLabel="F(N)"
          currentVals={{ f: 2 }}
          currentXVal={1}
        />
      </ChartTimeScrubProvider>,
    )
    expect(c2.querySelector('svg')!.style.cursor).toBe('')
  })

  it('AnimationStoreOverrideProvider 隔离读取覆写参数、屏蔽写操作，且 BasePhysicsChart 占位隐藏', () => {
    useAnimationStore.getState().reset()
    useAnimationStore.getState().setParams({ v0: 10 })
    useAnimationStore.getState().setIsPlaying(true)

    function Probe() {
      const v0 = useAnimationStore((s) => s.params.v0)
      const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
      return (
        <div>
          <span data-testid="ghost-v0">{v0}</span>
          <button type="button" onClick={() => setIsPlaying(false)}>
            try-stop
          </button>
          <VelocityTimeChart points={[{ t: 0, v: 0 }, { t: 2, v: 5 }]} currentTime={1} tMax={2} />
        </div>
      )
    }

    const { container } = render(
      <AnimationStoreOverrideProvider params={{ v0: 4 }} renderRole="ghost">
        <Probe />
      </AnimationStoreOverrideProvider>,
    )

    expect(screen.getByTestId('ghost-v0').textContent).toBe('4')
    // 写入被屏蔽，主 store 不受影响
    fireEvent.click(screen.getByText('try-stop'))
    expect(useAnimationStore.getState().isPlaying).toBe(true)
    expect(useAnimationStore.getState().params.v0).toBe(10)
    // 图表在 ghost 渲染中退化为透明占位 div，不渲染 SVG
    expect(container.querySelector('svg')).toBeNull()
  })
})
