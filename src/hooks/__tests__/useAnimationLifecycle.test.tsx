import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAnimationLifecycle } from '../useAnimationLifecycle'
import { useAnimationStore } from '@/stores'
import { getAnimationConfig, getAnimationConfigAsync } from '@/data/animationRegistry'
import type { AnimationConfig } from '@/data/types'

vi.mock('@/data/animationRegistry', () => ({
  getAnimationConfig: vi.fn(),
  getAnimationConfigAsync: vi.fn(),
}))

vi.mock('@/data/physicsQuantities', () => ({
  preloadQuantityBuilder: vi.fn(() => Promise.resolve()),
}))

function createWrapper(entry = '/animation/test-anim') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/animation/:id" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    )
  }
}

function makeConfig(overrides: Partial<AnimationConfig> = {}): AnimationConfig {
  return {
    id: 'test-anim',
    title: '测试动画',
    knowledgeId: 'test-k',
    Component: (() => null) as unknown as AnimationConfig['Component'],
    defaultParams: { v: 10 },
    controlsMode: 'timed',
    ...overrides,
  }
}

describe('useAnimationLifecycle', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>
  let nextFrameId: number
  let nowMs: number

  beforeEach(() => {
    useAnimationStore.getState().reset()
    rafCallbacks = new Map()
    nextFrameId = 1
    nowMs = 0

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextFrameId++
      rafCallbacks.set(id, cb)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id)
    })
    vi.mocked(getAnimationConfigAsync).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const stepFrame = (deltaMs: number) => {
    nowMs += deltaMs
    const pending = Array.from(rafCallbacks.entries())
    rafCallbacks.clear()
    for (const [, cb] of pending) {
      cb(nowMs)
    }
  }

  it('speed 倍速只缩放一次，2x 下 100ms 推进 0.2s、0.5x 下推进 0.05s', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(makeConfig({ maxTime: 10 }))

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })

    act(() => {
      useAnimationStore.getState().setSpeed(2)
      useAnimationStore.getState().setIsPlaying(true)
    })

    // 首帧建立基准时间戳，第二帧推进 100ms
    act(() => { stepFrame(0) })
    act(() => { stepFrame(100) })
    expect(useAnimationStore.getState().time).toBeCloseTo(0.2, 5)

    // 切到 0.5x 再推进 100ms（speed 变更通过 ref 立即生效，下一帧即可验证）
    act(() => {
      useAnimationStore.getState().setSpeed(0.5)
    })
    act(() => { stepFrame(100) })
    expect(useAnimationStore.getState().time).toBeCloseTo(0.25, 5)
  })

  it('loop 模式未声明 maxTime 时超过 30s 不会强制归零跳变', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(makeConfig({ controlsMode: 'loop' }))

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    expect(useAnimationStore.getState().isPlaying).toBe(true)

    act(() => { useAnimationStore.getState().setTime(29.9) })
    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) })

    expect(useAnimationStore.getState().time).toBeCloseTo(30.1, 5)
    expect(useAnimationStore.getState().isPlaying).toBe(true)
  })

  it('loop 模式显式声明 maxTime 时平滑取模回绕', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(makeConfig({ controlsMode: 'loop', maxTime: 10 }))

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    act(() => { useAnimationStore.getState().setTime(9.9) })
    act(() => { stepFrame(0) })
    act(() => { stepFrame(250) })

    expect(useAnimationStore.getState().time).toBeCloseTo(0.15, 5)
  })

  it('criticalTimes 开启 autoPause 时跨过临界点自动定格且恢复播放不死锁', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(
      makeConfig({
        maxTime: 5,
        criticalTimes: [
          { time: 1.5, label: '共速时刻', variant: 'critical', autoPause: true },
        ],
      }),
    )

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    expect(useAnimationStore.getState().autoPauseOnCritical).toBe(true)

    act(() => {
      useAnimationStore.getState().setTime(1.4)
      useAnimationStore.getState().setIsPlaying(true)
    })

    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) }) // 1.4 + 0.2 = 1.6 跨过 1.5

    expect(useAnimationStore.getState().time).toBeCloseTo(1.5, 5)
    expect(useAnimationStore.getState().isPlaying).toBe(false)

    // 从 1.5s 再次恢复播放不会卡在 1.5s
    act(() => {
      useAnimationStore.getState().setIsPlaying(true)
    })
    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) })

    expect(useAnimationStore.getState().time).toBeCloseTo(1.7, 5)
    expect(useAnimationStore.getState().isPlaying).toBe(true)
  })

  it('timed 模式开启 repeatLoop 后到达 maxTime 自动从 0 继续循环并同步 t=0 物理状态', () => {
    const updatePhysics = vi.fn(() => ({ position: { x: 1, y: 2 } }))
    vi.mocked(getAnimationConfig).mockReturnValue(makeConfig({ maxTime: 5, updatePhysics }))

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    act(() => {
      useAnimationStore.getState().setRepeatLoop(true)
      useAnimationStore.getState().setTime(4.9)
      useAnimationStore.getState().setIsPlaying(true)
    })

    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) })

    expect(useAnimationStore.getState().time).toBe(0)
    expect(useAnimationStore.getState().isPlaying).toBe(true)
    expect(updatePhysics).toHaveBeenLastCalledWith({ v: 10 }, 0, 0)
  })

  it('动态 controlsMode 下通过 ?params=...&t=... 深链进入 loop 场次，定格并保持暂停不被覆盖', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(
      makeConfig({
        defaultParams: { scene: 0 },
        controlsMode: (p) => (p.scene === 1 ? 'loop' : 'timed'),
        maxTime: (p) => (p.scene === 0 ? 5 : undefined),
      }),
    )

    renderHook(() => useAnimationLifecycle(), {
      wrapper: createWrapper('/animation/test-anim?params=%7B%22scene%22%3A1%7D&t=1.2'),
    })

    expect(useAnimationStore.getState().params.scene).toBe(1)
    expect(useAnimationStore.getState().time).toBeCloseTo(1.2, 5)
    expect(useAnimationStore.getState().isPlaying).toBe(false)
  })

  it('动态 maxTime 返回 undefined 的 loop 场次不会每 5s/30s 强制归零跳变', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(
      makeConfig({
        defaultParams: { scene: 1 },
        controlsMode: (p) => (p.scene === 1 ? 'loop' : 'timed'),
        maxTime: (p) => (p.scene === 0 ? 5 : undefined),
      }),
    )

    renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    expect(useAnimationStore.getState().isPlaying).toBe(true)

    act(() => { useAnimationStore.getState().setTime(5.0) })
    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) })
    expect(useAnimationStore.getState().time).toBeCloseTo(5.2, 5)

    act(() => { useAnimationStore.getState().setTime(29.9) })
    act(() => { stepFrame(0) })
    act(() => { stepFrame(200) })
    expect(useAnimationStore.getState().time).toBeCloseTo(30.1, 5)
  })

  it('运行期从 loop 切到 timed 自动暂停；通过 handleRestart 切出时保持播放', () => {
    vi.mocked(getAnimationConfig).mockReturnValue(
      makeConfig({
        defaultParams: { scene: 1 },
        controlsMode: (p) => (p.scene === 1 ? 'loop' : 'timed'),
      }),
    )

    const { result } = renderHook(() => useAnimationLifecycle(), { wrapper: createWrapper() })
    expect(useAnimationStore.getState().isPlaying).toBe(true)

    act(() => {
      useAnimationStore.getState().updateParam('scene', 0)
    })
    expect(useAnimationStore.getState().isPlaying).toBe(false)

    act(() => {
      useAnimationStore.getState().updateParam('scene', 1)
    })
    expect(useAnimationStore.getState().isPlaying).toBe(true)

    act(() => {
      useAnimationStore.getState().setParams({ scene: 0 })
      result.current.handleRestart()
    })
    expect(useAnimationStore.getState().time).toBe(0)
    expect(useAnimationStore.getState().isPlaying).toBe(true)
  })
})
