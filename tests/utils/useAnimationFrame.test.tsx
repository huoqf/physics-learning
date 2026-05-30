import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useAnimationFrame } from '@/utils/animation'

// 受控的 requestAnimationFrame mock：手动驱动帧
let rafCallbacks: Array<(t: number) => void> = []
let rafId = 0

function flushFrame(time: number) {
  const callbacks = rafCallbacks
  rafCallbacks = []
  callbacks.forEach((cb) => cb(time))
}

beforeEach(() => {
  rafCallbacks = []
  rafId = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    rafCallbacks.push(cb)
    return ++rafId
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafCallbacks = []
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Harness({
  playing,
  speed,
  onTick,
}: {
  playing: boolean
  speed?: number
  onTick: (dt: number) => void
}) {
  useAnimationFrame(onTick, { playing, speed })
  return null
}

describe('useAnimationFrame', () => {
  it('playing 为 false 时不应调度帧', () => {
    const onTick = vi.fn()
    render(<Harness playing={false} onTick={onTick} />)
    expect(rafCallbacks.length).toBe(0)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('playing 为 true 时应在每帧调用回调', () => {
    const onTick = vi.fn()
    render(<Harness playing={true} onTick={onTick} />)
    flushFrame(0) // 首帧建立基准 lastTime
    flushFrame(16)
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('应按 speed 缩放 deltaTime', () => {
    const onTick = vi.fn()
    render(<Harness playing={true} speed={2} onTick={onTick} />)
    flushFrame(0)
    flushFrame(10)
    // 第二帧 delta = (10 - 0) * 2 = 20
    expect(onTick).toHaveBeenLastCalledWith(20)
  })

  it('卸载后应停止调度（清理 rAF）', () => {
    const onTick = vi.fn()
    const { unmount } = render(<Harness playing={true} onTick={onTick} />)
    flushFrame(0)
    const callsBefore = onTick.mock.calls.length
    unmount()
    flushFrame(16)
    expect(onTick.mock.calls.length).toBe(callsBefore)
  })

  it('speed 应被钳制在合理范围（>10 截断为 10）', () => {
    const onTick = vi.fn()
    render(<Harness playing={true} speed={100} onTick={onTick} />)
    flushFrame(0)
    flushFrame(5)
    // delta = (5 - 0) * 10(钳制) = 50
    expect(onTick).toHaveBeenLastCalledWith(50)
  })
})
