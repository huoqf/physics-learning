import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAnimationStore } from '@/stores'

vi.mock('@/stores', () => ({
  useAnimationStore: vi.fn(),
}))

function mockStore(params: Record<string, number>) {
  vi.mocked(useAnimationStore).mockImplementation((selector) => {
    const state = { params } as never
    return typeof selector === 'function' ? selector(state) : state
  })
}

describe('WaveInterferenceCenterExtra', () => {
  it('渲染标题与公式说明', async () => {
    mockStore({ a: 12, lambda: 5, A: 1 })
    const { default: WaveInterferenceCenterExtra } = await import(
      '../WaveInterferenceCenterExtra'
    )
    render(<WaveInterferenceCenterExtra />)

    expect(screen.getByText(/双源干涉屏强/)).toBeDefined()
    expect(screen.getByText(/加强: δ = nλ/)).toBeDefined()
  })

  it('渲染底部物理说明文字', async () => {
    mockStore({ a: 12, lambda: 5, A: 1 })
    const { default: WaveInterferenceCenterExtra } = await import(
      '../WaveInterferenceCenterExtra'
    )
    render(<WaveInterferenceCenterExtra />)

    expect(screen.getByText(/相干双源：程差/)).toBeDefined()
  })
})
