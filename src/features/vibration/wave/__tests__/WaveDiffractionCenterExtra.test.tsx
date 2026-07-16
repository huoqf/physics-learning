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

describe('WaveDiffractionCenterExtra', () => {
  it('渲染标题与 d/λ 比值', async () => {
    mockStore({ d: 8, lambda: 4, A: 1, showProbe: 1 })
    const { default: WaveDiffractionCenterExtra } = await import(
      '../WaveDiffractionCenterExtra'
    )
    render(<WaveDiffractionCenterExtra />)

    expect(screen.getByText(/单缝衍射强/)).toBeDefined()
    expect(screen.getByText(/d\/λ ≈ 2\.00/)).toBeDefined()
  })

  it('渲染底部物理说明文字', async () => {
    mockStore({ d: 8, lambda: 4, A: 1, showProbe: 1 })
    const { default: WaveDiffractionCenterExtra } = await import(
      '../WaveDiffractionCenterExtra'
    )
    render(<WaveDiffractionCenterExtra />)

    expect(screen.getByText(/单缝衍射：缝宽/)).toBeDefined()
  })
})
